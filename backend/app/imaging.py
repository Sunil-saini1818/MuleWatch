"""Image analysis: OCR (Tesseract, optional), perceptual hash for repost detection and
card/passbook cue detection from OCR text."""
import re
import shutil

from PIL import Image, ImageOps

from .extract import LEXICON

try:
    import imagehash
except ImportError:          # pragma: no cover
    imagehash = None

try:
    import pytesseract
    OCR_AVAILABLE = shutil.which("tesseract") is not None
except ImportError:          # pragma: no cover
    pytesseract = None
    OCR_AVAILABLE = False


def _ocr_langs() -> str:
    try:
        langs = set(pytesseract.get_languages(config=""))
    except Exception:
        return "eng"
    return "eng+hin" if "hin" in langs else "eng"


def ocr_image(path: str) -> str:
    if not OCR_AVAILABLE:
        return ""
    try:
        img = Image.open(path)
        img = ImageOps.exif_transpose(img).convert("L")
        if img.width < 1000:                               # upscale small screenshots
            scale = 1000 / img.width
            img = img.resize((int(img.width * scale), int(img.height * scale)))
        txt = pytesseract.image_to_string(img, lang=_ocr_langs())
        # also try inverted image (white text on dark posters)
        inv = pytesseract.image_to_string(ImageOps.invert(img), lang=_ocr_langs())
        best = txt if len(txt.strip()) >= len(inv.strip()) else inv
        return re.sub(r"[ \t]+", " ", best).strip()
    except Exception:
        return ""


def phash(path: str) -> str:
    if imagehash is None:
        return ""
    try:
        return str(imagehash.phash(Image.open(path)))
    except Exception:
        return ""


def phash_distance(a: str, b: str) -> int:
    if not a or not b or imagehash is None:
        return 64
    return imagehash.hex_to_hash(a) - imagehash.hex_to_hash(b)


def image_cues(ocr_text: str) -> list[str]:
    t = ocr_text.lower()
    return [term for term in LEXICON["image_terms"] if term in t]
