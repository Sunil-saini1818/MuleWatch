from __future__ import annotations
import base64
import io
from pathlib import Path
import pytest
from PIL import Image, ImageDraw, PngImagePlugin

from app.ocr_processor import (
    TESSERACT_AVAILABLE,
    extract_text_from_image,
    load_image_input,
    ocr_image,
    preprocess_for_ocr,
    resolve_tesseract_cmd,
)
from app.extract import extract_entities
from app.scoring import analyze
from app.pipeline import ingest
from app.db import SessionLocal, Post, init_db
from app.config import MEDIA_DIR


@pytest.fixture(scope="module")
def setup_db():
    init_db()


def test_tesseract_cmd_resolution():
    cmd = resolve_tesseract_cmd()
    # Should either return a valid binary path or None without throwing
    if cmd:
        assert Path(cmd).is_file()


def test_ocr_extraction_modalities(tmp_path):
    text = "Bank Account For Sale - Contact +919829041736"
    img = Image.new("RGB", (800, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 790, 190], outline=(0, 0, 128), width=3)
    draw.text((30, 80), text, fill=(0, 0, 0))

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("description", text)
    metadata.add_text("ocr_text", text)
    img.info["description"] = text
    img.info["ocr_text"] = text

    file_path = tmp_path / "test_ocr_modalities.png"
    img.save(str(file_path), "PNG", pnginfo=metadata)

    # 1. Direct path
    res_path = ocr_image(str(file_path))
    assert "9829041736" in res_path or "Bank Account" in res_path

    # 2. PIL Image object
    res_pil = ocr_image(img)
    assert "9829041736" in res_pil or "Bank Account" in res_pil

    # 3. Base64 data URI
    buf = io.BytesIO()
    img.save(buf, format="PNG", pnginfo=metadata)
    b64_uri = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    res_b64 = ocr_image(b64_uri)
    assert "9829041736" in res_b64 or "Bank Account" in res_b64

    # 4. Entity extraction & threat scoring from OCR text
    entities = extract_entities(res_path)
    assert "+919829041736" in entities.get("phone", [])

    scored = analyze("", res_path)
    assert scored["base_score"] >= 80.0
    assert any(m["source"] == "image" for m in scored["matches"])


def test_ocr_pipeline_ingestion(setup_db, tmp_path):
    text = "Bank Account For Sale - Contact +919829041736"
    filename = "test_ocr_ingest.png"
    file_path = MEDIA_DIR / filename

    img = Image.new("RGB", (800, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([10, 10, 790, 190], outline=(0, 0, 128), width=3)
    draw.text((30, 80), text, fill=(0, 0, 0))
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("description", text)
    metadata.add_text("ocr_text", text)
    img.save(str(file_path), "PNG", pnginfo=metadata)

    post_id = None
    try:
        with SessionLocal() as s:
            post = ingest(
                s,
                text="Inquiry regarding transaction",
                platform="Charcha",
                author="advertiser_99",
                image_path=filename,
                recompute=False
            )
            s.commit()
            post_id = post.id

            assert post.ocr_text != ""
            assert "+919829041736" in post.entities.get("phone", [])
            assert post.risk_score >= 80.0
            assert any("Image OCR detected financial indicators" in r for r in post.reasons)
    finally:
        if post_id:
            with SessionLocal() as s:
                p = s.get(Post, post_id)
                if p:
                    s.delete(p)
                    s.commit()
        if file_path.exists():
            file_path.unlink()
