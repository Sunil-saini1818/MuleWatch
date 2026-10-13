"""Central configuration. Everything is overridable through environment variables (.env)."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent          # backend/
ROOT_DIR = BASE_DIR.parent                                 # repo root
DATA_DIR = Path(os.getenv("MW_DATA_DIR", BASE_DIR / "data"))
MEDIA_DIR = DATA_DIR / "media"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


def _load_dotenv():
    """Tiny .env loader so we don't need python-dotenv."""
    for p in (ROOT_DIR / ".env", BASE_DIR / ".env"):
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'mulewatch.db'}")

# Alerts
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
ALERT_MIN_LEVEL = os.getenv("ALERT_MIN_LEVEL", "Critical")   # Critical | High

# Optional LLM second opinion (Claude). Leave empty to run fully offline.
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "claude-haiku-5-5")

# Risk level thresholds (score 0-100)
LEVELS = [(80, "Critical"), (55, "High"), (30, "Medium"), (0, "Low")]


def level_for(score: float) -> str:
    for threshold, name in LEVELS:
        if score >= threshold:
            return name
    return "Low"


LEVEL_RANK = {"Low": 0, "Medium": 1, "High": 2, "Critical": 3}
