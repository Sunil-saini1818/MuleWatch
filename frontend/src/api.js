async function req(path, opts = {}) {
  const r = await fetch(path, opts);
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try { const d = await r.json(); msg = d.detail || msg; } catch { /* not json */ }
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
  graph: (params = {}) => req("/api/graph?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== "" && v != null))),
  alerts: () => req("/api/alerts"),
  alertsSeen: () => req("/api/alerts/seen", { method: "POST" }),
  watchlist: () => req("/api/watchlist"),
  addWatch: (kind, value, note = "") => req("/api/watchlist", json("POST", { kind, value, note })),
  delWatch: (id) => req(`/api/watchlist/${id}`, { method: "DELETE" }),
  sources: () => req("/api/sources"),
  addSource: (kind, url, name) => req("/api/sources", json("POST", { kind, url, name })),
  toggleSource: (id, enabled) => req(`/api/sources/${id}`, json("PATCH", { enabled })),
  crawl: () => req("/api/crawl", { method: "POST" }),
  bot: () => req("/api/bot"),
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
