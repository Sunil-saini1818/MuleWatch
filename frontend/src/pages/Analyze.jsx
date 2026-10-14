import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, caseId } from "../api";
import { Icon, ScoreMeter } from "../components/ui";
import { Evidence } from "./CaseDetail";

const SAMPLES = [
  "HDFC current account available — full kit with ATM + passbook + net banking. KYC done, 15k. Telegram t.me/fastkit_99",
  "Bhai apna khata kiraye pe do, har mahine 25k milega. Sirf gaming ke liye use hoga. WhatsApp 98765 43210",
  "Beware: never sell or rent your bank account, it makes you a money mule. Report to 1930.",
  "Selling my old cycle, ₹3000. Call 91234 56780",
];

const SAMPLE_URLS = [
  { label: "Mule Kit Forum Ad (Local)", url: "http://localhost:8100/p/1" },
  { label: "Recruiter Poster Ad", url: "http://localhost:8100/p/6" },
  { label: "Passbook & Kit Ad", url: "http://localhost:8100/p/16" },
  { label: "Cyber Awareness Post", url: "http://localhost:8100/p/19" },
  { label: "Normal Community Post", url: "http://localhost:8100/p/21" },
];

const SAMPLE_QRS = [
  { label: "Mule UPI Intent", path: "/media/sample_qr_mule_upi.png", name: "sample_qr_mule_upi.png" },
  { label: "Crypto Deposit", path: "/media/sample_qr_crypto.png", name: "sample_qr_crypto.png" },
  { label: "Telegram Channel", path: "/media/sample_qr_telegram.png", name: "sample_qr_telegram.png" },
];

export function QrVerdictCard({ res }) {
  if (!res || !res.qr_metadata) return null;
  const qr = res.qr_metadata;
  const intelList = qr.intel || [];
  const level = res.risk_level || (res.risk_score >= 80 ? "Critical" : res.risk_score >= 55 ? "High" : res.risk_score >= 30 ? "Medium" : "Safe");
  const isHighOrCrit = level === "Critical" || level === "High";

  return (
    <div className={`qr-verdict-card ${isHighOrCrit ? "threat" : "safe"}`}>
      <div className="qr-verdict-top">
        <div className="qr-verdict-badge-group">
          <span className={`qr-status-badge ${level.toLowerCase()}`}>
            {level === "Critical" ? "CRITICAL" : level === "High" ? "HIGH" : level === "Medium" ? "MEDIUM" : "SAFE"}
          </span>
          <h3>QR Code Intelligence Verdict</h3>
        </div>
        <span className="qr-verdict-score">Risk Score: <b>{Math.round(res.risk_score || 0)}/100</b></span>
      </div>

      <div className="qr-verdict-meta-bar">
        <span><b>Detection:</b> {qr.decoder || "OpenCV Vision Pipeline"}</span>
        <span><b>Payloads Detected:</b> {qr.payloads?.length || 0}</span>
        {res.category && <span><b>Category:</b> {res.category}</span>}
      </div>

      {/* Decoded Payload Text */}
      <div className="qr-verdict-section">
        <div className="qr-sec-title">Decoded Payload Text</div>
        <div className="qr-payload-list-view">
          {(qr.payloads || []).map((p, idx) => (
            <div key={idx} className="qr-payload-code-box">
              <code>{p}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Extracted Indicators */}
      <div className="qr-verdict-section">
        <div className="qr-sec-title">Extracted Threat & Financial Indicators</div>
        <div className="qr-ind-grid">
          {intelList.map((item, idx) => (
            <div key={idx} className="qr-ind-card">
              <div className="qr-ind-header">
                <span className={`qr-ind-cat-pill ${item.is_fraud_indicator ? "fraud" : "neutral"}`}>
                  {item.category || "Payload Entity"}
                </span>
                <span className="qr-ind-type-pill">{item.type}</span>
              </div>
              <div className="qr-ind-table">
                {item.upi_id && (
                  <div className="qr-ind-row">
                    <span className="ind-k">Target UPI Handle:</span>
                    <span className="ind-v"><code className="hl-id">{item.upi_id}</code></span>
                  </div>
                )}
                {item.payee_name && (
                  <div className="qr-ind-row">
                    <span className="ind-k">Merchant / Payee Name:</span>
                    <span className="ind-v"><b>{item.payee_name}</b></span>
                  </div>
                )}
                {item.amount && (
                  <div className="qr-ind-row">
                    <span className="ind-k">Requested Amount:</span>
                    <span className="ind-v"><b>₹{item.amount}</b></span>
                  </div>
                )}
                {item.crypto_wallet && (
                  <div className="qr-ind-row">
                    <span className="ind-k">Crypto Wallet:</span>
                    <span className="ind-v"><code className="hl-id">{item.crypto_wallet}</code></span>
                  </div>
                )}
                {item.url && (
                  <div className="qr-ind-row">
                    <span className="ind-k">Destination URL / Channel:</span>
                    <span className="ind-v">
                      <a href={item.url} target="_blank" rel="noreferrer" className="ind-url">{item.url}</a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {res.id && (
        <div className="qr-case-saved-alert">
          <span>✓ Case logged to database as <b>{caseId(res.id)}</b>.</span>
          <Link to={`/case/${res.id}`} className="view-case-link">View Case Record →</Link>
        </div>
      )}
    </div>
  );
}

export default function Analyze() {
  const [mode, setMode] = useState("link");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [save, setSave] = useState(false);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const qrInputRef = useRef(null);

  const handleQrFile = (file) => {
    if (!file) return;
    setQrImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setQrPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const loadSampleQr = async (path, filename) => {
    try {
      const resp = await fetch(path);
      const blob = await resp.blob();
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      handleQrFile(file);
    } catch (e) {
      console.error("Failed to load sample QR", e);
    }
  };

  const run = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setRes(null);
    try {
      if (mode === "link") {
        setRes(await api.analyzeUrl(url, save));
      } else if (mode === "qr") {
        if (!qrImage) {
          setErr("Please select or drop a QR code image to analyze.");
          setBusy(false);
          return;
        }
        const f = new FormData();
        f.append("image", qrImage);
        f.append("save", save ? "true" : "false");
        const out = await api.analyzeQr(f);
        setRes(out);
      } else {
        const f = new FormData();
        f.append("text", text);
        f.append("save", save ? "true" : "false");
        if (image) f.append("image", image);
        setRes(await api.analyze(f));
      }
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  const canRun =
    mode === "link" ? url.trim().length > 3 :
    mode === "qr" ? Boolean(qrImage) :
    (text.trim() || image);
  const fetched = res?.fetch;

  return (
    <div>
      <div className="page-head">
        <h1>Check a post</h1>
        <p>Instant financial fraud scoring and threat indicator extraction for public posts, URLs, and QR codes.</p>
      </div>
      <form className="panel analyze" onSubmit={run}>
        <div className="seg mode-seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "link"} className={`seg-btn${mode === "link" ? " on-indigo" : ""}`} onClick={() => setMode("link")}>Link</button>
          <button type="button" role="tab" aria-selected={mode === "text"} className={`seg-btn${mode === "text" ? " on-indigo" : ""}`} onClick={() => setMode("text")}>Text or screenshot</button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "qr"}
            className={`seg-btn${mode === "qr" ? " on-indigo" : ""}`}
            onClick={() => setMode("qr")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon name="qrcode" size={14} /> Scan QR
          </button>
        </div>
        {mode === "link" ? (
          <>
            <input className="url-in" value={url} onChange={(e) => setUrl(e.target.value)} type="text" inputMode="url" autoFocus
              placeholder="http://localhost:8100/p/1, an image link, a forum post or a Telegram link" aria-label="Link to check" />
            <div className="samples" style={{ marginTop: "6px" }}>
              <span className="small muted">Samples:</span>
              {SAMPLE_URLS.map((s, i) => (
                <button type="button" key={i} onClick={() => setUrl(s.url)} title={s.url}>
                  {s.label}
                </button>
              ))}
            </div>
          </>
        ) : mode === "qr" ? (
          <div className="qr-dropzone-container">
            <div
              className={`qr-dropzone ${dragOver ? "dragover" : ""} ${qrImage ? "has-file" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.[0]) handleQrFile(e.dataTransfer.files[0]);
              }}
              onClick={() => !qrImage && qrInputRef.current?.click()}
            >
              <input
                ref={qrInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleQrFile(e.target.files[0])}
              />
              {qrPreview ? (
                <div className="qr-file-preview">
                  <img src={qrPreview} alt="QR Code Preview" className="qr-thumb" />
                  <div className="qr-file-info">
                    <span className="qr-file-name">{qrImage?.name}</span>
                    <span className="qr-file-size">{(qrImage?.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      className="btn-tiny btn-remove-qr"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQrImage(null);
                        setQrPreview(null);
                      }}
                    >
                      ✕ Remove image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="qr-dropzone-prompt">
                  <div className="qr-icon-circle">
                    <Icon name="qrcode" size={26} />
                  </div>
                  <h3>Upload or Drop QR Code Screenshot</h3>
                  <p>Drag and drop a QR image, or click to browse</p>
                  <span className="qr-browse-btn">Choose QR Image</span>
                </div>
              )}
            </div>

            <div className="samples" style={{ marginTop: "8px" }}>
              <span className="small muted">Samples:</span>
              {SAMPLE_QRS.map((s, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => loadSampleQr(s.path, s.name)}
                  title={`Load sample: ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste the post text here (English, Hindi or Hinglish)" />
            <div className="samples">
              <span className="small muted">Samples:</span>
              {SAMPLES.map((s, i) => <button type="button" key={i} onClick={() => setText(s)}>Sample {i + 1}</button>)}
            </div>
          </>
        )}
        <div className="analyze-row">
          {mode === "text" && <label className="file-in">Screenshot or poster <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)} /></label>}
          <label className="switch"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /><span>Save as a case</span></label>
          <button className="btn btn-primary" disabled={busy || !canRun}>
            {busy ? (
              mode === "link" ? "Opening link…" :
              mode === "qr" ? "Decoding QR…" : "Checking…"
            ) : (
              mode === "qr" ? "Decode & Analyze QR" : "Check post"
            )}
          </button>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
      </form>
      {res && (
        <div className="analyze-res">
          {res.qr_metadata?.detected && <QrVerdictCard res={res} />}
          {fetched && (
            <div className={`fetch-info${fetched.note ? " warn" : ""}`}>
              {fetched.already_tracked
                ? <>This link is already <Link to={`/case/${res.id}`}>{caseId(res.id)}</Link>. Showing that case.</>
                : <>Read from <a href={fetched.final_url} target="_blank" rel="noreferrer">{fetched.final_url}</a> using {fetched.how.toLowerCase()}{fetched.images ? `, with ${fetched.images} image${fetched.images > 1 ? "s" : ""}` : ""}.</>}
              {fetched.note && <p>{fetched.note}</p>}
            </div>
          )}
          <div className="case-head">
            <ScoreMeter score={res.risk_score} level={res.risk_level} />
            <div className="case-title">
              <div className="case-id">{res.category}{res.cluster_size > 1 && <span className="chip chip-ring">linked to {res.cluster_size - 1} other post{res.cluster_size > 2 ? "s" : ""}</span>}</div>
              <h1>{res.risk_level === "Low" ? "No strong signs of account or card selling" : "This looks like a suspicious financial ad"}</h1>
              <p className="case-meta">{res.platform}{res.author && <> · {res.author}</>}</p>
              {res.id && <p><Link to={`/case/${res.id}`}>Open {caseId(res.id)}</Link></p>}
            </div>
          </div>
          <Evidence p={res} />
        </div>
      )}
    </div>
  );
}
