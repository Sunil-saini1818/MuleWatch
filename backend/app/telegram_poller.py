from __future__ import annotations
"""
Scheduled Telegram Background Polling & Ingestion Worker for MuleWatch.

Runs continuously on a background thread/task loop:
  - Executes strictly every 10 minutes (configurable via TELEGRAM_POLL_INTERVAL).
  - Fetches messages from monitored Telegram channels/chats within the last 10 minutes (time-filtered).
  - Inspects text, captions, sender details, and attached images.
  - Scores via MuleWatch OCR, NLP, and LLM classification engine.
  - Computes risk score, detects obfuscated syntax, assigns threat levels.
  - Persists new cases to SQLite database, updates coordination network graph, and triggers alerts.
  - Provides health metrics and synchronization status to the Command Center and Monitored Sources page.
"""

import asyncio
import hashlib
import html
import logging
import os
import re
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

import requests

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
    TELEGRAM_POLL_INTERVAL,
    level_for,
)
from .db import Post, SessionLocal, Source
from .pipeline import ingest, recompute_all

logger = logging.getLogger("mulewatch.telegram.poller")

# Status tracking for background poller service
_poller_status: dict[str, Any] = {
    "enabled": True,
    "running": False,
    "interval_seconds": TELEGRAM_POLL_INTERVAL,
    "last_sync": None,
    "next_sync": None,
    "last_items_ingested": 0,
    "total_messages_polled": 0,
    "total_fraud_detected": 0,
    "last_error": "",
    "channels_monitored": [],
    "api_id": TELEGRAM_API_ID,
    "app_title": APP_TITLE,
}

_stop_event = threading.Event()
_poller_thread: threading.Thread | None = None


def get_poller_status() -> dict[str, Any]:
    """Return live status of the scheduled 10-minute Telegram poller."""
    status = dict(_poller_status)
    if status["running"] and status["last_sync"]:
        try:
            last_dt = datetime.fromisoformat(status["last_sync"])
            next_dt = last_dt + timedelta(seconds=status["interval_seconds"])
            status["next_sync"] = next_dt.isoformat()
        except Exception:
            pass
    return status


def _parse_iso(dt_str: str) -> datetime | None:
    if not dt_str:
        return None
    try:
        dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except Exception:
        return None


def fetch_channel_messages_web(channel: str, since_dt: datetime) -> list[dict[str, Any]]:
    """
    Fetch public Telegram channel messages via web gateway (https://t.me/s/<channel>).
    Captures messages, captions, image links, and timestamps without requiring user auth.
    """
    from .crawler import _get, UA
    clean_channel = channel.strip().lstrip("@").rstrip("/")
    if not clean_channel:
        return []

    url = f"https://t.me/s/{clean_channel}"
    try:
        r = _get(url, timeout=6.0, retries=2, fallback_to_local=False)
        if not r.ok:
            return []
    except Exception as e:
        logger.debug(f"Failed to fetch public telegram web for @{clean_channel}: {e}")
        return []

    messages = []
    # Pattern to capture message blocks
    blocks = re.findall(
        r'(<div class="tgme_widget_message [^"]*"[^>]*data-post="[^"]+".*?)(?=<div class="tgme_widget_message_wrap|\Z)',
        r.text,
        re.S,
    )
    for block in blocks:
        pm = re.search(r'data-post="([^"]+)"', block)
        if not pm:
            continue
        post_id = pm.group(1)

        # Message text / caption
        tm = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', block, re.S)
        raw_html = tm.group(1) if tm else ""
        text = html.unescape(re.sub(r"<br\s*/?>", "\n", re.sub(r"<(?!br)[^>]+>", "", raw_html))).strip()

        # Image preview link
        img_m = re.search(r"tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)", block)
        image_url = img_m.group(1) if img_m else ""

        # Post timestamp
        dt_m = re.search(r'<time datetime="([^"]+)"', block)
        msg_dt = _parse_iso(dt_m.group(1)) if dt_m else None

        # Filter strictly within the time window
        if msg_dt and msg_dt < since_dt:
            continue

        if not text and not image_url:
            continue

        messages.append({
            "post_id": post_id,
            "channel": clean_channel,
            "text": text,
            "image_url": image_url,
            "posted_at": msg_dt or datetime.utcnow(),
            "author": f"@{clean_channel}",
        })
    return messages


async def fetch_channel_messages_telethon(client: Any, channel: str, since_dt: datetime) -> list[dict[str, Any]]:
    """
    Fetch messages from Telegram channel or chat using active Telethon MTProto client session.
    """
    clean_channel = channel.strip().lstrip("@").rstrip("/")
    if not clean_channel:
        return []

    messages = []
    try:
        from telethon.tl.types import MessageMediaPhoto
        entity = await client.get_entity(clean_channel)
        async for msg in client.iter_messages(entity, limit=50):
            msg_dt = msg.date
            if msg_dt.tzinfo is not None:
                msg_dt = msg_dt.astimezone(timezone.utc).replace(tzinfo=None)
            if msg_dt < since_dt:
                break

            text = msg.message or ""
            img_bytes = None
            if msg.media and isinstance(msg.media, MessageMediaPhoto):
                try:
                    img_bytes = await client.download_media(msg, bytes)
                except Exception:
                    img_bytes = None

            sender = await msg.get_sender()
            sender_name = getattr(sender, "username", "") or getattr(sender, "first_name", clean_channel)
            if sender_name and not sender_name.startswith("@"):
                sender_name = "@" + sender_name

            messages.append({
                "post_id": f"{clean_channel}/{msg.id}",
                "channel": clean_channel,
                "text": text,
                "image_bytes": img_bytes,
                "posted_at": msg_dt,
                "author": sender_name or f"@{clean_channel}",
            })
    except Exception as exc:
        logger.debug(f"Telethon iter_messages on {channel} notice: {exc}")

    return messages


def poll_telegram_channels_cycle(minutes_window: int = 10) -> int:
    """
    Execute one polling execution cycle:
    1. Determine monitored Telegram channels from Source table and defaults.
    2. Fetch all messages received within (now - minutes_window).
    3. Pass through MuleWatch classification and coordination pipeline.
    4. Save new cases and notify Command Center.
    """
    from .telegram_bot import detect_obfuscations, normalize_obfuscated_text, build_verdict_response, _forward_alert_to_admin

    now = datetime.utcnow()
    since_dt = now - timedelta(minutes=minutes_window)
    _poller_status["last_sync"] = now.isoformat()
    _poller_status["channels_monitored"] = []

    # 1. Gather all enabled Telegram sources from DB
    target_channels = set()
    with SessionLocal() as s:
        for src in s.query(Source).filter_by(kind="telegram", enabled=True).all():
            ch = src.url.rstrip("/").split("/")[-1].lstrip("@")
            if ch:
                target_channels.add(ch)

    # Fallback to default high-risk sample channels if no custom telegram sources exist
    if not target_channels:
        target_channels = {"muledeals", "fastaccountskit", "bank_kits_india"}

    _poller_status["channels_monitored"] = sorted(target_channels)

    new_posts_count = 0
    with SessionLocal() as s:
        known_remote_ids = {
            p.remote_id for p in s.query(Post.remote_id).filter(Post.source == "telegram").all() if p.remote_id
        }

        for channel in target_channels:
            try:
                # Fetch time-filtered messages
                items = fetch_channel_messages_web(channel, since_dt)
                _poller_status["total_messages_polled"] += len(items)

                for item in items:
                    rid = item["post_id"]
                    if rid in known_remote_ids:
                        continue

                    raw_text = item["text"]
                    img_url = item.get("image_url", "")
                    saved_img = ""
                    if img_url:
                        from .crawler import _download_image
                        saved_img = _download_image(img_url, f"tg_{rid.replace('/', '_')}")

                    obfuscations = detect_obfuscations(raw_text)
                    platform_tag = f"Telegram · @{item['channel']}"
                    post_url = f"https://t.me/{rid}"

                    author_meta = {
                        "client": f"{APP_TITLE} Poller (API ID {TELEGRAM_API_ID})",
                        "channel": item["channel"],
                        "author": item["author"],
                        "post_id": rid,
                        "polled_at": now.isoformat(),
                        "obfuscations_detected": obfuscations,
                        "ingested_via": "telegram_poller",
                    }

                    post = ingest(
                        s,
                        text=raw_text,
                        platform=platform_tag[:60],
                        author=item["author"][:120],
                        url=post_url[:500],
                        image_path=saved_img,
                        posted_at=item["posted_at"],
                        source="telegram",
                        use_llm=True,
                        author_metadata=author_meta,
                        recompute=False,
                    )
                    post.remote_id = rid

                    if obfuscations:
                        post.reasons = (post.reasons or []) + [
                            f"Obfuscated mule recruitment syntax detected: {', '.join(obfuscations)}"
                        ]
                        if post.risk_score < 80:
                            boosted = min(100.0, post.risk_score + 15.0)
                            post.risk_score = boosted
                            post.risk_level = level_for(boosted)

                    s.flush()
                    known_remote_ids.add(rid)
                    new_posts_count += 1

                    if post.risk_level in ("Critical", "High"):
                        _poller_status["total_fraud_detected"] += 1
                        if TELEGRAM_CHAT_ID:
                            _, verdict_msg = build_verdict_response(post, obfuscations)
                            _forward_alert_to_admin(verdict_msg)

                # Update the corresponding Source row in the DB
                src_row = s.query(Source).filter_by(kind="telegram", url=f"https://t.me/{channel}").first()
                if not src_row:
                    src_row = s.query(Source).filter(Source.kind == "telegram", Source.url.contains(channel)).first()
                if src_row:
                    src_row.items_seen = (src_row.items_seen or 0) + len(items)
                    src_row.last_crawl = now
                    src_row.last_status = f"ok · {len(items)} messages checked (last 10m)"
                    s.commit()

            except Exception as ch_err:
                logger.warning(f"Error polling channel @{channel}: {ch_err}")
                _poller_status["last_error"] = f"{type(ch_err).__name__}: {str(ch_err)[:100]}"

        if new_posts_count:
            # Recompute coordination clusters and broadcast alerts to command center
            recompute_all(s, alert=True, push=True)
            s.commit()

    _poller_status["last_items_ingested"] = new_posts_count
    logger.info(f"Telegram polling cycle finished. Ingested {new_posts_count} new intercepts.")
    return new_posts_count


def _poller_worker_loop():
    """Background thread that executes polling strictly every TELEGRAM_POLL_INTERVAL seconds."""
    _poller_status["running"] = True
    interval = _poller_status["interval_seconds"] or 600

    # Initial cycle shortly after boot
    time.sleep(2)
    while not _stop_event.is_set():
        try:
            poll_telegram_channels_cycle(minutes_window=10)
        except Exception as e:
            _poller_status["last_error"] = f"{type(e).__name__}: {str(e)[:120]}"
            logger.warning(f"Error in Telegram poller loop: {e}")

        # Sleep in small slices to allow graceful shutdown
        slept = 0
        while slept < interval and not _stop_event.is_set():
            time.sleep(1)
            slept += 1

    _poller_status["running"] = False


def start():
    """Start the scheduled Telegram background poller thread."""
    global _poller_thread
    if _poller_thread and _poller_thread.is_alive():
        return
    _stop_event.clear()
    _poller_thread = threading.Thread(target=_poller_worker_loop, daemon=True, name="telegram-poller")
    _poller_thread.start()
    logger.info(f"[{APP_TITLE}] Scheduled Telegram 10-minute Poller Worker started.")


def stop():
    """Stop the background poller thread."""
    _stop_event.set()
    _poller_status["running"] = False
