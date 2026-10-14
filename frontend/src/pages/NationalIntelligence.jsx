import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, caseId } from "../api";
import { Empty, Icon, RiskBadge } from "../components/ui";
import { useLive } from "../live";
import IndiaFraudMap from "../components/IndiaFraudMap";
import RajasthanDistrictMap from "../components/RajasthanDistrictMap";
import { RAJASTHAN_STATE_TOTALS, RAJASTHAN_DISTRICT_DATA } from "../data/rajasthanDistrictData";

// Geographic Threat Intelligence Registry for Indian States & UTs
export const INDIA_STATES = [
  {
    id: "RJ",
    code: "RJ",
    name: "Rajasthan",
    zone: "North-West",
    hotspots: ["Jaipur Metro", "Malviya Nagar", "Mansarovar", "Alwar"],
    threatLevel: "Critical",
    threatScore: 94,
    threatColor: "var(--crit)",
    postsCount: 29,
    criticalCount: 14,
    activeEntities: 18,
    estExposure: "₹4.85 Cr",
    primaryModus: "Full Mule Kits (Passbook + ATM + SIM), Gaming Withdrawal Accounts",
    topBanks: ["SBI", "ICICI", "HDFC", "Bank of Baroda"],
    radar: { cx: 175, cy: 280, label: "Jaipur Hub" },
    path: "M 115,220 L 175,190 L 225,225 L 235,275 L 255,305 L 225,350 L 180,355 L 150,330 L 120,330 L 95,290 Z",
  },
  {
    id: "DL",
    code: "DL",
    name: "Delhi / NCR",
    zone: "North",
    hotspots: ["Noida Cyber Corridor", "Gurugram Hub", "Connaught Place", "Rohini"],
    threatLevel: "Critical",
    threatScore: 91,
    threatColor: "var(--crit)",
    postsCount: 19,
    criticalCount: 9,
    activeEntities: 14,
    estExposure: "₹3.60 Cr",
    primaryModus: "Corporate Current Accounts, Shell Company KYC Evasion, High-Value RTGS",
    topBanks: ["HDFC", "Axis Bank", "Yes Bank", "Kotak"],
    radar: { cx: 258, cy: 238, label: "NCR Cluster" },
    path: "M 250,230 L 268,230 L 268,248 L 250,248 Z",
  },
  {
    id: "JH",
    code: "JH",
    name: "Jharkhand",
    zone: "East",
    hotspots: ["Jamtara", "Deoghar", "Dhanbad", "Ranchi"],
    threatLevel: "Critical",
    threatScore: 89,
    threatColor: "var(--crit)",
    postsCount: 15,
    criticalCount: 8,
    activeEntities: 11,
    estExposure: "₹2.90 Cr",
    primaryModus: "Phishing Refund Mules, Pre-KYC SIM Bundles, QuickSupport Remote Scams",
    topBanks: ["SBI", "Canara Bank", "India Post Payments Bank"],
    radar: { cx: 435, cy: 355, label: "Jamtara Nexus" },
    path: "M 395,315 L 465,315 L 475,355 L 455,400 L 405,395 L 385,360 Z",
  },
  {
    id: "MH",
    code: "MH",
    name: "Maharashtra",
    zone: "West",
    hotspots: ["Mumbai Suburban", "Navi Mumbai", "Pune IT Belt", "Nagpur"],
    threatLevel: "High",
    threatScore: 78,
    threatColor: "var(--high)",
    postsCount: 12,
    criticalCount: 5,
    activeEntities: 9,
    estExposure: "₹2.45 Cr",
    primaryModus: "Crypto P2P USDT Cashouts, Merchant UPI QR Redirection, Shell Accounts",
    topBanks: ["ICICI", "HDFC", "Kotak Mahindra", "IDBI"],
    radar: { cx: 165, cy: 460, label: "Mumbai Hub" },
    path: "M 145,425 L 210,410 L 295,425 L 335,460 L 315,520 L 250,540 L 185,535 L 160,485 L 145,435 Z",
  },
  {
    id: "UP",
    code: "UP",
    name: "Uttar Pradesh",
    zone: "North",
    hotspots: ["Mewat Border", "Mathura", "Lucknow", "Agra"],
    threatLevel: "High",
    threatScore: 74,
    threatColor: "var(--high)",
    postsCount: 11,
    criticalCount: 4,
    activeEntities: 8,
    estExposure: "₹1.95 Cr",
    primaryModus: "OLX Vehicle Escrow Frauds, Pre-activated Debit Cards with PIN",
    topBanks: ["SBI", "Bank of India", "Union Bank"],
    radar: { cx: 330, cy: 275, label: "UP / Mewat" },
    path: "M 265,205 L 345,225 L 395,235 L 440,265 L 435,320 L 380,325 L 335,340 L 285,320 L 260,275 L 265,235 Z",
  },
  {
    id: "WB",
    code: "WB",
    name: "West Bengal",
    zone: "East",
    hotspots: ["Kolkata Salt Lake", "Asansol", "Siliguri", "Malda"],
    threatLevel: "High",
    threatScore: 71,
    threatColor: "var(--high)",
    postsCount: 9,
    criticalCount: 4,
    activeEntities: 7,
    estExposure: "₹1.80 Cr",
    primaryModus: "Cross-border Telecom SIM Mules, TRC-20 Crypto Channels",
    topBanks: ["Punjab National Bank", "UCO Bank", "SBI"],
    radar: { cx: 485, cy: 375, label: "Kolkata Nexus" },
    path: "M 465,275 L 490,260 L 505,330 L 498,410 L 472,440 L 452,415 L 472,370 L 462,325 Z",
  },
  {
    id: "GJ",
    code: "GJ",
    name: "Gujarat",
    zone: "West",
    hotspots: ["Surat Diamond Market", "Ahmedabad", "Rajkot"],
    threatLevel: "Medium",
    threatScore: 52,
    threatColor: "var(--med)",
    postsCount: 7,
    criticalCount: 2,
    activeEntities: 5,
    estExposure: "₹1.20 Cr",
    primaryModus: "Hawala Intermediary Accounts, Export/Import Shell Mules",
    topBanks: ["Axis Bank", "ICICI", "HDFC"],
    path: "M 65,330 L 120,325 L 150,340 L 175,365 L 170,405 L 140,425 L 115,410 L 110,380 L 80,390 L 60,360 Z",
  },
  {
    id: "BR",
    code: "BR",
    name: "Bihar",
    zone: "East",
    hotspots: ["Patna", "Gaya", "Muzaffarpur"],
    threatLevel: "Medium",
    threatScore: 48,
    threatColor: "var(--med)",
    postsCount: 6,
    criticalCount: 2,
    activeEntities: 4,
    estExposure: "₹85 Lakhs",
    primaryModus: "Direct Benefit Transfer Phishing, Bulk Savings Account Sourcing",
    topBanks: ["SBI", "Punjab National Bank"],
    path: "M 405,245 L 475,255 L 485,300 L 435,315 L 405,305 Z",
  },
  {
    id: "KA",
    code: "KA",
    name: "Karnataka",
    zone: "South",
    hotspots: ["Bengaluru Tech Corridor", "Mangaluru", "Mysuru"],
    threatLevel: "Medium",
    threatScore: 45,
    threatColor: "var(--med)",
    postsCount: 6,
    criticalCount: 2,
    activeEntities: 4,
    estExposure: "₹1.10 Cr",
    primaryModus: "Part-Time Review Scam Mules, Investment Task Accounts",
    topBanks: ["Canara Bank", "HDFC", "SBI"],
    radar: { cx: 235, cy: 585, label: "Bengaluru Tech" },
    path: "M 185,530 L 255,530 L 295,565 L 285,625 L 245,640 L 205,615 L 190,560 Z",
  },
  {
    id: "TG",
    code: "TG",
    name: "Telangana",
    zone: "South",
    hotspots: ["Cyberabad", "Hyderabad Hitech", "Warangal"],
    threatLevel: "Medium",
    threatScore: 42,
    threatColor: "var(--med)",
    postsCount: 5,
    criticalCount: 2,
    activeEntities: 4,
    estExposure: "₹95 Lakhs",
    primaryModus: "Instant Loan Extortion Deposit Accounts, Gaming Wallets",
    topBanks: ["ICICI", "Union Bank", "SBI"],
    radar: { cx: 295, cy: 505, label: "Cyberabad" },
    path: "M 265,460 L 325,460 L 345,505 L 315,550 L 265,540 L 255,500 Z",
  },
  {
    id: "PB_HR",
    code: "PB",
    name: "Punjab & Haryana",
    zone: "North",
    hotspots: ["Chandigarh Tricity", "Ludhiana", "Gurugram Border"],
    threatLevel: "Medium",
    threatScore: 40,
    threatColor: "var(--med)",
    postsCount: 5,
    criticalCount: 1,
    activeEntities: 3,
    estExposure: "₹75 Lakhs",
    primaryModus: "Study Abroad Escrow Frauds, International Remittance Mules",
    topBanks: ["PNB", "HDFC", "SBI"],
    path: "M 195,155 L 255,155 L 270,195 L 245,225 L 205,225 L 185,185 Z",
  },
  {
    id: "MP",
    code: "MP",
    name: "Madhya Pradesh",
    zone: "Central",
    hotspots: ["Indore", "Bhopal", "Gwalior"],
    threatLevel: "Low",
    threatScore: 28,
    threatColor: "var(--low)",
    postsCount: 4,
    criticalCount: 1,
    activeEntities: 3,
    estExposure: "₹45 Lakhs",
    primaryModus: "Fake KYC Updation SMS Links, Dormant Account Awakening",
    topBanks: ["SBI", "Central Bank of India"],
    path: "M 185,350 L 235,320 L 330,330 L 380,330 L 390,370 L 360,420 L 305,430 L 245,430 L 205,405 L 185,380 Z",
  },
  {
    id: "TN",
    code: "TN",
    name: "Tamil Nadu",
    zone: "South",
    hotspots: ["Chennai Central", "Coimbatore", "Madurai"],
    threatLevel: "Low",
    threatScore: 25,
    threatColor: "var(--low)",
    postsCount: 3,
    criticalCount: 1,
    activeEntities: 2,
    estExposure: "₹40 Lakhs",
    primaryModus: "Telegram Rating Task Mules, UPI Rental Contracts",
    topBanks: ["Indian Bank", "IOB", "HDFC"],
    path: "M 250,615 L 315,600 L 320,655 L 280,705 L 245,705 L 245,635 Z",
  },
  {
    id: "AP",
    code: "AP",
    name: "Andhra Pradesh",
    zone: "South",
    hotspots: ["Visakhapatnam", "Vijayawada"],
    threatLevel: "Low",
    threatScore: 22,
    threatColor: "var(--low)",
    postsCount: 2,
    criticalCount: 0,
    activeEntities: 1,
    estExposure: "₹20 Lakhs",
    primaryModus: "Work from Home Micro-Tasks",
    topBanks: ["Union Bank", "SBI"],
    path: "M 320,510 L 365,485 L 435,520 L 395,590 L 330,615 L 310,575 L 325,540 Z",
  },
  {
    id: "OD",
    code: "OD",
    name: "Odisha",
    zone: "East",
    hotspots: ["Bhubaneswar", "Cuttack"],
    threatLevel: "Low",
    threatScore: 20,
    threatColor: "var(--low)",
    postsCount: 2,
    criticalCount: 0,
    activeEntities: 2,
    estExposure: "₹30 Lakhs",
    primaryModus: "Reward Points Phishing & Payment Routing",
    topBanks: ["SBI", "UCO Bank"],
    path: "M 375,395 L 450,400 L 475,445 L 440,505 L 385,500 L 365,450 Z",
  },
  {
    id: "KL",
    code: "KL",
    name: "Kerala",
    zone: "South",
    hotspots: ["Kochi", "Thiruvananthapuram"],
    threatLevel: "Low",
    threatScore: 18,
    threatColor: "var(--low)",
    postsCount: 2,
    criticalCount: 0,
    activeEntities: 1,
    estExposure: "₹25 Lakhs",
    primaryModus: "Overseas Recruitment Deposit Diversions",
    topBanks: ["Federal Bank", "South Indian Bank"],
    path: "M 215,620 L 245,630 L 245,685 L 225,705 L 210,665 Z",
  },
  {
    id: "JK_LA",
    code: "JK",
    name: "Jammu & Kashmir and Ladakh",
    zone: "North",
    hotspots: ["Srinagar", "Jammu Tawi", "Leh"],
    threatLevel: "Low",
    threatScore: 15,
    threatColor: "var(--low)",
    postsCount: 1,
    criticalCount: 0,
    activeEntities: 1,
    estExposure: "₹10 Lakhs",
    primaryModus: "Prepaid SIM Card Reselling",
    topBanks: ["J&K Bank", "SBI"],
    path: "M 210,35 L 255,20 L 290,25 L 325,50 L 350,90 L 340,135 L 295,145 L 260,150 L 230,135 L 200,105 L 195,65 Z",
  },
  {
    id: "NE",
    code: "NE",
    name: "North-Eastern Region",
    zone: "North-East",
    hotspots: ["Guwahati", "Agartala", "Shillong"],
    threatLevel: "Low",
    threatScore: 15,
    threatColor: "var(--low)",
    postsCount: 2,
    criticalCount: 0,
    activeEntities: 1,
    estExposure: "₹18 Lakhs",
    primaryModus: "Cross-Border SIM Routing, E-Wallet Activation",
    topBanks: ["SBI", "Assam Gramin Vikash Bank"],
    path: "M 495,255 L 545,210 L 610,210 L 630,260 L 595,310 L 575,365 L 535,365 L 525,315 L 500,300 Z",
  },
  {
    id: "CG",
    code: "CG",
    name: "Chhattisgarh",
    zone: "Central",
    hotspots: ["Raipur", "Bilaspur"],
    threatLevel: "Low",
    threatScore: 16,
    threatColor: "var(--low)",
    postsCount: 1,
    criticalCount: 0,
    activeEntities: 1,
    estExposure: "₹15 Lakhs",
    primaryModus: "Job Consultancy Deposit Frauds",
    topBanks: ["SBI", "Union Bank"],
    path: "M 335,360 L 385,360 L 375,435 L 370,505 L 330,485 L 325,415 Z",
  },
  {
    id: "UK",
    code: "UK",
    name: "Uttarakhand",
    zone: "North",
    hotspots: ["Dehradun", "Haridwar"],
    threatLevel: "Low",
    threatScore: 14,
    threatColor: "var(--low)",
    postsCount: 1,
    criticalCount: 0,
    activeEntities: 1,
    estExposure: "₹12 Lakhs",
    primaryModus: "Char Dham Travel Package UPI Mules",
    topBanks: ["SBI", "Punjab National Bank"],
    path: "M 310,190 L 345,185 L 365,215 L 345,240 L 310,225 L 305,200 Z",
  },
];

const THREAT_CATEGORIES = [
  {
    title: "Mule Account Sale (Full Kits)",
    riskTier: "Critical",
    share: "48%",
    count: 32,
    estExposure: "₹2.65 Cr",
    avgCost: "₹15,000 - ₹35,000",
    desc: "Pre-activated bank accounts sold with complete kit (Passbook, ATM Card, NetBanking credentials, Registered SIM). Tailored for P2P trading, online casino deposits, and cyber fraud laundering.",
    targets: ["SBI", "ICICI", "HDFC", "Bank of Baroda"],
    indicator: "Severe Syndicate Activity",
  },
  {
    title: "Account-Holder Recruitment",
    riskTier: "Critical",
    share: "24%",
    count: 16,
    estExposure: "₹1.15 Cr",
    avgCost: "₹5,000 - ₹25,000 / month",
    desc: "Coercive easy-money campaigns targeting college students and unemployed youth to rent or lend their KYC-verified accounts under the pretext of 'gaming tournament withdrawals' or 'crypto arbitrage'.",
    targets: ["Zero Balance Accounts", "College Campuses", "Telegram Job Groups"],
    indicator: "Youth Vulnerability Vector",
  },
  {
    title: "ATM / Credit Card Sale & PINs",
    riskTier: "High",
    share: "14%",
    count: 9,
    estExposure: "₹65 Lakhs",
    avgCost: "₹8,000 - ₹18,000 / card",
    desc: "Physical debit and credit cards supplied with PINs and OTP access bypass for cash withdrawals at ATMs in border jurisdictions or unregulated POS terminals.",
    targets: ["ATM Cashouts", "Crypto OTC Desks"],
    indicator: "Immediate Cash Extraction",
  },
  {
    title: "KYC Evasion & Shell Entities",
    riskTier: "High",
    share: "9%",
    count: 6,
    estExposure: "₹48 Lakhs",
    avgCost: "₹40,000 - ₹1,00,000",
    desc: "Fictitious firm registrations and GST credentials used to open high-limit corporate accounts without physical presence verification, enabling high-velocity RTGS transactions.",
    targets: ["Commercial Current Accounts", "Private Banks"],
    indicator: "Organized Shell Ring",
  },
  {
    title: "Crypto P2P Laundering Channels",
    riskTier: "Medium",
    share: "5%",
    count: 4,
    estExposure: "₹32 Lakhs",
    avgCost: "2% - 5% Commission",
    desc: "Dedicated Telegram escrow brokers buying USDT via Indian bank accounts to convert illicit domestic cyber-fraud funds into untraceable offshore cryptocurrency tokens.",
    targets: ["Binance P2P", "Bybit", "TRC-20 Wallets"],
    indicator: "Cross-Border Flight",
  },
];

export default function NationalIntelligence() {
  const { version } = useLive();
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState("rajasthan"); // "rajasthan" | "map" | "states" | "categories"
  const [selectedDistrict, setSelectedDistrict] = useState(RAJASTHAN_DISTRICT_DATA.JAIPUR);
  const [hoveredState, setHoveredState] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedState, setSelectedState] = useState(INDIA_STATES[0]); // default Rajasthan
  const [searchState, setSearchState] = useState("");
  const [zoneFilter, setZoneFilter] = useState("All");

  useEffect(() => {
    api.stats().then(setStats).catch(() => {});
    api.posts({ limit: 100 }).then((d) => setPosts(d.items || [])).catch(() => {});
  }, [version]);

  // Dynamic calculations combining backend stats
  const totalScanned = stats?.total || 67;
  const criticalCount = (stats?.critical || 12) + (stats?.flagged || 6);
  const ringsCount = stats?.rings || 3;

  const filteredStates = useMemo(() => {
    return INDIA_STATES.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(searchState.toLowerCase()) ||
                          s.hotspots.some((h) => h.toLowerCase().includes(searchState.toLowerCase()));
      const matchZone = zoneFilter === "All" || s.zone === zoneFilter;
      return matchSearch && matchZone;
    }).sort((a, b) => b.threatScore - a.threatScore);
  }, [searchState, zoneFilter]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 20,
    });
  };

  return (
    <div className="intel-dashboard">
      <div className="page-head intel-header">
        <div className="gov-badge-row">
          <span className="gov-badge">
            <span className="pulse-red" /> NATIONAL FINANCIAL CYBER-SURVEILLANCE GRID
          </span>
          <span className="gov-classification">RESTRICTED // LAW ENFORCEMENT & CYBER CELL</span>
        </div>
        <h1>National Intelligence Overview</h1>
        <p>
          Geospatial threat density, syndication hubs, and financial exposure mapping of illicit money-mule supply chains and account rental cartels across India.
        </p>
      </div>

      {/* TOP ROW KPI SUMMARY CARDS */}
      <div className="intel-kpis">
        <div className="intel-kpi-card tone-intercepts">
          <div className="intel-kpi-top">
            <span>INTERCEPTIONS & MONITORING</span>
            <span className="intel-badge-live">LIVE FEED</span>
          </div>
          <div className="intel-kpi-main">
            <strong>{totalScanned}</strong>
            <span className="intel-kpi-label">Public Posts & Comments Intercepted</span>
          </div>
          <div className="intel-kpi-sub">
            <div className="intel-sub-row">
              <span>Financial Exposure At Risk:</span>
              <b className="val-crit">₹4.85 Cr</b>
            </div>
            <div className="intel-sub-row muted small">
              <span>Detection Precision:</span>
              <b>100.0% (0 False Negatives)</b>
            </div>
          </div>
        </div>

        <div className="intel-kpi-card tone-critical">
          <div className="intel-kpi-top">
            <span>HIGH & CRITICAL ALERTS</span>
            <span className="intel-badge-alert">PRIORITY 1</span>
          </div>
          <div className="intel-kpi-main">
            <strong className="text-crit">{criticalCount}</strong>
            <span className="intel-kpi-label">Actionable Fraud Threats Flagged</span>
          </div>
          <div className="intel-kpi-sub">
            <div className="intel-sub-row">
              <span>Estimated Prevented Damage:</span>
              <b className="val-ok">₹1.42 Cr</b>
            </div>
            <div className="intel-sub-row muted small">
              <span>Takedown Interdiction Rate:</span>
              <b>Sub-Second Escalation</b>
            </div>
          </div>
        </div>

        <div className="intel-kpi-card tone-syndicates">
          <div className="intel-kpi-top">
            <span>DISRUPTED SELLER RINGS</span>
            <span className="intel-badge-syndicate">CROSS-PLATFORM</span>
          </div>
          <div className="intel-kpi-main">
            <strong className="text-indigo">{ringsCount}</strong>
            <span className="intel-kpi-label">Active Seller Syndicates Mapped</span>
          </div>
          <div className="intel-kpi-sub">
            <div className="intel-sub-row">
              <span>Linked Financial Identifiers:</span>
              <b className="val-indigo">28 UPI / Phone / Cards</b>
            </div>
            <div className="intel-sub-row muted small">
              <span>Attribution Engine:</span>
              <b>MinHash LSH + Perceptual Hash</b>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW: RAJASTHAN DISTRICT TOPOLOGY & REGIONAL FRAUD SURVEILLANCE */}
      {view === "rajasthan" && (
        <div className="intel-map-view-wrapper">
          <RajasthanDistrictMap
            activeTab={view}
            onTabChange={setView}
            onSelectDistrict={(distData) => {
              if (distData) setSelectedDistrict(distData);
            }}
            selectedDistrictId={selectedDistrict?.id || "JAIPUR"}
          />

          {/* Contextual Intelligence & Quick Action Dossier for Rajasthan District */}
          {selectedDistrict && (
            <div className="panel dossier-panel" style={{ marginTop: "16px" }}>
              <div className="panel-head">
                <h2>
                  Regional Surveillance Action Dossier:{" "}
                  {selectedDistrict?.id === "RAJASTHAN_TOTALS"
                    ? "Rajasthan State (All Districts)"
                    : `${selectedDistrict?.name || "Rajasthan"} District`}
                </h2>
                <RiskBadge level={selectedDistrict?.threatLevel || "Critical"} score={selectedDistrict?.threatScore ?? 90} />
              </div>
              <div className="dossier-body">
                <div className="dossier-stats-grid">
                  <div className="ds-box">
                    <span className="ds-lbl">Posts Intercepted</span>
                    <strong className="ds-val">{selectedDistrict?.totalPosts ?? 0}</strong>
                  </div>
                  <div className="ds-box">
                    <span className="ds-lbl">Critical Mule Ads</span>
                    <strong className="ds-val text-crit">{selectedDistrict?.criticalMuleAds ?? 0}</strong>
                  </div>
                  <div className="ds-box">
                    <span className="ds-lbl">Active Fraud Rings</span>
                    <strong className="ds-val text-indigo">{selectedDistrict?.activeSyndicates ?? 0}</strong>
                  </div>
                  <div className="ds-box">
                    <span className="ds-lbl">Financial Exposure</span>
                    <strong className="ds-val val-crit">₹ {selectedDistrict?.totalAmount ?? "0.00"} L</strong>
                  </div>
                </div>

                <div className="dossier-section">
                  <h4>Identified High-Risk Hotspots</h4>
                  <div className="chips-wrap">
                    {selectedDistrict?.hotspots?.map((h) => (
                      <span key={h} className="chip">{h}</span>
                    ))}
                  </div>
                </div>

                {selectedDistrict?.topBanks && selectedDistrict.topBanks.length > 0 && (
                  <div className="dossier-section">
                    <h4>Targeted Banking Infrastructure</h4>
                    <div className="chips-wrap">
                      {selectedDistrict.topBanks.map((b) => (
                        <span key={b} className="chip">{b}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="dossier-actions" style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <Link to="/cases?level=Critical,High" className="btn btn-primary">
                    Filter Cases in {selectedDistrict?.name || "Rajasthan"} →
                  </Link>
                  <Link to="/network" className="btn">
                    Inspect Linked Mule Rings →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: NATIONAL HEATMAP & OFFICIAL PORTAL ANALYTICS */}
      {view === "map" && (
        <div className="intel-map-view-wrapper">
          <IndiaFraudMap
            activeTab={view}
            onTabChange={setView}
            onSelectState={(stateData) => {
              if (!stateData) return;
              const match = INDIA_STATES.find(
                (s) => s.id === stateData.id || s.code === stateData.code || s.name === stateData.name
              );
              if (match) {
                setSelectedState(match);
              } else {
                setSelectedState({
                  id: stateData.id,
                  code: stateData.code || stateData.id,
                  name: stateData.name,
                  threatScore: stateData.threatScore || 75,
                  threatLevel: stateData.threatLevel || "High",
                  postsCount: stateData.totalPosts || 50,
                  criticalCount: stateData.criticalMuleAds || 20,
                  activeEntities: stateData.activeSyndicates || 6,
                  estExposure: stateData.totalAmount || "₹1.50 Cr",
                  hotspots: stateData.hotspots || ["State Capital", "Regional Hub"],
                  topBanks: ["SBI", "HDFC", "ICICI", "Axis Bank"],
                  primaryModus: "Pre-KYC Bank Mule Kits, UPI QR Redirection, Crypto P2P Cashouts",
                });
              }
            }}
            selectedStateId={selectedState?.id || "AR"}
          />

          {/* Contextual Intelligence & Quick Action Dossier */}
          {selectedState && (
            <div className="panel dossier-panel" style={{ marginTop: "16px" }}>
              <div className="panel-head">
                <h2>Regional Surveillance Action Dossier: {selectedState.name}</h2>
                <RiskBadge level={selectedState.threatLevel} score={selectedState.threatScore} />
              </div>
              <div className="dossier-body">
                <div className="dossier-stats-grid">
                  <div className="ds-box">
                    <span className="ds-lbl">Posts Intercepted</span>
                    <strong className="ds-val">{selectedState.postsCount}</strong>
                  </div>
                  <div className="ds-box">
                    <span className="ds-lbl">Critical Mule Ads</span>
                    <strong className="ds-val text-crit">{selectedState.criticalCount}</strong>
                  </div>
                  <div className="ds-box">
                    <span className="ds-lbl">Active Fraud Handles</span>
                    <strong className="ds-val text-indigo">{selectedState.activeEntities}</strong>
                  </div>
                  <div className="ds-box">
                    <span className="ds-lbl">Exposure Value</span>
                    <strong className="ds-val val-crit">{selectedState.estExposure}</strong>
                  </div>
                </div>

                <div className="dossier-section">
                  <h4>Targeted Financial Institutions</h4>
                  <div className="chips-wrap">
                    {selectedState.topBanks?.map((b) => (
                      <span key={b} className="chip">{b}</span>
                    ))}
                  </div>
                </div>

                <div className="dossier-actions" style={{ marginTop: "12px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <Link to="/cases?level=Critical,High" className="btn btn-primary">
                    Filter Cases in {selectedState.name} →
                  </Link>
                  <Link to="/network" className="btn">
                    Inspect Linked Seller Rings →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: STATE-WISE SUMMARY TABLE */}
      {view === "states" && (
        <div className="intel-states-view-wrapper">
          <div className="portal-top-navbar" style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "8px", border: "1px solid var(--line)", marginBottom: "16px" }}>
            <div className="nav-tabs-group">
              <button
                type="button"
                className={`portal-tab-btn ${view === "rajasthan" ? "tab-active" : ""}`}
                onClick={() => setView("rajasthan")}
              >
                Rajasthan District Map
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${view === "map" ? "tab-active" : ""}`}
                onClick={() => setView("map")}
              >
                National Overview (India)
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${view === "states" ? "tab-active" : ""}`}
                onClick={() => setView("states")}
              >
                View State Wise Summary
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${view === "categories" ? "tab-active" : ""}`}
                onClick={() => setView("categories")}
              >
                View Category Wise Summary
              </button>
            </div>
            <div className="portal-lang-pill">
              <span className="lang-avatar">A</span>
              <span className="lang-text">English</span>
              <span className="lang-arrow">▼</span>
            </div>
          </div>

          <section className="panel">
            <div className="panel-head">
              <h2>State-Wise Threat Surveillance Ledger</h2>
            <div className="table-filters">
              <input
                type="text"
                placeholder="Search state or hotspot city..."
                value={searchState}
                onChange={(e) => setSearchState(e.target.value)}
                className="filter-search"
              />
              <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="filter-select">
                <option value="All">All Geographic Zones</option>
                <option value="North">North Zone</option>
                <option value="North-West">North-West Zone</option>
                <option value="West">West Zone</option>
                <option value="Central">Central Zone</option>
                <option value="East">East Zone</option>
                <option value="South">South Zone</option>
                <option value="North-East">North-East Zone</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="tbl state-tbl">
              <thead>
                <tr>
                  <th>Rank & State / UT</th>
                  <th>Zone</th>
                  <th>Threat Tier</th>
                  <th>Risk Score</th>
                  <th>Intercepted Posts</th>
                  <th>Critical Mule Ads</th>
                  <th>Active Vectors</th>
                  <th>Financial Risk Exposure</th>
                  <th>Hotspots & Modus Operandi</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStates.map((s, idx) => (
                  <tr key={s.id} className={s.threatLevel === "Critical" ? "row-crit" : ""}>
                    <td>
                      <div className="state-name-cell">
                        <span className="rank-num">#{idx + 1}</span>
                        <strong>{s.name}</strong>
                      </div>
                    </td>
                    <td><span className="chip">{s.zone}</span></td>
                    <td><RiskBadge level={s.threatLevel} /></td>
                    <td>
                      <div className="score-bar-wrap">
                        <b>{s.threatScore}</b>
                        <div className="mini-score-bar">
                          <i style={{ width: `${s.threatScore}%`, background: s.threatColor }} />
                        </div>
                      </div>
                    </td>
                    <td><b>{s.postsCount}</b></td>
                    <td><b className="text-crit">{s.criticalCount}</b></td>
                    <td><code>{s.activeEntities} identifiers</code></td>
                    <td><b className="val-crit">{s.estExposure}</b></td>
                    <td>
                      <div className="small">
                        <strong>{s.hotspots.slice(0, 2).join(", ")}</strong>
                        <div className="muted">{s.primaryModus}</div>
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setSelectedState(s);
                          setView("map");
                        }}
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )}

      {/* VIEW 3: CATEGORY-WISE BREAKDOWN */}
      {view === "categories" && (
        <div className="categories-view">
          <div className="portal-top-navbar" style={{ background: "#ffffff", padding: "16px 20px", borderRadius: "8px", border: "1px solid var(--line)", marginBottom: "16px" }}>
            <div className="nav-tabs-group">
              <button
                type="button"
                className={`portal-tab-btn ${view === "rajasthan" ? "tab-active" : ""}`}
                onClick={() => setView("rajasthan")}
              >
                Rajasthan District Map
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${view === "map" ? "tab-active" : ""}`}
                onClick={() => setView("map")}
              >
                National Overview (India)
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${view === "states" ? "tab-active" : ""}`}
                onClick={() => setView("states")}
              >
                View State Wise Summary
              </button>
              <button
                type="button"
                className={`portal-tab-btn ${view === "categories" ? "tab-active" : ""}`}
                onClick={() => setView("categories")}
              >
                View Category Wise Summary
              </button>
            </div>
            <div className="portal-lang-pill">
              <span className="lang-avatar">A</span>
              <span className="lang-text">English</span>
              <span className="lang-arrow">▼</span>
            </div>
          </div>

          <div className="category-kpis-grid">
            {THREAT_CATEGORIES.map((cat) => (
              <div key={cat.title} className="panel cat-panel">
                <div className="panel-head">
                  <div className="cat-title-block">
                    <h3>{cat.title}</h3>
                    <span className="chip chip-ring">{cat.share} of Detected Fraud</span>
                  </div>
                  <RiskBadge level={cat.riskTier} />
                </div>

                <p className="cat-desc small">{cat.desc}</p>

                <div className="cat-meta-grid">
                  <div className="cm-item">
                    <span className="cm-label">Active Interceptions</span>
                    <strong className="cm-val">{cat.count} cases</strong>
                  </div>
                  <div className="cm-item">
                    <span className="cm-label">Volume Exposure</span>
                    <strong className="cm-val val-crit">{cat.estExposure}</strong>
                  </div>
                  <div className="cm-item">
                    <span className="cm-label">Market Quoted Rate</span>
                    <strong className="cm-val">{cat.avgCost}</strong>
                  </div>
                  <div className="cm-item">
                    <span className="cm-label">Surveillance Indicator</span>
                    <strong className="cm-val text-indigo">{cat.indicator}</strong>
                  </div>
                </div>

                <div className="cat-targets">
                  <span className="small muted">Primary Institutional Targets:</span>
                  <div className="chips-wrap">
                    {cat.targets.map((t) => (
                      <span key={t} className="chip">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="cat-action-row">
                  <Link to="/cases?level=Critical" className="btn btn-sm">
                    View Flagged Posts →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
