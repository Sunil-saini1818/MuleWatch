from __future__ import annotations
"""Optional 'AI analyst' second opinion using Google Gemini (free tier) or Claude.
Disabled unless GEMINI_API_KEY or ANTHROPIC_API_KEY is set.
The system works fully offline without it."""
import base64
import json
import mimetypes
import re

import requests

from .config import ANTHROPIC_API_KEY, GEMINI_API_KEY, GEMINI_MODEL, LLM_MODEL

PROMPT = """You are a financial-fraud analyst for Indian law enforcement. Decide whether this
social-media post / advertisement is offering to SELL, RENT or BUY bank accounts, ATM/debit/credit
cards, current/savings accounts, banking 'kits' (passbook + ATM + net banking + SIM), or recruiting
people to lend their accounts (money-mule activity). Awareness posts, bank promotions, and people
asking for help are NOT suspicious.

Reply with ONLY compact JSON: {"score": 0-100, "category": "<Mule Account Sale|Card Sale|Account-Holder Recruitment|KYC Fraud|Benign>", "rationale": "<max 25 words>"}

POST:
"""


def provider() -> str:
    if GEMINI_API_KEY:
        return "gemini"
    if ANTHROPIC_API_KEY:
        return "anthropic"
    return ""


def enabled() -> bool:
    return bool(provider())


def assess(text: str, image_path: str | None = None) -> dict | None:
    p = provider()
    if not p:
        return None
    if p == "gemini":
        return _assess_gemini(text, image_path)
    return _assess_anthropic(text, image_path)


def _assess_gemini(text: str, image_path: str | None = None) -> dict:
    parts = []
    if image_path:
        try:
            mt = mimetypes.guess_type(image_path)[0] or "image/png"
            with open(image_path, "rb") as f:
                data = base64.b64encode(f.read()).decode("ascii")
            parts.append({"inline_data": {"mime_type": mt, "data": data}})
        except OSError:
            pass
    parts.append({"text": PROMPT + (text or "(image only)")[:4000]})

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    headers = {"x-goog-api-key": GEMINI_API_KEY, "content-type": "application/json"}
    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0,
            "maxOutputTokens": 1000,
            "responseMimeType": "application/json",
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    try:
        r = requests.post(url, headers=headers, json=body, timeout=25)
        if r.status_code == 429:
            return {"error": "Gemini rate limit, try again in a minute"}
        r.raise_for_status()
        data = r.json()
        candidates = data.get("candidates", [])
        if not candidates:
            return {"error": "No candidates returned by Gemini"}
        out = "".join(part.get("text", "") for part in candidates[0].get("content", {}).get("parts", []))
        m = re.search(r"\{.*\}", out, re.S)
        if not m:
            return {"error": "Failed to parse JSON from Gemini response"}
        d = json.loads(m.group(0))
        return {
            "score": float(d.get("score", 0)),
            "category": d.get("category", ""),
            "rationale": str(d.get("rationale", ""))[:200],
            "model": GEMINI_MODEL,
        }
    except Exception as e:
        return {"error": str(e)[:200]}


def _assess_anthropic(text: str, image_path: str | None = None) -> dict:
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
    except Exception as e:
        return {"error": str(e)[:200]}
