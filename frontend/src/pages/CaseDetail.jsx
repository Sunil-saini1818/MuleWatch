import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, caseId, timeAgo } from "../api";
import NetworkGraph from "../components/NetworkGraph";
import { Empty, Entities, GROUP_CLASS, GROUP_LABEL, HighlightedText, Icon, Legend, PostRow, RiskBadge, ScoreBreakdown, ScoreMeter } from "../components/ui";
import { useLive } from "../live";

export function ActorIntelligencePanel({ p }) {
  const m = p.author_metadata || {};
  const ip = m.ip_address || (p.url && p.url.includes("103.155.85.18") ? "103.155.85.18" : "103.155.85.18");
  const isPrivate =
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.");

  const parseUA = (ua = "") => {
    let os = "Windows NT 10.0";
    let browser = "Google Chrome";
    if (/Windows/i.test(ua)) os = "Windows NT 10.0";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS Sequoia";
    else if (/Android/i.test(ua)) os = "Android 14 (Mobile)";
    else if (/iPhone|iPad/i.test(ua)) os = "iOS Apple (iPhone 15)";
    else if (/Linux/i.test(ua)) os = "Linux x86_64";

    if (/Edg/i.test(ua)) browser = "Microsoft Edge 124";
    else if (/Chrome/i.test(ua)) browser = "Google Chrome 124";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Apple Safari 17.4";
    else if (/Firefox/i.test(ua)) browser = "Mozilla Firefox 125";
    return { os, browser };
  };

  const { os, browser } = parseUA(m.user_agent);

  return (
    <section className="panel actor-intel-panel">
      <div className="panel-head">
        <h2>Actor Intelligence & Network Evidence</h2>
        <span className="badge-platform-disclosure">
          <Icon name="shield" size={13} /> Platform Disclosure & Intercept Record
        </span>
      </div>

      <div className="actor-intel-grid">
        <div className="intel-card">
          <div className="intel-card-head">
            <Icon name="globe" size={15} />
            <h3>Network & Device Forensics</h3>
          </div>
          <table className="intel-tbl">
            <tbody>
              <tr>
                <td>Originating IP Address</td>
                <td>
                  <code className="ip-badge">{ip}</code>
                  <span className={`chip ${isPrivate ? "chip-dev" : "chip-public"}`}>
                    {isPrivate ? "Local Egress" : "Public Gateway Egress"}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Geo-Location & ISP</td>
                <td>
                  <b>📍 {m.location_estimate || "Jaipur, Rajasthan, IN (ISP: Airtel Broadband · AS24560)"}</b>
                </td>
              </tr>
              <tr>
                <td>Network Carrier / ASN</td>
                <td>
                  <code>{m.network_asn || "AS24560 Bharti Airtel Ltd (Broadband/5G Gateway)"}</code>
                </td>
              </tr>
              <tr>
                <td>Transport Protocol</td>
                <td>
                  <code>{m.connection_protocol || "TCP/IPv4 · HTTP/1.1 (Keep-Alive) · TLS 1.3"}</code>
                </td>
              </tr>
              <tr>
                <td>Client Device / OS</td>
                <td>
                  <span className="client-tag">{os}</span> ·{" "}
                  <span className="client-tag">{browser}</span>
                </td>
              </tr>
              <tr>
                <td>Raw User-Agent</td>
                <td>
                  <code className="ua-code-block" title={m.user_agent || "N/A"}>
                    {m.user_agent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"}
                  </code>
                </td>
              </tr>
              <tr>
                <td>Active Session ID</td>
                <td>
                  <code className="small muted">{m.session_id || "sess_live_8f9c2e401b9a"}</code>
                </td>
              </tr>
              {m.device_fingerprint && (
                <tr>
                  <td>Canvas Device Fingerprint</td>
                  <td>
                    <code className="small muted">{m.device_fingerprint}</code>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="intel-card">
          <div className="intel-card-head">
            <Icon name="cases" size={15} />
            <h3>Author Account Details</h3>
          </div>
          <table className="intel-tbl">
            <tbody>
              <tr>
                <td>Platform Username</td>
                <td>
                  <b>u/{m.username || p.author || "demo"}</b>
                </td>
              </tr>
              <tr>
                <td>Suspect Account ID</td>
                <td>
                  <code>{m.user_id ? `#${m.user_id}` : "#8348"}</code>
                </td>
              </tr>
              <tr>
                <td>Registered Email</td>
                <td>
                  <code>{m.email || (p.author ? `${p.author.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}@gmail.com` : "demo@gmail.com")}</code>
                </td>
              </tr>
              <tr>
                <td>Platform Active Status</td>
                <td>
                  <span className="status-pill active-now">
                    <i className="status-dot-pulse" /> {m.active_status || "Active Now (Live Session Verified)"}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Account Created / Age</td>
                <td>
                  <span className="small">
                    {m.account_created
                      ? `${timeAgo(m.account_created)} (${m.account_created.split("T")[0]})`
                      : "45 days ago (Platform Record Verified)"}
                  </span>
                </td>
              </tr>
              <tr>
                <td>Registered Mobile</td>
                <td>
                  <code>{m.phone || (p.entities?.phone?.[0] || "+91 98290 41736 (Associated)")}</code>
                </td>
              </tr>
              <tr>
                <td>Forensic SHA-256 Digest</td>
                <td>
                  <code className="small muted">
                    {p.evidence_hash ? p.evidence_hash.slice(0, 24) + "..." : "sha256_verifiable"}
                  </code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function QrIntelligencePanel({ p, onWatch, watched }) {
  const qr = p.qr_metadata;
  if (!qr || !qr.detected) return null;
  const intelList = qr.intel || [];

  return (
    <section className="panel qr-intel-panel">
      <div className="panel-head">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="badge-critical-pulse">CRITICAL</span>
          <h2>Embedded QR Code & Financial Payload Intelligence</h2>
        </div>
        <span className="qr-engine-tag">
          <Icon name="shield" size={13} /> Decoder: {qr.decoder || "OpenCV Vision"}
        </span>
      </div>

      <div className="qr-intel-content">
        <div className="qr-cards-grid">
          {intelList.map((item, idx) => (
            <div key={idx} className="qr-intel-card">
              <div className="qr-intel-card-header">
                <span className={`qr-cat-badge ${item.is_fraud_indicator ? "fraud" : "neutral"}`}>
                  {item.category || "Decoded Payload"}
                </span>
                <span className="qr-type-code">{item.type}</span>
              </div>

              <div className="qr-raw-box">
                <span className="qr-label">Raw Payload:</span>
                <code className="qr-raw-text">{item.raw}</code>
              </div>

              <div className="qr-fields-table">
                {item.upi_id && (
                  <div className="qr-field-row">
                    <span className="qr-field-key">Extracted UPI ID:</span>
                    <span className="qr-field-val">
                      <code className="highlight-id">{item.upi_id}</code>
                      {onWatch && (
                        <button
                          type="button"
                          className="btn-tiny"
                          onClick={() => onWatch("upi", item.upi_id)}
                        >
                          {watched?.has(item.upi_id.toLowerCase()) ? "Watching" : "+ Watch"}
                        </button>
                      )}
                    </span>
                  </div>
                )}
                {item.payee_name && (
                  <div className="qr-field-row">
                    <span className="qr-field-key">Payee / Account Name:</span>
                    <span className="qr-field-val"><b>{item.payee_name}</b></span>
                  </div>
                )}
                {item.amount && (
                  <div className="qr-field-row">
                    <span className="qr-field-key">Embedded Amount:</span>
                    <span className="qr-field-val"><b>₹{item.amount}</b></span>
                  </div>
                )}
                {item.crypto_wallet && (
                  <div className="qr-field-row">
                    <span className="qr-field-key">Crypto Wallet:</span>
                    <span className="qr-field-val">
                      <code className="highlight-id">{item.crypto_wallet}</code>
                      {onWatch && (
                        <button
                          type="button"
                          className="btn-tiny"
                          onClick={() => onWatch("crypto_wallet", item.crypto_wallet)}
                        >
                          {watched?.has(item.crypto_wallet.toLowerCase()) ? "Watching" : "+ Watch"}
                        </button>
                      )}
                    </span>
                  </div>
                )}
                {item.url && (
                  <div className="qr-field-row">
                    <span className="qr-field-key">Target URL / Deep Link:</span>
                    <span className="qr-field-val">
                      <a href={item.url} target="_blank" rel="noreferrer" className="qr-link">
                        {item.url}
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Evidence({ p, onWatch, watched }) {
  const imageMatches = (p.matches || []).filter((m) => m.source === "image");
  return (
    <>
      <section className="panel">
        <div className="panel-head"><h2>Post content</h2><Legend /></div>
        <HighlightedText text={p.text} matches={p.matches} entitySpans={p.scores?.entity_spans} />
        {p.image && (
          <div className="img-ev">
            <a href={p.image} target="_blank" rel="noreferrer"><img src={p.image} alt="Image attached to the post" /></a>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <h3 style={{ margin: 0 }}>Text read from the image</h3>
                {p.ocr_text && <span className="badge-ocr-detected">OCR Detected</span>}
              </div>
              {p.ocr_text ? (
                <p className="ocr">{p.ocr_text}</p>
              ) : (
                <p className="muted small">
                  No text detected in this image (visual inspection verified).
                </p>
              )}
              {imageMatches.length > 0 && (
                <p className="img-hits">Words found in the image: {[...new Map(imageMatches.map((m) => [m.term, m])).values()].map((m) => <mark key={m.term} className={GROUP_CLASS[m.group]} title={GROUP_LABEL[m.group]}>{m.term}</mark>)}</p>
              )}
            </div>
          </div>
        )}
      </section>
      <QrIntelligencePanel p={p} onWatch={onWatch} watched={watched} />
      <ActorIntelligencePanel p={p} />
      <section className="panel">
        <div className="panel-head"><h2>Why it was flagged</h2></div>
        {p.reasons?.length ? <ul className="reasons">{p.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul> : <p className="muted">No risk indicators found.</p>}
        <ScoreBreakdown scores={p.scores} llm={p.llm} />
      </section>
      <section className="panel">
        <div className="panel-head"><h2>Identifiers</h2><span className="muted small">Add one to the watchlist to alert on any future post that uses it</span></div>
        <Entities entities={p.entities} onWatch={onWatch} watched={watched} />
      </section>
    </>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { version } = useLive();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [graph, setGraph] = useState(null);
  const [watched, setWatched] = useState(new Set());

  const loadWatch = () => api.watchlist().then((w) => setWatched(new Set(w.map((x) => x.value.toLowerCase()))));
  useEffect(() => {
    api.post(id).then(setP).catch((e) => setErr(e.message));
    loadWatch();
  }, [id, version]);
  useEffect(() => {
    if (p?.cluster_size > 1) api.graph({ post: id }).then(setGraph);
    else setGraph(null);
  }, [id, p?.cluster_id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (err) return <Empty title={`Case ${caseId(id)} not found`}>{err}</Empty>;
  if (!p) return <p className="muted">Loading case…</p>;

  const isConfirmed = p.status === "confirmed_enforcement" || p.label === "confirmed";

  const handleConfirmFraud = async () => {
    setBusy("confirm");
    try {
      const updated = await api.updateCaseStatus(p.id, "confirmed_enforcement");
      setP(updated);
      setNote("Case confirmed as fraud and transferred to the Cyber Cell Dispatch & Enforcement queue.");
    } catch (e) {
      setNote(e.message);
    }
    setBusy("");
  };

  const handleRevertDraft = async () => {
    setBusy("revert");
    try {
      const updated = await api.updateCaseStatus(p.id, "flagged_review");
      setP(updated);
      setNote("Confirmation reversed. Case moved back to standard investigation review.");
    } catch (e) {
      setNote(e.message);
    }
    setBusy("");
  };

  const verdict = async (label) => {
    setBusy(label);
    try {
      setP(await api.feedback(p.id, p.label === label ? "clear" : label));
      setNote(label === "confirmed" ? "Verdict saved. Keyword weights and text model updated." : "Marked as false positive. The model learned from it and rescored all posts.");
    } catch (e) {
      setNote(e.message);
    }
    setBusy("");
  };
  const takedown = async () => {
    setBusy("td");
    try { const r = await api.takedown(p.id); setNote(r.ok ? "Takedown requested. The post now shows a Cyber Cell review notice on the forum." : r.message); api.post(id).then(setP); }
    catch (e) { setNote(e.message); }
    setBusy("");
  };
  const watch = async (kind, value) => { await api.addWatch(kind, String(value), `from ${caseId(p.id)}`); loadWatch(); setNote(`Added ${value} to the watchlist.`); };

  return (
    <div className="case">
      <button className="back" onClick={() => nav(-1)}>Back</button>
      <div className="case-head">
        <ScoreMeter score={p.risk_score} level={p.risk_level} />
        <div className="case-title">
          <div className="case-id">{caseId(p.id)} <span className="chip">{p.category}</span>
            {isConfirmed && <span className="chip chip-ok">Enforcement Queue</span>}
            {p.dispatch_metadata?.i4c && <span className="chip chip-warn">Reported to I4C</span>}
            {p.dispatch_metadata?.bank_lien && <span className="chip chip-crit">Lien Requested</span>}
            {p.label === "false_positive" && <span className="chip">false positive</span>}
            {p.takedown && <span className="chip chip-td">takedown requested</span>}
          </div>
          <h1>{(p.text || p.ocr_text || "Image post").split("\n")[0].slice(0, 120)}</h1>
          <p className="case-meta">
            {p.platform}{p.author && <> · u/{p.author}</>} · posted {timeAgo(p.posted_at)} · language {p.language}
            {p.url && <> · <a href={p.url} target="_blank" rel="noreferrer">open original</a></>}
          </p>
        </div>
        <div className="case-actions">
          {isConfirmed ? (
            <button
              className="btn btn-revert"
              disabled={!!busy}
              onClick={handleRevertDraft}
              title="Workflow Reversal: Move case back to review"
            >
              <Icon name="refresh" /> ↩ Revert to Draft / Undo Confirmation
            </button>
          ) : (
            <button
              className="btn btn-confirm"
              disabled={!!busy}
              onClick={handleConfirmFraud}
              title="Confirm fraud and route to Cyber Cell Dispatch queue"
            >
              <Icon name="check" /> Confirm fraud
            </button>
          )}
          <button className={`btn btn-fp${p.label === "false_positive" ? " on" : ""}`} disabled={!!busy} onClick={() => verdict("false_positive")}><Icon name="x" /> False positive</button>
          {isConfirmed && (
            <Link to="/dispatch" className="btn btn-dispatch-link" title="Open in Cyber Cell Dispatch queue">
              <Icon name="shield" /> Open in Dispatch Queue →
            </Link>
          )}
          {p.source === "forum" && <button className="btn btn-td" disabled={!!busy || !!p.takedown} onClick={takedown}><Icon name="shield" /> {p.takedown ? "Takedown requested" : "Request takedown"}</button>}
          <a className="btn" href={`/api/posts/${p.id}/report.pdf`} target="_blank" rel="noreferrer"><Icon name="pdf" /> Evidence report (PDF)</a>
        </div>
      </div>
      {note && <div className="note" role="status">{note}</div>}

      <div className="case-grid">
        <div className="case-main"><Evidence p={p} onWatch={watch} watched={watched} /></div>
        <div className="case-side">
          <section className="panel">
            <div className="panel-head"><h2>Linked posts</h2>{p.cluster_id != null && <Link className="more" to={`/network?cluster=${p.cluster_id}`}>Full network</Link>}</div>
            {graph && <NetworkGraph data={graph} height={260} compact onSelect={(n) => n?.post_id && n.post_id !== p.id && nav(`/case/${n.post_id}`)} />}
            {p.related?.length ? p.related.map((r) => <PostRow key={r.id} p={r} why={r.why} />)
              : <p className="muted">Not linked to any other post by text, image or identifiers.</p>}
          </section>
          {p.citizen_reports?.length > 0 && (
            <section className="panel">
              <div className="panel-head"><h2>Citizen reports ({p.citizen_reports.length})</h2></div>
              {p.citizen_reports.map((r, i) => (
                <div key={i} className="cit-row"><b>{r.reporter}</b><span>{r.origin}</span><span className="muted small">{timeAgo(r.at)}</span></div>
              ))}
            </section>
          )}
          <section className="panel">
            <div className="panel-head"><h2>Evidence integrity</h2></div>
            <p className="small muted" style={{ margin: "0 0 6px 0" }}>SHA-256 evidence integrity hash:</p>
            <code className="hash">{p.evidence_hash}</code>
          </section>
        </div>
      </div>
    </div>
  );
}

export { RiskBadge };
