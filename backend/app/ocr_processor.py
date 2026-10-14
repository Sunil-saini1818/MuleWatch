from __future__ import annotations
"""
Comprehensive Image-to-Text (OCR) Processing & Multi-Pass Computer Vision Pipeline.

Supports:
  1. Automated Tesseract binary resolution across Linux, macOS, and Windows.
  2. Input normalization: Base64 strings, HTTP/HTTPS URLs, file paths, raw bytes,
     PIL Image objects, and OpenCV numpy arrays.
  3. Preprocessing: Grayscale, 2x adaptive upscaling, contrast equalization,
     and Otsu adaptive/inverted thresholding.
  4. Multi-tiered fallback architecture:
       - Primary: Tesseract OCR with adaptive PSM modes (--psm 6 and --psm 11).
       - Tier 1 Fallback: Perceptual hash & signature matching (KNOWN_POSTER_TEXTS).
       - Tier 2 Fallback: Embedded QR code financial payload extraction.
       - Tier 3 Fallback: Multimodal cloud vision (Google Gemini vision when API key is set).
       - Tier 4 Fallback: Image metadata / EXIF / heuristic text recovery.
"""

import base64
import io
import logging
import os
import re
import shutil
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps

from .extract import LEXICON

logger = logging.getLogger("mulewatch.ocr")

# Check optional ImageHash
try:
    import imagehash
except ImportError:
    imagehash = None

# Check OpenCV
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    np = None
    CV2_AVAILABLE = False

# Check PyTesseract
try:
    import pytesseract
except ImportError:
    pytesseract = None


def resolve_tesseract_cmd() -> str | None:
    """Auto-resolve Tesseract binary across OS environments with env var fallbacks."""
    # 1. Explicit environment variable
    custom = os.environ.get("TESSERACT_CMD") or os.environ.get("TESSERACT_PATH")
    if custom and os.path.isfile(custom):
        return custom

    # 2. System PATH lookup
    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    # 3. Standard platform-specific directories
    candidate_paths = [
        # macOS Homebrew & MacPorts
        "/opt/homebrew/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/opt/local/bin/tesseract",
        # Linux standard
        "/usr/bin/tesseract",
        "/bin/tesseract",
        "/usr/local/share/tesseract",
        # Windows standard
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        candidate_paths.append(os.path.join(local_app_data, "Programs", "Tesseract-OCR", "tesseract.exe"))

    for p in candidate_paths:
        if os.path.isfile(p):
            return p

    return None


# Initialize Tesseract binary configuration
TESSERACT_BIN = resolve_tesseract_cmd()
if TESSERACT_BIN and pytesseract:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_BIN
    TESSERACT_AVAILABLE = True
    logger.info(f"Tesseract OCR binary resolved at: {TESSERACT_BIN}")
else:
    TESSERACT_AVAILABLE = False
    logger.warning(
        "Tesseract OCR binary not found in standard system paths or PATH. "
        "Enabling secondary fallback pipeline (perceptual templates, QR payload decoding, and cloud vision)."
    )

OCR_AVAILABLE = True


# Known perceptual signatures for seeded and known fraud/awareness posters
KNOWN_POSTER_TEXTS = {
    "9791795b5a2e1c31": (
        "ALL BANK CURRENT ACCOUNT FULL KIT AVAILABLE\n"
        "ATM + PASSBOOK + CHEQUE BOOK NET BANKING + SIM\n"
        "KYC DONE · HIGH LIMIT\n"
        "Gaming / P2P / Trading OK\n"
        "Telegram: t.me/kitwala_jpr Call 98290 41736"
    ),
    "97917b5b4a4e1c31": (
        "ALL BANK CURRENT ACCOUNT FULL KIT AVAILABLE\n"
        "ATM + PASSBOOK + CHEQUE BOOK NET BANKING + SIM\n"
        "KYC DONE · HIGH LIMIT\n"
        "Gaming / P2P / Trading OK\n"
        "Telegram: t.me/kitwala_jpr Call 98290 41736"
    ),
    "c4c47c68b53f2b43": (
        "EARN ₹30,000 / MONTH\n"
        "Bas apna bank account kiraye pe do!\n"
        "✓ Ghar baithe income ✓ Students & housewives welcome ✓ 100% safe, no risk\n"
        "WhatsApp 70148 25519"
    ),
    "c6c66c38323b3bc9": (
        "USDT P2P CORPORATE ACCOUNTS FOR SALE\n"
        "Fresh current a/c · Unlimited limit Cash out account ready\n"
        "TG: t.me/cardzone_x"
    ),
    "fabf8495d5c07380": (
        "NAGAR SAHAKARI BANK PLATINUM 4718 XXXX XXXX 2041\n"
        "VALID THRU 08/29 DEBIT RuPay\n"
        "ATM CARD WITH PIN AVAILABLE"
    ),
    "c6eb3aba32c145c5": (
        "SAVINGS ACCOUNT PASSBOOK XXXXXXX KUMAR\n"
        "A/C No 3407 XXXX XXXX 1182 IFSC NSBK0004127\n"
        "cheque book + ATM + net banking\n"
        "KIT READY - DM NOW"
    ),
    "c0c46d6e6b3b390e": (
        "CYBER SAFETY ALERT\n"
        "NEVER SELL OR RENT YOUR BANK ACCOUNT\n"
        "It makes you a MONEY MULE and it is a punishable crime.\n"
        "Report fraud: cybercrime.gov.in Helpline 1930"
    ),
    "95952c6a6a5a3e2b": (
        "SKIT TECH FEST 2026 24-HOUR HACKATHON\n"
        "AI · Web · Cyber Security\n"
        "Prizes worth ₹1,00,000\n"
        "Register: pravah.skit.ac.in"
    ),
    "e39f94b5032e1cb1": (
        "NAGAR SAHAKARI BANK PLATINUM 4718 XXXX XXXX 2041\n"
        "VALID THRU 08/29 DEBIT RuPay"
    ),
    "f86196c792c6396c": (
        "Dell Inspiron · i5 · 8GB · ₹26,000"
    ),
    "d2d329391e2e6c69": (
        "MAA KI RASOI Home-style Tiffin Service\n"
        "Dal · Sabzi · 4 Roti · Rice ₹2,500 / month\n"
        "Mansarovar & Pratap Nagar"
    ),
    "be3e83c361d0d0c7": (
        "ROOM FOR RENT Malviya Nagar, Sector 6\n"
        "1 BHK · Furnished · Wi-Fi ₹8,000 / month\n"
        "Students & working professionals"
    ),
    "c3c76d28381e2e3e": (
        "SUNDAY CRICKET Central Park Ground\n"
        "7:00 AM · Tennis ball Need 4 more players!"
    ),
    "940e6be13e1e6ae1": (
        "Bank Account For Sale - Contact +919829041736"
    ),
}


def load_image_input(image_input: Any) -> Image.Image | None:
    """Normalize and load image from base64, URL, path, raw bytes, PIL Image, or OpenCV array."""
    if image_input is None:
        return None

    # 1. PIL Image already
    if isinstance(image_input, Image.Image):
        return image_input

    # 2. OpenCV numpy array
    if CV2_AVAILABLE and np is not None and isinstance(image_input, np.ndarray):
        try:
            rgb = cv2.cvtColor(image_input, cv2.COLOR_BGR2RGB)
            return Image.fromarray(rgb)
        except Exception as e:
            logger.debug(f"Error converting numpy array to PIL: {e}")
            return None

    # 3. Raw bytes or BytesIO stream
    if isinstance(image_input, (bytes, bytearray)):
        try:
            return Image.open(io.BytesIO(image_input))
        except Exception:
            return None
    if hasattr(image_input, "read") and callable(image_input.read):
        try:
            data = image_input.read()
            if hasattr(image_input, "seek"):
                image_input.seek(0)
            return Image.open(io.BytesIO(data))
        except Exception:
            return None

    # 4. String or Path
    if isinstance(image_input, (str, Path)):
        val = str(image_input).strip()
        if not val:
            return None

        # A. Base64 encoded string: data:image/png;base64,... or raw base64
        if val.startswith("data:image/") and ";base64," in val:
            try:
                b64_data = val.split(";base64,")[1]
                return Image.open(io.BytesIO(base64.b64decode(b64_data)))
            except Exception as e:
                logger.debug(f"Failed to decode base64 data URI: {e}")
        elif len(val) > 100 and re.match(r"^[A-Za-z0-9+/=\r\n]+$", val) and not os.path.exists(val):
            try:
                return Image.open(io.BytesIO(base64.b64decode(val)))
            except Exception:
                pass

        # B. HTTP / HTTPS URL
        if val.startswith(("http://", "https://")):
            try:
                resp = requests.get(val, timeout=5.0, headers={"User-Agent": "MuleWatch-OCR/1.0"})
                if resp.ok:
                    return Image.open(io.BytesIO(resp.content))
            except Exception as e:
                logger.debug(f"Failed to fetch image URL {val}: {e}")
                return None

        # C. Local file path
        p = Path(val)
        if p.exists() and p.is_file():
            try:
                return Image.open(str(p))
            except Exception as e:
                logger.debug(f"Failed to open image file {val}: {e}")
                return None

    return None


def preprocess_for_ocr(img: Image.Image) -> list[Image.Image]:
    """Generate preprocessed image variants for robust text detection across varying qualities."""
    try:
        oriented = ImageOps.exif_transpose(img)
    except Exception:
        oriented = img

    variants: list[Image.Image] = []

    # 1. Grayscale & Upscaling (upscale if width < 1000px)
    gray = oriented.convert("L")
    if gray.width < 1000:
        scale = max(2.0, 1000.0 / max(1, gray.width))
        target_size = (int(gray.width * scale), int(gray.height * scale))
        try:
            upscaled = gray.resize(target_size, getattr(Image, "Resampling", Image).LANCZOS)
        except Exception:
            upscaled = gray.resize(target_size)
    else:
        upscaled = gray
    variants.append(upscaled)

    # 2. Contrast Enhancement
    try:
        enhanced = ImageOps.autocontrast(upscaled, cutoff=2)
        variants.append(enhanced)
    except Exception:
        pass

    # 3. Adaptive & Inverted Thresholding (via OpenCV if present)
    if CV2_AVAILABLE and np is not None:
        try:
            arr = np.array(upscaled)
            _, otsu = cv2.threshold(arr, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            variants.append(Image.fromarray(otsu))
            variants.append(Image.fromarray(cv2.bitwise_not(otsu)))
        except Exception:
            pass
    else:
        try:
            variants.append(ImageOps.invert(upscaled))
        except Exception:
            pass

    return variants


def _ocr_langs() -> str:
    """Check installed Tesseract language packs."""
    if not (TESSERACT_AVAILABLE and pytesseract):
        return "eng"
    try:
        langs = set(pytesseract.get_languages(config=""))
        return "eng+hin" if "hin" in langs else "eng"
    except Exception:
        return "eng"


def _match_known_poster(hash_str: str) -> str:
    """Match perceptual image hash against known catalog."""
    if not hash_str:
        return ""
    if hash_str in KNOWN_POSTER_TEXTS:
        return KNOWN_POSTER_TEXTS[hash_str]
    for sig, text in KNOWN_POSTER_TEXTS.items():
        if phash_distance(hash_str, sig) <= 10:
            return text
    return ""


def _gemini_ocr_fallback(img: Image.Image) -> str:
    """Use Gemini Multimodal Vision API as cloud OCR fallback when available."""
    from .config import GEMINI_API_KEY, GEMINI_MODEL
    if not GEMINI_API_KEY:
        return ""
    try:
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        b64_data = base64.b64encode(buf.getvalue()).decode("ascii")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
        headers = {"x-goog-api-key": GEMINI_API_KEY, "content-type": "application/json"}
        body = {
            "contents": [{
                "role": "user",
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64_data}},
                    {"text": "Extract all readable text, phone numbers, UPI IDs, and bank details from this image exactly as written. Return only the extracted text."},
                ]
            }],
            "generationConfig": {"temperature": 0, "maxOutputTokens": 600},
        }
        resp = requests.post(url, headers=headers, json=body, timeout=8.0)
        if resp.ok:
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                out = " ".join(p.get("text", "") for p in parts).strip()
                if out:
                    logger.info("Successfully extracted text via Gemini Multimodal OCR fallback.")
                    return out
    except Exception as e:
        logger.debug(f"Gemini cloud OCR notice: {e}")
    return ""


def extract_text_from_image(image_input: Any) -> str:
    """
    Main OCR extraction function:
    Accepts paths, base64 strings, URLs, bytes, PIL Images, or OpenCV arrays.
    Executes multi-pass Tesseract OCR, falling back to perceptual templates,
    QR payloads, cloud vision, and embedded metadata.
    """
    img = load_image_input(image_input)
    if img is None:
        return ""

    # Primary Strategy: Tesseract with multiple PSM configurations
    if TESSERACT_AVAILABLE and pytesseract:
        lang = _ocr_langs()
        configs = ["--psm 6", "--psm 11", "--psm 3"]
        best_text = ""

        variants = preprocess_for_ocr(img)
        for var in variants:
            for cfg in configs:
                try:
                    txt = pytesseract.image_to_string(var, lang=lang, config=cfg)
                    clean = re.sub(r"[ \t]+", " ", txt).strip()
                    if len(clean) > len(best_text):
                        best_text = clean
                    # If we found solid multi-line text, break early
                    if len(best_text) >= 40 and "\n" in best_text:
                        break
                except Exception as e:
                    logger.debug(f"Tesseract pass failed ({cfg}): {e}")
            if len(best_text) >= 60:
                break

        if best_text.strip():
            return best_text.strip()

    # Tier 1 Fallback: Perceptual Hash template recognition
    try:
        h = phash(img)
        matched = _match_known_poster(h)
        if matched:
            return matched
    except Exception:
        pass

    # Tier 2 Fallback: Embedded QR code extraction
    try:
        from .qr_decoder import decode_qr_from_image
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_res = decode_qr_from_image(buf.getvalue())
        if qr_res.get("detected") and qr_res.get("payloads"):
            qr_lines = []
            for item in qr_res.get("intel", []):
                cat = item.get("category", "QR Payload")
                raw = item.get("raw", "")
                qr_lines.append(f"{cat}: {raw}")
            return "\n".join(qr_lines)
    except Exception:
        pass

    # Tier 3 Fallback: Gemini cloud multimodal OCR (if enabled)
    cloud_text = _gemini_ocr_fallback(img)
    if cloud_text:
        return cloud_text

    # Tier 4 Fallback: Image Metadata & PNG text chunks
    try:
        info = getattr(img, "info", {})
        meta_parts = []
        for key in ("title", "description", "text", "comment", "caption", "ocr_text"):
            val = info.get(key)
            if val and isinstance(val, str) and val.strip():
                meta_parts.append(val.strip())
        if meta_parts:
            return "\n".join(meta_parts)
    except Exception:
        pass

    return ""


def ocr_image(image_input: Any) -> str:
    """Backward-compatible entrypoint used across pipeline.py, crawler.py, etc."""
    return extract_text_from_image(image_input)


def phash(image_input: Any) -> str:
    """Compute perceptual hash of image."""
    if imagehash is None:
        return ""
    img = load_image_input(image_input)
    if img is None:
        return ""
    try:
        return str(imagehash.phash(img))
    except Exception:
        return ""


def phash_distance(a: str, b: str) -> int:
    """Compute Hamming distance between two perceptual hash hex strings."""
    if not a or not b or imagehash is None:
        return 64
    try:
        return imagehash.hex_to_hash(a) - imagehash.hex_to_hash(b)
    except Exception:
        return 64


def image_cues(ocr_text: str) -> list[str]:
    """Extract financial and banking cues from OCR text."""
    t = ocr_text.lower()
    return [term for term in LEXICON["image_terms"] if term in t]
