from __future__ import annotations
from datetime import datetime

from sqlalchemy import (JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer,
                        String, Text, create_engine)
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 20} if DATABASE_URL.startswith("sqlite") else {},
)

if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _):
        # crawler thread, API requests and the live-event stream all touch the DB at once
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA synchronous=NORMAL")
        cur.close()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base = declarative_base()


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = {"sqlite_autoincrement": True}

    id = Column(Integer, primary_key=True)
    platform = Column(String(40), index=True, default="unknown")
    author = Column(String(120), default="")
    url = Column(String(500), default="")
    text = Column(Text, default="")
    image_path = Column(String(300), default="")      # relative to MEDIA_DIR
    ocr_text = Column(Text, default="")
    image_phash = Column(String(32), default="")
    language = Column(String(20), default="en")
    source = Column(String(30), default="manual")      # forum | telegram | manual | extension
    remote_id = Column(String(120), default="", index=True)   # id on the monitored site
    takedown = Column(String(20), default="")                # requested | done
    posted_at = Column(DateTime, default=datetime.utcnow, index=True)
    ingested_at = Column(DateTime, default=datetime.utcnow)

    entities = Column(JSON, default=dict)     # {"phone": [...], "upi": [...], ...}
    matches = Column(JSON, default=list)      # keyword hits with spans
    scores = Column(JSON, default=dict)       # breakdown
    reasons = Column(JSON, default=list)      # human readable evidence lines
    llm = Column(JSON, default=dict)          # optional LLM opinion

    risk_score = Column(Float, default=0, index=True)
    risk_level = Column(String(12), default="Low", index=True)
    category = Column(String(40), default="Benign", index=True)

    cluster_id = Column(Integer, nullable=True, index=True)
    cluster_size = Column(Integer, default=1)
    related = Column(JSON, default=list)      # [{"id":..,"why":[..]}]

    label = Column(String(20), nullable=True)  # investigator verdict: confirmed | false_positive
    train_label = Column(Integer, nullable=True)  # labelled training data (1 suspicious / 0 benign)
    evidence_hash = Column(String(64), default="")


class WatchItem(Base):
    __tablename__ = "watchlist"
    id = Column(Integer, primary_key=True)
    kind = Column(String(20))      # phone | upi | telegram | whatsapp | url | keyword ...
    value = Column(String(200), index=True)
    note = Column(String(300), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), index=True)
    level = Column(String(12))
    reason = Column(String(300))
    delivered = Column(Boolean, default=False)
    channel = Column(String(30), default="dashboard")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    seen = Column(Boolean, default=False)


class KeywordStat(Base):
    """Investigator feedback per lexicon term -> adaptive weights."""
    __tablename__ = "keyword_stats"
    term = Column(String(120), primary_key=True)
    confirmed = Column(Integer, default=0)
    false_positive = Column(Integer, default=0)


class Setting(Base):
    """Small key/value store for things set at runtime (e.g. the chat that receives alerts)."""
    __tablename__ = "settings"
    key = Column(String(60), primary_key=True)
    value = Column(String(300), default="")


def get_setting(key: str, default: str = "") -> str:
    with SessionLocal() as s:
        row = s.get(Setting, key)
        return row.value if row else default


def set_setting(key: str, value: str | None):
    with SessionLocal() as s:
        row = s.get(Setting, key)
        if value is None:
            if row:
                s.delete(row)
        elif row:
            row.value = value
        else:
            s.add(Setting(key=key, value=value))
        s.commit()


class Report(Base):
    """A citizen report received through the Telegram reporting bot. Several reports can point to the
    same case (people forwarding the same ad)."""
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id"), index=True)
    chat_id = Column(String(40), index=True)        # needed to send the reporter updates
    reporter_hash = Column(String(16), index=True)  # shown in the UI instead of the person
    reporter_name = Column(String(80), default="")
    content_key = Column(String(32), index=True)
    origin = Column(String(200), default="")        # "forwarded from channel @x" etc.
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class Source(Base):
    """A monitored website / channel."""
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True)
    kind = Column(String(20))          # forum | telegram
    name = Column(String(120))
    url = Column(String(300))
    enabled = Column(Boolean, default=True)
    last_crawl = Column(DateTime, nullable=True)
    last_status = Column(String(200), default="")
    items_seen = Column(Integer, default=0)
    cursor = Column(String(100), default="")   # last seen remote id


def init_db():
    Base.metadata.create_all(engine)
