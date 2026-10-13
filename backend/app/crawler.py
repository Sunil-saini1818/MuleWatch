"""Real-time collectors for publicly available content.

* ForumCrawler   — crawls a public forum's /new page and each post page, reading the
                   schema.org DiscussionForumPosting JSON-LD (the same structured data real
                   sites publish for search engines) and downloading attached images.
* TelegramPublic — reads public channel previews at https://t.me/s/<channel> (no login/API).

A background thread polls every enabled source every CRAWL_INTERVAL seconds."""
import html
import json
import os
import re
import threading
import time
import traceback
from datetime import datetime
from urllib.parse import urljoin

import requests

from .config import MEDIA_DIR
from .db import Post, SessionLocal, Source
from .pipeline import ingest

CRAWL_INTERVAL = float(os.getenv("CRAWL_INTERVAL", "3"))
FORUM_URL = os.getenv("FORUM_URL", "http://localhost:8100")
MOD_TOKEN = os.getenv("FORUM_MOD_TOKEN", "cybercell-demo")
UA = {"User-Agent": "MuleWatch-Crawler/1.0 (+research; hackathon demo)"}
MAX_IMAGE = 6 * 1024 * 1024

_status = {"running": False, "last_cycle": None, "new_last_cycle": 0, "errors": 0}


def status():
    return dict(_status)


def _get(url, **kw):
    return requests.get(url, headers=UA, timeout=8, **kw)


def _download_image(url: str, name: str) -> str:
    try:
        r = _get(url, stream=True)
        if not r.ok or not r.headers.get("content-type", "").startswith("image/"):
            return ""
        ext = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "image/gif": ".gif"}.get(
            r.headers["content-type"].split(";")[0], ".img")
        data = b""
        for chunk in r.iter_content(65536):
            data += chunk
            if len(data) > MAX_IMAGE:
                return ""
        path = MEDIA_DIR / f"{name}{ext}"
        path.write_bytes(data)
        return path.name
    except requests.RequestException:
        return ""


def _parse_dt(s: str) -> datetime | None:
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
    except (ValueError, AttributeError):
        return None


# ----------------------------------------------------------------------------- forum

def crawl_forum(session, src: Source) -> int:
    base = src.url.rstrip("/")
    listing = _get(base + "/new")
    listing.raise_for_status()
    ids = sorted({int(x) for x in re.findall(r'href="/p/(\d+)"', listing.text)})
    known = {p.remote_id for p in session.query(Post.remote_id).filter(Post.source == "forum").all()}
    new = 0
    for pid in ids:
        rid = f"{base}#{pid}"
        if rid in known:
            continue
        page = _get(f"{base}/p/{pid}")
        if not page.ok:
            continue
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', page.text, re.S)
        if not m:
            continue
        d = json.loads(m.group(1))
        title, body = d.get("headline", ""), d.get("text", "")
        link = d.get("sharedContent", {}).get("url", "") if isinstance(d.get("sharedContent"), dict) else ""
        text = "\n".join(x for x in (title, body, link) if x)
        image = ""
        if d.get("image"):
            image = _download_image(urljoin(base + "/", d["image"]), f"forum_{pid}")
        author = (d.get("author") or {}).get("name", "")
        community = d.get("isPartOf", {}).get("name", "") if isinstance(d.get("isPartOf"), dict) else ""
        p = ingest(session, text=text, platform="Charcha forum" + (f" · {community}" if community else ""),
               author=author, url=f"{base}/p/{pid}", image_path=image,
               posted_at=_parse_dt(d.get("datePublished", "")), source="forum", recompute=False)
        p.remote_id = rid
        new += 1
    return new


# ----------------------------------------------------------------------------- telegram

def crawl_telegram(session, src: Source) -> int:
    channel = src.url.rstrip("/").split("/")[-1].lstrip("@")
    r = _get(f"https://t.me/s/{channel}")
    r.raise_for_status()
    known = {p.remote_id for p in session.query(Post.remote_id).filter(Post.source == "telegram").all()}
    new = 0
    for block in re.findall(r'(<div class="tgme_widget_message [^"]*"[^>]*data-post="[^"]+".*?)(?=<div class="tgme_widget_message_wrap|\Z)',
                            r.text, re.S):
        post_id = re.search(r'data-post="([^"]+)"', block).group(1)
        if post_id in known:
            continue
        tm = re.search(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', block, re.S)
        text = html.unescape(re.sub(r"<br\s*/?>", "\n", re.sub(r"<(?!br)[^>]+>", "", tm.group(1)))) if tm else ""
        img = re.search(r"tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)", block)
        image = _download_image(img.group(1), "tg_" + post_id.replace("/", "_")) if img else ""
        dt = re.search(r'<time datetime="([^"]+)"', block)
        if not text and not image:
            continue
        p = ingest(session, text=text, platform="Telegram", author="@" + channel, url=f"https://t.me/{post_id}",
               image_path=image, posted_at=_parse_dt(dt.group(1)) if dt else None, source="telegram", recompute=False)
        p.remote_id = post_id
        new += 1
    return new


CRAWLERS = {"forum": crawl_forum, "telegram": crawl_telegram}


def crawl_once() -> int:
    from .pipeline import recompute_all
    total = 0
    with SessionLocal() as s:
        for src in s.query(Source).filter_by(enabled=True).all():
            try:
                n = CRAWLERS[src.kind](s, src)
                src.items_seen += n
                src.last_status = f"ok · {n} new" if n else "ok"
                total += n
            except Exception as e:
                src.last_status = f"error: {type(e).__name__}: {str(e)[:120]}"
                _status["errors"] += 1
            src.last_crawl = datetime.utcnow()
            s.commit()
        if total:
            recompute_all(s, alert=True)
    _status["last_cycle"] = datetime.utcnow().isoformat()
    _status["new_last_cycle"] = total
    return total


def _loop():
    _status["running"] = True
    while _status["running"]:
        try:
            crawl_once()
        except Exception:
            traceback.print_exc()
        time.sleep(CRAWL_INTERVAL)


def start():
    if not _status["running"]:
        threading.Thread(target=_loop, daemon=True, name="crawler").start()


def ensure_default_sources():
    with SessionLocal() as s:
        if not s.query(Source).filter_by(kind="forum").first():
            s.add(Source(kind="forum", name="Charcha public forum", url=FORUM_URL))
            s.commit()


def request_takedown(post: Post) -> tuple[bool, str]:
    if post.source != "forum" or "#" not in (post.remote_id or ""):
        return False, "Takedown API is only wired for the Charcha forum in this demo."
    base, pid = post.remote_id.split("#", 1)
    try:
        r = requests.post(f"{base}/api/moderation/flag/{pid}", headers={"X-Mod-Token": MOD_TOKEN, **UA},
                          json={"case": f"MW-{post.id:05d}", "reason": post.category}, timeout=6)
        return r.ok, r.text[:200]
    except requests.RequestException as e:
        return False, str(e)
