import { useState } from "react";
import { Link } from "react-router-dom";
import { api, caseId } from "../api";
import { ScoreMeter } from "../components/ui";
import { Evidence } from "./CaseDetail";

const SAMPLES = [
  "HDFC current account available — full kit with ATM + passbook + net banking. KYC done, 15k. Telegram t.me/fastkit_99",
  "Bhai apna khata kiraye pe do, har mahine 25k milega. Sirf gaming ke liye use hoga. WhatsApp 98765 43210",
  "Beware: never sell or rent your bank account, it makes you a money mule. Report to 1930.",
  "Selling my old cycle, ₹3000. Call 91234 56780",
];

export default function Analyze() {
  const [mode, setMode] = useState("link");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState(null);
  const [save, setSave] = useState(false);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setRes(null);
    try {
      if (mode === "link") {
        setRes(await api.analyzeUrl(url, save));
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

  const canRun = mode === "link" ? url.trim().length > 3 : (text.trim() || image);
  const fetched = res?.fetch;

  return (
    <div>
      <div className="page-head">
        <h1>Check a post</h1>
        <p>Paste a link to a post, ad, Telegram post or image, or paste the text and a screenshot. You get the verdict and the evidence in a few seconds.</p>
      </div>
      <form className="panel analyze" onSubmit={run}>
        <div className="seg mode-seg" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "link"} className={`seg-btn${mode === "link" ? " on-indigo" : ""}`} onClick={() => setMode("link")}>Link</button>
          <button type="button" role="tab" aria-selected={mode === "text"} className={`seg-btn${mode === "text" ? " on-indigo" : ""}`} onClick={() => setMode("text")}>Text or screenshot</button>
        </div>
        {mode === "link" ? (
          <>
            <input className="url-in" value={url} onChange={(e) => setUrl(e.target.value)} type="text" inputMode="url" autoFocus
              placeholder="https://t.me/channel/123, an OLX/Facebook/Instagram/X post, a forum post or an image link" aria-label="Link to check" />
            <p className="hint-line">MuleWatch opens the link like a browser, reads the post text, the link-preview details and any pictures (text in images is read by OCR). Pages that need a login may show little; use the text tab or the Chrome extension for those.</p>
          </>
        ) : (
          <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste the post text here (English, Hindi or Hinglish)" />
            <div className="samples">Try: {SAMPLES.map((s, i) => <button type="button" key={i} onClick={() => setText(s)}>sample {i + 1}</button>)}</div>
          </>
        )}
        <div className="analyze-row">
          {mode === "text" && <label className="file-in">Screenshot or poster <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)} /></label>}
          <label className="switch"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /><span>Save as a case</span></label>
          <button className="btn btn-primary" disabled={busy || !canRun}>{busy ? (mode === "link" ? "Opening link…" : "Checking…") : "Check post"}</button>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
      </form>
      {res && (
        <div className="analyze-res">
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
