import { useEffect, useState } from "react";
import { api, timeAgo } from "../api";
import { Empty, Icon } from "../components/ui";

const KINDS = [["phone", "Phone"], ["upi", "UPI ID"], ["telegram", "Telegram link"], ["whatsapp", "WhatsApp"],
  ["crypto_wallet", "Crypto wallet"], ["url", "Website / domain"], ["handle", "Handle"], ["keyword", "Keyword"]];

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [kind, setKind] = useState("phone");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { api.watchlist().then(setItems); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    setItems(await api.addWatch(kind, value, note));
    setValue(""); setNote("");
  };

  return (
    <div>
      <div className="page-head">
        <h1>Watchlist</h1>
        <p>Known numbers, UPI IDs and links. Any post that mentions one is raised to at least score 88 and alerts immediately, even if the wording looks harmless.</p>
      </div>
      <form className="panel watch-form" onSubmit={add}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. +919829041736 or earnfast21@ybl" aria-label="Value" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
        <button className="btn btn-primary"><Icon name="plus" /> Add</button>
      </form>
      <section className="panel">
        {items.length ? (
          <table className="tbl">
            <thead><tr><th>Type</th><th>Value</th><th>Note</th><th>Added</th><th /></tr></thead>
            <tbody>{items.map((w) => (
              <tr key={w.id}><td>{w.kind}</td><td><code>{w.value}</code></td><td>{w.note}</td><td>{timeAgo(w.created_at)}</td>
                <td><button className="icon-btn" aria-label="Remove" onClick={async () => setItems(await api.delWatch(w.id))}><Icon name="x" size={16} /></button></td></tr>
            ))}</tbody>
          </table>
        ) : <Empty title="Watchlist is empty">Add identifiers here, or use the + next to any identifier in a case.</Empty>}
      </section>
    </div>
  );
}
