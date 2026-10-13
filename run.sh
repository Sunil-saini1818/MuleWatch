#!/usr/bin/env bash
# Start the MuleWatch command center on http://localhost:8000
#
#   ./run.sh                 monitor the forum set in .env (FORUM_URL)
#   ./run.sh --local-forum   also run the Charcha forum locally on :8100 (offline backup demo)
#   ./run.sh --reset         wipe collected cases and start fresh
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"

LOCAL_FORUM=0; RESET=0
for a in "$@"; do
  case "$a" in
    --local-forum) LOCAL_FORUM=1 ;;
    --reset) RESET=1 ;;
  esac
done

[ -f .env ] || cp .env.example .env

PY="$(command -v python3.12 || command -v python3.11 || command -v python3.10 || command -v python3)"
"$PY" -c 'import sys; assert sys.version_info >= (3, 10), "Python 3.10+ needed"' || exit 1

if [ ! -d .venv ]; then
  echo "==> Creating virtualenv"
  "$PY" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
if [ ! -f .venv/.deps-ok ] || [ backend/requirements.txt -nt .venv/.deps-ok ]; then
  echo "==> Installing Python packages"
  pip install -q --upgrade pip
  pip install -q -r backend/requirements.txt -r forum/requirements.txt
  touch .venv/.deps-ok
fi

command -v tesseract >/dev/null || echo "!! Tesseract OCR not found — image text won't be read. Install: sudo apt install tesseract-ocr tesseract-ocr-hin"

if [ ! -f frontend/dist/index.html ]; then
  if command -v npm >/dev/null; then
    echo "==> Building dashboard"
    (cd frontend && npm install --no-audit --no-fund && npm run build)
  else
    echo "!! npm not found and frontend/dist missing — install Node.js 18+"; exit 1
  fi
fi

if [ "$RESET" = 1 ]; then
  echo "==> Resetting collected data"
  rm -rf backend/data
fi

PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup EXIT INT TERM

if [ "$LOCAL_FORUM" = 1 ]; then
  echo "==> Starting local Charcha forum on http://localhost:8100"
  [ -f forum/data/charcha.db ] || (cd forum && python seed_forum.py)
  (cd forum && FORUM_MOD_TOKEN="$(grep -E '^FORUM_MOD_TOKEN=' "$ROOT/.env" | cut -d= -f2-)" \
     uvicorn forum_app:app --host 0.0.0.0 --port 8100 --log-level warning) &
  PIDS+=($!)
  export FORUM_URL=http://localhost:8100
  # replace a previously saved remote source with the local one
  sleep 1
fi

echo "==> MuleWatch command center: http://localhost:8000"
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level warning &
PIDS+=($!)
wait
