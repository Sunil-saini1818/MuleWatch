from __future__ import annotations
"""
Comprehensive End-to-End System Audit & Integration Verification Suite.
Directly tests all core endpoint functions, state transitions, QR decoding,
OCR resilience, Cyber Cell dispatch, and Telegram manual sync.
"""
import asyncio
import io
import os
import sys
from pathlib import Path
import pytest
from PIL import Image
import qrcode
from fastapi import UploadFile

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db import init_db, SessionLocal, Post
from app.main import (
    stats,
    state_stats,
    rajasthan_district_stats,
    telegram_status,
    telegram_poller_status,
    telegram_manual_sync,
    telegram_poll_now,
    platforms_stats,
    analyze_endpoint,
    analyze_qr,
    update_case_status,
    get_dispatch_queue,
    dispatch_i4c,
    dispatch_bank_lien,
    graph,
    sources,
    report,
)
from app.pipeline import ingest


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_db()


def test_e2e_01_core_stats_and_overview():
    """Verify general statistics and telemetry endpoints."""
    st = stats()
    assert isinstance(st, dict)
    assert "total" in st
    assert "critical" in st

    s_data = state_stats()
    assert "national" in s_data
    assert "states" in s_data
    assert "RJ" in s_data["states"]

    r_data = rajasthan_district_stats()
    assert "totals" in r_data
    assert "districts" in r_data
    assert len(r_data["districts"]) == 33
    assert "JAIPUR" in r_data["districts"]
    assert "BHARATPUR" in r_data["districts"]


def test_e2e_02_telegram_dual_mode_and_manual_sync():
    """Verify Telegram status, poller, and manual-sync endpoints."""
    # 1. Status
    st_data = telegram_status()
    assert isinstance(st_data, dict)
    assert "api_id" in st_data

    # 2. Poller status
    p_data = telegram_poller_status()
    assert isinstance(p_data, dict)

    # 3. Manual sync
    sync_data = telegram_manual_sync(minutes=10)
    assert sync_data["ok"] is True
    assert sync_data["api_id"] == "21942717"
    assert "new_cases" in sync_data

    # 4. Backward compatible poll-now
    poll_now_data = telegram_poll_now(minutes=10)
    assert poll_now_data["ok"] is True


def test_e2e_03_linked_platforms_stats():
    """Verify platform breakdown telemetry endpoint."""
    p_data = platforms_stats()
    assert "platforms" in p_data
    platforms = {p["platform_id"]: p for p in p_data["platforms"]}
    assert "telegram" in platforms
    assert "charcha" in platforms
    assert platforms["telegram"]["meta"]["api_id"] == "21942717"


@pytest.mark.anyio
async def test_e2e_04_multi_input_analyzer_text():
    """Verify multi-input analyzer on raw text."""
    text = "SBI Current account full kit for sale with netbanking ATM card and SIM. 20k per kit. WhatsApp 9829041736"
    res = await analyze_endpoint(
        text=text,
        platform="Manual audit",
        save=False,
    )
    assert res["risk_score"] >= 80
    assert res["risk_level"] in ("Critical", "High")
    assert "+919829041736" in res["entities"]["phone"]


@pytest.mark.anyio
async def test_e2e_05_multi_input_analyzer_qr_code():
    """Verify QR code decoding and financial intelligence extraction."""
    upi_payload = "upi://pay?pa=cyber_mule@okhdfcbank&pn=CashOutFast&am=20000&cu=INR"
    qr_img = qrcode.make(upi_payload)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    upload_file = UploadFile(filename="test_mule_qr.png", file=buf)
    res_data = await analyze_qr(image=upload_file, save=False)
    assert res_data["risk_score"] >= 60
    assert "qr_metadata" in res_data
    qr_meta = res_data["qr_metadata"]
    assert qr_meta["detected"] is True
    assert any("cyber_mule@okhdfcbank" in p for p in qr_meta["payloads"])
    assert "cyber_mule@okhdfcbank" in res_data["entities"]["upi"]


def test_e2e_06_cyber_cell_dispatch_and_reversal():
    """Verify case enforcement workflow, dispatch queue, PDF report, and reversal."""
    # 1. Ingest a sample case
    with SessionLocal() as s:
        p = ingest(
            s,
            text="HDFC Current account with ATM card, passbook, and SIM. Ready for crypto P2P. Contact t.me/muledeal or 9829041736 UPI testmule@okhdfc",
            platform="Telegram · @mule_deals",
            author="syndicate_leader",
            url="https://t.me/mule_deals/101",
            source="telegram",
            recompute=False,
        )
        s.commit()
        pid = p.id

    # 2. Confirm Fraud -> move to confirmed_enforcement
    res_confirm = update_case_status(pid, {"status": "confirmed_enforcement"})
    assert res_confirm["status"] == "confirmed_enforcement"

    # 3. Verify in dispatch queue
    res_queue = get_dispatch_queue()
    q_items = [item["id"] for item in res_queue["items"]]
    assert pid in q_items

    # 4. Dispatch to I4C
    res_i4c = dispatch_i4c(case_id=pid)
    assert res_i4c["success"] is True
    assert res_i4c["ack_id"].startswith("I4C-2026-")

    # 5. Dispatch Bank Lien
    res_lien = dispatch_bank_lien(case_id=pid, bank="HDFC Nodal Gateway", target_account="testmule@okhdfc")
    assert res_lien["success"] is True
    assert res_lien["lien_id"].startswith("LIEN-HDFC-")

    # 6. Verify PDF evidence report generation
    res_pdf = report(pid)
    assert res_pdf.media_type == "application/pdf"
    assert len(res_pdf.body) > 1000

    # 7. Safety Reversal: Revert to draft review
    res_revert = update_case_status(pid, {"status": "flagged_review"})
    assert res_revert["status"] == "flagged_review"

    # 8. Verify completely removed from dispatch queue
    res_queue_after = get_dispatch_queue()
    q_items_after = [item["id"] for item in res_queue_after["items"]]
    assert pid not in q_items_after


def test_e2e_07_graph_and_sources_endpoints():
    """Verify network graph and crawler sources endpoints."""
    g_data = graph(min_score=30)
    assert "nodes" in g_data
    assert "edges" in g_data

    s_data = sources()
    assert "sources" in s_data
    assert "crawler" in s_data
    assert "telegram_poller" in s_data
