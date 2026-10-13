// MuleWatch Field Check — sends selected text / images from any page to the command center.
const DEFAULT_API = "http://localhost:8000";
const api = async () => (await chrome.storage.sync.get({ api: DEFAULT_API })).api.replace(/\/$/, "");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "mw-text", title: "Check selected text with MuleWatch", contexts: ["selection"] });
  chrome.contextMenus.create({ id: "mw-image", title: "Check this image with MuleWatch", contexts: ["image"] });
});

async function analyze({ text = "", imageUrl = "", pageUrl = "", title = "" }) {
  const base = await api();
  const form = new FormData();
  form.append("text", text);
  form.append("url", pageUrl);
  form.append("platform", title ? `Browser: ${new URL(pageUrl).hostname}` : "Browser extension");
  form.append("source", "extension");
  form.append("save", "true");
  if (imageUrl) {
    try {
      const blob = await (await fetch(imageUrl)).blob();
      form.append("image", blob, "capture." + (blob.type.split("/")[1] || "png"));
    } catch (e) { /* cross-origin image we can't read: fall back to text only */ }
  }
  const r = await fetch(base + "/api/analyze", { method: "POST", body: form });
  if (!r.ok) throw new Error(`MuleWatch returned ${r.status}`);
  return r.json();
}

async function showResult(tabId, res) {
  const base = await api();
  await chrome.storage.local.set({ last: { ...res, base } });
  chrome.notifications.create(String(res.id), {
    type: "basic", iconUrl: "icon128.png",
    title: `${res.risk_level} risk · score ${Math.round(res.risk_score)}`,
    message: `${res.category}. ${(res.reasons || [])[0] || "No strong indicators."}`.slice(0, 250),
    priority: res.risk_level === "Critical" ? 2 : 0,
  });
  if (tabId) {
    chrome.scripting.executeScript({
      target: { tabId },
      args: [res.risk_level, Math.round(res.risk_score), res.category, `${base}/case/${res.id}`],
      func: (level, score, cat, link) => {
        const colors = { Critical: "#d7263d", High: "#ea7317", Medium: "#b88a00", Low: "#3f8f6b" };
        const el = document.createElement("a");
        el.href = link; el.target = "_blank";
        el.textContent = `MuleWatch: ${level} (${score}) — ${cat}. Open case`;
        Object.assign(el.style, { position: "fixed", right: "16px", bottom: "16px", zIndex: 2147483647, background: colors[level] || "#333",
          color: "#fff", padding: "10px 14px", borderRadius: "10px", font: "600 14px system-ui, sans-serif", textDecoration: "none",
          boxShadow: "0 8px 24px rgba(0,0,0,.25)" });
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 9000);
      },
    }).catch(() => {});
  }
}

chrome.notifications.onClicked.addListener(async (id) => {
  chrome.tabs.create({ url: `${await api()}/case/${id}` });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const res = await analyze({
      text: info.menuItemId === "mw-text" ? info.selectionText : "",
      imageUrl: info.menuItemId === "mw-image" ? info.srcUrl : "",
      pageUrl: info.pageUrl || tab?.url || "", title: tab?.title || "",
    });
    showResult(tab?.id, res);
  } catch (e) {
    chrome.notifications.create({ type: "basic", iconUrl: "icon128.png", title: "MuleWatch unreachable",
      message: `${e.message}. Is the command center running at ${await api()}?` });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === "analyze") {
    analyze(msg.payload).then((res) => { showResult(msg.tabId, res); reply({ ok: true, res }); })
      .catch((e) => reply({ ok: false, error: e.message }));
    return true;
  }
});
