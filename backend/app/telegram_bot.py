from __future__ import annotations
"""SentinelAI Telegram MTProto Worker & Real-time Fraud Interception Engine for MuleWatch.

Integrates official Telegram developer credentials (API_ID, API_HASH, APP_TITLE)
via Telethon MTProto protocol and Telegram Bot API. Ingests, inspects, classifies,
and reports suspicious money mule accounts, bank kits, and payment fraud in real time.
"""

import asyncio
import hashlib
import html
import logging
import os
import re
import threading
import time
from datetime import datetime
from typing import Any, Callable

from .config import (
    ALERT_MIN_LEVEL,
    APP_TITLE,
    DATA_DIR,
    MEDIA_DIR,
    PUBLIC_BASE_URL,
    REPORT_BOT_TOKEN,
    TELEGRAM_API_HASH,
    TELEGRAM_API_ID,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    level_for,
)
from .db import Post, SessionLocal
from .pipeline import ingest

logger = logging.getLogger("mulewatch.telegram")

# Known obfuscation patterns used by money mule recruiters
OBFUSCATION_PATTERNS = [
    (re.compile(r"s[@a4*]v[i1*]ngs?\s*acc?(?:ount)?", re.I), "savings account"),
    (re.compile(r"curr?[e3*]nt?\s*acc?(?:ount)?", re.I), "current account"),
    (re.compile(r"atm\s*c[@a4*]rd\s*k[i1*]t", re.I), "atm card kit"),
    (re.compile(r"n[o0]\s*kyc", re.I), "no kyc"),
    (re.compile(r"pre[\s-]*kyc", re.I), "pre-kyc"),
    (re.compile(r"f[u*]ll\s*k[i1*]t", re.I), "full kit"),
    (re.compile(r"p[@a4*]ssb[o0]{2}k", re.I), "passbook"),
    (re.compile(r"ch[e3*]qu?e\s*b[o0]{2}k", re.I), "cheque book"),
    (re.compile(r"usdt\s*c[@a4*]sh[o0]ut", re.I), "usdt cashout"),
    (re.compile(r"g[@a4*]m[i1*]ng\s*w[i1*]thdr[@a4*]w[@a4*]l", re.I), "gaming withdrawal"),
    (re.compile(r"m[u*]l[e3*]\s*acc?(?:ount)?", re.I), "mule account"),
    (re.compile(r"acc?(?:ount)?\s*r[e3*]nt[@a4*]l", re.I), "account rental"),
]


def detect_obfuscations(text: str) -> list[str]:
    """Detect obfuscated mule keywords and return normalized terminology."""
    hits = []
    for pattern, normalized in OBFUSCATION_PATTERNS:
        if pattern.search(text):
            hits.append(normalized)
    return list(dict.fromkeys(hits))


def normalize_obfuscated_text(text: str) -> str:
    """Normalize common leetspeak substitutions to improve downstream NLP/LLM recall."""
    t = text
    t = re.sub(r"[@]", "a", t)
    t = re.sub(r"[\$]", "s", t)
    t = re.sub(r"[0]", "o", t)
    t = re.sub(r"[1]", "i", t)
    t = re.sub(r"[3]", "e", t)
    return t


def format_verdict_badge(risk_score: float, risk_level: str) -> str:
    """Format official high-impact verdict badge."""
    score_int = int(round(risk_score))
    if score_int >= 80 or risk_level == "Critical":
        return f"🚨 CRITICAL MULE AD DETECTED [Score: {score_int}/100]"
    elif score_int >= 55 or risk_level == "High":
        return f"⚠️ HIGH RISK FRAUD INTERCEPT [Score: {score_int}/100]"
    elif score_int >= 30 or risk_level == "Medium":
        return f"🟡 SUSPICIOUS ADVERTISEMENT [Score: {score_int}/100]"
    else:
        return f"🟢 LOW RISK / BENIGN AD [Score: {score_int}/100]"


def build_verdict_response(post: Post, obfuscated_hits: list[str]) -> tuple[str, str]:
    """Create human-readable HTML response for Telegram reply and logs."""
    badge = format_verdict_badge(post.risk_score, post.risk_level)
    cid = f"MW-{post.id:04d}" if post.id else "MW-TEMP"
    case_url = f"{PUBLIC_BASE_URL.rstrip('/')}/#/cases/{post.id}" if post.id else PUBLIC_BASE_URL

    ents = post.entities or {}
    upis = ents.get("upi") or []
    phones = ents.get("phone") or []
    telegrams = list(dict.fromkeys((ents.get("telegram") or []) + (ents.get("handle") or [])))
    banks = ents.get("bank") or []

    indicators_lines = []
    if upis:
        indicators_lines.append(f"• <b>UPI Handles:</b> {', '.join(upis[:4])}")
    if phones:
        indicators_lines.append(f"• <b>Phone Numbers:</b> {', '.join(phones[:4])}")
    if telegrams:
        indicators_lines.append(f"• <b>Telegram Contacts:</b> {', '.join(telegrams[:4])}")
    if banks:
        indicators_lines.append(f"• <b>Targeted Banks:</b> {', '.join(banks[:4])}")
    if obfuscated_hits:
        indicators_lines.append(f"• <b>Obfuscated Phrases:</b> {', '.join(obfuscated_hits[:4])}")

    indicators_text = "\n".join(indicators_lines) if indicators_lines else "• <i>No specific payment handles identified</i>"

    reasons = [r for r in (post.reasons or [])[:3]]
    reasons_text = "\n".join([f"• {html.escape(r)}" for r in reasons]) if reasons else "• Pattern match against known mule syndicate schema"

    text_msg = (
        f"<b>{badge}</b>\n\n"
        f"<b>SentinelAI Threat Classification:</b>\n"
        f"• <b>Case Identifier:</b> <code>{cid}</code>\n"
        f"• <b>Threat Tier:</b> <b>{post.risk_level.upper()}</b> (Score: {post.risk_score:.0f}/100)\n"
        f"• <b>Detected Modus:</b> {html.escape(post.category or 'Money Mule Account Rental')}\n\n"
        f"🔍 <b>Extracted Financial Indicators:</b>\n"
        f"{indicators_text}\n\n"
        f"📋 <b>Key Evidence Triggers:</b>\n"
        f"{reasons_text}\n\n"
        f"🛡️ <b>MuleWatch Intelligence Dossier:</b>\n"
        f"Inspect full forensic network graph: <a href=\"{case_url}\">{case_url}</a>\n\n"
        f"<i>🇮🇳 National Cyber Crime Reporting Portal: 1930 | cybercrime.gov.in</i>"
    )
    return badge, text_msg


def examine_and_ingest_telegram_message(
    *,
    text: str = "",
    caption: str = "",
    author: str = "",
    channel: str = "Telegram Direct",
    chat_id: str | int = "",
    message_id: str | int = "",
    image_bytes: bytes | None = None,
    image_filename: str = "",
    reply_callback: Callable[[str, str], Any] | None = None,
    use_llm: bool = True,
) -> dict[str, Any]:
    """Pass incoming Telegram message through NLP classification, OCR, and coordination graph."""
    combined_raw = "\n".join(x for x in (text, caption) if x).strip()
    if not combined_raw and not image_bytes:
        return {"ok": False, "error": "Empty message content"}

    obfuscated_hits = detect_obfuscations(combined_raw)
    normalized_text = normalize_obfuscated_text(combined_raw)

    # Save media file if attached
    saved_img_name = ""
    if image_bytes:
        try:
            h = hashlib.sha1(image_bytes).hexdigest()[:12]
            saved_img_name = image_filename or f"tg_mtproto_{h}.jpg"
            if not saved_img_name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                saved_img_name += ".jpg"
            (MEDIA_DIR / saved_img_name).write_bytes(image_bytes)
        except Exception as e:
            logger.warning(f"Could not persist Telegram image: {e}")

    # Build platform and metadata tags
    clean_author = author.strip() or ("@" + str(channel).lstrip("@") if channel else "Telegram User")
    platform_name = f"Telegram · {channel}" if channel else "Telegram"
    post_url = f"https://t.me/{str(channel).lstrip('@')}/{message_id}" if channel and message_id else ""

    author_metadata = {
        "client": f"{APP_TITLE} (MTProto / API ID {TELEGRAM_API_ID})",
        "channel": channel,
        "author": clean_author,
        "chat_id": str(chat_id),
        "message_id": str(message_id),
        "obfuscations_detected": obfuscated_hits,
        "ingested_via": "telegram_worker",
        "timestamp": datetime.utcnow().isoformat(),
    }

    with SessionLocal() as s:
        post = ingest(
            s,
            text=combined_raw,
            platform=platform_name[:60],
            author=clean_author[:120],
            url=post_url[:500],
            image_path=saved_img_name,
            source="telegram",
            use_llm=use_llm,
            author_metadata=author_metadata,
        )

        if obfuscated_hits:
            post.reasons = (post.reasons or []) + [
                f"Obfuscated mule recruitment syntax detected: {', '.join(obfuscated_hits)}"
            ]
            # Boost score if intentional leetspeak evasion was detected
            if post.risk_score < 80:
                boosted = min(100.0, post.risk_score + 15.0)
                post.risk_score = boosted
                post.risk_level = level_for(boosted)

        s.commit()
        s.refresh(post)

        badge, verdict_msg = build_verdict_response(post, obfuscated_hits)
        cid = f"MW-{post.id:04d}"
        case_url = f"{PUBLIC_BASE_URL.rstrip('/')}/#/cases/{post.id}"

        # Update global worker metrics
        _worker_state["messages_processed"] += 1
        if post.risk_level in ("Critical", "High"):
            _worker_state["fraud_detected"] += 1
        _worker_state["last_verdict"] = {
            "post_id": post.id,
            "case_id": cid,
            "badge": badge,
            "level": post.risk_level,
            "score": post.risk_score,
            "author": post.author,
            "channel": channel,
            "at": datetime.utcnow().isoformat(),
        }

    # Execute reply callback if provided
    if reply_callback:
        try:
            reply_callback(badge, verdict_msg)
        except Exception as e:
            logger.warning(f"Error executing Telegram reply callback: {e}")

    # Forward to designated admin chat if alert threshold met
    if post.risk_level in ("Critical", "High") and TELEGRAM_CHAT_ID:
        _forward_alert_to_admin(verdict_msg)

    return {
        "ok": True,
        "post_id": post.id,
        "case_id": cid,
        "badge": badge,
        "verdict_html": verdict_msg,
        "risk_level": post.risk_level,
        "risk_score": post.risk_score,
        "category": post.category,
        "entities": post.entities,
        "case_url": case_url,
    }


def _forward_alert_to_admin(text: str):
    """Deliver priority alert report to designated Telegram admin channel/chat."""
    token = REPORT_BOT_TOKEN or TELEGRAM_BOT_TOKEN
    chat_id = TELEGRAM_CHAT_ID
    if not token or not chat_id:
        return
    try:
        import requests
        requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            timeout=8,
        )
    except Exception as e:
        logger.debug(f"Admin forward failed (non-fatal): {e}")


# =============================================================================
# TELETHON MTPROTO WORKER
# =============================================================================

_worker_state = {
    "enabled": True,
    "running": False,
    "api_id": TELEGRAM_API_ID,
    "api_hash_set": bool(TELEGRAM_API_HASH),
    "app_title": APP_TITLE,
    "protocol": "MTProto (Telethon v1.45)",
    "client_ready": False,
    "messages_processed": 0,
    "fraud_detected": 0,
    "last_verdict": None,
    "last_error": "",
    "started_at": None,
}


def get_worker_status() -> dict[str, Any]:
    """Return live status of the Telegram MTProto worker."""
    return dict(_worker_state)


class SentinelAITelegramWorker:
    """Telethon MTProto client background worker for monitoring channels & groups."""

    def __init__(self):
        self._thread: threading.Thread | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._client = None
        self._stop_event = threading.Event()

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_thread, daemon=True, name="sentinel-telethon")
        self._thread.start()
        logger.info(f"[{APP_TITLE}] SentinelAI Telegram MTProto background worker launched.")

    def stop(self):
        self._stop_event.set()
        if self._client and self._loop and self._loop.is_running():
            try:
                future = asyncio.run_coroutine_threadsafe(self._client.disconnect(), self._loop)
                future.result(timeout=5)
            except Exception:
                pass
        _worker_state["running"] = False

    def _run_thread(self):
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._async_main())
        except Exception as e:
            _worker_state["running"] = False
            _worker_state["last_error"] = f"{type(e).__name__}: {str(e)[:140]}"
            logger.warning(f"Telegram MTProto worker terminated: {e}")
        finally:
            self._loop.close()

    async def _async_main(self):
        from telethon import TelegramClient, events

        session_path = str(DATA_DIR / "sentinel_ai.session")
        token = REPORT_BOT_TOKEN or TELEGRAM_BOT_TOKEN

        _worker_state["started_at"] = datetime.utcnow().isoformat()
        _worker_state["running"] = True

        backoff = 3
        while not self._stop_event.is_set():
            try:
                logger.info(
                    f"[{APP_TITLE}] Connecting Telethon MTProto client (API ID: {TELEGRAM_API_ID})..."
                )
                self._client = TelegramClient(session_path, TELEGRAM_API_ID, TELEGRAM_API_HASH)

                if token:
                    await self._client.start(bot_token=token)
                else:
                    # In headless hackathon mode without an interactive phone prompt, connect session
                    await self._client.connect()

                _worker_state["client_ready"] = True
                _worker_state["last_error"] = ""
                backoff = 3
                logger.info(f"[{APP_TITLE}] MTProto connection established successfully.")

                @self._client.on(events.NewMessage)
                async def on_new_message(event):
                    try:
                        msg = event.message
                        text = msg.message or ""
                        sender = await event.get_sender()
                        sender_name = getattr(sender, "username", "") or getattr(sender, "first_name", "Telegram User")
                        if sender_name and not sender_name.startswith("@"):
                            sender_name = "@" + sender_name

                        chat = await event.get_chat()
                        channel_title = getattr(chat, "title", "") or getattr(chat, "username", "Direct Chat")

                        # Download media if image is attached
                        img_bytes = None
                        if msg.photo:
                            img_bytes = await event.download_media(file=bytes)

                        def reply_sender(badge, html_text):
                            asyncio.run_coroutine_threadsafe(
                                event.reply(html_text, parse_mode="html"), self._loop
                            )

                        examine_and_ingest_telegram_message(
                            text=text,
                            author=sender_name,
                            channel=channel_title,
                            chat_id=event.chat_id,
                            message_id=msg.id,
                            image_bytes=img_bytes,
                            reply_callback=reply_sender,
                        )
                    except Exception as err:
                        logger.warning(f"Error processing MTProto incoming message: {err}")

                # Run until stop requested or disconnection
                while not self._stop_event.is_set():
                    if not self._client.is_connected():
                        break
                    await asyncio.sleep(2)

            except Exception as exc:
                _worker_state["client_ready"] = False
                _worker_state["last_error"] = f"{type(exc).__name__}: {str(exc)[:120]}"
                logger.warning(
                    f"[{APP_TITLE}] Telethon worker connection notice: {exc}. "
                    f"Retrying in {backoff}s (MuleWatch operational in fallback/simulation mode)."
                )
                await asyncio.sleep(backoff)
                backoff = min(60, backoff * 2)


# Global worker instance
_global_worker = SentinelAITelegramWorker()


def start():
    """Start the Telegram MTProto integration worker."""
    _global_worker.start()


def stop():
    """Stop the Telegram MTProto integration worker."""
    _global_worker.stop()
