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
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [save, setSave] = useState(false);
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const f = new FormData();
    f.append("text", text);
    f.append("save", save ? "true" : "false");
    if (image) f.append("image", image);
    try { setRes(await api.analyze(f)); } catch (x) { setErr(x.message); }
    setBusy(false);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Check a post</h1>
        <p>Paste an ad or upload a screenshot from WhatsApp, Telegram, Instagram or anywhere else. You get the verdict and the evidence in a few seconds.</p>
      </div>
      <form className="panel analyze" onSubmit={run}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste the post text here (English, Hindi or Hinglish)" />
        <div className="samples">Try: {SAMPLES.map((s, i) => <button type="button" key={i} onClick={() => setText(s)}>sample {i + 1}</button>)}</div>
        <div className="analyze-row">
          <label className="file-in">Screenshot or poster <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)} /></label>
          <label className="switch"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /><span>Save as a case</span></label>
          <button className="btn btn-primary" disabled={busy || (!text.trim() && !image)}>{busy ? "Checking…" : "Check post"}</button>
        </div>
        {err && <p className="err">{err}</p>}
      </form>
      {res && (
        <div className="analyze-res">
          <div className="case-head">
            <ScoreMeter score={res.risk_score} level={res.risk_level} />
            <div className="case-title">
              <div className="case-id">{res.category}</div>
              <h1>{res.risk_level === "Low" ? "No strong signs of account or card selling" : "This looks like a suspicious financial ad"}</h1>
              {save && <p><Link to={`/case/${res.id}`}>Saved as {caseId(res.id)}</Link></p>}
            </div>
          </div>
          <Evidence p={res} />
        </div>
      )}
    </div>
  );
}
