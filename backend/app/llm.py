from __future__ import annotations
"""Optional 'AI analyst' second opinion using Claude. Disabled unless ANTHROPIC_API_KEY is set.
The system works fully offline without it."""
import base64
import json
import mimetypes
import re

import requests

from .config import ANTHROPIC_API_KEY, LLM_MODEL

PROMPT = """You are a financial-fraud analyst for Indian law enforcement. Decide whether this
social-media post / advertisement is offering to SELL, RENT or BUY bank accounts, ATM/debit/credit
cards, current/savings accounts, banking 'kits' (passbook + ATM + net banking + SIM), or recruiting
people to lend their accounts (money-mule activity). Awareness posts, bank promotions, and people
asking for help are NOT suspicious.

Reply with ONLY compact JSON: {"score": 0-100, "category": "<Mule Account Sale|Card Sale|Account-Holder Recruitment|KYC Fraud|Benign>", "rationale": "<max 25 words>"}

POST:
"""


def enabled() -> bool:
    return bool(ANTHROPIC_API_KEY)


def assess(text: str, image_path: str | None = None) -> dict | None:
    if not enabled():
        return None
    content = []
    if image_path:
        try:
            mt = mimetypes.guess_type(image_path)[0] or "image/png"
            with open(image_path, "rb") as f:
                data = base64.b64encode(f.read()).decode()
            content.append({"type": "image", "source": {"type": "base64", "media_type": mt, "data": data}})
        except OSError:
            pass
    content.append({"type": "text", "text": PROMPT + (text or "(image only)")[:4000]})
    try:
        r = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
                     "content-type": "application/json"},
            json={"model": LLM_MODEL, "max_tokens": 200, "messages": [{"role": "user", "content": content}]},
            timeout=25,
        )
        r.raise_for_status()
        out = "".join(b.get("text", "") for b in r.json().get("content", []))
        m = re.search(r"\{.*\}", out, re.S)
        if not m:
            return None
        d = json.loads(m.group(0))
        return {"score": float(d.get("score", 0)), "category": d.get("category", ""),
                "rationale": str(d.get("rationale", ""))[:200], "model": LLM_MODEL}
    except Exception as e:      # network / quota problems must never break ingestion
        return {"error": str(e)[:200]}
