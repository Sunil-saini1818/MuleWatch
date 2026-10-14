# MuleWatch — AI detection of suspicious financial advertisements

**IEEE-IGNITE Hackathon 2026 · Problem SKIT002 · AI-Based Detection of Suspicious Financial Advertisements**

MuleWatch watches public platforms in real time for posts that sell or rent **bank accounts, ATM/debit/credit cards, current/savings accounts and "full kits"** (passbook + ATM + net banking + SIM) — the supply chain of money-mule accounts used to launder cyber-fraud money. It flags them with an explainable risk score, links posts from the same seller network, alerts investigators within seconds, and produces a court-ready evidence report.

The repo contains two apps:

| App | What it is | Runs on |
|---|---|---|
| **MuleWatch command center** (`backend/` + `frontend/`) | Crawler, detection engine, investigation dashboard | Investigator's laptop — `http://localhost:8000` |
| **Charcha forum** (`forum/`) | A Reddit-style public community forum with 50 seeded posts, used as the live target for the demo | Public server — `http://103.155.85.18:8100` |

---

## How each expected outcome is met

| Expected outcome | How MuleWatch does it |
|---|---|
| Collect publicly available ad data | Live crawler polls monitored sources every 3 s and reads **every new post and every new comment** (sellers often hide ads in comments; each comment is scored as its own case and can be taken down on its own). Forum crawler reads the schema.org `DiscussionForumPosting` JSON-LD real sites publish; Telegram crawler reads public channel previews (`t.me/s/<channel>`). **Any single link** can be checked (post, ad, Telegram post, web page or image) or added as a monitored page that's re-checked every minute. Plus manual check page and a Chrome extension. |
| Identify keywords, images, phone numbers, URLs, payment details | Multilingual lexicon (English, Hindi, Hinglish) with obfuscation handling (`acc0unt`, `a.t.m`, `r3ady`); extraction of Indian phone numbers in any grouping, UPI IDs, Telegram/WhatsApp links, IFSC, card numbers (masked), crypto wallets, short links, prices; **OCR** (Tesseract, eng+hin) on images. |
| Classify ads by risk indicators | Hybrid score = noisy-OR of rule engine, character n-gram text classifier, image cues (and optional Claude second opinion) → Low / Medium / High / Critical, with categories: Mule Account Sale, Account-Holder Recruitment, Card Sale, KYC Fraud. |
| Detect repeated / coordinated ads | MinHash-LSH near-duplicate text, perceptual-hash reposted images (catches cropped/tinted copies), and shared identifiers → connected "seller rings" with a ring boost. Interactive network graph. |
| Provide evidence / context | Every flagged post shows highlighted words, extracted identifiers, OCR text, a per-component score breakdown, linked posts and *why* they're linked. SHA-256 evidence hash at capture time. One-click PDF evidence report. |
| Alerts + investigation dashboard | Server-Sent Events push alerts to the command center instantly (toast + sound), optional Telegram bot push, case management with verdicts, watchlist, and **request takedown** that marks the post on the forum as under Cyber Cell review. |

Extras that matter to investigators: **feedback loop** (Confirm / False positive updates per-keyword precision and retrains the model live), **watchlist** (known numbers/UPI IDs force an alert), **awareness detection** (posts that *warn* about mule accounts are not flagged), and a card photo posted by a student is not treated like a card being sold.

### Results on unseen data
The text model is trained on a separate generated corpus (`backend/training/training_data.jsonl`, 660 examples). On the 50 forum posts and 17 comments it has never seen (19 mule, card or easy-money items, 48 normal or tricky look-alikes):

```
TP 19  FP 0  TN 48  FN 0   precision 1.00  recall 1.00     (python training/evaluate.py)
```
It's a small synthetic set, so treat this as a sanity check rather than a benchmark.

---

## Run it (laptop)

Needs Python 3.10+, Node 18+ (only to rebuild the UI), and Tesseract for OCR.

```bash
sudo apt install tesseract-ocr tesseract-ocr-hin     # OCR (recommended)
git clone https://github.com/vikashdhankar/mulewatch && cd mulewatch
cp .env.example .env        # set FORUM_URL / FORUM_MOD_TOKEN (and optional Telegram bot)
./run.sh                    # → http://localhost:8000
```

* `./run.sh --local-forum` also starts the forum locally on :8100 — **offline backup** if the venue Wi-Fi or server fails.
* `./run.sh --reset` clears collected cases (the forum keeps its posts).
* `./run.sh --port 8010` picks a port (if 8000 is busy, the next free port is used automatically).
* The command center has no login, so it listens on this laptop only. `./run.sh --lan` exposes it to the local network.
* Dev mode for the UI: `cd frontend && npm run dev` (proxies the API on :8000).
* Tests: `cd backend && python -m pytest -q`

### Optional: Telegram alerts on your phone
1. Telegram → **@BotFather** → `/newbot` → copy the token.
2. Send any message to your new bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id`.
3. Put both in `.env` as `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`, restart. Critical alerts now arrive on your phone (the first crawl of a source doesn't push old posts).

### Optional: AI analyst
Set `ANTHROPIC_API_KEY` in `.env` to add a Claude second opinion (text + image) to manual checks on the "Check a post" page. Everything works offline without it.

---

## Forum on the server (CyberPanel)

The forum runs as its own systemd service on **port 8100**, so it doesn't touch the websites CyberPanel serves on 80/443.

```bash
# from your laptop
scp -r mulewatch/forum mulewatch/deploy root@103.155.85.18:/opt/charcha-src/
# on the server
sudo FORUM_MOD_TOKEN=skit-cybercell-2026 bash /opt/charcha-src/deploy/setup-forum-server.sh
```
Then allow TCP 8100 in **CyberPanel → Security → Firewall** (and in your hosting provider's firewall, if any).

* Logins: `demo / demo123`, `judge1`, `judge2`, `judge3` / `demo123`
* Reset the forum to the 50 original posts: `sudo RESEED=1 bash /opt/charcha-src/deploy/setup-forum-server.sh`
* Logs: `journalctl -u charcha -f`
* `FORUM_MOD_TOKEN` must be the same on the server and in the laptop's `.env` for takedowns to work.

The forum is marked as a demo sandbox, sends `noindex`, and blocks crawlers in robots.txt. All users, phone numbers, handles and banks in the seed data are fictional.

---

## Demo guide
Full step-by-step demonstration guide with setup commands, URLs, script and troubleshooting: [`docs/MuleWatch_Demo_Guide.pdf`](docs/MuleWatch_Demo_Guide.pdf) (also as Word).

## 3-minute demo script

1. **Command center** on the projector: 67 posts and comments scanned, 18 critical, 4 seller rings. Turn **Sound on**.
2. Hand a judge your phone with **Charcha** open, logged in as `judge1`. Ask them to post anything, e.g. in c/GamingAdda:
   > *Kotak current account kit ready, net banking + ATM, KYC done. 16k. Telegram t.me/kitwala_jpr*

   Within ~3 seconds a **Critical** alert slides in with a chime — and the post has already joined the existing **kitwala ring** because it reuses that Telegram handle.
3. Ask a second judge to post something harmless (*"Selling my cycle, 3000, call …"*) — it shows up in the feed as Low and raises no alert.
4. Image trick: post only a poster image with the text "DM karo" (use `forum/seed/images/kit_poster_repost.jpg`). OCR reads the poster, perceptual hashing matches it to the original poster, and it lands in the same ring.
5. Open the case: highlighted evidence, OCR text, score breakdown, linked posts → **Seller network** shows the ring.
6. Click **Request takedown** → refresh the forum post: it's blurred with a Cyber Cell notice. Click **Evidence report (PDF)**.
7. Click **False positive** on a borderline case to show the model retraining and rescoring live.

Backup lines for questions: the Hindi post (`घर बैठे कमाई का मौका`), the obfuscated `s@vings acc0unt + a.t.m r3ady`, and the awareness PSA that mentions every keyword but stays Low.

---

## Architecture

```
 Charcha forum / Telegram public channels / browser extension / manual check
                 │  crawl every 3 s (JSON-LD, t.me/s), download images
                 ▼
  Extraction ── keywords (en/hi/Hinglish, de-obfuscation) · phones · UPI · links · IFSC · cards · wallets
      │         OCR (Tesseract eng+hin) · perceptual hash
      ▼
  Scoring ──── rule engine + char-n-gram Naive Bayes + image cues (+ Claude, optional) → noisy-OR
      ▼
  Coordination ── MinHash LSH text · pHash images · shared identifiers → union-find rings → ring boost
      ▼
  Alerts (SSE → dashboard toast/sound, Telegram bot) · cases · watchlist · PDF evidence · takedown API
      ▲
  Investigator verdicts → per-term precision + model retrain → rescore everything
```

| Path | Contents |
|---|---|
| `backend/app/extract.py` | Lexicon matching, de-obfuscation, entity regexes |
| `backend/app/lexicon.json` | Indicator vocabulary and weights (edit freely) |
| `backend/app/scoring.py` | Hybrid explainable scoring |
| `backend/app/ml.py` | Character n-gram Naive Bayes |
| `backend/app/coordination.py` | Ring detection |
| `backend/app/crawler.py` | Forum + Telegram crawlers, takedown call |
| `backend/app/report.py` | PDF evidence report |
| `frontend/src/` | React command center |
| `forum/` | Charcha forum + seed data + image generator |
| `extension/` | Chrome extension (load unpacked) |
| `deploy/` | Server setup script |

## Checking a single link
**Check a post → Link**: paste any public link — a forum post, a Telegram post (`t.me/channel/123`), an OLX / Facebook / Instagram / X page, any web page, or a direct image link. MuleWatch reads schema.org data, link-preview (Open Graph) data and the page text, downloads up to 3 images and reads them with OCR, then scores it like any other post. Turn on *Save as a case* to keep it (the same link isn't saved twice). Pages behind a login return little; use the Chrome extension's *Check this page* for those, since it reads the page as you see it.

To keep watching one page (an ad, a profile or a listing), add it in **Monitored sources** as *Single web page*. It's re-checked every minute (`PAGE_INTERVAL`) and a new case is created whenever its content changes. Links to local or private network addresses are refused, except the demo forum.

API: `POST /api/analyze/url {"url": "...", "save": true}`

## Chrome extension
`chrome://extensions` → enable Developer mode → **Load unpacked** → select `extension/`. Right-click on any site:
* selected text or an image → *Check … with MuleWatch*
* a link → *Check this link with MuleWatch* (the command center fetches it)
* the page itself → *Check this page with MuleWatch* (reads the page as you see it, so it works on pages that need a login)

The verdict appears as a notification and a badge on the page, and the case is saved in the command center.

## Responsible use
MuleWatch is decision support for investigators. Scores and links are leads, not proof; every case needs human verification before action. Only publicly available content is collected.
