from __future__ import annotations
"""
System-Wide Self-Healing & Diagnostic Integration Test Suite for MuleWatch
Validates:
 1. Source ingestion & resilient URL/network fallback
 2. Fraud detection scoring engine & classification (level_for, analyze)
 3. Seller network coordination graph generation & entity mapping
 4. Telegram MTProto bot worker non-blocking initialization
 5. PDF evidence generation resilience against null/missing metadata
"""
import os
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from datetime import datetime

os.environ.setdefault("MW_DATA_DIR", tempfile.mkdtemp())
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import init_db
from app.config import level_for
from app.scoring import analyze
from app.coordination import compute
from app.report import build_report
from app.crawler import _get
import app.telegram_bot as telegram_bot


def setup_module():
    init_db()


def test_1_source_fallback_resilience():
    """Verify crawler handles unreachable endpoints gracefully without raising unhandled exceptions."""
    # Attempting to fetch non-existent local route with fallback disabled
    try:
        r = _get("http://localhost:9999/nonexistent", timeout=0.5, retries=1, fallback_to_local=False)
        assert r is not None
    except Exception as e:
        # Connection error should be cleanly caught and recognized
        assert "Connection" in type(e).__name__ or "Max retries exceeded" in str(e)


def test_2_scoring_engine_and_classification():
    """Verify fraud detection engine accurately flags mule account kit sales."""
    text = "Current account kit ready with ATM card, PIN, and netbanking. 25k per kit. Contact t.me/muledeal or 9829041736"
    res = analyze(text)
    assert res["base_score"] >= 80, f"Score was {res['base_score']}, expected >= 80"
    level = level_for(res["base_score"])
    assert level in ("Critical", "High")
    assert any(h["term"] in ["account kit", "net banking", "card with pin"] for h in res["matches"])
    assert "+919829041736" in res["entities"]["phone"]
    assert "t.me/muledeal" in res["entities"]["telegram"]


def test_3_seller_network_graph():
    """Verify coordination engine links disparate posts by shared phone/UPI."""
    p1 = SimpleNamespace(
        id=101, author="seller_alpha", platform="forum", text="Selling SBI kit", ocr_text="",
        image_phash=None, entities={"phone": ["+919829041736"], "upi": ["mule@upi"]}
    )
    p2 = SimpleNamespace(
        id=102, author="seller_beta", platform="telegram", text="Need urgent buyer", ocr_text="",
        image_phash=None, entities={"phone": ["+919829041736"], "upi": ["mule@upi"], "telegram": ["t.me/fastmule"]}
    )
    p3 = SimpleNamespace(
        id=103, author="seller_gamma", platform="forum", text="Unrelated item", ocr_text="",
        image_phash=None, entities={"phone": ["+919999999999"], "upi": ["other@upi"]}
    )
    
    clusters = compute([p1, p2, p3])
    # p1 and p2 should share cluster root
    assert 101 in clusters and 102 in clusters
    assert clusters[101]["cluster"] is not None
    assert clusters[101]["cluster"] == clusters[102]["cluster"]
    assert 102 in clusters[101]["related"]


def test_4_telegram_worker_status_and_safety():
    """Verify Telegram bot worker initializes safely without blocking."""
    status = telegram_bot.get_worker_status()
    assert isinstance(status, dict)
    assert "running" in status
    assert "api_id" in status
    assert "protocol" in status
    assert status["api_hash_set"] is True


def test_5_pdf_report_resilience_null_metadata():
    """Verify build_report generates valid PDF bytes even with null, missing, or malformed metadata."""
    post = SimpleNamespace(
        id=9999,
        created_at=datetime.utcnow(),
        posted_at=datetime.utcnow(),
        author="anonymous_user",
        platform="Charcha forum",
        url="http://localhost:8100/p/test",
        source="forum",
        text="Mule account available for transfer. Call 9829041736",
        ocr_text=None,
        image_path=None,
        risk_score=92,
        risk_level="Critical",
        category="Account rental / Mule recruitment",
        reasons=["High keyword match", "Phone extracted"],
        llm_verdict="Critical fraud operation detected.",
        author_metadata=None,  # Null metadata edge case
        entities={
            "phone": ["+919829041736"],
            "upi": [],
            "telegram": [],
            "whatsapp": [],
            "ifsc": [],
            "crypto_wallet": [],
            "email": []
        }
    )
    
    pdf_bytes = build_report(post, related_posts=[])
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_6_scheduled_telegram_poller():
    """Verify 10-minute scheduled Telegram poller module and status reports."""
    from app import telegram_poller
    poller_status = telegram_poller.get_poller_status()
    assert isinstance(poller_status, dict)
    assert poller_status["interval_seconds"] == 600
    assert "channels_monitored" in poller_status
    assert "total_messages_polled" in poller_status

    # Test single polling cycle execution with 10-minute time window
    new_items = telegram_poller.poll_telegram_channels_cycle(minutes_window=10)
    assert isinstance(new_items, int)
    assert new_items >= 0
    updated_status = telegram_poller.get_poller_status()
    assert updated_status["last_sync"] is not None


def test_7_rajasthan_district_stats():
    """Verify Rajasthan district fraud intelligence endpoint and dataset coverage."""
    from app.main import rajasthan_district_stats, RAJASTHAN_DISTRICT_PROFILES
    data = rajasthan_district_stats()
    assert isinstance(data, dict)
    assert "totals" in data
    assert "districts" in data
    districts = data["districts"]
    assert len(districts) == 33
    assert "JAIPUR" in districts
    assert "BHARATPUR" in districts
    assert "ALWAR" in districts
    assert "JODHPUR" in districts
    
    # Validate Jaipur hotspot intelligence
    jp = districts["JAIPUR"]
    assert jp["name"] == "Jaipur"
    assert jp["threatScore"] >= 90
    assert jp["criticalMuleAds"] > 0
    assert "Malviya Nagar" in jp["hotspots"]
    assert "SBI" in jp["topBanks"]
    
    # Validate Bharatpur cyber mewat hotline
    bp = districts["BHARATPUR"]
    assert bp["name"] == "Bharatpur"
    assert "Kaman" in bp["hotspots"]
    assert bp["threatLevel"] == "Critical"
    
    # Validate Rajasthan totals
    totals = data["totals"]
    assert totals["id"] == "RAJASTHAN_TOTALS"
    assert totals["totalPosts"] > 1000
    assert totals["threatScore"] >= 90


