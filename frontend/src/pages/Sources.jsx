import { useEffect, useState } from "react";
import { api, caseId, timeAgo } from "../api";
import { Icon, RiskBadge } from "../components/ui";
import { useLive } from "../live";
import { Link } from "react-router-dom";

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
  const sys = stats?.system;

  return (
    <div>
      <div className="page-head">
        <h1>Monitored sources</h1>
        <p>Public pages MuleWatch crawls every few seconds. New posts are scored the moment they appear.</p>
      </div>
      <section className="panel">
        <table className="tbl">
          <thead><tr><th>Source</th><th>Address</th><th>Status</th><th>Last crawl</th><th>Posts collected</th><th>Active</th></tr></thead>
          <tbody>{data?.sources.map((s) => (
            <tr key={s.id}>
              <td>{s.name}<div className="muted small">{s.kind === "forum" ? "Public forum" : "Telegram public channel"}</div></td>
              <td><code>{s.url}</code></td>
              <td className={s.last_status?.startsWith("error") ? "err" : "ok-text"}>{s.last_status || "waiting"}</td>
              <td>{timeAgo(s.last_crawl)}</td>
              <td>{s.items_seen}</td>
              <td><label className="switch"><input type="checkbox" checked={s.enabled} onChange={async (e) => setData(await api.toggleSource(s.id, e.target.checked))} /><span /></label></td>
            </tr>
          ))}</tbody>
        </table>
        <form className="src-form" onSubmit={add}>
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Source type">
            <option value="forum">Forum (Charcha-compatible)</option>
            <option value="telegram">Telegram public channel</option>
          </select>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={kind === "forum" ? "http://103.155.85.18:8100" : "t.me/channelname"} required />
          <button className="btn"><Icon name="plus" /> Add source</button>
          <button type="button" className="btn" onClick={async () => { const r = await api.crawl(); setMsg(`Crawled now: ${r.new} new post(s).`); load(); }}><Icon name="refresh" /> Crawl now</button>
        </form>
        {msg && <p className="note">{msg}</p>}
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>Alert log</h2><span className="muted small">{sys?.telegram_alerts ? "Telegram push is on" : "Telegram push off (set TELEGRAM_BOT_TOKEN in .env)"}</span></div>
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
            <dt>Image text reading (OCR)</dt><dd className={sys?.ocr ? "ok-text" : "err"}>{sys?.ocr ? "Tesseract ready" : "Tesseract not installed"}</dd>
            <dt>Text model</dt><dd>Character n-gram classifier, trained on {sys ? sys.model_docs[0] + sys.model_docs[1] : "–"} labelled examples, retrains on every verdict</dd>
            <dt>AI analyst</dt><dd>{sys?.llm ? "Claude second opinion on manual checks" : "Off (optional, set ANTHROPIC_API_KEY)"}</dd>
            <dt>Telegram alerts</dt><dd>{sys?.telegram_alerts ? "On" : "Off"}</dd>
            <dt>Crawler</dt><dd>{sys?.crawler?.running ? "Running" : "Stopped"}{sys?.crawler?.errors ? `, ${sys.crawler.errors} errors so far` : ""}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
