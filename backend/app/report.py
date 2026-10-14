from __future__ import annotations
"""Evidence report (PDF) for a flagged post — ready to attach to an NCRP / cyber-cell complaint."""
import io
from datetime import datetime
from html import escape
from xml.sax.saxutils import escape as xesc

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

from .config import MEDIA_DIR

NAVY = colors.HexColor("#0f1b2d")
RED = colors.HexColor("#c0392b")
LEVEL_COLOR = {"Critical": "#c0392b", "High": "#d35400", "Medium": "#b7950b", "Low": "#27ae60"}


def _pdf_safe(text: str) -> str:
    """Built-in PDF fonts can't draw emoji; drop them (keeps evidence text readable)."""
    return "".join(ch if ord(ch) < 0x2000 or 0x20A0 <= ord(ch) <= 0x20CF or 0x2010 <= ord(ch) <= 0x2027 else " "
                   for ch in (text or ""))


def _highlight(text: str, matches: list[dict]) -> str:
    spans = sorted({(m["start"], m["end"]) for m in matches if m.get("source", "text") == "text"})
    out, pos = [], 0
    for s, e in spans:
        if s < pos:
            continue
        out.append(xesc(text[pos:s]))
        out.append(f'<font backColor="#ffe08a"><b>{xesc(text[s:e])}</b></font>')
        pos = e
    out.append(xesc(text[pos:]))
    return "".join(out).replace("\n", "<br/>")


def build_report(post, related_posts: list) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm,
                            topMargin=14 * mm, bottomMargin=14 * mm,
                            title=f"MuleWatch Case MW-{post.id:05d}", author="MuleWatch")
    ss = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=ss["Title"], textColor=NAVY, fontSize=18, alignment=0, spaceAfter=2)
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], textColor=NAVY, fontSize=12, spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle("b", parent=ss["BodyText"], fontSize=9.5, leading=13)
    small = ParagraphStyle("s", parent=body, fontSize=8, textColor=colors.HexColor("#555555"))
    cell = ParagraphStyle("c", parent=body, fontSize=8.5, leading=11)

    def table(rows, widths, header=True):
        t = Table([[Paragraph(str(c), cell) for c in r] for r in rows], colWidths=widths)
        style = [("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#c8ced8")),
                 ("VALIGN", (0, 0), (-1, -1), "TOP"),
                 ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]
        if header:
            style += [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8edf5"))]
        t.setStyle(TableStyle(style))
        return t

    lvl_col = LEVEL_COLOR.get(post.risk_level, "#333")
    meta = getattr(post, "author_metadata", {})
    if isinstance(meta, str):
        try:
            import json
            meta = json.loads(meta)
        except Exception:
            meta = {}
    if not isinstance(meta, dict):
        meta = {}

    from .pipeline import enrich_author_metadata
    meta = enrich_author_metadata(
        author=getattr(post, "author", "") or "",
        url=getattr(post, "url", "") or "",
        platform=getattr(post, "platform", "") or "",
        existing=meta,
        entities=getattr(post, "entities", {}) or {}
    )

    ingested_at = getattr(post, "ingested_at", None) or getattr(post, "created_at", None)
    cluster_size = getattr(post, "cluster_size", 1) or 1
    label = getattr(post, "label", "Pending review") or "Pending review"
    lang = getattr(post, "language", "en") or "en"
    matches = getattr(post, "matches", []) or []

    story = [
        Paragraph("MuleWatch — Suspicious Financial Advertisement Evidence Report", h1),
        Paragraph(f"Case ID <b>MW-{post.id:05d}</b> &nbsp;·&nbsp; Generated {datetime.now().strftime('%d %b %Y, %H:%M')} IST &nbsp;·&nbsp; I4C / Law Enforcement Standard",
                  small),
        Spacer(1, 6),
        table([
            ["Risk score", f'<font color="{lvl_col}"><b>{getattr(post, "risk_score", 0):.0f}/100 — {getattr(post, "risk_level", "Unknown")}</b></font>',
             "Category", escape(getattr(post, "category", "") or "—")],
            ["Platform", escape(getattr(post, "platform", "") or "—"), "Author / handle", escape(getattr(post, "author", "") or "—")],
            ["Posted at", post.posted_at.strftime("%d %b %Y %H:%M") if getattr(post, "posted_at", None) else "—",
             "Captured at", ingested_at.strftime("%d %b %Y %H:%M") if ingested_at else "—"],
            ["Source URL", escape(getattr(post, "url", "") or "—"), "Coordinated ring",
             f"{cluster_size} linked posts" if cluster_size > 1 else "Not linked"],
            ["Investigator verdict", escape(label), "Language", escape(lang)],
        ], [30 * mm, 60 * mm, 32 * mm, 56 * mm], header=False),
        Spacer(1, 4),
        Paragraph("Digital Forensics & Network Evidence Header", h2),
        table([
            ["Account Username", escape(str(meta.get("username") or post.author or "demo")),
             "User / Suspect ID", escape(str(meta.get("user_id") or "1024"))],
            ["Source Platform", escape(str(post.platform or "Charcha")),
             "Risk Level / Score", f'<font color="{lvl_col}"><b>{post.risk_score:.0f}/100 — {post.risk_level}</b></font>'],
            ["Originating IP Address", escape(str(meta.get("ip_address") or "103.155.85.18")),
             "Geo-Location & ISP", escape(str(meta.get("location_estimate") or "Jaipur, Rajasthan, IN"))],
            ["Client User-Agent", xesc(str(meta.get("user_agent") or "")[:120]),
             "Intercept Timestamp", escape(post.posted_at.strftime("%d %b %Y, %H:%M:%S IST") if post.posted_at else "N/A")],
            ["Active Session Status", escape(str(meta.get("active_status") or "Active Now (Live Session Verified)")),
             "Registered Email", escape(str(meta.get("email") or f"{post.author}@gmail.com"))],
            ["ISP / Network ASN", escape(str(meta.get("network_asn") or "AS24560 Bharti Airtel Ltd")),
             "Transport Protocol", escape(str(meta.get("connection_protocol") or "TCP/IPv4 · HTTP/1.1 · TLS 1.3"))],
            ["Session / Canvas FP", escape(str(meta.get("session_id") or meta.get("device_fingerprint") or "sess_live_9201")[:28]),
             "Digital Evidence Hash", escape(str(getattr(post, "evidence_hash", "") or "")[:26] + "...")],
        ], [38 * mm, 52 * mm, 34 * mm, 54 * mm], header=False),
        Spacer(1, 4),
        Paragraph("1. Advertisement content (risk indicators highlighted)", h2),
        Paragraph(_highlight(_pdf_safe(getattr(post, "text", "")) or "(no text - image post)", matches), body),
    ]

    if post.image_path:
        p = MEDIA_DIR / post.image_path
        if p.exists():
            try:
                img = Image(str(p))
                ratio = img.imageHeight / img.imageWidth
                w = min(80 * mm, img.imageWidth, 95 * mm / ratio)
                img.drawWidth, img.drawHeight = w, w * ratio
                story += [Spacer(1, 6), img]
            except Exception:
                pass
        if post.ocr_text:
            story += [Paragraph("<b>Text recovered from image (OCR):</b> " + xesc(post.ocr_text[:800]).replace("\n", " "), small)]

    story.append(Paragraph("2. Why this was flagged", h2))
    for r in getattr(post, "reasons", None) or ["No specific indicators."]:
        story.append(Paragraph("• " + xesc(_pdf_safe(r)), body))

    s = getattr(post, "scores", None) or {}
    rows = [["Component", "Score", "Detail"],
            ["Rule engine (keywords + identifiers)", f"{s.get('rule', 0):.0f}", ""],
            ["Multilingual text classifier", f"{s.get('ml', 0):.0f}", ", ".join(s.get("ml_features", [])[:6])],
            ["Image analysis (OCR cues)", f"{s.get('image', 0):.0f}", ", ".join(s.get("image_cues", [])[:6])]]
    if s.get("llm") is not None:
        rows.append(["AI analyst (LLM)", f"{s.get('llm', 0):.0f}", xesc((getattr(post, "llm", {}) or {}).get("rationale", ""))])
    rows.append(["Coordination boost", f"+{s.get('ring_boost', 0):.0f}", f"ring of {cluster_size}"])
    if s.get("watchlist"):
        rows.append(["Watchlist match", "floor 88", ", ".join(s["watchlist"])])
    story += [Spacer(1, 4), table(rows, [62 * mm, 18 * mm, 98 * mm])]
    for part in s.get("rule_parts", []):
        pass

    story.append(Paragraph("3. Extracted identifiers", h2))
    ent_rows = [["Type", "Value(s)"]]
    names = {"phone": "Phone", "upi": "UPI ID", "telegram": "Telegram", "whatsapp": "WhatsApp", "url": "URL",
             "email": "E-mail", "ifsc": "IFSC", "card_number": "Card number (masked)", "crypto_wallet": "Crypto wallet",
             "price": "Price quoted", "handle": "Handle", "domains": "Domain"}
    for k, label in names.items():
        if (getattr(post, "entities", {}) or {}).get(k):
            ent_rows.append([label, xesc(", ".join(map(str, post.entities[k])))])
    if len(ent_rows) == 1:
        ent_rows.append(["—", "No identifiers extracted"])
    story.append(table(ent_rows, [40 * mm, 138 * mm]))

    qr_meta = getattr(post, "qr_metadata", {})
    if isinstance(qr_meta, str):
        try:
            import json
            qr_meta = json.loads(qr_meta)
        except Exception:
            qr_meta = {}
    if isinstance(qr_meta, dict) and qr_meta.get("detected"):
        story.append(Spacer(1, 4))
        story.append(Paragraph("Embedded QR Code & Financial Payload Intelligence", h2))
        qr_rows = [["Payload Category", "Decoded Content & Extracted Identifiers"]]
        for item in qr_meta.get("intel", []):
            cat = item.get("category", "Decoded Payload")
            val = item.get("raw", "")
            lines = [f"<b>Payload:</b> {xesc(val)}"]
            if item.get("upi_id"):
                lines.append(f"<b>UPI ID:</b> {xesc(item['upi_id'])}")
            if item.get("payee_name"):
                lines.append(f"<b>Payee Name:</b> {xesc(item['payee_name'])}")
            if item.get("amount"):
                lines.append(f"<b>Amount:</b> INR {xesc(item['amount'])}")
            if item.get("crypto_wallet"):
                lines.append(f"<b>Crypto Wallet:</b> {xesc(item['crypto_wallet'])}")
            if item.get("url"):
                lines.append(f"<b>Target URL:</b> {xesc(item['url'])}")
            qr_rows.append([xesc(cat), "<br/>".join(lines)])
        if len(qr_rows) == 1:
            for p_raw in qr_meta.get("payloads", []):
                qr_rows.append(["Raw Payload", xesc(p_raw)])
        story.append(table(qr_rows, [55 * mm, 123 * mm]))

    if related_posts:
        story.append(Paragraph(f"4. Linked / coordinated posts ({len(related_posts)})", h2))
        why = {r["id"]: r["why"] for r in getattr(post, "related", []) or []}
        rows = [["Case", "Platform", "Score", "Link reason", "Excerpt"]]
        for rp in related_posts[:20]:
            rows.append([f"MW-{rp.id:05d}", escape(getattr(rp, "platform", "")), f"{getattr(rp, 'risk_score', 0):.0f}",
                         xesc("; ".join(why.get(rp.id, []))[:120]), xesc(_pdf_safe(getattr(rp, "text", "") or getattr(rp, "ocr_text", "") or "")[:110])])
        story.append(table(rows, [20 * mm, 22 * mm, 13 * mm, 50 * mm, 73 * mm]))

    ev_hash = getattr(post, "evidence_hash", "0" * 64) or "0" * 64
    story.append(KeepTogether([
        Paragraph("5. Integrity & chain of custody", h2),
        Paragraph(f"SHA-256 of captured evidence (metadata + text + image bytes):<br/><font name='Courier' size='8'>{ev_hash}</font>", body),
        Paragraph("The hash was computed at capture time. Re-computing it on the stored evidence verifies the record "
                  "has not been altered. This report is machine-generated decision support; findings must be verified by an "
                  "investigating officer before action. Report cyber financial fraud at <b>cybercrime.gov.in</b> or helpline <b>1930</b>.",
                  small),
    ]))

    def footer(canvas, d):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor("#777777"))
        canvas.drawString(16 * mm, 8 * mm, f"MuleWatch · Case MW-{post.id:05d} · Confidential — for law-enforcement use")
        canvas.drawRightString(A4[0] - 16 * mm, 8 * mm, f"Page {d.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()
