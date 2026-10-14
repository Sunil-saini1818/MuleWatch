import cytoscape from "cytoscape";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const LEVEL_COLOR = {
  Critical: "#d7263d",
  High: "#ea7317",
  Medium: "#b88a00",
  Low: "#3f8f6b",
};

const KIND_COLOR = {
  author: "#d7263d",
  handle: "#d7263d",
  seller: "#d7263d",
  actor: "#d7263d",
  phone: "#2563eb",
  upi: "#7c3aed",
  telegram: "#0284c7",
  whatsapp: "#059669",
  crypto_wallet: "#d97706",
  card_number: "#db2777",
  ifsc: "#0891b2",
  domain: "#64748b",
  email: "#64748b",
};

const KIND_SHAPE = {
  author: "ellipse",
  handle: "ellipse",
  seller: "ellipse",
  actor: "ellipse",
  phone: "round-diamond",
  telegram: "round-triangle",
  whatsapp: "round-triangle",
  upi: "round-hexagon",
  crypto_wallet: "round-hexagon",
  card_number: "round-hexagon",
  ifsc: "round-hexagon",
  domain: "round-tag",
  email: "ellipse",
};

const SCHEMA_MAP = {
  post: "(:CasePost)",
  author: "(:SellerAccount)",
  handle: "(:SellerAccount)",
  seller: "(:SellerAccount)",
  actor: "(:SellerAccount)",
  phone: "(:PhoneNumber)",
  upi: "(:UpiIdentity)",
  telegram: "(:TelegramHandle)",
  whatsapp: "(:WhatsAppEntity)",
  crypto_wallet: "(:CryptoWallet)",
  card_number: "(:BankCard)",
  ifsc: "(:BankBranch)",
  domain: "(:DomainHost)",
  email: "(:EmailAddress)",
};

const REL_MAP = {
  phone: "USES_PHONE",
  upi: "SHARES_UPI",
  telegram: "MENTIONS_TELEGRAM",
  whatsapp: "USES_WHATSAPP",
  handle: "POSTED_BY",
  author: "POSTED_BY",
  seller: "OPERATED_BY",
  actor: "OPERATED_BY",
  card_number: "HOLDS_CARD",
  crypto_wallet: "PAYS_TO_WALLET",
  ifsc: "USES_BANK",
  domain: "HOSTED_ON",
  email: "USES_EMAIL",
  similar: "SIMILAR_TO",
};

function getLayoutConfig(name) {
  if (name === "concentric") {
    return {
      name: "concentric",
      animate: true,
      animationDuration: 600,
      fit: true,
      padding: 32,
      concentric: (node) => (node.data("type") === "post" ? (node.data("score") || 50) : (node.data("count") || 1) * 15),
      levelWidth: () => 20,
    };
  }
  if (name === "circle") {
    return {
      name: "circle",
      animate: true,
      animationDuration: 600,
      fit: true,
      padding: 32,
    };
  }
  if (name === "breadthfirst") {
    return {
      name: "breadthfirst",
      animate: true,
      animationDuration: 600,
      fit: true,
      directed: true,
      padding: 32,
      spacingFactor: 1.25,
    };
  }
  // Default: cose (Force-Directed Spring Physics)
  return {
    name: "cose",
    animate: true,
    animationDuration: 750,
    animationEasing: "ease-out",
    refresh: 20,
    fit: true,
    padding: 32,
    randomize: false,
    componentSpacing: 85,
    nodeRepulsion: () => 85000,
    nodeOverlap: 20,
    idealEdgeLength: () => 85,
    edgeElasticity: () => 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  };
}

const NetworkGraph = forwardRef(function NetworkGraph(
  { data, onSelect, height = 560, compact = false, layoutName = "cose", hopMode = "2hop" },
  ref
) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const hopModeRef = useRef(hopMode);
  hopModeRef.current = hopMode;

  useImperativeHandle(ref, () => ({
    focusNode: (id) => {
      const cy = cyRef.current;
      if (!cy) return;
      const node = cy.getElementById(id);
      if (node && node.length) {
        cy.animate({
          center: { eles: node },
          zoom: 1.45,
          duration: 400,
        });
        node.emit("tap");
      }
    },
    zoomIn: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.animate({ zoom: cy.zoom() * 1.35, duration: 250 });
    },
    zoomOut: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.animate({ zoom: cy.zoom() / 1.35, duration: 250 });
    },
    fit: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.animate({ fit: { padding: 32 }, duration: 350 });
    },
    stabilize: () => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.layout(getLayoutConfig(layoutName)).run();
    },
    setLayout: (name) => {
      const cy = cyRef.current;
      if (!cy) return;
      cy.layout(getLayoutConfig(name)).run();
    },
    getCy: () => cyRef.current,
  }));

  useEffect(() => {
    if (!containerRef.current || !data) return;

    const elements = [
      ...data.nodes.map((n) => {
        const isActor = n.type === "author" || n.type === "handle" || n.type === "seller" || n.type === "actor";
        return {
          data: {
            ...n,
            isActor,
            schema: SCHEMA_MAP[n.type] || "(:Entity)",
          },
        };
      }),
      ...data.edges.map((e, i) => {
        const relLabel = e.label || REL_MAP[e.kind] || (e.kind ? e.kind.toUpperCase() : "LINKED_TO");
        return {
          data: {
            id: e.id || `e${i}`,
            ...e,
            rel_label: relLabel,
          },
        };
      }),
    ];

    cyRef.current?.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      wheelSensitivity: 0.22,
      boxSelectionEnabled: false,
      autounselectify: false,
      autoungrabify: false,
      style: [
        // Post Nodes: Box / Pill
        {
          selector: "node[type='post']",
          style: {
            shape: "round-rectangle",
            "background-color": (n) => LEVEL_COLOR[n.data("level")] || "#475569",
            width: (n) => 36 + (n.data("score") || 0) / 4.5,
            height: 24,
            label: compact ? "" : "data(label)",
            "font-size": 9.5,
            "font-weight": "bold",
            color: "#ffffff",
            "text-valign": "center",
            "text-halign": "center",
            "border-width": 2,
            "border-color": "#ffffff",
            "font-family": "IBM Plex Sans, Segoe UI, sans-serif",
            "shadow-blur": 6,
            "shadow-color": (n) => LEVEL_COLOR[n.data("level")] || "#475569",
            "shadow-opacity": 0.25,
          },
        },
        // Seller / Actor Nodes: Circle (Red / Critical)
        {
          selector: "node[?isActor]",
          style: {
            shape: "ellipse",
            "background-color": "#d7263d",
            width: (n) => 32 + 5 * Math.min(5, n.data("count") || 1),
            height: (n) => 32 + 5 * Math.min(5, n.data("count") || 1),
            label: "data(label)",
            "font-size": 10.5,
            "font-weight": "bold",
            color: "#0f172a",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-padding": 2.5,
            "text-border-color": "#d7263d",
            "text-border-width": 1,
            "text-border-opacity": 0.5,
            "text-valign": "bottom",
            "text-margin-y": 4,
            "border-width": 3,
            "border-color": "#ffffff",
            "font-family": "IBM Plex Sans, sans-serif",
            "shadow-blur": 8,
            "shadow-color": "#d7263d",
            "shadow-opacity": 0.35,
          },
        },
        // Phone Number Nodes: Diamond (Blue)
        {
          selector: "node[type='phone']",
          style: {
            shape: "round-diamond",
            "background-color": "#2563eb",
            width: (n) => 28 + 4 * Math.min(5, n.data("count") || 1),
            height: (n) => 28 + 4 * Math.min(5, n.data("count") || 1),
            label: "data(label)",
            "font-size": 10,
            "font-family": "IBM Plex Mono, Consolas, monospace",
            color: "#0f172a",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-padding": 2,
            "text-border-color": "#93c5fd",
            "text-border-width": 0.8,
            "text-valign": "bottom",
            "text-margin-y": 4,
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        // Telegram & WhatsApp Nodes: Triangle (Light Blue / Green)
        {
          selector: "node[type='telegram'], node[type='whatsapp']",
          style: {
            shape: "round-triangle",
            "background-color": (n) => (n.data("type") === "whatsapp" ? "#059669" : "#0284c7"),
            width: (n) => 30 + 4 * Math.min(5, n.data("count") || 1),
            height: (n) => 30 + 4 * Math.min(5, n.data("count") || 1),
            label: "data(label)",
            "font-size": 10,
            "font-family": "IBM Plex Mono, Consolas, monospace",
            color: "#0f172a",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-padding": 2,
            "text-border-color": "#bae6fd",
            "text-border-width": 0.8,
            "text-valign": "bottom",
            "text-margin-y": 4,
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        // UPI & Financial Nodes: Hexagon (Purple / Gold / Pink)
        {
          selector: "node[type='upi'], node[type='crypto_wallet'], node[type='card_number'], node[type='ifsc']",
          style: {
            shape: "round-hexagon",
            "background-color": (n) => KIND_COLOR[n.data("type")] || "#7c3aed",
            width: (n) => 30 + 4 * Math.min(5, n.data("count") || 1),
            height: (n) => 30 + 4 * Math.min(5, n.data("count") || 1),
            label: "data(label)",
            "font-size": 10,
            "font-family": "IBM Plex Mono, Consolas, monospace",
            color: "#0f172a",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.9,
            "text-background-padding": 2,
            "text-border-color": "#ddd6fe",
            "text-border-width": 0.8,
            "text-valign": "bottom",
            "text-margin-y": 4,
            "border-width": 2,
            "border-color": "#ffffff",
          },
        },
        // Other Entity Nodes (domain, email, etc.)
        {
          selector: "node[type!='post'][!isActor][type!='phone'][type!='telegram'][type!='whatsapp'][type!='upi'][type!='crypto_wallet'][type!='card_number'][type!='ifsc']",
          style: {
            shape: (n) => KIND_SHAPE[n.data("type")] || "ellipse",
            "background-color": (n) => KIND_COLOR[n.data("type")] || "#64748b",
            width: 26,
            height: 26,
            label: "data(label)",
            "font-size": 9.5,
            "font-family": "IBM Plex Mono, monospace",
            color: "#334155",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.85,
            "text-background-padding": 2,
            "text-valign": "bottom",
            "text-margin-y": 3,
            "border-width": 1.5,
            "border-color": "#ffffff",
          },
        },
        // Directional Relationship Edges
        {
          selector: "edge",
          style: {
            width: 1.8,
            "line-color": "#94a3b8",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#94a3b8",
            "arrow-scale": 1.15,
            label: compact ? "" : "data(rel_label)",
            "font-size": 7.5,
            "font-family": "IBM Plex Mono, monospace",
            "font-weight": 600,
            "text-rotation": "autorotate",
            color: "#475569",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.88,
            "text-background-padding": 2,
            "text-border-color": "#e2e8f0",
            "text-border-width": 0.5,
            "text-border-opacity": 0.8,
          },
        },
        // Similar Post Edges (dashed red, undirected)
        {
          selector: "edge[kind='similar']",
          style: {
            "line-style": "dashed",
            "line-color": "#ef4444",
            width: 2.2,
            opacity: 0.85,
            "target-arrow-shape": "none",
            label: "SIMILAR_TO",
            color: "#b91c1c",
            "text-border-color": "#fecaca",
          },
        },
        // Hovered Edge
        {
          selector: "edge.edge-hovered",
          style: {
            width: 3.5,
            "line-color": "#2563eb",
            "target-arrow-color": "#2563eb",
            "font-size": 9,
            "font-weight": "bold",
            color: "#1e3a8a",
            "z-index": 999,
          },
        },
        // Dimmed Nodes/Edges (Neighborhood focus)
        {
          selector: ".faded",
          style: {
            opacity: 0.08,
          },
        },
        // Root Selected Node (Center of investigation)
        {
          selector: "node.selected-root",
          style: {
            "border-width": 4,
            "border-color": "#0f172a",
            "border-opacity": 1,
            "shadow-blur": 16,
            "shadow-color": "#0f172a",
            "shadow-opacity": 0.45,
            "z-index": 999,
          },
        },
        // 1-Hop Connected Neighborhood (Immediate)
        {
          selector: "node.hop1",
          style: {
            "border-width": 3,
            "border-color": "#2563eb",
            "border-opacity": 1,
            opacity: 1,
            "z-index": 120,
          },
        },
        {
          selector: "edge.hop1",
          style: {
            width: 3,
            "line-color": "#2563eb",
            "target-arrow-color": "#2563eb",
            opacity: 1,
            "z-index": 110,
          },
        },
        // 2-Hop Connected Neighborhood (Extended Ring)
        {
          selector: "node.hop2",
          style: {
            "border-width": 2.5,
            "border-color": "#7c3aed",
            "border-opacity": 0.9,
            opacity: 0.9,
            "z-index": 60,
          },
        },
        {
          selector: "edge.hop2",
          style: {
            width: 2.2,
            "line-color": "#a855f7",
            "target-arrow-color": "#a855f7",
            opacity: 0.85,
            "z-index": 50,
          },
        },
      ],
      layout: getLayoutConfig(layoutName),
    });

    cyRef.current = cy;

    // Node Click: Highlight 1-hop and 2-hop Neighborhoods
    cy.on("tap", "node", (e) => {
      const root = e.target;
      const mode = hopModeRef.current;
      const hop1Nodes = root.neighborhood("node");
      const hop1Edges = root.connectedEdges();

      cy.elements().removeClass("selected-root hop1 hop2 faded");

      if (mode === "1hop") {
        cy.elements().addClass("faded");
        root.removeClass("faded").addClass("selected-root");
        hop1Nodes.removeClass("faded").addClass("hop1");
        hop1Edges.removeClass("faded").addClass("hop1");

        onSelect?.(
          root.data(),
          hop1Nodes.map((x) => x.data()),
          [],
          hop1Edges.map((ed) => ed.data())
        );
      } else {
        // 2-hop neighborhood calculation
        const hop2Nodes = hop1Nodes.neighborhood("node").difference(hop1Nodes).difference(root);
        const hop2Edges = hop1Nodes.connectedEdges().difference(hop1Edges);

        cy.elements().addClass("faded");
        root.removeClass("faded").addClass("selected-root");
        hop1Nodes.removeClass("faded").addClass("hop1");
        hop1Edges.removeClass("faded").addClass("hop1");
        hop2Nodes.removeClass("faded").addClass("hop2");
        hop2Edges.removeClass("faded").addClass("hop2");

        onSelect?.(
          root.data(),
          hop1Nodes.map((x) => x.data()),
          hop2Nodes.map((x) => x.data()),
          hop1Edges.union(hop2Edges).map((ed) => ed.data())
        );
      }
    });

    // Background Click: Reset Highlight
    cy.on("tap", (e) => {
      if (e.target === cy) {
        cy.elements().removeClass("selected-root hop1 hop2 faded");
        onSelect?.(null, [], [], []);
      }
    });

    // Edge Hover Handling
    cy.on("mouseover", "edge", (e) => {
      e.target.addClass("edge-hovered");
    });
    cy.on("mouseout", "edge", (e) => {
      e.target.removeClass("edge-hovered");
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, compact, layoutName]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="graph neo4j-graph-canvas"
      style={{ height }}
      role="img"
      aria-label="Neo4j Sentinel-AI interactive knowledge graph of linked posts, seller rings, and shared financial entities"
    />
  );
});

export default NetworkGraph;
export { KIND_COLOR, KIND_SHAPE, LEVEL_COLOR, REL_MAP, SCHEMA_MAP };
