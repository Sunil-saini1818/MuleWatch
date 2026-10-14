from __future__ import annotations
"""Tests for SentinelAI Telegram MTProto Worker & Real-time Examination Engine."""
import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("MW_DATA_DIR", tempfile.mkdtemp())
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import telegram_bot
from app.db import Post, SessionLocal, init_db
from app.ml import model, retrain
from app.pipeline import base_training_set


def setup_module():
    from app import config, llm
    config.GEMINI_API_KEY = ""
    config.ANTHROPIC_API_KEY = ""
    llm.GEMINI_API_KEY = ""
    llm.ANTHROPIC_API_KEY = ""
    init_db()
    if not model().trained:
        retrain(base_training_set())


def test_obfuscation_detection():
    text = "Need s@vings acc with atm c@rd kit and n0 kyc fast delivery"
    hits = telegram_bot.detect_obfuscations(text)
    assert "savings account" in hits
    assert "atm card kit" in hits
    assert "no kyc" in hits


def test_telegram_message_examination_and_ingest():
    raw_message = (
        "SBI corporate current account available. ATM card + chequebook + SIM included. "
        "KYC fully verified. Price 25k. UPI: 9829041736@ybl or ping @mule_king_jpr"
    )

    replies = []
    def callback(badge, text):
        replies.append((badge, text))

    res = telegram_bot.examine_and_ingest_telegram_message(
        text=raw_message,
        author="@mule_king_jpr",
        channel="Jaipur Direct Wire",
        message_id="77812",
        reply_callback=callback,
        use_llm=False,
    )

    assert res["ok"] is True
    assert res["risk_level"] in ("Critical", "High")
    assert res["risk_score"] >= 70
    assert "CRITICAL MULE AD DETECTED" in res["badge"] or "HIGH RISK" in res["badge"]
    assert "9829041736@ybl" in str(res["entities"].get("upi", []))
    assert "@mule_king_jpr" in str(res["entities"].get("handle", [])) or "@mule_king_jpr" in str(res["entities"].get("telegram", []))
    assert len(replies) == 1
    assert "MW-" in replies[0][1]

    # Verify database persistence
    with SessionLocal() as s:
        p = s.get(Post, res["post_id"])
        assert p is not None
        assert p.source == "telegram"
        assert p.platform == "Telegram · Jaipur Direct Wire"
        assert p.author == "@mule_king_jpr"


def test_worker_status_telemetry():
    status = telegram_bot.get_worker_status()
    assert status["enabled"] is True
    assert status["api_id"] == 21942717
    assert status["app_title"] == "SentinelAI"
    assert "MTProto" in status["protocol"]
