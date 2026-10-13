import cytoscape from "cytoscape";
import { useEffect, useRef } from "react";

const LEVEL_COLOR = { Critical: "#d7263d", High: "#ea7317", Medium: "#c99a06", Low: "#3f8f6b" };
const KIND_COLOR = {
  phone: "#2b3a9f", upi: "#7a3fb8", telegram: "#1f8acb", whatsapp: "#1e9e5a", handle: "#59607a",
  email: "#59607a", crypto_wallet: "#b8860b", card_number: "#a13a5c", ifsc: "#4b6b7a", domain: "#4b6b7a",
};
const KIND_SHAPE = { phone: "round-diamond", upi: "round-hexagon", telegram: "round-triangle", whatsapp: "round-triangle",
  crypto_wallet: "round-pentagon", card_number: "round-rectangle" };

export default function NetworkGraph({ data, onSelect, height = 560, compact = false }) {
  const ref = useRef(null);
  const cy = useRef(null);

  useEffect(() => {
    if (!ref.current || !data) return;
    const elements = [
      ...data.nodes.map((n) => ({ data: { ...n } })),
      ...data.edges.map((e, i) => ({ data: { id: `e${i}`, ...e } })),
    ];
    cy.current?.destroy();
    cy.current = cytoscape({
      container: ref.current,
      elements,
      wheelSensitivity: 0.25,
      style: [
        { selector: "node[type='post']", style: {
          "background-color": (n) => LEVEL_COLOR[n.data("level")] || "#888",
          width: (n) => 18 + (n.data("score") || 0) / 7, height: (n) => 18 + (n.data("score") || 0) / 7,
          label: compact ? "" : "data(label)", "font-size": 9, color: "#3a4256", "text-valign": "bottom", "text-margin-y": 3,
          "border-width": 2, "border-color": "#fff", "font-family": "IBM Plex Sans, Segoe UI, sans-serif",
        } },
        { selector: "node[type!='post']", style: {
          "background-color": (n) => KIND_COLOR[n.data("type")] || "#59607a",
          shape: (n) => KIND_SHAPE[n.data("type")] || "ellipse",
          width: (n) => 22 + 5 * Math.min(6, n.data("count") || 1), height: (n) => 22 + 5 * Math.min(6, n.data("count") || 1),
          label: "data(label)", "font-size": 10, "font-family": "IBM Plex Mono, Consolas, monospace", color: "#16202e",
          "text-background-color": "#ffffff", "text-background-opacity": 0.85, "text-background-padding": 2,
          "text-valign": "bottom", "text-margin-y": 4,
        } },
        { selector: "edge", style: { width: 1.6, "line-color": "#b9c1d3", "curve-style": "bezier" } },
        { selector: "edge[kind='similar']", style: { "line-style": "dashed", "line-color": "#d7263d", width: 2, opacity: 0.7 } },
        { selector: ":selected", style: { "border-width": 4, "border-color": "#16202e" } },
        { selector: ".faded", style: { opacity: 0.15 } },
      ],
      layout: { name: "cose", animate: false, nodeRepulsion: () => 9000, idealEdgeLength: () => 70, padding: 24,
        componentSpacing: 60, nodeOverlap: 12, randomize: true },
    });
    cy.current.on("tap", "node", (e) => {
      const n = e.target;
      cy.current.elements().addClass("faded");
      n.closedNeighborhood().removeClass("faded");
      n.closedNeighborhood().connectedEdges().removeClass("faded");
      onSelect?.(n.data(), n.closedNeighborhood("node").map((x) => x.data()));
    });
    cy.current.on("tap", (e) => {
      if (e.target === cy.current) { cy.current.elements().removeClass("faded"); onSelect?.(null, []); }
    });
    return () => { cy.current?.destroy(); cy.current = null; };
  }, [data, compact]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={ref} className="graph" style={{ height }} role="img" aria-label="Network of linked posts and shared identifiers" />;
}

export { KIND_COLOR, LEVEL_COLOR };
