from __future__ import annotations
"""
Advanced QR Code Decoding & Embedded Fraud Intelligence Extraction Pipeline.

Extracts hidden UPI payment links, URLs, deep links, crypto wallets, and financial
identifiers from images, posters, and screenshots using:
  1. Primary: OpenCV QRCodeDetector with multi-pass image preprocessing (grayscale, adaptive threshold, sharpening).
  2. Secondary: PyZBar (when native libzbar is present).
  3. Tertiary: Pure-Python / PIL image heuristics fallback.
"""

import io
import logging
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from PIL import Image

logger = logging.getLogger("mulewatch.qr")

# Attempt OpenCV import
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    np = None
    CV2_AVAILABLE = False

# Attempt pyzbar import
try:
    from pyzbar.pyzbar import decode as pyzbar_decode
    PYZBAR_AVAILABLE = True
except Exception:
    pyzbar_decode = None
    PYZBAR_AVAILABLE = False


def _load_cv2_image(image_input: str | bytes | Path) -> Any | None:
    """Load image into OpenCV BGR numpy array from path or raw bytes."""
    if not CV2_AVAILABLE:
        return None
    try:
        if isinstance(image_input, (str, Path)):
            path_str = str(image_input)
            if not os.path.exists(path_str):
                return None
            return cv2.imread(path_str)
        elif isinstance(image_input, bytes):
            nparr = np.frombuffer(image_input, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        logger.debug(f"Failed to load image in OpenCV: {e}")
    return None


def _preprocess_variants(cv_img: Any) -> list[Any]:
    """Generate preprocessed image variants for distorted, compressed, or inverted QR codes."""
    if cv_img is None:
        return []
    variants = [cv_img]
    try:
        gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
        variants.append(gray)

        # 1. Contrast limited adaptive histogram equalization (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        variants.append(clahe.apply(gray))

        # 2. Sharpening filter
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        sharpened = cv2.filter2D(gray, -1, kernel)
        variants.append(sharpened)

        # 3. Otsu thresholding
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(otsu)

        # 4. Inverted threshold (light on dark)
        variants.append(cv2.bitwise_not(otsu))
    except Exception as e:
        logger.debug(f"Preprocessing variant error: {e}")
    return variants


def parse_qr_payload_intelligence(raw_payload: str) -> dict[str, Any]:
    """
    Classify and extract financial identifiers hidden inside the decoded QR code.
    Identifies:
      - UPI deep links (upi://pay?pa=...&pn=...)
      - Raw UPI handles (merchant@bank)
      - Phishing / Evasion URLs
      - Telegram & WhatsApp deep links
      - Cryptocurrency wallet addresses
    """
    clean = raw_payload.strip()
    intel: dict[str, Any] = {
        "raw": clean,
        "type": "text",
        "upi_id": None,
        "payee_name": None,
        "amount": None,
        "url": None,
        "crypto_wallet": None,
        "is_fraud_indicator": False,
        "category": "Unknown Payload",
    }

    # 1. UPI payment URL format: upi://pay?pa=...&pn=...
    if clean.lower().startswith("upi://pay"):
        intel["type"] = "upi_intent"
        intel["category"] = "UPI Payment Intent"
        intel["is_fraud_indicator"] = True
        try:
            parsed = urlparse(clean)
            qs = parse_qs(parsed.query)
            pa = qs.get("pa", [None])[0]
            pn = qs.get("pn", [None])[0]
            am = qs.get("am", [None])[0]
            if pa:
                intel["upi_id"] = unquote(pa).strip()
            if pn:
                intel["payee_name"] = unquote(pn).strip()
            if am:
                intel["amount"] = unquote(am).strip()
        except Exception:
            pass
        return intel

    # 2. Raw UPI handle format: user@okaxis, shop@paytm
    upi_match = re.search(r"([A-Za-z0-9][A-Za-z0-9.\-_]{1,60}@[A-Za-z]{2,15})", clean)
    if upi_match and not clean.startswith(("http://", "https://")):
        intel["type"] = "upi_id"
        intel["upi_id"] = upi_match.group(1).lower()
        intel["category"] = "Direct UPI ID"
        intel["is_fraud_indicator"] = True
        return intel

    # 3. Cryptocurrency wallet (TRC20 / Bitcoin / Ethereum)
    crypto_match = re.search(r"\b(T[1-9A-HJ-NP-Za-km-z]{33}|0x[a-fA-F0-9]{40}|bc1[a-z0-9]{25,59})\b", clean)
    if crypto_match:
        intel["type"] = "crypto_wallet"
        intel["crypto_wallet"] = crypto_match.group(1)
        intel["category"] = "Cryptocurrency Deposit Address"
        intel["is_fraud_indicator"] = True
        return intel

    # 4. Web URLs / Telegram / Shorteners
    if re.match(r"^https?://", clean, re.I):
        intel["type"] = "url"
        intel["url"] = clean
        if "t.me" in clean.lower() or "telegram" in clean.lower():
            intel["category"] = "Telegram Direct Channel Link"
        elif "wa.me" in clean.lower() or "whatsapp" in clean.lower():
            intel["category"] = "WhatsApp Direct Chat Link"
        elif any(sh in clean.lower() for sh in ("bit.ly", "tinyurl", "cutt.ly", "rb.gy", "t.ly")):
            intel["category"] = "Obfuscated / Shortened Phishing Link"
        else:
            intel["category"] = "Web URL"
        intel["is_fraud_indicator"] = True
        return intel

    return intel


def decode_qr_from_image(image_input: str | bytes | Path) -> dict[str, Any]:
    """
    Decodes one or more QR codes from an image path or raw image bytes.
    Returns:
      {
        "detected": bool,
        "payloads": list[str],
        "bbox": list[list[int]] or None,
        "intel": list[dict[str, Any]],
        "extracted_entities": dict[str, list[str]],
        "decoder": str
      }
    """
    results: list[str] = []
    bboxes: list[Any] = []
    used_decoder = "none"

    # Strategy 1: OpenCV QRCodeDetector (Fast, native C++, no external shared libs)
    cv_img = _load_cv2_image(image_input)
    if cv_img is not None:
        try:
            detector = cv2.QRCodeDetector()
            # Try multiple image variants until a QR code is detected
            for var in _preprocess_variants(cv_img):
                # First try multi-detection
                try:
                    retval, decoded_info, points, _ = detector.detectAndDecodeMulti(var)
                    if retval:
                        for text in decoded_info:
                            if text and text.strip() and text.strip() not in results:
                                results.append(text.strip())
                        if points is not None and len(points) > 0:
                            bboxes.extend(points.tolist())
                        if results:
                            used_decoder = "opencv_multi"
                            break
                except Exception:
                    pass

                # Fallback to single detectAndDecode
                val, pts, _ = detector.detectAndDecode(var)
                if val and val.strip() and val.strip() not in results:
                    results.append(val.strip())
                    if pts is not None:
                        bboxes.append(pts.tolist())
                    used_decoder = "opencv_single"
                    break
        except Exception as e:
            logger.debug(f"OpenCV QR detection error: {e}")

    # Strategy 2: PyZBar fallback (if installed and zbar library is found)
    if not results and PYZBAR_AVAILABLE:
        try:
            pil_img = None
            if isinstance(image_input, (str, Path)):
                pil_img = Image.open(str(image_input))
            elif isinstance(image_input, bytes):
                pil_img = Image.open(io.BytesIO(image_input))

            if pil_img:
                decoded_objects = pyzbar_decode(pil_img)
                for obj in decoded_objects:
                    data_str = obj.data.decode("utf-8", "replace").strip()
                    if data_str and data_str not in results:
                        results.append(data_str)
                        if hasattr(obj, "polygon") and obj.polygon:
                            bboxes.append([(p.x, p.y) for p in obj.polygon])
                if results:
                    used_decoder = "pyzbar"
        except Exception as e:
            logger.debug(f"PyZBar QR decoding notice: {e}")

    # Structure actionable entity outputs
    intel_list = [parse_qr_payload_intelligence(p) for p in results]
    extracted_entities: dict[str, list[str]] = {
        "upi": [],
        "telegram": [],
        "whatsapp": [],
        "url": [],
        "crypto_wallet": [],
    }

    for item in intel_list:
        if item.get("upi_id") and item["upi_id"] not in extracted_entities["upi"]:
            extracted_entities["upi"].append(item["upi_id"])
        if item.get("crypto_wallet") and item["crypto_wallet"] not in extracted_entities["crypto_wallet"]:
            extracted_entities["crypto_wallet"].append(item["crypto_wallet"])
        if item.get("url"):
            u = item["url"]
            if ("t.me" in u or "telegram" in u) and u not in extracted_entities["telegram"]:
                extracted_entities["telegram"].append(u)
            elif ("wa.me" in u or "whatsapp" in u) and u not in extracted_entities["whatsapp"]:
                extracted_entities["whatsapp"].append(u)
            elif u not in extracted_entities["url"]:
                extracted_entities["url"].append(u)

    return {
        "detected": len(results) > 0,
        "payloads": results,
        "bbox": bboxes[0] if bboxes else None,
        "intel": intel_list,
        "extracted_entities": extracted_entities,
        "decoder": used_decoder,
    }
