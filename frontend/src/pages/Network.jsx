import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, caseId } from "../api";
import NetworkGraph, { KIND_COLOR, LEVEL_COLOR, SCHEMA_MAP } from "../components/NetworkGraph";
import { Empty, Icon, RiskBadge } from "../components/ui";
import { useLive } from "../live";

export default function Network() {
  const [sp, setSp] = useSearchParams();
  const { version } = useLive();
  const graphRef = useRef(null);

  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null);
  const [hop1, setHop1] = useState([]);
  const [hop2, setHop2] = useState([]);
  const [minScore, setMinScore] = useState(30);
  const [layoutName, setLayoutName] = useState("cose");
  const [hopMode, setHopMode] = useState("2hop");
  const [searchQuery, setSearchQuery] = useState("");
  const [watchMsg, setWatchMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const cluster = sp.get("cluster");

  useEffect(() => {
    api.graph(cluster ? { cluster } : { min_score: minScore }).then((res) => {
      setData(res);
      setSel(null);
      setHop1([]);
      setHop2([]);
    });
  }, [cluster, minScore, version]);

  const posts = useMemo(() => data?.nodes.filter((n) => n.type === "post") || [], [data]);
  const ids = useMemo(() => data?.nodes.filter((n) => n.type !== "post") || [], [data]);
  const edgeCount = data?.edges?.length || 0;

  // Identify top shared syndicate hubs (identifiers linking the most posts)
  const topHubs = useMemo(() => {
    return [...ids]
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 5);
  }, [ids]);

  // Search matches
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !data?.nodes) return [];
    return data.nodes
      .filter((n) =>
        n.label.toLowerCase().includes(q) ||
        (n.author && n.author.toLowerCase().includes(q)) ||
        (n.post_id && String(n.post_id).includes(q))
      )
      .slice(0, 6);
  }, [searchQuery, data]);

  const handleSelectNode = (root, h1 = [], h2 = []) => {
    setSel(root);
    setHop1(h1);
    setHop2(h2);
    setWatchMsg("");
    setCopied(false);
  };

  const handleFocus = (nodeId) => {
    graphRef.current?.focusNode(nodeId);
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddWatch = (kind, value) => {
    const watchKind = kind === "domain" ? "url" : kind;
    api.addWatch(watchKind, value, "from Neo4j graph view").then(() => {
      setWatchMsg("✓ Added to Watchlist");
      setTimeout(() => setWatchMsg(""), 3500);
    });
  };

  // Extract linked posts (1-hop & 2-hop)
  const linkedPosts = useMemo(() => {
    if (!sel) return [];
    const directPosts = hop1.filter((n) => n.type === "post").map((p) => ({ ...p, hop: 1 }));
    const ringPosts = hop2.filter((n) => n.type === "post").map((p) => ({ ...p, hop: 2 }));
    const combined = [...directPosts, ...ringPosts];
    // Deduplicate
    const seen = new Set();
    return combined.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [sel, hop1, hop2]);

  // Extract connected identifiers (when a post is selected)
  const connectedIds = useMemo(() => {
    if (!sel || sel.type !== "post") return [];
    return hop1.filter((n) => n.type !== "post");
  }, [sel, hop1]);

  return (
    <div className="network-page">
      {/* PAGE HEADER */}
      <div className="page-head">
        <div className="head-title-row">
          <h1>Seller network</h1>
          <span className="badge-neo4j"><Icon name="graph" size={14} /> Neo4j Intelligence Graph</span>
        </div>
        <p>
          Interactive knowledge graph tracing coordinated mule rings, shared payment handles, phone numbers,
          and syndicated recruitment campaigns. Nodes represent actors, posts, and financial artifacts connected
          via directional relationships.
        </p>
      </div>

      {/* GRAPH TOOLBAR CONTROLS */}
      <div className="graph-control-bar panel">
        {/* Risk Score Slider */}
        <div className="control-cell">
          {cluster ? (
            <button className="chip chip-ring" onClick={() => setSp({})}>
              Isolating Syndicate Ring #{cluster} ✕
            </button>
          ) : (
            <label className="range-label">
              <span>Minimum risk score:</span>
              <input
                type="range"
                min="0"
                max="90"
                step="10"
                value={minScore}
                onChange={(e) => setMinScore(+e.target.value)}
              />
              <b>{minScore}</b>
            </label>
          )}
        </div>

        {/* Layout Engine Selector */}
        <div className="control-cell">
          <label className="select-label">
            <span>Layout engine:</span>
            <select
              value={layoutName}
              onChange={(e) => {
                setLayoutName(e.target.value);
                graphRef.current?.setLayout(e.target.value);
              }}
            >
              <option value="cose">Force-Directed Physics (Springs)</option>
              <option value="concentric">Concentric Centrality Rings</option>
              <option value="circle">Syndicate Perimeter Circle</option>
              <option value="breadthfirst">Hierarchical Entity Tree</option>
            </select>
          </label>
        </div>

        {/* Neighborhood Hop Mode */}
        <div className="control-cell">
          <label className="select-label">
            <span>Tracing depth:</span>
            <div className="segmented-btn-group">
              <button
                className={`seg-btn ${hopMode === "1hop" ? "active" : ""}`}
                onClick={() => setHopMode("1hop")}
                title="Highlight 1-Hop direct connections"
              >
                1-Hop
              </button>
              <button
                className={`seg-btn ${hopMode === "2hop" ? "active" : ""}`}
                onClick={() => setHopMode("2hop")}
                title="Highlight 2-Hop full syndicate ring"
              >
                2-Hop Ring
              </button>
            </div>
          </label>
        </div>

        {/* Node Search Bar */}
        <div className="control-cell search-cell">
          <div className="graph-search-wrap">
            <input
              type="text"
              placeholder="Search phone, UPI, handle, or MW-id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")}>✕</button>
            )}
            {searchMatches.length > 0 && (
              <div className="search-dropdown">
                {searchMatches.map((m) => (
                  <div
                    key={m.id}
                    className="search-item"
                    onClick={() => {
                      handleFocus(m.id);
                      setSearchQuery("");
                    }}
                  >
                    <span className="search-tag">{SCHEMA_MAP[m.type] || "(:Node)"}</span>
                    <b className="search-label">{m.label}</b>
                    {m.level && <RiskBadge level={m.level} score={m.score} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Canvas Physics & Zoom Buttons */}
        <div className="control-cell btn-cell">
          <button className="btn btn-sm" onClick={() => graphRef.current?.zoomIn()} title="Zoom in">
            +
          </button>
          <button className="btn btn-sm" onClick={() => graphRef.current?.zoomOut()} title="Zoom out">
            −
          </button>
          <button className="btn btn-sm" onClick={() => graphRef.current?.fit()} title="Fit view to screen">
            Fit
          </button>
          <button
            className="btn btn-sm btn-stabilize"
            onClick={() => graphRef.current?.stabilize()}
            title="Re-run physics layout stabilization"
          >
            <Icon name="refresh" size={13} /> Stabilize
          </button>
        </div>
      </div>

      {/* GRAPH CANVAS & SIDEBAR WRAPPER */}
      <div className="net-wrap">
        <section className="panel net-graph-container">
          <div className="graph-meta-banner">
            <span className="stats-indicator">
              <b>{posts.length}</b> Posts · <b>{ids.length}</b> Shared Identifiers · <b>{edgeCount}</b> Directional Relationships
            </span>
            <span className="graph-help-hint">
              Drag nodes to adjust physics · Click any node to trace its {hopMode === "2hop" ? "2-hop ring" : "1-hop direct links"} · Click background to reset
            </span>
          </div>

          {data && posts.length > 0 ? (
            <NetworkGraph
              ref={graphRef}
              data={data}
              height={640}
              layoutName={layoutName}
              hopMode={hopMode}
              onSelect={handleSelectNode}
            />
          ) : (
            <Empty title="Nothing to render yet">
              Lower the minimum risk score threshold or wait for monitored posts to be ingested.
            </Empty>
          )}

          {/* NEO4J SCHEMA LEGEND */}
          <div className="neo-schema-legend">
            <div className="legend-section">
              <span className="legend-group-title">Node Typology:</span>
              <span className="legend-item">
                <i className="shape-node shape-circle" style={{ background: KIND_COLOR.seller }} />
                <code>(:SellerAccount)</code> Circle (Red)
              </span>
              <span className="legend-item">
                <i className="shape-node shape-diamond" style={{ background: KIND_COLOR.phone }} />
                <code>(:PhoneNumber)</code> Diamond (Blue)
              </span>
              <span className="legend-item">
                <i className="shape-node shape-triangle" style={{ background: KIND_COLOR.telegram }} />
                <code>(:SocialLink)</code> Triangle (Light Blue/Cyan)
              </span>
              <span className="legend-item">
                <i className="shape-node shape-hexagon" style={{ background: KIND_COLOR.upi }} />
                <code>(:UpiIdentity)</code> Hexagon (Purple)
              </span>
              <span className="legend-item">
                <i className="shape-node shape-pill" style={{ background: LEVEL_COLOR.Critical }} />
                <code>(:CasePost)</code> Box / Pill (Risk Level)
              </span>
            </div>
            <div className="legend-section">
              <span className="legend-group-title">Relationships:</span>
              <span className="legend-rel"><i className="rel-arrow" /><code>POSTED_BY</code></span>
              <span className="legend-rel"><i className="rel-arrow" /><code>USES_PHONE</code></span>
              <span className="legend-rel"><i className="rel-arrow" /><code>SHARES_UPI</code></span>
              <span className="legend-rel"><i className="rel-arrow" /><code>MENTIONS_TELEGRAM</code></span>
              <span className="legend-rel"><i className="rel-dash" /><code>SIMILAR_TO</code></span>
            </div>
          </div>
        </section>

        {/* RIGHT SIDE DETAILS DRAWER / INSPECTOR */}
        <aside className="panel net-side neo-inspector">
          {sel ? (
            <div className="inspector-content">
              {/* TOP SCHEMA BADGE & ACTION ROW */}
              <div className="inspector-header">
                <span className="schema-badge">
                  <i className="dot-pulse" /> {SCHEMA_MAP[sel.type] || "(:Entity)"}
                </span>
                <button
                  className="btn-icon-copy"
                  onClick={() => handleCopy(sel.label)}
                  title="Copy entity identifier"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>

              {/* ENTITY VALUE HEADER */}
              <div className="entity-title-block">
                <code className="entity-main-val">{sel.label}</code>
                {sel.type === "post" && (
                  <div className="entity-post-title">
                    <Link to={`/case/${sel.post_id}`}>{caseId(sel.post_id)}</Link>
                  </div>
                )}
              </div>

              {/* QUICK ACTION BUTTONS */}
              <div className="inspector-quick-actions">
                <button className="btn btn-sm" onClick={() => handleFocus(sel.id)}>
                  Focus in Graph
                </button>
                {sel.type !== "post" ? (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleAddWatch(sel.type, sel.label)}
                  >
                    Add Entity to Watchlist
                  </button>
                ) : (
                  <Link className="btn btn-sm btn-primary" to={`/case/${sel.post_id}`}>
                    Open Case File
                  </Link>
                )}
              </div>

              {watchMsg && <div className="watch-confirm-banner">{watchMsg}</div>}

              {/* METADATA GRID */}
              <div className="inspector-meta-grid">
                <div className="meta-box">
                  <span className="meta-lbl">Entity Type</span>
                  <b>{sel.kind_label || (sel.type === "post" ? "Case Post" : sel.type)}</b>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Linked Posts</span>
                  <b>{sel.count || (linkedPosts.length ? linkedPosts.length : 1)}</b>
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Risk Rating</span>
                  {sel.level ? (
                    <RiskBadge level={sel.level} score={sel.score} />
                  ) : (
                    <span className="badge-calc">
                      {linkedPosts[0]?.score ? `${Math.round(linkedPosts[0].score)} Risk` : "Linked Ring"}
                    </span>
                  )}
                </div>
                <div className="meta-box">
                  <span className="meta-lbl">Platform / Origin</span>
                  <b>{sel.platform || (linkedPosts[0]?.platform || "Multi-Channel")}</b>
                </div>
              </div>

              {/* POST EXCERPT (IF POST) */}
              {sel.type === "post" && sel.excerpt && (
                <div className="inspector-excerpt-box">
                  <span className="sec-lbl">Content Excerpt:</span>
                  <p className="excerpt-quote">"{sel.excerpt}"</p>
                </div>
              )}

              {/* CONNECTED IDENTIFIERS LIST (IF POST) */}
              {sel.type === "post" && connectedIds.length > 0 && (
                <div className="inspector-sec">
                  <span className="sec-lbl">Connected Identifiers ({connectedIds.length}):</span>
                  <div className="id-pills-list">
                    {connectedIds.map((cid) => (
                      <div
                        key={cid.id}
                        className="id-pill-row"
                        onClick={() => handleFocus(cid.id)}
                        title="Click to jump to node in graph"
                      >
                        <span className="id-tag">{SCHEMA_MAP[cid.type] || cid.type}</span>
                        <code className="id-val">{cid.label}</code>
                        <span className="id-deg">{cid.count} posts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LINKED SUSPICIOUS POSTS LIST */}
              <div className="inspector-sec">
                <span className="sec-lbl">
                  Linked Suspicious Posts ({linkedPosts.length}):
                </span>
                {linkedPosts.length > 0 ? (
                  <div className="linked-posts-scroll">
                    {linkedPosts.map((p) => (
                      <div key={p.id} className="linked-post-card">
                        <div className="lp-head">
                          <Link to={`/case/${p.post_id}`} className="lp-id">
                            {caseId(p.post_id)}
                          </Link>
                          <span className={`hop-tag hop-${p.hop}`}>
                            {p.hop === 1 ? "1-Hop Direct" : "2-Hop Ring"}
                          </span>
                          <RiskBadge level={p.level} score={p.score} />
                        </div>
                        <div className="lp-platform small muted">
                          {p.platform} {p.author && `· u/${p.author}`}
                        </div>
                        {p.excerpt && <p className="lp-excerpt">{p.excerpt}</p>}
                        <div className="lp-actions">
                          <button
                            className="btn-text-link"
                            onClick={() => handleFocus(p.id)}
                          >
                            Trace in graph →
                          </button>
                          <Link className="btn-text-link" to={`/case/${p.post_id}`}>
                            View evidence →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="small muted">No linked posts in current threshold.</p>
                )}
              </div>
            </div>
          ) : (
            /* DEFAULT OVERVIEW WHEN NO NODE IS SELECTED */
            <div className="inspector-empty-guide">
              <div className="overview-header">
                <h3>Syndicate Intelligence</h3>
                <span className="small muted">Knowledge Graph Overview</span>
              </div>

              {/* OVERVIEW STATS */}
              <div className="overview-metrics-grid">
                <div className="metric-box">
                  <span className="metric-num">{posts.length}</span>
                  <span className="metric-lbl">Case Posts</span>
                </div>
                <div className="metric-box">
                  <span className="metric-num">{ids.length}</span>
                  <span className="metric-lbl">Shared Entities</span>
                </div>
                <div className="metric-box">
                  <span className="metric-num">{edgeCount}</span>
                  <span className="metric-lbl">Relationships</span>
                </div>
              </div>

              {/* TOP SHARED SYNDICATE HUBS */}
              {topHubs.length > 0 && (
                <div className="top-hubs-section">
                  <span className="sec-lbl">Top Shared Syndicate Hubs:</span>
                  <p className="small muted">
                    Entities linking multiple mule advertisements with the highest degree centrality:
                  </p>
                  <div className="top-hubs-list">
                    {topHubs.map((hub) => (
                      <div
                        key={hub.id}
                        className="hub-row"
                        onClick={() => handleFocus(hub.id)}
                      >
                        <div className="hub-info">
                          <span className="hub-tag">{SCHEMA_MAP[hub.type] || hub.type}</span>
                          <code className="hub-label">{hub.label}</code>
                        </div>
                        <span className="hub-badge">{hub.count} linked posts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* INVESTIGATION INSTRUCTION CARD */}
              <div className="investigation-tips-card">
                <h4>Investigation Workflow</h4>
                <ul>
                  <li><b>Select any entity</b> to spotlight its 1-hop and 2-hop criminal network.</li>
                  <li><b>Drag & drop</b> nodes to untangle dense clusters or trace syndicate branches.</li>
                  <li><b>Stabilize Physics</b> whenever dragging nodes to rebalance the force simulation.</li>
                  <li><b>Add to Watchlist</b> to flag future advertisements featuring identified accounts.</li>
                </ul>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
