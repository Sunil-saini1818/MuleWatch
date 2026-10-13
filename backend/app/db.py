from datetime import datetime

from sqlalchemy import (JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer,
                        String, Text, create_engine)
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
Base = declarative_base()


class Post(Base):
    __tablename__ = "posts"

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
