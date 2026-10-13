"""Core detection tests:  cd backend && python -m pytest -q"""
import os
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

os.environ.setdefault("MW_DATA_DIR", tempfile.mkdtemp())
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.coordination import compute  # noqa: E402
from app.extract import extract_entities, find_keywords  # noqa: E402
from app.ml import retrain  # noqa: E402
from app.pipeline import base_training_set  # noqa: E402
from app.scoring import analyze  # noqa: E402

retrain(base_training_set())


def test_entities():
    e = extract_entities("Call 98290 41736 or +91-8875 93 6612, pay kit77@ybl, t.me/kitwala_jpr, wa.me/917014825519 "
                         "IFSC SBIN0001234, USDT TQ7Xk2YpZ6bM1rJ9aV8fW3eN4cL5hG2sD1, mail a@b.com")
    assert "+919829041736" in e["phone"] and "+918875936612" in e["phone"]
    assert e["upi"] == ["kit77@ybl"]
    assert e["telegram"] == ["t.me/kitwala_jpr"]
    assert "+917014825519" in e["whatsapp"]
    assert e["ifsc"] == ["SBIN0001234"]
    assert e["crypto_wallet"] and e["email"] == ["a@b.com"]


def test_obfuscation_and_hindi():
    terms = {h["term"] for h in find_keywords("fr3sh acc0unt kit r3ady, a.t.m card with pin")}
    assert {"account kit", "card with pin"} <= terms
    assert any(h["term"] == "किराये पर खाता" for h in find_keywords("गेमिंग के लिए किराये पर खाता उपलब्ध"))


SUSPICIOUS = [
    "SBI current account available, full kit with ATM passbook net banking, KYC done 15k. t.me/fastkit_99",
    "Bhai apna khata kiraye pe do, har mahine 25k. Sirf gaming ke liye. WhatsApp 98765 43210",
    "Debit cards with PIN available, bulk, replacement guarantee. Pay kit@okaxis",
    "बैंक खाता उपलब्ध है, पूरा किट मिलेगा। संपर्क 9876543210",
]
BENIGN = [
    "Never sell or rent your bank account — it makes you a money mule. Report to 1930.",
    "Lost my ATM card, how do I block it quickly?",
    "Selling my old cycle for 3000, call 9123456780",
    "Which bank is best for a current account for my small shop?",
    "Opened my first savings account today and got a debit card!",
]


def test_separation():
    for t in SUSPICIOUS:
        assert analyze(t)["base_score"] >= 80, t
    for t in BENIGN:
        assert analyze(t)["base_score"] < 30, t


def test_card_photo_without_sale_language_is_low():
    ocr = "NAGAR SAHAKARI BANK PLATINUM 4718 XXXX XXXX 2041 VALID THRU 08/29 DEBIT RuPay"
    assert analyze("Finally got my first debit card!", ocr)["base_score"] < 30
    assert analyze("DM for details", ocr + " ATM CARD WITH PIN AVAILABLE")["base_score"] >= 55


def test_rings():
    P = lambda i, text: SimpleNamespace(id=i, text=text, ocr_text="", image_phash="", entities=extract_entities(text))
    posts = [P(1, "kit available call 98290 41736"), P(2, "ready account, WA 9829041736"),
             P(3, "unrelated post about momos"), P(4, "join t.me/abc_kit"), P(5, "full kit t.me/abc_kit")]
    c = compute(posts)
    assert c[1]["cluster"] == c[2]["cluster"] and c[4]["cluster"] == c[5]["cluster"]
    assert c[3]["cluster"] is None or c[3]["cluster"] not in (c[1]["cluster"], c[4]["cluster"])
