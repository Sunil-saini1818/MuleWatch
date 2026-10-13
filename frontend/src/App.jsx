import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { api, caseId, timeAgo } from "./api";
import { Icon, RiskBadge } from "./components/ui";
import { useLive } from "./live";
import Analyze from "./pages/Analyze";
import CaseDetail from "./pages/CaseDetail";
import Cases from "./pages/Cases";
import Dashboard from "./pages/Dashboard";
import Network from "./pages/Network";
import Sources from "./pages/Sources";
import Watchlist from "./pages/Watchlist";

const NAV = [
  ["/", "Command center", "radar"],
  ["/cases", "Cases", "cases"],
  ["/network", "Seller network", "graph"],
  ["/analyze", "Check a post", "scan"],
  ["/watchlist", "Watchlist", "eye"],
  ["/sources", "Monitored sources", "globe"],
];

function MonitorStatus() {
  const { connected, version } = useLive();
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const load = () => api.sources().then(setSrc).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [version]);
  const active = src?.sources?.filter((s) => s.enabled) || [];
  const err = active.some((s) => s.last_status?.startsWith("error"));
  const last = active.map((s) => s.last_crawl).filter(Boolean).sort().pop();
  return (
    <Link to="/sources" className={`monitor ${connected && !err ? "on" : "off"}`}>
      <span className="pulse" />
      <span>
        {connected ? (err ? "Source unreachable" : `Monitoring ${active.length} source${active.length === 1 ? "" : "s"}`) : "Reconnecting…"}
        {last && <small>last crawl {timeAgo(last)}</small>}
      </span>
    </Link>
  );
}

function Toasts() {
  const { toasts, dismiss } = useLive();
  return (
    <div className="toasts" aria-live="assertive">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.level.toLowerCase()}`}>
          <div className="toast-head">
            <strong>{t.level} alert</strong>
            {t.post && <span>{caseId(t.post.id)} · {t.post.platform}</span>}
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss"><Icon name="x" size={16} /></button>
          </div>
          {t.post && <p className="toast-text">{t.post.excerpt}</p>}
          <p className="toast-why">{t.reason}</p>
          {t.post && <Link to={`/case/${t.post.id}`} onClick={() => dismiss(t.id)} className="toast-open">Open case</Link>}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const { soundOn, enableSound } = useLive();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [loc.pathname]);

  return (
    <div className="shell">
      <aside className={`side${menu ? " open" : ""}`}>
        <Link to="/" className="brand">
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <span>MuleWatch</span>
        </Link>
        <nav>
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={to} end={to === "/"} className="nav">
              <Icon name={icon} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          Detecting sale and rental of bank accounts, ATM cards and banking kits on public platforms.
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
          <MonitorStatus />
          <div className="top-right">
            <button className={`sound${soundOn ? " on" : ""}`} onClick={enableSound} title="Alert sound">
              <Icon name={soundOn ? "sound" : "mute"} /> <span>{soundOn ? "Sound on" : "Sound off"}</span>
            </button>
          </div>
        </header>
        <main className="page">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/case/:id" element={<CaseDetail />} />
            <Route path="/network" element={<Network />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="*" element={<p>Page not found. <Link to="/">Back to the command center</Link></p>} />
          </Routes>
        </main>
      </div>
      <Toasts />
    </div>
  );
}

export { RiskBadge };
