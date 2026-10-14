import pytest
from app.db import SessionLocal, Post, init_db
from app.main import platforms_stats, list_posts
from app.platform_seeder import seed_platform_posts_if_needed


@pytest.fixture(scope="module", autouse=True)
def setup_platforms_environment():
    init_db()
    with SessionLocal() as s:
        if s.query(Post).filter(Post.source_platform == "charcha").count() == 0:
            from app.pipeline import ingest
            ingest(
                s,
                text="All bank current account full kit available ATM passbook netbanking",
                platform="Charcha forum · PaisaTalk",
                source="forum",
                source_platform="charcha",
                author="rohit_traders",
                url="http://localhost:8100/p/1",
                recompute=False,
            )
            s.commit()
    seed_platform_posts_if_needed()


def test_platforms_stats_aggregation():
    stats = platforms_stats()
    assert "platforms" in stats
    assert stats["active_sources_count"] == 4
    assert stats["total_posts_across_platforms"] >= 4

    platform_ids = [p["platform_id"] for p in stats["platforms"]]
    assert "telegram" in platform_ids
    assert "charcha" in platform_ids
    assert "instagram" in platform_ids
    assert "twitter" in platform_ids

    # Verify each card metrics structure
    for p in stats["platforms"]:
        assert "platform" in p
        assert "total_posts" in p
        assert isinstance(p["total_posts"], int)
        assert p["total_posts"] >= 0
        assert "critical_count" in p
        assert "high_count" in p
        assert "last_sync" in p
        assert "status" in p
        assert "status_badge" in p
        assert "meta" in p


def test_platform_specific_metrics():
    stats = platforms_stats()
    platforms_by_id = {p["platform_id"]: p for p in stats["platforms"]}

    # Telegram
    tg = platforms_by_id["telegram"]
    assert tg["meta"]["api_id"] == "21942717"
    assert tg["meta"]["app_title"] == "SentinelAI"
    assert tg["total_posts"] >= 1

    # Charcha
    ch = platforms_by_id["charcha"]
    assert "8100" in ch["meta"]["host"]
    assert ch["total_posts"] >= 1

    # Instagram
    insta = platforms_by_id["instagram"]
    assert insta["total_posts"] >= 1
    assert "5m" in insta["status"]

    # Twitter
    tw = platforms_by_id["twitter"]
    assert tw["total_posts"] >= 1


def test_list_posts_platform_filtering():
    # Test telegram
    res_tg = list_posts(platform="telegram", limit=100)
    assert res_tg["total"] >= 1
    for item in res_tg["items"]:
        assert "telegram" in (item["platform"] + " " + item["source_platform"]).lower()

    # Test instagram
    res_in = list_posts(source_platform="instagram", limit=100)
    assert res_in["total"] >= 1
    for item in res_in["items"]:
        assert item["source_platform"] == "instagram"

    # Test twitter
    res_tw = list_posts(platform="twitter", limit=100)
    assert res_tw["total"] >= 1
    for item in res_tw["items"]:
        assert "twitter" in (item["platform"] + " " + item["source_platform"]).lower() or "x (" in item["platform"].lower()

    # Test charcha
    res_ch = list_posts(platform="charcha", limit=100)
    assert res_ch["total"] >= 1
    for item in res_ch["items"]:
        assert "charcha" in (item["platform"] + " " + item["source_platform"]).lower()


def test_post_model_source_platform_persisted():
    with SessionLocal() as s:
        posts = s.query(Post).all()
        assert len(posts) > 0
        valid_platforms = {"telegram", "charcha", "instagram", "twitter", "manual"}
        for p in posts:
            sp = getattr(p, "source_platform", None)
            assert sp is not None
            assert sp.lower() in valid_platforms
