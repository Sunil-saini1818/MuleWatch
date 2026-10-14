from __future__ import annotations
"""
Image analysis: OCR (Tesseract, optional), perceptual hash for repost detection,
and card/passbook cue detection from OCR text.
"""

from .ocr_processor import (
    KNOWN_POSTER_TEXTS,
    OCR_AVAILABLE,
    TESSERACT_AVAILABLE,
    TESSERACT_BIN,
    extract_text_from_image,
    image_cues,
    load_image_input,
    ocr_image,
    phash,
    phash_distance,
    preprocess_for_ocr,
    resolve_tesseract_cmd,
)

__all__ = [
    "KNOWN_POSTER_TEXTS",
    "OCR_AVAILABLE",
    "TESSERACT_AVAILABLE",
    "TESSERACT_BIN",
    "extract_text_from_image",
    "image_cues",
    "load_image_input",
    "ocr_image",
    "phash",
    "phash_distance",
    "preprocess_for_ocr",
    "resolve_tesseract_cmd",
]
