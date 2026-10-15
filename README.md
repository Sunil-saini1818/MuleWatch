# MuleWatch 🛡️
### AI-Powered Financial Fraud Detection & Cyber Cell Enforcement Platform

[![Hackathon](https://img.shields.io/badge/Hackathon-IEEE%20Ignite%202026-blue.svg?style=for-the-badge)](https://github.com/Sunil-saini1818/MuleWatch)
[![Host](https://img.shields.io/badge/Host-SKIT%20Jaipur-orange.svg?style=for-the-badge)](https://www.skit.ac.in/)
[![Team](https://img.shields.io/badge/Team-Capycoders-green.svg?style=for-the-badge)](https://github.com/Sunil-saini1818/MuleWatch)
[![Problem ID](https://img.shields.io/badge/Problem%20ID-SKIT002-red.svg?style=for-the-badge)](https://github.com/Sunil-saini1818/MuleWatch)
[![Status](https://img.shields.io/badge/Status-Production--Ready%20Demo-brightgreen.svg?style=for-the-badge)](https://github.com/Sunil-saini1818/MuleWatch)

> **Submission for IEEE Ignite Hackathon 2026**  
> **Problem Statement SKIT002:** *AI-Based Detection of Suspicious Financial Advertisements*  
> **Host Institution:** Swami Keshvanand Institute of Technology, Management & Gramothan (SKIT Jaipur)  
> **Repository:** [https://github.com/Sunil-saini1818/MuleWatch](https://github.com/Sunil-saini1818/MuleWatch)  
> **Pitch Deck (PPTX):** [`MuleWatch_Presentation_IEEE_Ignite_2026.pptx`](MuleWatch_Presentation_IEEE_Ignite_2026.pptx)

---

## 📑 Table of Contents
1. [The Problem Statement](#-the-problem-statement)
2. [Our Solution (MuleWatch)](#-our-solution-mulewatch)
3. [End-to-End System Architecture & Workflow](#-end-to-end-system-architecture--workflow)
4. [Key Feature Highlights](#-key-feature-highlights)
5. [Technical Stack](#-technical-stack)
6. [Local Setup & Quick Start Guide](#-local-setup--quick-start-guide)
7. [Live 3-Minute Demonstration Script](#-live-3-minute-demonstration-script)
8. [Forensic & Legal Compliance (Section 65B)](#-forensic--legal-compliance-section-65b)
9. [Team Credits](#-team-credits)

---

## 🚨 The Problem Statement

India is witnessing an exponential surge in sophisticated digital financial fraud, catalyzed by an organized underground economy of **money mule accounts**. Organized cybercrime syndicates operate openly on social media platforms, Telegram channels, WhatsApp groups, and classified discussion forums:

* **Commercialized Mule Accounts:** Criminals actively recruit vulnerable individuals (students, gig workers, unemployed youths) through *"work-from-home"* or *"easy daily commission"* advertisements, renting or purchasing their savings accounts, corporate current accounts, debit cards, and pre-activated SIM cards.
* **Rapid Churning & Evasion:** Syndicates cycle through UPI QR codes, burner SIM cards, and Telegram accounts within hours. Dirty money from cyber heists, task scams, and fake loan apps is layered through multiple mule accounts before being withdrawn at ATMs or converted into cryptocurrency.
* **Manual Moderation Overload:** Law enforcement agencies (LEAs) and cyber cells face an insurmountable bottleneck—manual keyword searches lag **48–72 hours** behind fast-moving syndicates, by which time illicit funds have already vanished.
* **Multimodal Concealment:** Fraudsters bypass keyword filters by embedding payment details, phone numbers, and UPI QR codes inside banner images, flyers, and compressed video clips.

---

## 💡 Our Solution (MuleWatch)

**MuleWatch** transforms law enforcement from reactive responders into proactive interdictors. It is an end-to-end autonomous cyber intelligence platform that continuously harvests, extracts, classifies, and interdicts suspicious financial advertisements across digital channels in real time.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Multi-Source    │ ──▶ │ Multimodal AI    │ ──▶ │ Regional Map &   │ ──▶ │ 1-Click Cyber    │
│  Ingestion       │     │ OCR / QR / NLP   │     │ Syndicate Graph  │     │ Cell Dispatch    │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
  • Telegram Channels      • Tesseract OCR          • Rajasthan TopoJSON     • I4C Portal Format
  • Charcha Forum          • OpenCV QR Decoder      • Hotspot Risk Index     • Bank Account Lien
  • Citizen Bot / URLs     • De-obfuscated Regex    • Actor Linkage Rings    • Tamper-proof PDF
```

* **Automated Threat Surveillance:** Real-time ingestion from dark/public forums, Telegram channels, and single submitted URLs.
* **Multimodal Extraction:** Deep visual text extraction (OCR) and instant QR code decoding uncover hidden UPI VPA addresses (`upi://pay?pa=...`) and masked account numbers.
* **Explainable AI Risk Scoring:** A hybrid scoring engine (domain heuristics + character n-gram NLP) assigns instant risk tiers (*Low, Medium, High, Critical*) with complete component transparency.
* **Judicial Enforcement Readiness:** Instantly packages captured evidence into court-admissible PDF dossiers with digital SHA-256 fingerprinting, origin IP tracking, and one-click dispatch to the National Cyber Crime Reporting Portal (I4C).

---

## 🏗️ End-to-End System Architecture & Workflow

### Step 1: Multi-Source Ingestion Engine
* **Telegram MTProto Client (`telethon`):** Continuously monitors underground fraud discussion channels, capturing raw text, forwarded messages, author IDs, and embedded media assets.
* **Charcha Community Forum Crawler:** Polls discussion boards (e.g. `http://103.155.85.18:8100`) via structured `schema.org/DiscussionForumPosting` JSON-LD parsing, scanning both top-level posts and nested comments.
* **Citizen Reporting Telegram Bot:** Enables citizens to forward suspicious messages, links, or screenshots directly to the engine for instant risk verdicts.
* **On-Demand URL / Image Analyzer:** Allows investigators to paste any public URL or upload screenshot flyers for deep scanning.

### Step 2: Multimodal Extraction & Analysis
* **De-Obfuscation Engine:** Identifies leetspeak and deliberate character-spacing tricks used to evade keyword filters (e.g., `s@vings acc0unt`, `a.t.m r3ady`, `k-y-c d-o-n-e`, `घर बैठे कमाई`).
* **Entity Extraction:** High-precision regex pattern matchers extract Indian mobile numbers (`+91`), bank IFSC codes, masked account numbers, WhatsApp links, and cryptocurrency wallet addresses.
* **Tesseract OCR (Eng + Hin):** Image pre-processing (adaptive thresholding and contrast normalization) reads embedded poster text from image flyers.
* **OpenCV / PyZBar QR Decoding:** Decodes raw UPI strings directly from QR payment codes embedded in banners.
* **Explainable Hybrid Risk Scoring:** 
  $$\text{Risk Score} = \text{Noisy-OR}(\text{Rule Engine}, \text{Character n-gram Naive Bayes}, \text{Visual Cues})$$
  Distinguishes between actual mule syndicates and public awareness warnings/legitimate second-hand goods.

### Step 3: Regional Intelligence & Syndicate Linkage
* **Rajasthan District-Level Intelligence Map:** Localized vector TopoJSON rendering of Rajasthan administrative districts, displaying live regional hotspot metrics (Jaipur, Bharatpur, Alwar, Mewat corridor).
* **Mule Syndicate Graph (Entity Clustering):** Uses MinHash-LSH and connected-components algorithms to cluster posts sharing identical UPI handles, phone numbers, bank details, or image perceptual hashes into unified criminal rings.

### Step 4: Enforcement & Cyber Cell Dispatch
* **Cyber Cell Dispatch Queue:** Confirmed fraud cases automatically route into a dedicated nodal dispatch stream.
* **Court-Admissible Evidence Dossier:** Generates standardized PDF reports containing post URLs, origin IP addresses, actor handles, device user-agents, and forensic timestamps.
* **SHA-256 Digital Fingerprint:** Cryptographically seals all evidence records at capture time to satisfy **Section 65B of the Indian Evidence Act**.
* **One-Click Nodal Dispatches:** Triggers simulated webhooks to the **National Cyber Crime Reporting Portal (I4C)** and dispatches urgent account lien notices to partner banks.
* **Reversible State Machine Guardrails:** Safe two-way workflow (`Confirm Fraud` ⇄ `Revert to Draft`) prevents accidental enforcement actions.

---

## ⚡ Key Feature Highlights

### 🗺️ 1. Rajasthan District Intelligence Map
* **Gapless Vector TopoJSON:** High-precision SVG polygon rendering of all Rajasthan districts with zero seam distortion.
* **Hyper-Local Threat Telemetry:** Reflects authentic cybercrime corridor dynamics (e.g., Alwar/Bharatpur financial fraud clusters).
* **Dynamic Hover & Drill-Down:** Hovering or clicking any district updates the summary telemetry: *Active Fraud Alerts*, *Suspected Mule Accounts*, *Flagged Volume (₹)*, and *Lien Action Status*.

### 🔍 2. Multimodal Analyzer ("Check a Post")
* **Three-Way Input Hub:** Supports **Direct Web URL**, **Raw Text**, and **Image Flyer Upload**.
* **Visual QR-to-UPI Extraction:** Immediately unpacks graphic flyers, extracting hidden merchant VPAs and beneficiary names.
* **Zero-False-Positive Filtering:** Awareness filter detects public advisories warning against fraud, preventing erroneous alerts.

### ⚖️ 3. Cyber Cell Dispatch & Nodal Enforcement Queue
* **Investigator Triage Reduction:** Reduces manual verification timeline from **48–72 hours to under 3 minutes**.
* **Automated Takedowns:** One-click integration sends take-down webhooks directly to host platforms, blurring offending posts with an official Cyber Cell warning notice.
* **Evidence PDF Export:** Complete case dossier compiled with ReportLab, featuring cryptographic hashes, raw screenshots, and investigator signatures.

### 🕸️ 4. Seller Network Graph
* **Interactive D3 Force Graph:** Visualizes cross-platform actor connections.
* **Syndicate Unmasking:** Discovers when different usernames across Telegram and web forums share the same underlying bank account or UPI address.

---

## 🛠️ Technical Stack

| Domain | Technologies & Libraries |
| :--- | :--- |
| **Frontend UI / UX** | React 18, Vite, Tailwind CSS, Lucide React Icons |
| **Geospatial & Graphs** | Custom TopoJSON / GeoJSON SVG Topologies, D3.js Force Simulation |
| **Backend API Core** | Python 3.12, FastAPI (Asynchronous ASGI), Uvicorn |
| **Database & Cache** | SQLite in WAL (Write-Ahead Logging) Mode, In-Memory Ring Graph |
| **Computer Vision & OCR** | PyTesseract (Tesseract OCR eng+hin), OpenCV (`cv2`), Pillow (`PIL`) |
| **QR Code Extraction** | PyZBar, NumPy |
| **NLP & Deduplication** | Regex De-obfuscation Engine, Character n-gram Naive Bayes, Datasketch MinHash-LSH |
| **Network & Ingestion** | Telethon (Telegram MTProto), HTTPX, BeautifulSoup4, Schema.org Parser |
| **Forensic Reporting** | ReportLab (PDF Engine), SHA-256 Digest Engine |

---

## 🚀 Local Setup & Quick Start Guide

### Prerequisites
* **Operating System:** Linux, macOS, or Windows (WSL2 recommended)
* **Python:** 3.10+ (Python 3.12 recommended)
* **Node.js:** 18+ and `npm`
* **System OCR:** Tesseract OCR with Hindi support
  * **Ubuntu/Debian:** `sudo apt update && sudo apt install -y tesseract-ocr tesseract-ocr-hin`
  * **macOS:** `brew install tesseract tesseract-lang`

---

### Step-by-Step Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/Sunil-saini1818/MuleWatch.git
cd MuleWatch
```

#### 2. Configure Environment Variables
```bash
cp .env.example .env
```
*(The default `.env` is pre-configured with the live demo forum credentials: `http://103.155.85.18:8100` and `FORUM_MOD_TOKEN=skit-cybercell-2026`).*

#### 3. One-Click Automated Startup (Recommended)
MuleWatch comes with an all-in-one launcher script that automatically provisions the Python virtual environment, installs backend/frontend dependencies, and starts all services:

```bash
chmod +x run.sh
./run.sh --local-forum
```
* **Command Center Dashboard:** Open [http://localhost:8000](http://localhost:8000)
* **Charcha Target Forum (Local Mirror):** [http://localhost:8100](http://localhost:8100)

---

### Manual Service-by-Service Execution

#### Backend (FastAPI)
```bash
# Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python requirements
pip install -r backend/requirements.txt

# Start FastAPI ASGI server
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend (React + Vite)
```bash
# In a separate terminal
cd frontend
npm install
npm run dev
# Vite runs at http://localhost:5173 (proxied to API on :8000)
```

#### Offline Backup Forum (Optional)
```bash
# To run the target forum locally on :8100
cd forum
python -m venv .venv_forum && source .venv_forum/bin/activate
pip install -r requirements.txt
python -m uvicorn app:app --port 8100
```

---

## 🎬 Live 3-Minute Demonstration Script

Follow this sequence to showcase MuleWatch to hackathon judges:

1. **Command Center Overview (0:00 - 0:45):**
   * Open the dashboard on [http://localhost:8000](http://localhost:8000). Show active crawler status, real-time threat stream, and critical alerts.
   * Turn **Sound ON** in the top bar.

2. **Live Threat Injection & Instant Detection (0:45 - 1:30):**
   * Open the **Charcha Community Forum** ([http://103.155.85.18:8100](http://103.155.85.18:8100)) and submit a new post:
     > *"Kotak current account full kit ready with ATM card and net banking. Daily transaction limit 10L. Contact Telegram @kitwala_jpr"*
   * Within **3 seconds**, MuleWatch chimes with a **Critical Alert** toast on the dashboard.
   * The post is automatically clustered into the **`kitwala` seller ring** because the Telegram handle matches prior actor intelligence.

3. **Multimodal OCR & QR Extraction (1:30 - 2:15):**
   * Navigate to **Check a Post** ➔ **Scan QR / Image**.
   * Upload an ad flyer containing an obfuscated UPI QR code.
   * Show instant extraction of the raw `upi://pay?pa=...` identifier, bank IFSC, and risk score breakdown.

4. **Regional Intelligence & Dispatch (2:15 - 3:00):**
   * Navigate to **Regional Intelligence (Rajasthan)**: Show interactive hover metrics on Jaipur, Alwar, and Bharatpur.
   * Open the case in **Cases** ➔ Click **Confirm Fraud**.
   * Switch to **Cyber Cell Dispatch**: View the case queued for enforcement.
   * Click **Download Evidence Report (PDF)**: Open the generated report showing SHA-256 seal, actor metadata, origin IP, and user-agent.
   * Click **Dispatch to I4C**: Triggers simulated automated cyber cell interdiction.

---

## ⚖️ Forensic & Legal Compliance (Section 65B)

Evidence collected by MuleWatch is architected to satisfy the stringent evidentiary requirements of **Section 65B of the Indian Evidence Act**:

1. **SHA-256 Cryptographic Sealing:** Every raw HTML capture, image binary, and OCR transcript is digested into an immutable SHA-256 checksum at the exact millisecond of ingestion.
2. **Metadata Preservation:** Records origin IP address, target server headers, timestamp in ISO-8601 UTC, and device user-agents.
3. **Chain of Custody:** Tracks investigator actions (*Case Opened, Fraud Confirmed, Dispatch Triggered, Takedown Dispatched*) in an append-only audit log.

---

## 👥 Team Credits

Developed with ❤️ for **IEEE Ignite Hackathon 2026** at **SKIT Jaipur**.

* **Team Name:** `Capycoders`
* **Problem ID:** `SKIT002`
* **Institution:** Swami Keshvanand Institute of Technology, Management & Gramothan (SKIT Jaipur)
* **GitHub Repository:** [https://github.com/Sunil-saini1818/MuleWatch](https://github.com/Sunil-saini1818/MuleWatch)
* **Pitch Deck:** [`MuleWatch_Presentation_IEEE_Ignite_2026.pptx`](MuleWatch_Presentation_IEEE_Ignite_2026.pptx)

---
*MuleWatch — Autonomous Cyber Defense Protecting India's Digital Financial Ecosystem.*
