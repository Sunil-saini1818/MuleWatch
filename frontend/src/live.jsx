import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const LiveCtx = createContext(null);
export const useLive = () => useContext(LiveCtx);

// Two-tone alert chime generated with WebAudio (no audio files needed)
function chime(ctx, critical) {
  const now = ctx.currentTime;
  const tones = critical ? [880, 660, 880, 660] : [740];
  tones.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, now + i * 0.18);
    g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.18);
    o.stop(now + i * 0.18 + 0.17);
  });
}

export function LiveProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [feed, setFeed] = useState([]);          // posts that arrived during this session
  const [toasts, setToasts] = useState([]);
  const [version, setVersion] = useState(0);     // bump -> pages refetch
  const [soundOn, setSoundOn] = useState(false);
  const audio = useRef(null);
  const soundRef = useRef(false);

  const enableSound = useCallback(() => {
    if (!audio.current) audio.current = new (window.AudioContext || window.webkitAudioContext)();
    audio.current.resume();
    soundRef.current = !soundRef.current;
    setSoundOn(soundRef.current);
    if (soundRef.current) chime(audio.current, false);
  }, []);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  useEffect(() => {
    let es;
    let bumpTimer;
    const bump = () => { clearTimeout(bumpTimer); bumpTimer = setTimeout(() => setVersion((v) => v + 1), 600); };
    const connect = () => {
      es = new EventSource("/api/events");
      es.onopen = () => setConnected(true);
      es.onerror = () => setConnected(false);
      es.addEventListener("post", (e) => {
        const p = JSON.parse(e.data);
        setFeed((f) => [{ ...p, _arrived: Date.now() }, ...f.filter((x) => x.id !== p.id)].slice(0, 60));
        bump();
      });
      es.addEventListener("alert", (e) => {
        const a = JSON.parse(e.data);
        const id = a.id;
        setToasts((t) => [{ ...a, id }, ...t].slice(0, 4));
        setTimeout(() => dismiss(id), a.level === "Critical" ? 14000 : 9000);
        if (soundRef.current && audio.current) chime(audio.current, a.level === "Critical");
        bump();
      });
    };
    connect();
    return () => { es && es.close(); clearTimeout(bumpTimer); };
  }, [dismiss]);

  return (
    <LiveCtx.Provider value={{ connected, feed, toasts, dismiss, version, soundOn, enableSound, refresh: () => setVersion((v) => v + 1) }}>
      {children}
    </LiveCtx.Provider>
  );
}
