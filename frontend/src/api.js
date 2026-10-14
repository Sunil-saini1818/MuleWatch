async function req(path, opts = {}) {
  const r = await fetch(path, opts);
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try { const d = await r.json(); msg = d.detail || d.message || msg; } catch { /* not json */ }
    throw new Error(msg);
  }
  return r.headers.get("content-type")?.includes("json") ? r.json() : r;
}

const json = (method, body) => ({
  method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

export const api = {
  stats: () => req("/api/stats"),
  posts: (params = {}) => req("/api/posts?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null))),
  post: (id) => req(`/api/posts/${id}`),
  feedback: (id, label) => req(`/api/posts/${id}/feedback`, json("POST", { label })),
  takedown: (id) => req(`/api/posts/${id}/takedown`, { method: "POST" }),
  analyze: (form) => req("/api/analyze", { method: "POST", body: form }),
  analyzeUrl: (url, save) => req("/api/analyze/url", json("POST", { url, save })),
  analyzeQr: (form) => req("/api/analyze/qr", { method: "POST", body: form }),
  graph: (params = {}) => req("/api/graph?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null))),
  alerts: () => req("/api/alerts"),
  alertsSeen: () => req("/api/alerts/seen", { method: "POST" }),
  watchlist: () => req("/api/watchlist"),
  addWatch: (kind, value, note = "") => req("/api/watchlist", json("POST", { kind, value, note })),
  delWatch: (id) => req(`/api/watchlist/${id}`, { method: "DELETE" }),
  sources: () => req("/api/sources"),
  addSource: (kind, url, name) => req("/api/sources", json("POST", { kind, url, name })),
  toggleSource: (id, enabled) => req(`/api/sources/${id}`, json("PATCH", { enabled })),
  retrySource: (id) => req(`/api/sources/${id}/retry`, { method: "POST" }),
  delSource: (id) => req(`/api/sources/${id}`, { method: "DELETE" }),
  crawl: () => req("/api/crawl", { method: "POST" }),
  bot: () => req("/api/bot"),
  unlinkAlerts: () => req("/api/bot/alerts", { method: "DELETE" }),
  telegramStatus: () => req("/api/telegram/status"),
  telegramPoller: () => req("/api/telegram/poller"),
  telegramPollNow: (minutes = 10) => req("/api/telegram/manual-sync", json("POST", { minutes })),
  telegramManualSync: (minutes = 10) => req("/api/telegram/manual-sync", json("POST", { minutes })),
  examineTelegram: (data) => req("/api/telegram/examine", json("POST", data)),
  platformStats: () => req("/api/platforms/stats"),
  cases: (params = {}) => req("/api/cases?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null))),
  updateCaseStatus: (id, status) => req(`/api/cases/${id}/status`, json("POST", { status })),
  dispatchQueue: () => req("/api/dispatch/queue"),
  dispatchI4C: (case_id) => req("/api/dispatch/i4c", json("POST", { case_id })),
  dispatchBankLien: (case_id, bank = "Partner Nodal Bank", target_account = "") =>
    req("/api/dispatch/bank-lien", json("POST", { case_id, bank, target_account })),
  stateStats: () => req("/api/stats/states"),
  rajasthanStats: () => req("/api/stats/rajasthan-districts"),
  get: (path) => req(path.startsWith("/api") ? path : `/api${path}`),
};

export const LEVELS = ["Critical", "High", "Medium", "Low"];

export function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export const caseId = (id) => `MW-${String(id).padStart(5, "0")}`;
