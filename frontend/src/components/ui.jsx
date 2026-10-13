import { Link } from "react-router-dom";
import { caseId, timeAgo } from "../api";

export function Icon({ name, size = 18 }) {
  const p = {
    radar: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><path d="M12 12l6-6" /></>,
    cases: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
    graph: <><circle cx="6" cy="7" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="17" r="2.5" /><path d="M8 8l8-1.5M7.5 9l3.5 6M16.5 8l-3.5 7" /></>,
    scan: <><path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3" /><path d="M7 12h10" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>,
    bell: <><path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" /><path d="M10 20a2 2 0 004 0" /></>,
    sound: <><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></>,
    mute: <><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l5 6M22 9l-5 6" /></>,
    pdf: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
    check: <path d="M5 12l5 5 9-10" />,
    x: <path d="M6 6l12 12M18 6L6 18" />,
    shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
    link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    refresh: <><path d="M20 11a8 8 0 10-2.3 5.7" /><path d="M20 5v6h-6" /></>,
  }[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>
  );
}

export function RiskBadge({ level, score }) {
  return (
    <span className={`risk risk-${level?.toLowerCase()}`}>
      {score != null && <b>{Math.round(score)}</b>}
      {level}
    </span>
  );
}

export function ScoreMeter({ score, level, size = 120 }) {
  const r = 52, c = 2 * Math.PI * r, frac = Math.min(1, (score || 0) / 100);
  return (
    <div className={`meter meter-${level?.toLowerCase()}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} className="meter-track" />
        <circle cx="60" cy="60" r={r} className="meter-val" strokeDasharray={`${c * frac} ${c}`} transform="rotate(-90 60 60)" />
      </svg>
      <div className="meter-num"><strong>{Math.round(score)}</strong><span>{level}</span></div>
    </div>
  );
}

const GROUP_CLASS = {
  mule_kit: "hl-strong", card_sale: "hl-strong", payout_lure: "hl-strong",
  evasion: "hl-warn", financial_object: "hl-soft", sale_intent: "hl-soft", awareness: "hl-good",
};
const PRIORITY = { "hl-strong": 5, "hl-ent": 4, "hl-warn": 3, "hl-good": 2, "hl-soft": 1 };
const GROUP_LABEL = {
  mule_kit: "Mule-account sale language", card_sale: "Card sale", payout_lure: "Recruiting account holders",
  evasion: "KYC evasion / trust cue", financial_object: "Financial instrument", sale_intent: "Sale / rent intent",
  awareness: "Awareness context (lowers risk)",
};

export { GROUP_CLASS, GROUP_LABEL };

/** Renders text with keyword + identifier spans highlighted. */
export function HighlightedText({ text, matches = [], entitySpans = [] }) {
  if (!text) return <p className="muted">No text — image-only post.</p>;
  // backend offsets are Unicode code points; split the same way so emoji don't shift highlights
  const chars = Array.from(text);
  const cls = new Array(chars.length).fill(null);
  const tip = new Array(chars.length).fill(null);
  const paint = (s, e, c, t) => {
    for (let i = s; i < Math.min(e, chars.length); i++) {
      if (!cls[i] || PRIORITY[c] > PRIORITY[cls[i]]) { cls[i] = c; tip[i] = t; }
    }
  };
  matches.filter((m) => m.source === "text").forEach((m) => paint(m.start, m.end, GROUP_CLASS[m.group] || "hl-soft", GROUP_LABEL[m.group]));
  entitySpans.forEach((s) => paint(s.start, s.end, "hl-ent", s.kind.replace("_", " ")));
  const out = [];
  let i = 0;
  while (i < chars.length) {
    let j = i;
    while (j < chars.length && cls[j] === cls[i] && tip[j] === tip[i]) j++;
    const chunk = chars.slice(i, j).join("");
    out.push(cls[i] ? <mark key={i} className={cls[i]} title={tip[i]}>{chunk}</mark> : <span key={i}>{chunk}</span>);
    i = j;
  }
  return <div className="hl-text">{out}</div>;
}

export function Legend() {
  return (
    <div className="legend">
      <span><mark className="hl-strong">sale language</mark></span>
      <span><mark className="hl-warn">evasion cue</mark></span>
      <span><mark className="hl-ent">identifier</mark></span>
      <span><mark className="hl-soft">context word</mark></span>
      <span><mark className="hl-good">awareness</mark></span>
    </div>
  );
}

const ENT_LABEL = {
  phone: "Phone", upi: "UPI ID", telegram: "Telegram", whatsapp: "WhatsApp", handle: "Handle", url: "Link",
  email: "Email", ifsc: "IFSC", card_number: "Card no.", crypto_wallet: "Crypto wallet", price: "Price", domains: "Domain",
};
const WATCHABLE = new Set(["phone", "upi", "telegram", "whatsapp", "handle", "email", "crypto_wallet", "url", "domains"]);

export function Entities({ entities = {}, onWatch, watched = new Set() }) {
  const rows = Object.entries(entities).filter(([k, v]) => ENT_LABEL[k] && v?.length);
  if (!rows.length) return <p className="muted">No phone numbers, payment IDs or links found.</p>;
  return (
    <dl className="ents">
      {rows.map(([k, vals]) => (
        <div key={k} className="ent-row">
          <dt>{ENT_LABEL[k]}</dt>
          <dd>{vals.map((v) => (
            <span key={v} className="ent">
              <code>{v}</code>
              {onWatch && WATCHABLE.has(k) && (
                watched.has(String(v).toLowerCase())
                  ? <span className="ent-watched" title="On watchlist"><Icon name="eye" size={14} /></span>
                  : <button className="ent-watch" title="Add to watchlist" onClick={() => onWatch(k === "domains" ? "url" : k, v)}><Icon name="plus" size={14} /></button>
              )}
            </span>
          ))}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ScoreBreakdown({ scores = {}, llm }) {
  const rows = [
    ["Keyword & identifier rules", scores.rule, (scores.rule_parts || []).map((p) => `${p.name} (+${p.points})`).join(" · ")],
    ["Multilingual text model", scores.ml, scores.ml_features?.length ? `strongest signals: ${scores.ml_features.join(", ")}` : ""],
    ["Image analysis", scores.image, scores.image_cues?.length ? `seen in image: ${scores.image_cues.join(", ")}` : "no banking material in image"],
  ];
  if (scores.llm != null) rows.push(["AI analyst (Claude)", scores.llm, llm?.rationale || ""]);
  return (
    <div className="breakdown">
      {rows.map(([name, v, note]) => (
        <div key={name} className="bd-row">
          <div className="bd-head"><span>{name}</span><b>{Math.round(v || 0)}</b></div>
          <div className="bar"><i style={{ width: `${Math.min(100, v || 0)}%` }} /></div>
          {note && <div className="bd-note">{note}</div>}
        </div>
      ))}
      <div className="bd-extra">
        <span>Combined base score <b>{Math.round(scores.base || 0)}</b></span>
        {scores.ring_boost > 0 && <span>Seller-ring boost <b>+{scores.ring_boost}</b></span>}
        {scores.watchlist?.length > 0 && <span className="wl-hit">Watchlist match: {scores.watchlist.join(", ")}</span>}
      </div>
    </div>
  );
}

export function PostRow({ p, fresh, why }) {
  return (
    <Link to={`/case/${p.id}`} className={`post-row${fresh ? " fresh" : ""} lvl-${p.risk_level.toLowerCase()}`}>
      <RiskBadge level={p.risk_level} score={p.risk_score} />
      <div className="pr-main">
        <div className="pr-top">
          <span className="pr-case">{caseId(p.id)}</span>
          <span className="pr-cat">{p.category}</span>
          {p.cluster_size > 1 && <span className="chip chip-ring">ring of {p.cluster_size}</span>}
          {p.label === "confirmed" && <span className="chip chip-ok">confirmed</span>}
          {p.label === "false_positive" && <span className="chip">false positive</span>}
          {p.takedown && <span className="chip chip-td">takedown requested</span>}
        </div>
        <div className="pr-excerpt">{p.excerpt || "(image only)"}</div>
        {why ? <div className="pr-why">{why.join("; ")}</div> :
          <div className="pr-meta">{p.platform} · {p.author && `u/${p.author} · `}{timeAgo(p.posted_at)}</div>}
      </div>
      {p.image && <img className="pr-thumb" src={p.image} alt="" loading="lazy" />}
    </Link>
  );
}

export function Empty({ title, children }) {
  return <div className="empty"><strong>{title}</strong>{children && <p>{children}</p>}</div>;
}
