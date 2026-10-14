import { useEffect, useState } from "react";
import { api, caseId, timeAgo } from "../api";
import { Icon, RiskBadge, formatStatusBadge } from "../components/ui";
import { useLive } from "../live";
import { Link } from "react-router-dom";
import { BotPanel } from "../components/ReportBot";

export default function Sources() {
  const { version } = useLive();
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [kind, setKind] = useState("forum");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => { api.sources().then(setData); api.alerts().then(setAlerts); api.stats().then(setStats); };
  useEffect(load, [version]);
  useEffect(() => { const t = setInterval(() => api.sources().then(setData), 4000); return () => clearInterval(t); }, []);

  const add = async (e) => {
    e.preventDefault();
    try { setData(await api.addSource(kind, url, "")); setUrl(""); setMsg(""); } catch (x) { setMsg(x.message); }
  };
  const [pollerBusy, setPollerBusy] = useState(false);
  const sys = stats?.system;
  const tgPoller = data?.telegram_poller;

  const triggerPoller = async () => {
    setPollerBusy(true);
    try {
      const res = await api.telegramPollNow(10);
      setMsg(`Telegram poll cycle complete: ${res.new_cases} new intercept(s) processed.`);
      load();
    } catch (e) {
      setMsg(`Telegram poll error: ${e.message}`);
    }
    setPollerBusy(false);
  };

  return (
    <div>
      <div className="page-head">
        <h1>Monitored sources</h1>
        <p>Active crawler targets and scheduled ingestion feeds.</p>
      </div>

      <div className="panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", marginBottom: "16px", background: "#f8f9ff", borderLeft: "4px solid #4f46e5" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="status-pill ok-text" style={{ padding: "3px 10px", fontSize: "0.85rem", background: "#e0e7ff", color: "#3730a3", fontWeight: 600 }}>
              Telegram Poller: Active
            </span>
            <span className="small muted">
              Interval: Every {Math.round((tgPoller?.interval_seconds || 600) / 60)}m (Last 10m window)
            </span>
          </div>
          <div className="small muted" style={{ marginTop: "4px" }}>
            Last synced: <b>{tgPoller?.last_sync ? timeAgo(tgPoller.last_sync) : "just now"}</b>
            {tgPoller?.total_messages_polled != null && ` · ${tgPoller.total_messages_polled} msgs checked · ${tgPoller.total_fraud_detected || 0} fraud detected`}
            {tgPoller?.channels_monitored?.length > 0 && ` · Monitoring: ${tgPoller.channels_monitored.map(c => `@${c}`).join(", ")}`}
          </div>
        </div>
        <div>
          <button type="button" className="btn small" disabled={pollerBusy} onClick={triggerPoller} title="Poll Telegram channels now for messages received in the last 10 minutes">
            <Icon name="refresh" size={14} /> {pollerBusy ? "Polling…" : "Poll Telegram Now"}
          </button>
        </div>
      </div>
      <section className="panel">
        <table className="tbl">
          <thead><tr><th>Source</th><th>Address</th><th>Status</th><th>Last crawl</th><th>Posts collected</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>{data?.sources.map((s) => {
            const isOffline = s.last_status?.startsWith("offline") || s.last_status?.startsWith("error");
            const isDegraded = s.last_status?.startsWith("degraded");
            const badgeClass = isOffline ? "err" : isDegraded ? "warn-text" : "ok-text";
            return (
              <tr key={s.id}>
                <td><strong>{s.name}</strong> <span className="chip" style={{ fontSize: "11px", textTransform: "capitalize" }}>{s.kind}</span></td>
                <td><code>{s.url}</code></td>
                <td>
                  <span className={`status-pill ${badgeClass}`} style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: "0.85rem", background: isOffline ? "#ffebee" : isDegraded ? "#fff8e1" : "#e8f5e9" }}>
                    {formatStatusBadge(s.last_status)}
                  </span>
                </td>
                <td>{timeAgo(s.last_crawl)}</td>
                <td>{s.items_seen}</td>
                <td><label className="switch"><input type="checkbox" checked={s.enabled} onChange={async (e) => setData(await api.toggleSource(s.id, e.target.checked))} /><span /></label></td>
                <td>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button type="button" className="btn small" title="Retry Connection" onClick={async () => {
                      try {
                        setData(await api.retrySource(s.id));
                        setMsg(`Retried source ${s.name}`);
                      } catch (err) {
                        setMsg(`Retry failed: ${err.message}`);
                      }
                    }}>
                      <Icon name="refresh" size={14} /> Retry
                    </button>
                    {s.name !== "Charcha public forum" && (
                      <button type="button" className="btn small muted" title="Remove source" onClick={async () => {
                        if (confirm(`Remove source ${s.name}?`)) {
                          setData(await api.delSource(s.id));
                        }
                      }}>
                        <Icon name="trash" size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
        <form className="src-form" onSubmit={add}>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Source type">
            <option value="forum">Forum (Charcha-compatible)</option>
            <option value="telegram">Telegram public channel</option>
            <option value="page">Single web page (checked every minute)</option>
          </select>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={{ forum: "http://103.155.85.18:8100", telegram: "t.me/channelname", page: "https://… link to an ad, profile or listing" }[kind]} required />
          <button className="btn"><Icon name="plus" /> Add source</button>
          <button type="button" className="btn" onClick={async () => { const r = await api.crawl(); setMsg(`Crawled now: ${r.new} new post(s).`); load(); }}><Icon name="refresh" /> Crawl now</button>
        </form>
        {msg && <p className="note">{msg}</p>}
      </section>

      <BotPanel />
      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Alert log</h2><span className="muted small">{sys?.telegram_alerts ? "Telegram push is on" : "Telegram push off (see Phone alerts above)"}</span></div>
          {alerts.length ? alerts.slice(0, 25).map((a) => (
            <Link key={a.id} to={`/case/${a.post_id}`} className="alert-row">
              <RiskBadge level={a.level} />
              <div><strong>{caseId(a.post_id)}</strong> <span className="muted small">{timeAgo(a.created_at)}{a.channel === "telegram" && (a.delivered ? " · sent to Telegram" : " · Telegram pending")}</span>
                <div className="small">{a.reason}</div></div>
            </Link>
          )) : <p className="muted">No alerts yet.</p>}
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Detection engine</h2></div>
          <dl className="sys">
            <dt>Image text reading (OCR)</dt><dd className={sys?.ocr ? "ok-text" : "err"}>{sys?.ocr ? "Tesseract ready" : "Tesseract fallback (perceptual & QR)"}</dd>
            <dt>Text model</dt><dd>Character n-gram classifier ({sys ? sys.model_docs[0] + sys.model_docs[1] : "–"} samples)</dd>
            <dt>AI analyst</dt><dd>{sys?.llm ? (sys?.llm_provider === "claude" || sys?.llm_provider === "anthropic" ? "Claude (Active)" : "Gemini 1.5 Flash (Active)") : "Standby"}</dd>
            <dt>Telegram alerts</dt><dd>{sys?.telegram_alerts ? "On" : "Off"}</dd>
            <dt>Telegram 10m Poller</dt><dd className={tgPoller?.running ? "ok-text" : "muted"}>{tgPoller?.running ? `Active (${Math.round((tgPoller?.interval_seconds || 600) / 60)}m)` : "Standby"}</dd>
            <dt>Crawler</dt><dd>{sys?.crawler?.running ? "Running" : "Stopped"}{sys?.crawler?.errors ? ` (${sys.crawler.errors} errors)` : ""}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
