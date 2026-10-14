from __future__ import annotations
"""
Platform Seeder: Ingests realistic multi-source platform threat telemetry
(Instagram, X / Twitter, Telegram) into MuleWatch for multi-source intelligence breakdown.
"""
from datetime import datetime, timedelta
import logging

from .db import Post, SessionLocal
from .pipeline import ingest

logger = logging.getLogger("mulewatch.platform_seeder")

INSTAGRAM_POSTS = [
    {
        "author": "quick_cash_india",
        "platform": "Instagram · @quick_cash_india",
        "source_platform": "instagram",
        "text": "🔥 Students & Job Seekers Attention! Earn ₹35,000/month working from home. No investment required. Need active bank account (SBI/HDFC/ICICI) for gaming payout settlement. 100% genuine daily payouts. DM on WhatsApp +919829041736 or link in bio. #workfromhome #studentearning #quickmoney",
        "url": "https://www.instagram.com/p/DB148201a/",
        "hours_ago": 4,
    },
    {
        "author": "paisa_point_in",
        "platform": "Instagram · @paisa_point_in",
        "source_platform": "instagram",
        "text": "Urgent requirement for Current and Savings Accounts! Rent your bank account for 30 days. Payout ₹25,000 upfront + 2% commission per transfer. ATM card + Net banking login required. Safe work with gaming company. DM @paisa_point_in or WA 7014825519",
        "url": "https://www.instagram.com/p/DB21082bb/",
        "hours_ago": 7,
    },
    {
        "author": "easy_jobs_rajasthan",
        "platform": "Instagram · @easy_jobs_rajasthan",
        "source_platform": "instagram",
        "text": "Daily income opportunity for Jaipur & Kota college students 💸 Lending account for tournament prize pool. ₹15,000 advance. Aadhaar linked SIM & passbook needed. Contact t.me/kitwala_jpr or WhatsApp 9829041736",
        "url": "https://www.instagram.com/p/DB09823cc/",
        "hours_ago": 12,
    },
    {
        "author": "delhi_classifieds_ad",
        "platform": "Instagram · @delhi_classifieds_ad",
        "source_platform": "instagram",
        "text": "Corporate Current Accounts needed for business transactions. High limit required (50L+ daily). Rent paid weekly ₹50,000. Verified buyers only. Payment via UPI: earnfast21@ybl. DM for details.",
        "url": "https://www.instagram.com/p/DB01192dd/",
        "hours_ago": 18,
    },
    {
        "author": "crypto_lures_insta",
        "platform": "Instagram · @crypto_lures_insta",
        "source_platform": "instagram",
        "text": "USDT to INR cashout gateway partners wanted! We pay 3% flat commission per trade. Need Kotak 811 / Axis / Yes Bank zero balance accounts. Instant settlement. TG: @cardzone_x",
        "url": "https://www.instagram.com/p/DA98213ee/",
        "hours_ago": 26,
    },
    {
        "author": "earn_money_online_club",
        "platform": "Instagram · @earn_money_online_club",
        "source_platform": "instagram",
        "text": "Zero investment daily earn ₹2000-₹5000. Just receive fund and transfer back via GooglePay / PhonePe. Part time task for students. WhatsApp: 7014825519 to join recruitment group.",
        "url": "https://www.instagram.com/p/DA87123ff/",
        "hours_ago": 36,
    },
]

TWITTER_POSTS = [
    {
        "author": "P2P_Escrow_IN",
        "platform": "X (Twitter) · @P2P_Escrow_IN",
        "source_platform": "twitter",
        "text": "Bulk Bank Accounts available for USDT P2P trades. Full kit (Cheque book + ATM card + Netbanking + Registered SIM). Daily limit 1 Cr. No freeze guarantee. Escrow accepted on Binance/Bybit. TG: t.me/cardzone_x #USDTp2p #BankAccountSale #CryptoIndia",
        "url": "https://x.com/P2P_Escrow_IN/status/184589201928",
        "hours_ago": 2,
    },
    {
        "author": "CryptoWhale_Desk",
        "platform": "X (Twitter) · @CryptoWhale_Desk",
        "source_platform": "twitter",
        "text": "Need fresh corporate bank current accounts with high RTGS/NEFT limits. Paying ₹40,000 monthly rent per account. Only verified owners with registered GST. Contact on Telegram: @kitwala_jpr or call 9829041736 #FinTech #BusinessAccount",
        "url": "https://x.com/CryptoWhale_Desk/status/184578192837",
        "hours_ago": 5,
    },
    {
        "author": "FastCash_Desi",
        "platform": "X (Twitter) · @FastCash_Desi",
        "source_platform": "twitter",
        "text": "Rent your bank account for crypto withdrawal. Daily ₹3,000 to ₹8,000 guaranteed profit. No work needed, our team handles transactions. Send your UPI ID or phone number in DM. WhatsApp: 7014825519 #EarnFromHome #PassiveIncome",
        "url": "https://x.com/FastCash_Desi/status/184567182910",
        "hours_ago": 11,
    },
    {
        "author": "DebitKit_Trader",
        "platform": "X (Twitter) · @DebitKit_Trader",
        "source_platform": "twitter",
        "text": "Debit card kits with PIN available for sale. All major Indian banks (SBI, HDFC, PNB, Canara). Hand to hand delivery in Jaipur & Delhi. Pay via TRC20 USDT: TQ7Xk2YpZ6bM1rJ9aV8fW3eN4cL5hG2sD1. DM for price list.",
        "url": "https://x.com/DebitKit_Trader/status/184545192830",
        "hours_ago": 20,
    },
    {
        "author": "PaisaClub_X",
        "platform": "X (Twitter) · @PaisaClub_X",
        "source_platform": "twitter",
        "text": "Instant cash commission for student bank accounts. Give your account for 7 days, get ₹12,000 cash in hand. UPI payout: earnfast21@ybl. Contact via Telegram: @kitwala_jpr #StudentJobs #Jaipur",
        "url": "https://x.com/PaisaClub_X/status/184512983719",
        "hours_ago": 30,
    },
]

TELEGRAM_SEED_POSTS = [
    {
        "author": "jaipur_dark_market",
        "platform": "Telegram · @jaipur_dark_market",
        "source_platform": "telegram",
        "text": "🔥 FRESH MULE KITS AVAILABLE 🔥\nHDFC Corporate + Kotak Current Account available. Complete kit with ATM card, NetBanking, Chequebook, Registered Airtel SIM.\nKYC verified. Limit 25L/day. Price: 22k per kit.\nContact: @kitwala_jpr or call 98290 41736",
        "url": "https://t.me/jaipur_dark_market/412",
        "hours_ago": 3,
    },
    {
        "author": "mule_hunt_feed",
        "platform": "Telegram · @mule_hunt_feed",
        "source_platform": "telegram",
        "text": "Urgently required 20 saving accounts for BGMI tournament withdrawal and gaming cashout. 15k rent per month advance payment.\nUPI: earnfast21@ybl. WhatsApp 70148 25519",
        "url": "https://t.me/mule_hunt_feed/108",
        "hours_ago": 8,
    },
    {
        "author": "cardzone_channel",
        "platform": "Telegram · @cardzone_x",
        "source_platform": "telegram",
        "text": "USDT TRC20 Escrow Service & Current Account sales.\nWallet: TQ7Xk2YpZ6bM1rJ9aV8fW3eN4cL5hG2sD1\nBulk debit cards with PIN available for dispatch. Contact admin @cardzone_x",
        "url": "https://t.me/cardzone_x/89",
        "hours_ago": 14,
    },
]


def seed_platform_posts_if_needed(session=None):
    """Ensures realistic cross-platform intelligence exists for multi-source analysis."""
    close_after = False
    if session is None:
        session = SessionLocal()
        close_after = True

    try:
        now = datetime.utcnow()
        seeded_any = False

        # 1. Instagram
        insta_count = session.query(Post).filter(Post.source_platform == "instagram").count()
        if insta_count == 0:
            logger.info("Seeding realistic Instagram threat telemetry...")
            for item in INSTAGRAM_POSTS:
                posted_time = now - timedelta(hours=item["hours_ago"])
                ingest(
                    session,
                    text=item["text"],
                    platform=item["platform"],
                    author=item["author"],
                    url=item["url"],
                    source="page",
                    source_platform="instagram",
                    posted_at=posted_time,
                    recompute=False,
                )
                seeded_any = True

        # 2. Twitter / X
        twitter_count = session.query(Post).filter(Post.source_platform == "twitter").count()
        if twitter_count == 0:
            logger.info("Seeding realistic X (Twitter) threat telemetry...")
            for item in TWITTER_POSTS:
                posted_time = now - timedelta(hours=item["hours_ago"])
                ingest(
                    session,
                    text=item["text"],
                    platform=item["platform"],
                    author=item["author"],
                    url=item["url"],
                    source="page",
                    source_platform="twitter",
                    posted_at=posted_time,
                    recompute=False,
                )
                seeded_any = True

        # 3. Telegram (ensure at least 5 posts for high-density platform stats)
        tg_count = session.query(Post).filter(Post.source_platform == "telegram").count()
        if tg_count < 5:
            logger.info("Seeding auxiliary Telegram threat telemetry...")
            for item in TELEGRAM_SEED_POSTS:
                # check url doesn't already exist
                if not session.query(Post).filter(Post.url == item["url"]).first():
                    posted_time = now - timedelta(hours=item["hours_ago"])
                    ingest(
                        session,
                        text=item["text"],
                        platform=item["platform"],
                        author=item["author"],
                        url=item["url"],
                        source="telegram",
                        source_platform="telegram",
                        posted_at=posted_time,
                        recompute=False,
                    )
                    seeded_any = True

        if seeded_any:
            from .pipeline import recompute_all
            recompute_all(session, alert=False)
            session.commit()
            logger.info("Platform threat telemetry seeded and indexed.")

        # Ensure at least 2 demo confirmed cases for Cyber Cell Dispatch
        confirmed_count = session.query(Post).filter((Post.status == "confirmed_enforcement") | (Post.label == "confirmed")).count()
        if confirmed_count == 0:
            top_critical = session.query(Post).filter(Post.risk_level == "Critical").order_by(Post.risk_score.desc()).limit(2).all()
            for p in top_critical:
                p.status = "confirmed_enforcement"
                p.label = "confirmed"
            session.commit()
    except Exception as e:
        logger.warning(f"Error seeding platform posts: {e}")
        session.rollback()
    finally:
        if close_after:
            session.close()
