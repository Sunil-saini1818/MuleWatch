import pytest
from app.db import SessionLocal, Post, init_db
from app.pipeline import ingest
from app.main import (
    update_case_status,
    list_posts,
    get_dispatch_queue,
    dispatch_i4c,
    dispatch_bank_lien,
    detail,
)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    init_db()


def test_cyber_cell_dispatch_full_lifecycle():
    # 1. Ingest a high-threat test mule case
    with SessionLocal() as s:
        test_post = ingest(
            s,
            text="HDFC current account full kit for sale with netbanking ATM card and registered SIM. Rate 20k. Contact WA 9829041736 UPI testmule@okhdfc",
            platform="Telegram · @jaipur_deals",
            author="test_syndicate_boss",
            url="https://t.me/jaipur_deals/999",
            source="telegram",
            source_platform="telegram",
            recompute=False,
        )
        s.commit()
        pid = test_post.id
        assert pid is not None
        assert test_post.status == "flagged_review"

    # Verify not yet in dispatch queue
    queue_before = get_dispatch_queue()
    assert pid not in [item["id"] for item in queue_before["items"]]

    # 2. Confirm Fraud: Move case to confirmed_enforcement
    updated = update_case_status(pid, {"status": "confirmed_enforcement"})
    assert updated["id"] == pid
    assert updated["status"] == "confirmed_enforcement"
    assert updated["label"] == "confirmed"

    # 3. Assert it appears in GET /api/cases?status=confirmed_enforcement
    confirmed_cases = list_posts(status="confirmed_enforcement", limit=100)
    confirmed_ids = [item["id"] for item in confirmed_cases["items"]]
    assert pid in confirmed_ids

    # Also assert it appears in get_dispatch_queue
    queue_after = get_dispatch_queue()
    assert pid in [item["id"] for item in queue_after["items"]]

    # 4. Trigger Dispatch to I4C Suspect Registry
    i4c_res = dispatch_i4c(case_id=pid)
    assert i4c_res["success"] is True
    assert i4c_res["status"] == "Lien Requested"
    assert i4c_res["ack_id"].startswith("I4C-2026-")
    assert i4c_res["case_id"] == pid

    # 5. Trigger Nodal Bank Account Lien Freeze
    lien_res = dispatch_bank_lien(case_id=pid, bank="SBI Nodal Gateway", target_account="testmule@okhdfc")
    assert lien_res["success"] is True
    assert lien_res["status"] == "Lien Requested"
    assert lien_res["lien_id"].startswith("LIEN-HDFC-")
    assert lien_res["case_id"] == pid

    # Verify dispatch metadata persisted in database
    with SessionLocal() as s:
        persisted = s.get(Post, pid)
        meta = persisted.dispatch_metadata or {}
        assert "i4c" in meta
        assert meta["i4c"]["ack_id"] == i4c_res["ack_id"]
        assert "bank_lien" in meta
        assert meta["bank_lien"]["lien_id"] == lien_res["lien_id"]

    # 6. Safety Workflow Reversal: Undo confirmation and revert to draft review
    revert_res = update_case_status(pid, {"status": "flagged_review"})
    assert revert_res["id"] == pid
    assert revert_res["status"] == "flagged_review"
    assert revert_res["label"] is None

    # 7. Confirm the case is completely removed from the dispatch queue
    confirmed_cases_after_revert = list_posts(status="confirmed_enforcement", limit=100)
    assert pid not in [item["id"] for item in confirmed_cases_after_revert["items"]]

    queue_final = get_dispatch_queue()
    assert pid not in [item["id"] for item in queue_final["items"]]
