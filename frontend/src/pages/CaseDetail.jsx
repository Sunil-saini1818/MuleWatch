import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, caseId, timeAgo } from "../api";
import NetworkGraph from "../components/NetworkGraph";
import { Empty, Entities, GROUP_CLASS, GROUP_LABEL, HighlightedText, Icon, Legend, PostRow, RiskBadge, ScoreBreakdown, ScoreMeter } from "../components/ui";
import { useLive } from "../live";

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
              <h3>Text read from the image</h3>
              {p.ocr_text ? <p className="ocr">{p.ocr_text}</p> : <p className="muted">No readable text found (is Tesseract installed?).</p>}
              {imageMatches.length > 0 && (
                <p className="img-hits">Words found in the image: {[...new Map(imageMatches.map((m) => [m.term, m])).values()].map((m) => <mark key={m.term} className={GROUP_CLASS[m.group]} title={GROUP_LABEL[m.group]}>{m.term}</mark>)}</p>
              )}
            </div>
          </div>
        )}
      </section>
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

  const verdict = async (label) => {
    setBusy(label);
    try { setP(await api.feedback(p.id, p.label === label ? "clear" : label)); setNote(label === "confirmed" ? "Verdict saved. Keyword weights and the text model were updated." : "Marked as false positive. The model learned from it and rescored all posts."); }
    catch (e) { setNote(e.message); }
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
            {p.label === "confirmed" && <span className="chip chip-ok">confirmed</span>}
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
          <button className={`btn btn-confirm${p.label === "confirmed" ? " on" : ""}`} disabled={!!busy} onClick={() => verdict("confirmed")}><Icon name="check" /> {p.label === "confirmed" ? "Confirmed" : "Confirm fraud"}</button>
          <button className={`btn btn-fp${p.label === "false_positive" ? " on" : ""}`} disabled={!!busy} onClick={() => verdict("false_positive")}><Icon name="x" /> False positive</button>
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
          <section className="panel">
            <div className="panel-head"><h2>Evidence integrity</h2></div>
            <p className="small">SHA-256 of the captured post, metadata and image, recorded at capture time:</p>
            <code className="hash">{p.evidence_hash}</code>
          </section>
        </div>
      </div>
    </div>
  );
}

export { RiskBadge };
