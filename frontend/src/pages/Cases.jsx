import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, LEVELS } from "../api";
import { Empty, PostRow } from "../components/ui";
import { useLive } from "../live";

const CATEGORIES = ["Mule Account Sale", "Account-Holder Recruitment", "Card Sale", "KYC Fraud", "Easy-Money Lure", "Reported Fraud Attempt", "Suspicious Financial Ad", "Benign"];

export default function Cases() {
  const [sp, setSp] = useSearchParams();
  const { version } = useLive();
  const [data, setData] = useState({ total: 0, items: [] });
  const [q, setQ] = useState(sp.get("q") || "");
  const levels = (sp.get("level") || "").split(",").filter(Boolean);
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); };

  const activePlatform = sp.get("platform") || sp.get("source_platform") || "";

  useEffect(() => {
    api.posts({
      level: sp.get("level"), category: sp.get("category"), q: sp.get("q"), label: sp.get("label"),
      source: sp.get("source"), platform: sp.get("platform"), source_platform: sp.get("source_platform"),
      cluster: sp.get("cluster"), sort: sp.get("sort") || "risk", limit: 200
    }).then(setData).catch(() => {});
  }, [sp, version]);

  const toggleLevel = (l) => {
    const next = levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l];
    set("level", next.join(","));
  };

  const clearPlatform = () => {
    const n = new URLSearchParams(sp);
    n.delete("platform");
    n.delete("source_platform");
    setSp(n, { replace: true });
  };

  return (
    <div>
      <div className="page-head">
        <h1>Cases</h1>
        <p>
          {data.total} post{data.total === 1 ? "" : "s"} match
          {activePlatform ? ` on ${activePlatform}` : ""}. Open one to see the evidence and record a verdict.
        </p>
      </div>

      {activePlatform && (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#e0e7ff", color: "#3730a3", padding: "4px 12px", borderRadius: "16px", fontSize: "0.85rem", fontWeight: 600, marginBottom: "14px" }}>
          <span>Filtered by Platform: <b>{activePlatform}</b></span>
          <button onClick={clearPlatform} style={{ background: "none", border: "none", cursor: "pointer", color: "#3730a3", fontWeight: "bold", padding: 0, marginLeft: "4px" }} title="Clear platform filter">✕</button>
        </div>
      )}
      <div className="filters">
        <div className="seg">
          {LEVELS.map((l) => (
            <button key={l} className={`seg-btn lv-${l.toLowerCase()}${levels.includes(l) ? " on" : ""}`} onClick={() => toggleLevel(l)}>{l}</button>
          ))}
        </div>
        <select value={sp.get("category") || ""} onChange={(e) => set("category", e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={sp.get("label") || ""} onChange={(e) => set("label", e.target.value)} aria-label="Verdict">
          <option value="">Any verdict</option>
          <option value="pending">Not reviewed</option>
          <option value="confirmed">Confirmed</option>
          <option value="false_positive">False positive</option>
        </select>
        <select value={sp.get("source") || ""} onChange={(e) => set("source", e.target.value)} aria-label="Source">
          <option value="">Any source</option>
          <option value="forum">Forum posts and comments</option>
          <option value="citizen">Citizen reports</option>
          <option value="url">Checked links</option>
          <option value="page">Monitored pages</option>
          <option value="manual">Manual checks</option>
          <option value="extension">Chrome extension</option>
          <option value="telegram">Telegram channels</option>
        </select>
        <select value={sp.get("sort") || "risk"} onChange={(e) => set("sort", e.target.value)} aria-label="Sort">
          <option value="risk">Highest risk first</option>
          <option value="recent">Newest first</option>
        </select>
        <form onSubmit={(e) => { e.preventDefault(); set("q", q); }} className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search text, phone, UPI, author" />
        </form>
        {sp.get("cluster") && <button className="chip chip-ring" onClick={() => set("cluster", "")}>Ring {sp.get("cluster")} ✕</button>}
      </div>
      <div className="list">
        {data.items.length ? data.items.map((p) => <PostRow key={p.id} p={p} />)
          : <Empty title="No cases match these filters">Clear a filter or wait for new posts.</Empty>}
      </div>
    </div>
  );
}
