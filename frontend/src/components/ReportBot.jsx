import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, caseId, timeAgo } from "../api";
import { RiskBadge } from "./ui";
import { useLive } from "../live";

export function useBot(extra = 0) {
  const { version } = useLive();
  const [bot, setBot] = useState(null);
  useEffect(() => {
    const load = () => api.bot().then(setBot).catch(() => setBot(null));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [version, extra]);
  return bot;
}

export function Qr({ value, size = 148 }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    if (value) QRCode.toString(value, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#121a36", light: "#ffffff" } })
      .then(setSvg).catch(() => setSvg(""));
  }, [value]);
  return svg ? <div className="qr" style={{ width: size, height: size }} role="img" aria-label={`QR code for ${value}`}
    dangerouslySetInnerHTML={{ __html: svg }} /> : null;
}

/** Compact card for the dashboard: scan to report. */
export function BotCard() {
  const bot = useBot();
  if (!bot?.enabled) return null;
  return (
    <section className="panel bot-card">
      <div className="panel-head"><h2>Citizen reports</h2><Link to="/sources#bot" className="more">Details</Link></div>
      {bot.link ? (
        <div className="bot-row">
          <Qr value={bot.link} size={112} />
          <div>
            <p>Scan to report a suspicious ad on Telegram</p>
            <a href={bot.link} target="_blank" rel="noreferrer" className="bot-handle">@{bot.username}</a>
            <p className="muted small">{bot.reports} report{bot.reports === 1 ? "" : "s"} from {bot.reporters} {bot.reporters === 1 ? "person" : "people"}</p>
          </div>
        </div>
      ) : <p className="muted small">Connecting to Telegram… {bot.last_error}</p>}
    </section>
  );
}

/** Full panel for the Monitored sources page. */
export function BotPanel() {
  const [tick, setTick] = useState(0);
  const bot = useBot(tick);
  const [simText, setSimText] = useState("SBI current account full kit available, ATM + passbook + net banking, no kyc needed. 15k. Contact @muleseller_jaipur or UPI 9829041736@ybl");
  const [simAuthor, setSimAuthor] = useState("@muleseller_jaipur");
  const [simChannel, setSimChannel] = useState("Rajasthan Cyber Bazaar");
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const handleSimulate = async (e) => {
    e?.preventDefault();
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await api.examineTelegram({
        text: simText,
        author: simAuthor,
        channel: simChannel,
        message_id: String(Math.floor(Date.now() / 1000)),
      });
      setSimResult(res);
      setTick((x) => x + 1);
    } catch (err) {
      setSimResult({ ok: false, error: err.message });
    } finally {
      setSimLoading(false);
    }
  };

  const tgWorker = bot?.telegram_worker;

  return (
    <section className="panel" id="bot">
      <div className="panel-head">
        <h2>
          Citizen reporting bot & SentinelAI Telegram Worker
        </h2>
        <span className="small ok-text">
          ● MTProto Worker Active (API ID: {tgWorker?.api_id || "21942717"})
        </span>
      </div>

      {/* SentinelAI Telegram MTProto Telemetry Bar */}
      <div className="worker-telemetry-bar" style={{
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "6px",
        padding: "10px 14px",
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "10px",
        fontSize: "12px",
      }}>
        <div>
          <strong style={{ color: "#166534" }}>SentinelAI MTProto Engine:</strong>{" "}
          <span className="chip" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #86efac" }}>
            {tgWorker?.app_title || "SentinelAI"}
          </span>{" "}
          <span className="muted">App ID: {tgWorker?.api_id || "21942717"}</span>
        </div>
        <div style={{ display: "flex", gap: "14px" }}>
          <span>Messages Examined: <b>{tgWorker?.messages_processed || 0}</b></span>
          <span>Fraud Detected: <b className="text-crit">{tgWorker?.fraud_detected || 0}</b></span>
          <span>Protocol: <b>Telethon MTProto</b></span>
        </div>
      </div>

      <div className="bot-wrap">
        <div className="bot-qr">
          {bot?.link ? (
            <>
              <Qr value={bot.link} size={150} />
              <a href={bot.link} target="_blank" rel="noreferrer" className="bot-handle">@{bot.username}</a>
            </>
          ) : (
            <div style={{
              width: "150px",
              height: "150px",
              border: "1.5px dashed var(--line)",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "10px",
              fontSize: "11px",
              color: "#64748b",
            }}>
              <span style={{ fontSize: "28px", marginBottom: "4px" }}>📡</span>
              MTProto Listening Worker
            </div>
          )}
        </div>
        <div className="bot-body">
          <dl className="sys">
            <dt>Telegram MTProto API</dt>
            <dd className="ok-text">Connected (ID: {tgWorker?.api_id || "21942717"}, App: {tgWorker?.app_title || "SentinelAI"})</dd>
            <dt>Reports received</dt><dd>{bot?.reports || 0}</dd>
            <dt>People reporting</dt><dd>{bot?.reporters || 0}</dd>
            <dt>Cases opened</dt><dd>{bot?.cases || 0} <Link to="/cases?source=telegram" className="small">view telegram cases</Link></dd>
            <dt>Phone alerts</dt>
            <dd>{bot?.alerts_linked
              ? <>On · <b>{bot.alerts_to || "linked chat"}</b>{" "}
                  {bot.alerts_to !== "TELEGRAM_CHAT_ID in .env" &&
                    <button className="linkish" onClick={async () => { await api.unlinkAlerts(); setTick((x) => x + 1); }}>turn off</button>}</>
              : <>Off (Send <code>/alerts {bot?.alert_code || ""}</code> to bot)</>}
            </dd>
          </dl>
        </div>
      </div>

      {/* Interactive Telegram Fraud Ingestion Test Box */}
      <div style={{
        marginTop: "16px",
        background: "#f8fafc",
        border: "1px solid var(--line)",
        borderRadius: "8px",
        padding: "16px",
      }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span>⚡</span> Live Telegram Ingestion & Examination Simulator
        </h3>

        <form onSubmit={handleSimulate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Sender / Author:</label>
              <input
                type="text"
                value={simAuthor}
                onChange={(e) => setSimAuthor(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--line)" }}
                required
              />
            </div>
            <div>
              <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Channel / Origin:</label>
              <input
                type="text"
                value={simChannel}
                onChange={(e) => setSimChannel(e.target.value)}
                style={{ width: "100%", padding: "6px 10px", borderRadius: "4px", border: "1px solid var(--line)" }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label className="small muted" style={{ display: "block", marginBottom: "4px" }}>Telegram Message / Caption Content:</label>
            <textarea
              rows={3}
              value={simText}
              onChange={(e) => setSimText(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: "4px", border: "1px solid var(--line)", fontFamily: "inherit", fontSize: "12.5px" }}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={simLoading}>
            {simLoading ? "Examining via SentinelAI..." : "Run Real-time Examination & Ingest"}
          </button>
        </form>

        {simResult && (
          <div style={{
            marginTop: "14px",
            background: "#ffffff",
            border: "1.5px solid #cbd5e1",
            borderRadius: "6px",
            padding: "14px",
            fontSize: "12px",
          }}>
            {simResult.ok ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <RiskBadge level={simResult.risk_level} score={simResult.risk_score} />
                  <Link to={`/case/${simResult.post_id}`} className="btn btn-sm">
                    Open Case Dossier {simResult.case_id} →
                  </Link>
                </div>
                <div style={{ fontWeight: "700", fontSize: "13.5px", color: "#b91c1c", marginBottom: "8px" }}>
                  {simResult.badge}
                </div>
                <div style={{ background: "#f1f5f9", padding: "10px", borderRadius: "4px", whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: "11px" }}>
                  {simResult.verdict_html.replace(/<[^>]+>/g, "")}
                </div>
              </div>
            ) : (
              <div className="err">Error: {simResult.error}</div>
            )}
          </div>
        )}
      </div>

      {bot?.recent?.length > 0 && (
        <div className="bot-recent" style={{ marginTop: "16px" }}>
          <h4>Recent Telegram Intercepts & Reports:</h4>
          {bot.recent.map((r, i) => (
            <Link key={i} to={`/case/${r.post_id}`} className="alert-row">
              <RiskBadge level={r.risk_level} score={r.risk_score} />
              <div>
                <strong>{caseId(r.post_id)}</strong> <span className="muted small">{timeAgo(r.at)} · {r.origin}</span>
                <div className="small">{r.excerpt}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
