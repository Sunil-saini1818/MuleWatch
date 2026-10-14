import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./ui";
import { api } from "../api";
import { RAJASTHAN_DISTRICT_SVGS, RAJASTHAN_VIEWBOX } from "../data/rajasthanDistrictSvgPaths";
import {
  RAJASTHAN_STATE_TOTALS,
  RAJASTHAN_DISTRICT_DATA,
  getDistrictIntelligence,
} from "../data/rajasthanDistrictData";

export default function RajasthanDistrictMap({
  onSelectDistrict,
  selectedDistrictId,
  activeTab = "rajasthan",
  onTabChange,
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const [lockedDistrictId, setLockedDistrictId] = useState(selectedDistrictId || null);
  const [districtStats, setDistrictStats] = useState(RAJASTHAN_DISTRICT_DATA);
  const [stateTotals, setStateTotals] = useState(RAJASTHAN_STATE_TOTALS);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Sync locked district with external prop if provided
  useEffect(() => {
    if (selectedDistrictId !== undefined) {
      setLockedDistrictId(selectedDistrictId);
    }
  }, [selectedDistrictId]);

  // Attempt to fetch live dynamic stats from backend if available, fallback gracefully
  useEffect(() => {
    let cancelled = false;
    try {
      const fetchCall = api.rajasthanStats
        ? api.rajasthanStats()
        : api.get
        ? api.get("/stats/rajasthan-districts")
        : null;
      if (fetchCall && typeof fetchCall.then === "function") {
        fetchCall
          .then((res) => {
            if (!cancelled && res?.districts) {
              setDistrictStats(res.districts);
              if (res.totals) setStateTotals(res.totals);
            }
          })
          .catch(() => {});
      }
    } catch {
      // Graceful fallback
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Determine currently active displayed data
  const activeDistrictId = hoveredId || lockedDistrictId;
  const activeData = useMemo(() => {
    if (!activeDistrictId) return stateTotals || RAJASTHAN_STATE_TOTALS;
    const cleanId = String(activeDistrictId).toUpperCase().replace(/[^A-Z0-9]/g, "_");
    return (
      districtStats?.[cleanId] ||
      districtStats?.[activeDistrictId] ||
      getDistrictIntelligence(activeDistrictId) ||
      stateTotals ||
      RAJASTHAN_STATE_TOTALS
    );
  }, [activeDistrictId, districtStats, stateTotals]);

  // Handle District Click
  const handleDistrictClick = (district) => {
    if (!district?.id) return;
    if (lockedDistrictId === district.id) {
      // Toggle off / unlock
      setLockedDistrictId(null);
      onSelectDistrict?.(stateTotals || RAJASTHAN_STATE_TOTALS);
    } else {
      setLockedDistrictId(district.id);
      const cleanId = String(district.id).toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const dData =
        districtStats?.[cleanId] ||
        districtStats?.[district.id] ||
        getDistrictIntelligence(district.id) ||
        district;
      onSelectDistrict?.(dData);
    }
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Major district label centers for on-map clarity
  const majorDistrictIds = new Set([
    "JAIPUR",
    "JODHPUR",
    "BHARATPUR",
    "ALWAR",
    "KOTA",
    "UDAIPUR",
    "BIKANER",
    "AJMER",
    "SIKAR",
    "BARMER",
    "GANGANAGAR",
    "BHILWARA",
    "NAGAUR",
    "PALI",
    "CHITTORGARH",
  ]);

  return (
    <div className="portal-map-master-container">
      {/* Top Controls Bar */}
      <div className="portal-top-navbar">
        <div className="nav-tabs-group">
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "rajasthan" ? "tab-active" : ""}`}
            onClick={() => onTabChange?.("rajasthan")}
          >
            Rajasthan District Map
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "map" ? "tab-active" : ""}`}
            onClick={() => onTabChange?.("map")}
          >
            National Overview (India)
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "states" ? "tab-active" : ""}`}
            onClick={() => onTabChange?.("states")}
          >
            View State Summary
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "categories" ? "tab-active" : ""}`}
            onClick={() => onTabChange?.("categories")}
          >
            View Threat Categories
          </button>
        </div>

        <div className="portal-lang-pill">
          <span className="lang-avatar">RJ</span>
          <span className="lang-text">Rajasthan Cyber Grid</span>
          <span className="lang-arrow">▼</span>
        </div>
      </div>

      {/* Main Content: Left SVG Map + Right Floating Table Card */}
      <div className="portal-map-stage">
        {/* Left Side: RAJASTHAN DISTRICT SVG MAP */}
        <div className="portal-svg-card" onMouseMove={handleMouseMove}>
          <div className="map-card-header">
            <span className="map-badge-live">LIVE SURVEILLANCE // RAJASTHAN DISTRICT TOPOLOGY</span>
            <span className="map-scale-legend">33 Districts // Contiguous Cadastral Boundaries</span>
          </div>

          <svg
            viewBox={RAJASTHAN_VIEWBOX}
            className="portal-india-svg"
            role="img"
            aria-label="Rajasthan District Threat Map"
            style={{ width: "100%", maxHeight: "560px" }}
          >
            <defs>
              <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#4F46E5" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* District SVG Polygons */}
            {RAJASTHAN_DISTRICT_SVGS.map((dist) => {
              const isHovered = hoveredId === dist.id;
              const isLocked = lockedDistrictId === dist.id;
              const isActive = isHovered || isLocked;

              // Color based on active status or base palette
              let fillColor = "#F3F4F6";
              if (isActive) {
                fillColor = "#4F46E5"; // Deep indigo
              }

              return (
                <g key={dist.id}>
                  <path
                    d={dist.path}
                    id={`district-${dist.id}`}
                    className={`portal-state-path ${isActive ? "district-active-highlight" : ""}`}
                    fill={fillColor}
                    stroke={isActive ? "#ffffff" : "#9CA3AF"}
                    strokeWidth={isActive ? "2.2" : "1.0"}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    style={{
                      transition: "all 0.2s ease",
                      cursor: "pointer",
                      filter: isActive ? "url(#active-glow)" : "none",
                    }}
                    onMouseEnter={() => setHoveredId(dist.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleDistrictClick(dist)}
                  >
                    <title>{`${dist.name} (Threat Score: ${
                      getDistrictIntelligence(dist.id).threatScore
                    }/100)`}</title>
                  </path>

                  {/* Render subtle district name labels for major districts */}
                  {majorDistrictIds.has(dist.id) && (
                    <text
                      x={dist.center[0]}
                      y={dist.center[1]}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={dist.id === "JAIPUR" || dist.id === "JODHPUR" ? "10.5px" : "9px"}
                      fontWeight={isActive ? "700" : "600"}
                      fill={isActive ? "#ffffff" : "#4B5563"}
                      pointerEvents="none"
                      style={{
                        userSelect: "none",
                        transition: "fill 0.2s ease",
                        textShadow: isActive
                          ? "0 1px 2px rgba(0,0,0,0.8)"
                          : "0 1px 2px rgba(255,255,255,0.9)",
                      }}
                    >
                      {dist.name}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Map Guidance Pill */}
          <div className="map-guidance-pill" style={{ marginTop: "10px" }}>
            <Icon name="radar" size={13} />
            <span>Hover or click any district to inspect local financial exposure & mule networks</span>
          </div>
        </div>

        {/* Right Side: DISTRICT SUMMARY TABLE CARD */}
        <div className="portal-floating-table-card">
          {/* Header Row: Bright mint-green background (#90EE90) */}
          <div className="portal-table-header" style={{ background: "#90EE90" }}>
            <h3>
              {activeData?.id === "RAJASTHAN_TOTALS"
                ? "RAJASTHAN STATE OVERVIEW"
                : `${(activeData?.name || "DISTRICT").toUpperCase()} DISTRICT INTELLIGENCE`}
            </h3>
            {lockedDistrictId ? (
              <button
                type="button"
                className="state-locked-tag"
                style={{
                  cursor: "pointer",
                  border: "none",
                  background: "#047857",
                  color: "#ffffff",
                }}
                onClick={() => {
                  setLockedDistrictId(null);
                  onSelectDistrict?.(stateTotals || RAJASTHAN_STATE_TOTALS);
                }}
                title="Click to reset to Rajasthan State Overview"
              >
                ● Focus Locked (Reset)
              </button>
            ) : (
              <span className="state-locked-tag">
                Threat Score: {activeData?.threatScore ?? 85}/100
              </span>
            )}
          </div>

          {/* Column Titles Header */}
          <div className="portal-table-subhead" style={{ background: "#a7f3d0" }}>
            <span className="col-status">Fraud Indicator / Metric</span>
            <span className="col-count">District Count</span>
            <span className="col-amount">Financial Exposure (₹ in Lakhs)</span>
          </div>

          {/* Alternating Soft Pastel Background Rows */}
          <div className="portal-table-body">
            {/* Row 1: Total Intercepted Posts */}
            <div className="data-row row-light-blue">
              <span className="col-status">Total Intercepted Posts / Ads</span>
              <span className="col-count">{activeData?.totalPosts ?? 0}</span>
              <span className="col-amount">₹ {activeData?.totalAmount ?? "0.00"} L</span>
            </div>

            {/* Row 2: Critical Mule Accounts Flagged */}
            <div className="data-row row-light-pink">
              <span className="col-status">Critical Mule Accounts Flagged</span>
              <span className="col-count">{activeData?.criticalMuleAds ?? 0}</span>
              <span className="col-amount">₹ {activeData?.criticalAmount ?? "0.00"} L</span>
            </div>

            {/* Row 3: Verified Bank / ATM Card Sales */}
            <div className="data-row row-light-green">
              <span className="col-status">Verified Bank / ATM Card Sales</span>
              <span className="col-count">{activeData?.verifiedBankAccounts ?? 0}</span>
              <span className="col-amount">₹ {activeData?.accountsAmount ?? "0.00"} L</span>
            </div>

            {/* Row 4: Active Seller Syndicates / Rings */}
            <div className="data-row row-light-peach">
              <span className="col-status">Active Seller Syndicates / Rings</span>
              <span className="col-count">{activeData?.activeSyndicates ?? 0}</span>
              <span className="col-amount">₹ {activeData?.syndicatesAmount ?? "0.00"} L</span>
            </div>

            {/* Row 5: Cyber Cell Review / Action Status */}
            <div className="data-row row-light-mint">
              <span className="col-status">Cyber Cell Review / Action Status</span>
              <span className="col-count">{activeData?.underReview ?? 0}</span>
              <span className="col-amount">₹ {activeData?.reviewAmount ?? "0.00"} L</span>
            </div>
          </div>

          {/* District Intelligence Contextual Footer */}
          <div className="portal-table-footer">
            <div style={{ width: "100%", marginBottom: "6px" }}>
              <span className="threat-tag">
                Surveillance Tier:{" "}
                <b
                  style={{
                    color:
                      activeData?.threatLevel === "Critical"
                        ? "#dc2626"
                        : activeData?.threatLevel === "High"
                        ? "#ea580c"
                        : "#2563eb",
                  }}
                >
                  {activeData?.threatLevel || "Moderate"} ({activeData?.threatScore ?? 70}/100)
                </b>
              </span>
              <span style={{ margin: "0 8px", color: "#cbd5e1" }}>|</span>
              <span className="small muted">Zone: {activeData?.zone || "North-West"}</span>
            </div>

            <div style={{ width: "100%", marginBottom: "4px" }}>
              <span className="small" style={{ fontWeight: 600, color: "#334155" }}>
                Identified Local Hotspots:{" "}
              </span>
              <span className="hotspot-text small">
                {activeData?.hotspots ? activeData.hotspots.join(", ") : "Statewide Monitoring Hubs"}
              </span>
            </div>

            {activeData?.primaryModus && (
              <div style={{ width: "100%", marginTop: "4px" }}>
                <span className="small" style={{ fontWeight: 600, color: "#334155" }}>
                  Primary Modus:{" "}
                </span>
                <span className="small muted">{activeData.primaryModus}</span>
              </div>
            )}

            {activeData?.topBanks && activeData.topBanks.length > 0 && (
              <div style={{ width: "100%", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span className="small" style={{ fontWeight: 600, color: "#334155" }}>
                  Targeted Banks:
                </span>
                {activeData.topBanks.map((b) => (
                  <span
                    key={b}
                    className="chip"
                    style={{ fontSize: "10px", padding: "1px 6px", background: "#f1f5f9" }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
