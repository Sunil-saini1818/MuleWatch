import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, caseId, timeAgo } from "../api";
import { Empty, Icon, RiskBadge } from "../components/ui";
import { useLive } from "../live";

export default function DispatchQueue() {
  const { version } = useLive();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedPayload, setSelectedPayload] = useState(null);

  const loadQueue = () => {
    api.dispatchQueue()
      .then((res) => {
        setItems(res.items || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load dispatch queue:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 4000);
    return () => clearInterval(interval);
  }, [version]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  };

  // Action 1: Dispatch to I4C Portal
  const handleDispatchI4C = async (post) => {
    setBusyId(`i4c-${post.id}`);
    try {
      const res = await api.dispatchI4C(post.id);
      showToast("success", `Dispatched to National Cyber Crime Reporting Portal (I4C). Acknowledgment Ref: ${res.ack_id}`);
      setSelectedPayload({
        title: "I4C Cyber Crime Suspect Registry Webhook Response",
        payload: res,
      });
      loadQueue();
    } catch (e) {
      showToast("error", `I4C Dispatch failed: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  };

  // Action 2: Request Bank Account Lien
  const handleBankLien = async (post) => {
    setBusyId(`lien-${post.id}`);
    const upis = post.entities?.upi || [];
    const target = upis[0] || post.author || "Primary Account";
    try {
      const res = await api.dispatchBankLien(post.id, "SBI / HDFC Nodal Gateway", target);
      showToast("success", `Emergency nodal account lien transmitted to partner bank. Lien ID: ${res.lien_id}`);
      setSelectedPayload({
        title: "Nodal Banking Gateway Automated Lien Response",
        payload: res,
      });
      loadQueue();
    } catch (e) {
      showToast("error", `Bank Lien request failed: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  };

  // Action 3: Workflow Reversal (Safety Undo)
  const handleRevertCase = async (post) => {
    if (!window.confirm(`Revert case ${caseId(post.id)} back to investigation draft? It will be removed from the Dispatch queue.`)) {
      return;
    }
    setBusyId(`rev-${post.id}`);
    try {
      await api.updateCaseStatus(post.id, "flagged_review");
      showToast("info", `Case ${caseId(post.id)} reverted to draft review and removed from Cyber Cell Dispatch.`);
      loadQueue();
    } catch (e) {
      showToast("error", `Revert failed: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  };

  // Metrics
  const totalCases = items.length;
  const i4cDispatched = items.filter((p) => p.dispatch_metadata?.i4c).length;
  const lienRequested = items.filter((p) => p.dispatch_metadata?.bank_lien).length;
  const pendingDispatch = items.filter((p) => !p.dispatch_metadata?.i4c && !p.dispatch_metadata?.bank_lien).length;

  return (
    <div className="dispatch-page">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>Cyber Cell Dispatch & Nodal Enforcement</h1>
          <p>
            Law-enforcement interdiction pipeline and automated nodal bank lien dispatch.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn small" onClick={loadQueue} title="Refresh queue">
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
      </div>

      {toast && (
        <div className={`dispatch-toast toast-${toast.type}`}>
          <Icon name={toast.type === "error" ? "x" : "check"} size={16} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* KPI Summary Strip */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="kpi">
          <strong>{totalCases}</strong>
          <span>Confirmed Cases in Queue</span>
        </div>
        <div className="kpi warn">
          <strong>{pendingDispatch}</strong>
          <span>Awaiting Initial Dispatch</span>
        </div>
        <div className="kpi tone-ring">
          <strong>{i4cDispatched}</strong>
          <span>Reported to I4C Portal</span>
        </div>
        <div className="kpi crit">
          <strong>{lienRequested}</strong>
          <span>Nodal Bank Liens Requested</span>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <p className="muted">Loading dispatch queue…</p>
      ) : items.length === 0 ? (
        <div className="empty">
          <strong>No confirmed cases awaiting dispatch</strong>
          <p>
            When an investigator confirms a case in <Link to="/cases">Cases</Link>,
            it immediately transitions to this enforcement queue.
          </p>
          <div style={{ marginTop: "14px" }}>
            <Link to="/cases" className="btn primary">
              Browse Cases to Confirm →
            </Link>
          </div>
        </div>
      ) : (
        <div className="dispatch-queue-list">
          {items.map((p) => {
            const i4c = p.dispatch_metadata?.i4c;
            const lien = p.dispatch_metadata?.bank_lien;
            const isPending = !i4c && !lien;

            // Extract high risk identifiers
            const phones = p.entities?.phone || [];
            const upis = p.entities?.upi || [];
            const tgs = p.entities?.telegram || [];
            const wallets = p.entities?.crypto_wallet || [];

            return (
              <div key={p.id} className="dispatch-card">
                <div className="dispatch-card-head">
                  <div className="dispatch-head-left">
                    <span className="dispatch-case-id">{caseId(p.id)}</span>
                    <span className="dispatch-platform-chip">{p.platform}</span>
                    <span className="chip chip-ok">Confirmed Fraud</span>
                    <span className="dispatch-time muted small">Captured {timeAgo(p.posted_at)}</span>
                  </div>
                  <div className="dispatch-head-right">
                    {lien ? (
                      <span className="dispatch-status-badge badge-lien">
                        🏦 Lien Requested ({lien.lien_id})
                      </span>
                    ) : i4c ? (
                      <span className="dispatch-status-badge badge-i4c">
                        🚨 Reported to I4C ({i4c.ack_id})
                      </span>
                    ) : (
                      <span className="dispatch-status-badge badge-pending">
                        ⏳ Pending Dispatch
                      </span>
                    )}
                    <RiskBadge level={p.risk_level} score={p.risk_score} />
                  </div>
                </div>

                <div className="dispatch-card-body">
                  <h3 className="dispatch-title">
                    <Link to={`/case/${p.id}`}>
                      {(p.text || p.ocr_text || "Financial Advertisement").split("\n")[0].slice(0, 110)}
                    </Link>
                  </h3>
                  <p className="dispatch-excerpt">"{p.excerpt}"</p>

                  {/* High Risk Identifiers Box */}
                  <div className="dispatch-identifiers-panel">
                    <div className="id-group-title">SUSPECT IDENTIFIERS:</div>
                    <div className="id-tags-flow">
                      {phones.map((ph, idx) => (
                        <span key={idx} className="id-badge id-phone" title="Mobile Number">
                          📞 {ph}
                        </span>
                      ))}
                      {upis.map((u, idx) => (
                        <span key={idx} className="id-badge id-upi" title="UPI Payment Handle">
                          💳 {u}
                        </span>
                      ))}
                      {tgs.map((t, idx) => (
                        <span key={idx} className="id-badge id-tg" title="Telegram Channel/User">
                          ✈️ {t}
                        </span>
                      ))}
                      {wallets.map((w, idx) => (
                        <span key={idx} className="id-badge id-wallet" title="Crypto TRC20 Wallet">
                          🪙 {w}
                        </span>
                      ))}
                      {!phones.length && !upis.length && !tgs.length && !wallets.length && (
                        <span className="muted small">No direct digital identifiers; forensic metadata attached.</span>
                      )}
                    </div>
                  </div>

                  {/* Primary Reasons */}
                  {p.reasons?.length > 0 && (
                    <div className="dispatch-reasons-row">
                      <span className="dispatch-reasons-label">Key Evidence:</span>
                      {p.reasons.slice(0, 3).map((r, i) => (
                        <span key={i} className="dispatch-reason-pill">⚠️ {r}</span>
                      ))}
                    </div>
                  )}

                  {/* Evidence Hash info */}
                  {p.evidence_hash && (
                    <div className="dispatch-hash-line">
                      <span className="meta-k">Forensic SHA-256:</span>
                      <code>{p.evidence_hash}</code>
                    </div>
                  )}
                </div>

                {/* Enforcement Action Controls */}
                <div className="dispatch-card-actions">
                  <a
                    className="btn btn-pdf"
                    href={`/api/posts/${p.id}/report.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    title="Generate and view complete evidence dossier PDF"
                  >
                    <Icon name="pdf" size={15} /> 📄 Download Evidence PDF
                  </a>

                  <button
                    className={`btn btn-i4c ${i4c ? "done" : ""}`}
                    disabled={busyId === `i4c-${p.id}`}
                    onClick={() => handleDispatchI4C(p)}
                    title="Transmit suspect registry payload to I4C Cyber Crime Portal"
                  >
                    <Icon name="shield" size={15} />
                    {busyId === `i4c-${p.id}` ? "Reporting…" : i4c ? "✓ Re-Dispatch I4C" : "🚨 Dispatch to I4C Portal"}
                  </button>

                  <button
                    className={`btn btn-lien ${lien ? "done" : ""}`}
                    disabled={busyId === `lien-${p.id}`}
                    onClick={() => handleBankLien(p)}
                    title="Request immediate emergency nodal account lien"
                  >
                    <Icon name="cases" size={15} />
                    {busyId === `lien-${p.id}` ? "Transmitting…" : lien ? "✓ Lien Dispatched" : "🏦 Request Bank Lien"}
                  </button>

                  <button
                    className="btn btn-revert-action"
                    disabled={busyId === `rev-${p.id}`}
                    onClick={() => handleRevertCase(p)}
                    title="Workflow Reversal: Safety undo to move case back to review"
                  >
                    <Icon name="refresh" size={14} /> ↩ Revert to Draft
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Webhook JSON Response Modal */}
      {selectedPayload && (
        <div className="dispatch-modal-backdrop" onClick={() => setSelectedPayload(null)}>
          <div className="dispatch-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="dispatch-modal-head">
              <h3>{selectedPayload.title}</h3>
              <button className="btn-close" onClick={() => setSelectedPayload(null)}>✕</button>
            </div>
            <div className="dispatch-modal-body">
              <p className="small muted">
                Simulated automated webhook payload acknowledged by upstream enforcement sandbox:
              </p>
              <pre className="dispatch-json-block">
                {JSON.stringify(selectedPayload.payload, null, 2)}
              </pre>
            </div>
            <div className="dispatch-modal-foot">
              <button className="btn primary" onClick={() => setSelectedPayload(null)}>
                Close Acknowledgment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
