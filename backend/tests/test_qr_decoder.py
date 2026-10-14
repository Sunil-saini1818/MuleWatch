import io
from pathlib import Path
import pytest
import qrcode
from PIL import Image

from app.qr_decoder import decode_qr_from_image, parse_qr_payload_intelligence
from app.db import SessionLocal, Post, init_db
from app.pipeline import ingest
from app.config import MEDIA_DIR
from app.report import build_report


@pytest.fixture(scope="module")
def setup_db():
    init_db()


def test_parse_qr_payload_intelligence_upi():
    raw = "upi://pay?pa=cyberfraud@okaxis&pn=QuickCash&am=25000&cu=INR"
    intel = parse_qr_payload_intelligence(raw)
    assert intel["type"] == "upi_intent"
    assert intel["upi_id"] == "cyberfraud@okaxis"
    assert intel["payee_name"] == "QuickCash"
    assert intel["amount"] == "25000"
    assert intel["is_fraud_indicator"] is True


def test_parse_qr_payload_intelligence_crypto():
    raw = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"
    intel = parse_qr_payload_intelligence(raw)
    assert intel["type"] == "crypto_wallet"
    assert intel["crypto_wallet"] == raw
    assert intel["is_fraud_indicator"] is True


def test_parse_qr_payload_intelligence_url():
    raw = "https://t.me/joinchat/mule_accounts_group"
    intel = parse_qr_payload_intelligence(raw)
    assert intel["type"] == "url"
    assert intel["url"] == raw
    assert "Telegram" in intel["category"]
    assert intel["is_fraud_indicator"] is True


def test_decode_qr_from_generated_image(tmp_path):
    upi_payload = "upi://pay?pa=mule77@okaxis&pn=FastTransfer&am=15000"
    qr_img = qrcode.make(upi_payload)
    img_path = tmp_path / "test_qr.png"
    qr_img.save(str(img_path))

    res = decode_qr_from_image(str(img_path))
    assert res["detected"] is True
    assert len(res["payloads"]) >= 1
    assert any("mule77@okaxis" in p for p in res["payloads"])
    assert "mule77@okaxis" in res["extracted_entities"]["upi"]


def test_decode_qr_blank_image(tmp_path):
    blank = Image.new("RGB", (200, 200), color="white")
    blank_path = tmp_path / "blank.png"
    blank.save(str(blank_path))

    res = decode_qr_from_image(str(blank_path))
    assert res["detected"] is False
    assert res["payloads"] == []
    assert res["extracted_entities"]["upi"] == []


def test_pipeline_ingest_with_qr_code(setup_db, tmp_path):
    upi_payload = "upi://pay?pa=moneymule99@icici&pn=MuleAgent&am=50000"
    qr_img = qrcode.make(upi_payload)
    filename = "test_pipeline_qr.png"
    file_path = MEDIA_DIR / filename
    qr_img.save(str(file_path))
    post_id = None

    try:
        with SessionLocal() as s:
            post = ingest(
                s,
                text="Urgent payout contact us for direct transfer",
                platform="Charcha",
                author="qr_seller",
                image_path=filename,
                recompute=False
            )
            s.commit()
            post_id = post.id

            assert post.qr_metadata.get("detected") is True
            assert "moneymule99@icici" in post.entities.get("upi", [])
            assert post.risk_score >= 95.0
            assert post.risk_level == "Critical"
            assert any("Hidden QR code decoded" in r for r in post.reasons)

            # Test PDF Report Generation with embedded QR metadata
            pdf_bytes = build_report(post, [])
            assert len(pdf_bytes) > 1000
            assert b"%PDF" in pdf_bytes[:10]
    finally:
        if post_id:
            with SessionLocal() as s:
                p = s.get(Post, post_id)
                if p:
                    s.delete(p)
                    s.commit()
        if file_path.exists():
            file_path.unlink()


def test_analyze_qr_endpoint_preview_mode(setup_db, tmp_path):
    import asyncio
    from starlette.datastructures import UploadFile
    from app.main import analyze_qr

    upi_payload = "upi://pay?pa=seller99@axisbank&pn=FraudMerchant&am=10000"
    qr_img = qrcode.make(upi_payload)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    upload = UploadFile(filename="test_qr.png", file=buf)
    res = asyncio.run(analyze_qr(image=upload, save=False))

    assert res["success"] is True
    assert res["qr_metadata"]["detected"] is True
    assert "seller99@axisbank" in res["qr_metadata"]["extracted_entities"]["upi"]
    assert res["risk_score"] >= 95.0
    assert res["risk_level"] == "Critical"
    assert res["id"] is None  # preview mode, not saved in cases


def test_analyze_qr_endpoint_save_mode(setup_db, tmp_path):
    import asyncio
    from starlette.datastructures import UploadFile
    from app.main import analyze_qr

    crypto_payload = "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb"
    qr_img = qrcode.make(crypto_payload)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    upload = UploadFile(filename="crypto_qr.png", file=buf)
    res = asyncio.run(analyze_qr(image=upload, save=True))

    assert res["success"] is True
    assert res["qr_metadata"]["detected"] is True
    assert res["id"] is not None  # saved as case

    saved_id = res["id"]
    try:
        with SessionLocal() as s:
            p = s.get(Post, saved_id)
            assert p is not None
            assert p.risk_level == "Critical"
            assert crypto_payload in (p.entities.get("crypto_wallet") or [])
    finally:
        with SessionLocal() as s:
            p = s.get(Post, saved_id)
            if p:
                s.delete(p)
                s.commit()


def test_analyze_qr_endpoint_no_qr_found(setup_db, tmp_path):
    import asyncio
    from starlette.datastructures import UploadFile
    from app.main import analyze_qr

    blank = Image.new("RGB", (200, 200), color="white")
    buf = io.BytesIO()
    blank.save(buf, format="PNG")
    buf.seek(0)

    upload = UploadFile(filename="blank.png", file=buf)
    res = asyncio.run(analyze_qr(image=upload, save=False))

    # Should return JSONResponse with 422
    assert res.status_code == 422
    import json
    data = json.loads(res.body.decode("utf-8"))
    assert data["success"] is False
    assert "No valid QR code found" in data["message"]


