"""Hybrid, explainable risk scoring.

final = noisy-OR( rule engine , text classifier , image cues , [LLM] ) * 100
        + coordination boost (ring membership) + watchlist floor        (applied in pipeline)

Every component is stored so the UI can show *why* a post was flagged."""
from .extract import LEXICON, extract_entities, find_keywords
from .imaging import image_cues
from .ml import model

GROUPS = LEXICON["groups"]
RISK_GROUPS = {"mule_kit", "card_sale", "payout_lure", "evasion", "financial_object", "sale_intent"}


def term_multiplier(term: str, stats: dict) -> float:
    """Feedback-adapted weight: Laplace-smoothed precision mapped to 0.3 .. 1.5."""
    s = stats.get(term)
    if not s:
        return 1.0
    conf, fp = s
    precision = (conf + 1) / (conf + fp + 2)
    return round(0.3 + 1.2 * precision, 3)


def rule_engine(hits: list[dict], entities: dict, stats: dict) -> tuple[float, list[dict], list[str]]:
    by_group: dict[str, set] = {}
    for h in hits:
        by_group.setdefault(h["group"], set()).add(h["term"])

    points, parts, reasons = 0.0, [], []
    for group, terms in by_group.items():
        spec = GROUPS[group]
        raw = sum(spec["weight"] * term_multiplier(t, stats) for t in terms)
        capped = max(raw, spec["cap"]) if spec["cap"] < 0 else min(raw, spec["cap"])
        points += capped
        parts.append({"name": spec["label"], "points": round(capped, 1), "terms": sorted(terms)})
        if group in ("mule_kit", "card_sale", "payout_lure"):
            ctx = " (quoted inside an awareness message)" if "awareness" in by_group else ""
            reasons.append(f"{spec['label']}{ctx}: " + ", ".join(f"“{t}”" for t in sorted(terms)[:5]))
        elif group == "awareness":
            reasons.append("Looks like awareness / legitimate context: " + ", ".join(sorted(terms)[:3]))

    awareness = "awareness" in by_group
    for combo in LEXICON["combos"]:
        if not awareness and all(g in by_group for g in combo["all"]):
            points += combo["bonus"]
            parts.append({"name": combo["label"], "points": combo["bonus"], "terms": []})
            reasons.append(combo["label"])

    strong = {"mule_kit", "card_sale", "payout_lure"} & set(by_group)
    risky_language = not awareness and bool(
        strong or ({"financial_object", "sale_intent"} <= set(by_group))
        or ({"financial_object", "evasion"} <= set(by_group)))
    ent_rules = [
        ("card_number", 22, "Card number pattern present", False),
        ("crypto_wallet", 8, "Crypto wallet address (USDT/BTC payouts)", True),
        ("upi", 8, "UPI payment ID given for payment", True),
        ("ifsc", 6, "IFSC code shared", True),
        ("telegram", 8, "Moves buyers to Telegram", True),
        ("whatsapp", 7, "Moves buyers to WhatsApp", True),
        ("handle", 3, "Contact handle given", True),
        ("phone", 6, "Phone number for contact", True),
        ("price", 7, "Price quoted per item", True),
    ]
    for kind, pts, label, needs_language in ent_rules:
        if entities.get(kind) and (risky_language or not needs_language):
            points += pts
            parts.append({"name": label, "points": pts, "terms": entities[kind][:3]})
            reasons.append(f"{label}: {', '.join(map(str, entities[kind][:3]))}")
    if any(d in ("bit.ly", "tinyurl.com", "cutt.ly", "t.ly", "rb.gy", "is.gd") for d in entities.get("domains", [])) and risky_language:
        points += 5
        parts.append({"name": "Shortened link hides destination", "points": 5, "terms": []})

    return max(0.0, min(1.0, points / 100)), parts, reasons


def categorize(by_group: set, entities: dict, score: float) -> str:
    if score < 30:
        return "Benign"
    if "card_sale" in by_group or entities.get("card_number"):
        return "Card Sale"
    if "payout_lure" in by_group:
        return "Account-Holder Recruitment"
    if by_group & {"mule_kit"}:
        return "Mule Account Sale"
    if "evasion" in by_group:
        return "KYC Fraud"
    return "Suspicious Financial Ad"


def analyze(text: str, ocr_text: str = "", stats: dict | None = None, llm: dict | None = None) -> dict:
    stats = stats or {}
    text_hits = find_keywords(text)
    ocr_hits = [dict(h, source="image") for h in find_keywords(ocr_text)] if ocr_text else []
    entities = extract_entities(text + ("\n" + ocr_text if ocr_text else ""))
    spans = entities.pop("_spans")
    text_spans = [s for s in spans if s["end"] <= len(text)]

    r, parts, reasons = rule_engine(text_hits + ocr_hits, entities, stats)

    groups = {h["group"] for h in text_hits + ocr_hits}
    awareness = "awareness" in groups

    combined = (text + " " + ocr_text).strip()
    p = model().predict_proba(combined) if combined else 0.5
    m = max(0.0, (p - 0.5) * 2) * (0.4 if awareness else 1.0)
    ml_features = model().top_features(combined) if p > 0.6 else []
    if m > 0.3:
        reasons.append(f"Text classifier confidence {p:.0%} (signals: {', '.join(ml_features[:4])})")

    cues = image_cues(ocr_text) if ocr_text else []
    sale_context = bool(groups & {"mule_kit", "card_sale", "payout_lure", "evasion", "sale_intent"}) and not awareness
    i = 0.0
    if cues:
        # banking material in an image is only risky next to sale / rent language;
        # a student proudly posting a new card is not a seller
        i = min(1.0, 0.18 * len(cues)) if sale_context else min(0.12, 0.03 * len(cues))
        reasons.append(("Image shows banking material: " if sale_context else
                        "Image shows card/bank details (no sale language): ") + ", ".join(cues[:5]))
    if ocr_hits and not awareness and any(h["group"] in ("mule_kit", "card_sale", "payout_lure") for h in ocr_hits):
        i = min(1.0, i + 0.3)
        reasons.append("Sale language found inside the image (OCR)")

    l_score = 0.0
    if llm and "score" in llm:
        l_score = max(0.0, min(1.0, llm["score"] / 100))
        if llm.get("rationale"):
            reasons.append("AI analyst: " + llm["rationale"])

    noisy_or = 1 - (1 - r) * (1 - 0.75 * m) * (1 - 0.6 * i) * (1 - 0.8 * l_score)
    base = round(noisy_or * 100, 1)

    return {
        "matches": [{k: h[k] for k in ("term", "group", "start", "end", "text", "obfuscated")} | {"source": "text"} for h in text_hits]
                   + [{k: h[k] for k in ("term", "group", "start", "end", "text")} | {"source": "image"} for h in ocr_hits],
        "entities": entities,
        "entity_spans": text_spans,
        "groups": sorted(groups),
        "reasons": reasons,
        "base_score": base,
        "scores": {
            "rule": round(r * 100, 1),
            "ml": round(p * 100, 1),
            "image": round(i * 100, 1),
            "llm": round(l_score * 100, 1) if llm else None,
            "rule_parts": parts,
            "ml_features": ml_features,
            "image_cues": cues,
            "base": base,
        },
    }


def finalize(base: float, coord_boost: float, watch_hits: list[str]) -> float:
    score = min(100.0, base + coord_boost)
    if watch_hits:
        score = max(score, 88.0)
    return round(score, 1)
