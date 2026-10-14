import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, caseId, timeAgo } from "../api";
import { Icon, RiskBadge } from "../components/ui";
import { useLive } from "../live";

export default function LinkedPlatforms() {
  const { version } = useLive();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("telegram");
  const [pollingBusy, setPollingBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const loadData = () => {
    api.platformStats()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load platform stats:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [version]);

  const triggerTelegramPoll = async () => {
    setPollingBusy(true);
    setToastMsg("Triggering 10-minute Telegram polling cycle...");
    try {
      const res = await api.telegramPollNow(10);
      setToastMsg(`Telegram poll cycle finished. ${res.new_cases} new case(s) ingested.`);
      loadData();
    } catch (e) {
      setToastMsg(`Telegram poll failed: ${e.message}`);
    } finally {
      setPollingBusy(false);
      setTimeout(() => setToastMsg(""), 6000);
    }
  };

  const platforms = data?.platforms || [];
  const activePlatformObj = platforms.find((p) => p.platform_id === activeTab) || platforms[0];

  const getStatusClass = (statusType) => {
    if (statusType === "connected") return "badge-connected";
    if (statusType === "polling") return "badge-polling";
    return "badge-active";
  };

  const getPlatformIcon = (id) => {
    switch (id) {
      case "telegram":
        return "radar";
      case "charcha":
        return "globe";
      case "instagram":
        return "scan";
      case "twitter":
        return "link";
      default:
        return "globe";
    }
  };

  return (
    <div className="linked-platforms-page">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1>Linked Platforms & Multi-Source Ingestion</h1>
          <p>
            Verifiable multi-source threat telemetry proving intercepted origin across encrypted messaging,
            decentralized forums, and social classified streams.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn small" onClick={loadData} title="Refresh telemetry">
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="panel" style={{ background: "#e0e7ff", borderLeft: "4px solid #4338ca", padding: "10px 16px", marginBottom: "16px", color: "#312e81", fontWeight: 500 }}>
          {toastMsg}
        </div>
      )}

      {/* Aggregate KPI Strip */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="kpi">
          <strong>{data?.total_posts_across_platforms ?? "—"}</strong>
          <span>Total Ingested Intercepts</span>
        </div>
        <div className="kpi crit">
          <strong>{data?.total_critical_threats ?? "—"}</strong>
          <span>Critical Fraud Alerts</span>
        </div>
        <div className="kpi warn">
          <strong>{data?.total_high_threats ?? "—"}</strong>
          <span>High-Risk Mule Networks</span>
        </div>
        <div className="kpi ok">
          <strong>{data?.active_sources_count ?? "4"}</strong>
          <span>Connected Ingestion Feeds</span>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="platform-grid">
        {platforms.map((p) => {
          const isTg = p.platform_id === "telegram";
          const isCharcha = p.platform_id === "charcha";
          return (
            <div key={p.platform_id} className={`platform-card platform-${p.platform_id}`}>
              <div className="platform-card-header">
                <div className="platform-title-area">
                  <span className="platform-avatar">
                    <Icon name={getPlatformIcon(p.platform_id)} size={20} />
                  </span>
                  <div>
                    <h3 className="platform-name">{p.name}</h3>
                    <div className="platform-sub">{p.platform}</div>
                  </div>
                </div>
                <span className={`platform-status-badge ${getStatusClass(p.status_type)}`}>
                  <span className="status-dot" />
                  {p.status_badge}
                </span>
              </div>

              <p className="platform-desc">{p.description}</p>

              {/* Metrics Row */}
              <div className="platform-stats-row">
                <div className="platform-stat-item">
                  <div className="stat-label">Collected</div>
                  <div className="stat-num">{p.total_posts}</div>
                </div>
                <div className="platform-stat-item crit">
                  <div className="stat-label">Critical</div>
                  <div className="stat-num">{p.critical_count}</div>
                </div>
                <div className="platform-stat-item warn">
                  <div className="stat-label">High Threat</div>
                  <div className="stat-num">{p.high_count}</div>
                </div>
                <div className="platform-stat-item">
                  <div className="stat-label">Last Sync</div>
                  <div className="stat-time">{p.last_sync ? timeAgo(p.last_sync) : "just now"}</div>
                </div>
              </div>

              {/* Platform Metadata Badges */}
              <div className="platform-meta-box">
                {isTg && (
                  <>
                    <div className="meta-line">
                      <span className="meta-k">API ID:</span> <code>{p.meta?.api_id || "21942717"}</code>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">App Title:</span> <span>{p.meta?.app_title || "SentinelAI"}</span>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">Scope:</span> <span>Last 10m time-filtered</span>
                    </div>
                  </>
                )}
                {isCharcha && (
                  <>
                    <div className="meta-line">
                      <span className="meta-k">Target:</span> <code>{p.meta?.host || "http://103.155.85.18:8100"}</code>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">Fallback:</span> <code>{p.meta?.fallback_host || "http://localhost:8100"}</code>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">Extraction:</span> <span>JSON-LD & OCR Kits</span>
                    </div>
                  </>
                )}
                {p.platform_id === "instagram" && (
                  <>
                    <div className="meta-line">
                      <span className="meta-k">Stream:</span> <span>{p.meta?.feed || "OSINT Student Lures"}</span>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">Format:</span> <span>Sponsored Reels & Stories</span>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">Cadence:</span> <span>5m periodic batch</span>
                    </div>
                  </>
                )}
                {p.platform_id === "twitter" && (
                  <>
                    <div className="meta-line">
                      <span className="meta-k">Stream:</span> <span>P2P USDT Escrow Monitor</span>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">Keywords:</span> <code>#USDTp2p #BankAccount</code>
                    </div>
                    <div className="meta-line">
                      <span className="meta-k">Cadence:</span> <span>Real-time socket stream</span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="platform-card-actions">
                <button
                  className="btn platform-action-btn primary"
                  onClick={() => navigate(`/cases?platform=${p.platform_id}`)}
                  title={`Filter cases for ${p.name}`}
                >
                  <Icon name="cases" size={15} /> View Source Posts ({p.total_posts})
                </button>
                {isTg && (
                  <button
                    className="btn platform-action-btn secondary"
                    disabled={pollingBusy}
                    onClick={triggerTelegramPoll}
                    title="Poll monitored Telegram channels now"
                  >
                    <Icon name="refresh" size={14} /> {pollingBusy ? "Polling..." : "Poll Now"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cross-Platform Share & Distribution */}
      <div className="panel" style={{ marginTop: "24px" }}>
        <div className="panel-head">
          <h2>Platform Ingestion Share & Threat Ratio</h2>
          <span className="muted small">Volume distribution across intercepted sources</span>
        </div>
        <div className="share-bar-container">
          {platforms.map((p) => {
            const pct = data?.total_posts_across_platforms
              ? Math.max(3, Math.round((p.total_posts / data.total_posts_across_platforms) * 100))
              : 25;
            return (
              <div
                key={p.platform_id}
                className={`share-bar-segment seg-${p.platform_id}`}
                style={{ width: `${pct}%` }}
                title={`${p.name}: ${p.total_posts} posts (${pct}%)`}
              >
                <span>{p.platform}: {pct}%</span>
              </div>
            );
          })}
        </div>
        <div className="share-legend">
          {platforms.map((p) => (
            <div key={p.platform_id} className="legend-item">
              <span className={`legend-dot dot-${p.platform_id}`} />
              <span className="legend-name">{p.name}</span>
              <span className="legend-val">({p.total_posts} items · {p.critical_count} critical)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabbed Recent Intercepts by Platform */}
      <div className="panel" style={{ marginTop: "16px" }}>
        <div className="panel-head">
          <div>
            <h2>Recent Intercepts by Platform</h2>
            <div className="muted small">Direct verification of posts flagged from each connected source</div>
          </div>
          <div className="platform-tabs">
            {platforms.map((p) => (
              <button
                key={p.platform_id}
                className={`platform-tab-btn ${activeTab === p.platform_id ? "active" : ""}`}
                onClick={() => setActiveTab(p.platform_id)}
              >
                {p.platform} ({p.total_posts})
              </button>
            ))}
          </div>
        </div>

        {activePlatformObj?.recent_posts?.length > 0 ? (
          <div className="recent-posts-list">
            {activePlatformObj.recent_posts.map((post) => (
              <div key={post.id} className="recent-platform-post-card">
                <div className="rppc-head">
                  <div className="rppc-meta">
                    <span className="rppc-case-id">{caseId(post.id)}</span>
                    <span className="rppc-platform-tag">{post.platform}</span>
                    <span className="rppc-author">by <b>{post.author || "anonymous"}</b></span>
                    {post.posted_at && <span className="rppc-time">{timeAgo(post.posted_at)}</span>}
                  </div>
                  <RiskBadge level={post.risk_level} score={post.risk_score} />
                </div>
                <div className="rppc-excerpt">"{post.excerpt}"</div>
                {post.reasons?.length > 0 && (
                  <div className="rppc-reasons">
                    {post.reasons.map((r, i) => (
                      <span key={i} className="rppc-reason-pill">⚠️ {r}</span>
                    ))}
                  </div>
                )}
                <div className="rppc-actions">
                  <Link to={`/case/${post.id}`} className="btn small primary">
                    Inspect Full Evidence Case →
                  </Link>
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Icon name="link" size={13} /> Original Source URL
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <strong>No posts collected yet for this platform</strong>
            <p>Waiting for incoming intercepts or background crawler cycle.</p>
          </div>
        )}
      </div>
    </div>
  );
}
