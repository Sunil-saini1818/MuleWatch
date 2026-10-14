from __future__ import annotations
"""
Public OCR Module for MuleWatch.
Exports Tesseract resolution, image-to-text extraction, and preprocessing pipeline.
"""

from .ocr_processor import (
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
