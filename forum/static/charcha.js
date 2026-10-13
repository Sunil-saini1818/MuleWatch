function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

document.addEventListener("click", async (e) => {
  const v = e.target.closest(".vote");
  if (v) {
    e.preventDefault();
    const box = v.closest(".votes");
    const body = new FormData(); body.append("v", v.dataset.v);
    const r = await fetch(`/p/${box.dataset.id}/vote`, { method: "POST", body });
    if (r.status === 401) { location.href = "/login?next=" + encodeURIComponent(location.pathname); return; }
    const d = await r.json();
    box.querySelector(".score").textContent = d.score;
    box.querySelectorAll(".vote").forEach((b) => b.classList.toggle("on", Number(b.dataset.v) === d.mine));
  }
  const s = e.target.closest(".share");
  if (s) {
    const url = location.origin + s.dataset.url;
    try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); }
  }
});

const inp = document.getElementById("imgInput");
if (inp) inp.addEventListener("change", () => {
  const f = inp.files[0], img = document.getElementById("imgPreview");
  if (f) { img.src = URL.createObjectURL(f); img.hidden = false; } else img.hidden = true;
});
