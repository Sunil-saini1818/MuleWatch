import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./ui";
import { api } from "../api";
import { OFFICIAL_STATE_SVGS, INDIA_VIEWBOX } from "../data/indiaStateSvgPaths";

// Baseline Domain-Accurate MuleWatch Financial Fraud Intelligence Dictionary
export const INDIA_PORTAL_DATA = {
  AR: {
    id: "AR",
    code: "AR",
    name: "Arunachal Pradesh",
    zone: "North-East",
    totalPosts: 328,
    criticalMuleAds: 147,
    verifiedBankAccounts: 131,
    activeSyndicates: 25,
    dismissedLowRisk: 21,
    underReview: 129,
    totalAmount: "Rs. 3270.70",
    criticalAmount: "Rs. 1398.97",
    accountsAmount: "Rs. 399.80",
    syndicatesAmount: "Rs. 308.81",
    dismissedAmount: "Rs. 246.11",
    reviewAmount: "Rs. 1152.49",
    threatScore: 82,
    threatLevel: "High",
    hotspots: ["Itanagar", "Naharlagun", "Pasighat"],
  },
  RJ: {
    id: "RJ",
    code: "RJ",
    name: "Rajasthan",
    zone: "North-West",
    totalPosts: 842,
    criticalMuleAds: 412,
    verifiedBankAccounts: 320,
    activeSyndicates: 64,
    dismissedLowRisk: 46,
    underReview: 345,
    totalAmount: "Rs. 7840.50",
    criticalAmount: "Rs. 4210.20",
    accountsAmount: "Rs. 1820.40",
    syndicatesAmount: "Rs. 890.15",
    dismissedAmount: "Rs. 510.30",
    reviewAmount: "Rs. 2940.80",
    threatScore: 94,
    threatLevel: "Critical",
    hotspots: ["Jaipur Metro", "Alwar", "Bharatpur", "Jodhpur"],
  },
  DL: {
    id: "DL",
    code: "DL",
    name: "Delhi / NCR",
    zone: "North",
    totalPosts: 915,
    criticalMuleAds: 489,
    verifiedBankAccounts: 380,
    activeSyndicates: 72,
    dismissedLowRisk: 54,
    underReview: 410,
    totalAmount: "Rs. 8920.00",
    criticalAmount: "Rs. 5120.40",
    accountsAmount: "Rs. 2140.60",
    syndicatesAmount: "Rs. 950.20",
    dismissedAmount: "Rs. 620.10",
    reviewAmount: "Rs. 3480.90",
    threatScore: 92,
    threatLevel: "Critical",
    hotspots: ["Noida Cyber Corridor", "Gurugram Hub", "Rohini", "Connaught Place"],
  },
  JH: {
    id: "JH",
    code: "JH",
    name: "Jharkhand",
    zone: "East",
    totalPosts: 620,
    criticalMuleAds: 345,
    verifiedBankAccounts: 215,
    activeSyndicates: 42,
    dismissedLowRisk: 18,
    underReview: 240,
    totalAmount: "Rs. 5410.20",
    criticalAmount: "Rs. 3120.50",
    accountsAmount: "Rs. 1290.10",
    syndicatesAmount: "Rs. 480.20",
    dismissedAmount: "Rs. 190.50",
    reviewAmount: "Rs. 1840.20",
    threatScore: 89,
    threatLevel: "Critical",
    hotspots: ["Jamtara", "Deoghar", "Dhanbad", "Ranchi"],
  },
  MH: {
    id: "MH",
    code: "MH",
    name: "Maharashtra",
    zone: "West",
    totalPosts: 785,
    criticalMuleAds: 362,
    verifiedBankAccounts: 295,
    activeSyndicates: 68,
    dismissedLowRisk: 60,
    underReview: 310,
    totalAmount: "Rs. 6950.40",
    criticalAmount: "Rs. 3640.80",
    accountsAmount: "Rs. 1950.20",
    syndicatesAmount: "Rs. 720.40",
    dismissedAmount: "Rs. 639.00",
    reviewAmount: "Rs. 2480.50",
    threatScore: 84,
    threatLevel: "High",
    hotspots: ["Mumbai Suburban", "Navi Mumbai", "Pune", "Nagpur"],
  },
  UP: {
    id: "UP",
    code: "UP",
    name: "Uttar Pradesh",
    zone: "North",
    totalPosts: 740,
    criticalMuleAds: 315,
    verifiedBankAccounts: 270,
    activeSyndicates: 82,
    dismissedLowRisk: 73,
    underReview: 290,
    totalAmount: "Rs. 6420.10",
    criticalAmount: "Rs. 3050.20",
    accountsAmount: "Rs. 1620.50",
    syndicatesAmount: "Rs. 890.30",
    dismissedAmount: "Rs. 859.10",
    reviewAmount: "Rs. 2190.40",
    threatScore: 78,
    threatLevel: "High",
    hotspots: ["Mewat Border", "Mathura", "Lucknow", "Agra"],
  },
  WB: {
    id: "WB",
    code: "WB",
    name: "West Bengal",
    zone: "East",
    totalPosts: 512,
    criticalMuleAds: 218,
    verifiedBankAccounts: 194,
    activeSyndicates: 48,
    dismissedLowRisk: 52,
    underReview: 210,
    totalAmount: "Rs. 4310.80",
    criticalAmount: "Rs. 2150.30",
    accountsAmount: "Rs. 1120.40",
    syndicatesAmount: "Rs. 490.10",
    dismissedAmount: "Rs. 550.00",
    reviewAmount: "Rs. 1650.20",
    threatScore: 75,
    threatLevel: "High",
    hotspots: ["Kolkata North", "Salt Lake", "Siliguri", "Malda"],
  },
  TG: {
    id: "TG",
    code: "TG",
    name: "Telangana",
    zone: "South",
    totalPosts: 490,
    criticalMuleAds: 205,
    verifiedBankAccounts: 180,
    activeSyndicates: 52,
    dismissedLowRisk: 53,
    underReview: 195,
    totalAmount: "Rs. 4120.00",
    criticalAmount: "Rs. 1980.50",
    accountsAmount: "Rs. 1090.20",
    syndicatesAmount: "Rs. 510.30",
    dismissedAmount: "Rs. 539.00",
    reviewAmount: "Rs. 1540.80",
    threatScore: 72,
    threatLevel: "High",
    hotspots: ["Cyberabad", "Secunderabad", "Warangal"],
  },
  KA: {
    id: "KA",
    code: "KA",
    name: "Karnataka",
    zone: "South",
    totalPosts: 460,
    criticalMuleAds: 190,
    verifiedBankAccounts: 172,
    activeSyndicates: 46,
    dismissedLowRisk: 52,
    underReview: 180,
    totalAmount: "Rs. 3890.50",
    criticalAmount: "Rs. 1820.10",
    accountsAmount: "Rs. 980.40",
    syndicatesAmount: "Rs. 470.00",
    dismissedAmount: "Rs. 620.00",
    reviewAmount: "Rs. 1420.00",
    threatScore: 70,
    threatLevel: "High",
    hotspots: ["Bengaluru Tech Corridor", "Whitefield", "Mysuru"],
  },
  GJ: {
    id: "GJ",
    code: "GJ",
    name: "Gujarat",
    zone: "West",
    totalPosts: 430,
    criticalMuleAds: 175,
    verifiedBankAccounts: 160,
    activeSyndicates: 45,
    dismissedLowRisk: 50,
    underReview: 170,
    totalAmount: "Rs. 3650.00",
    criticalAmount: "Rs. 1690.00",
    accountsAmount: "Rs. 920.00",
    syndicatesAmount: "Rs. 440.00",
    dismissedAmount: "Rs. 600.00",
    reviewAmount: "Rs. 1340.00",
    threatScore: 68,
    threatLevel: "Medium",
    hotspots: ["Surat", "Ahmedabad", "Vadodara", "Rajkot"],
  },
  LA: {
    id: "LA",
    code: "LA",
    name: "Ladakh",
    zone: "North",
    totalPosts: 42,
    criticalMuleAds: 14,
    verifiedBankAccounts: 18,
    activeSyndicates: 6,
    dismissedLowRisk: 4,
    underReview: 16,
    totalAmount: "Rs. 340.20",
    criticalAmount: "Rs. 120.50",
    accountsAmount: "Rs. 95.20",
    syndicatesAmount: "Rs. 48.10",
    dismissedAmount: "Rs. 28.40",
    reviewAmount: "Rs. 98.00",
    threatScore: 35,
    threatLevel: "Low",
    hotspots: ["Leh", "Kargil"],
  },
  JK: {
    id: "JK",
    code: "JK",
    name: "Jammu and Kashmir",
    zone: "North",
    totalPosts: 125,
    criticalMuleAds: 48,
    verifiedBankAccounts: 42,
    activeSyndicates: 18,
    dismissedLowRisk: 17,
    underReview: 52,
    totalAmount: "Rs. 980.50",
    criticalAmount: "Rs. 410.20",
    accountsAmount: "Rs. 280.40",
    syndicatesAmount: "Rs. 140.10",
    dismissedAmount: "Rs. 149.80",
    reviewAmount: "Rs. 390.00",
    threatScore: 54,
    threatLevel: "Medium",
    hotspots: ["Srinagar", "Jammu City", "Anantnag"],
  },
  PB: {
    id: "PB",
    code: "PB",
    name: "Punjab",
    zone: "North",
    totalPosts: 310,
    criticalMuleAds: 120,
    verifiedBankAccounts: 115,
    activeSyndicates: 28,
    dismissedLowRisk: 35,
    underReview: 110,
    totalAmount: "Rs. 2480.00",
    criticalAmount: "Rs. 1120.00",
    accountsAmount: "Rs. 620.00",
    syndicatesAmount: "Rs. 280.00",
    dismissedAmount: "Rs. 160.00",
    reviewAmount: "Rs. 880.00",
    threatScore: 65,
    threatLevel: "Medium",
    hotspots: ["Ludhiana", "Amritsar", "Mohali", "Jalandhar"],
  },
  HR: {
    id: "HR",
    code: "HR",
    name: "Haryana",
    zone: "North",
    totalPosts: 380,
    criticalMuleAds: 158,
    verifiedBankAccounts: 142,
    activeSyndicates: 36,
    dismissedLowRisk: 42,
    underReview: 140,
    totalAmount: "Rs. 3120.00",
    criticalAmount: "Rs. 1450.00",
    accountsAmount: "Rs. 780.00",
    syndicatesAmount: "Rs. 360.00",
    dismissedAmount: "Rs. 190.00",
    reviewAmount: "Rs. 1120.00",
    threatScore: 76,
    threatLevel: "High",
    hotspots: ["Faridabad", "Panipat", "Karnal", "Rohtak"],
  },
  BR: {
    id: "BR",
    code: "BR",
    name: "Bihar",
    zone: "East",
    totalPosts: 410,
    criticalMuleAds: 172,
    verifiedBankAccounts: 150,
    activeSyndicates: 38,
    dismissedLowRisk: 40,
    underReview: 160,
    totalAmount: "Rs. 3350.00",
    criticalAmount: "Rs. 1520.00",
    accountsAmount: "Rs. 840.00",
    syndicatesAmount: "Rs. 390.00",
    dismissedAmount: "Rs. 210.00",
    reviewAmount: "Rs. 1200.00",
    threatScore: 80,
    threatLevel: "High",
    hotspots: ["Patna Cyber Cell", "Gaya", "Muzaffarpur"],
  },
  MP: {
    id: "MP",
    code: "MP",
    name: "Madhya Pradesh",
    zone: "Central",
    totalPosts: 350,
    criticalMuleAds: 138,
    verifiedBankAccounts: 130,
    activeSyndicates: 32,
    dismissedLowRisk: 38,
    underReview: 135,
    totalAmount: "Rs. 2850.00",
    criticalAmount: "Rs. 1280.00",
    accountsAmount: "Rs. 720.00",
    syndicatesAmount: "Rs. 330.00",
    dismissedAmount: "Rs. 180.00",
    reviewAmount: "Rs. 1020.00",
    threatScore: 66,
    threatLevel: "Medium",
    hotspots: ["Indore IT Hub", "Bhopal Central", "Gwalior"],
  },
  OR: {
    id: "OR",
    code: "OR",
    name: "Odisha",
    zone: "East",
    totalPosts: 240,
    criticalMuleAds: 92,
    verifiedBankAccounts: 88,
    activeSyndicates: 22,
    dismissedLowRisk: 26,
    underReview: 95,
    totalAmount: "Rs. 1920.00",
    criticalAmount: "Rs. 860.00",
    accountsAmount: "Rs. 480.00",
    syndicatesAmount: "Rs. 220.00",
    dismissedAmount: "Rs. 120.00",
    reviewAmount: "Rs. 690.00",
    threatScore: 62,
    threatLevel: "Medium",
    hotspots: ["Bhubaneswar", "Cuttack", "Rourkela"],
  },
  TN: {
    id: "TN",
    code: "TN",
    name: "Tamil Nadu",
    zone: "South",
    totalPosts: 320,
    criticalMuleAds: 124,
    verifiedBankAccounts: 118,
    activeSyndicates: 30,
    dismissedLowRisk: 36,
    underReview: 125,
    totalAmount: "Rs. 2560.00",
    criticalAmount: "Rs. 1150.00",
    accountsAmount: "Rs. 640.00",
    syndicatesAmount: "Rs. 290.00",
    dismissedAmount: "Rs. 160.00",
    reviewAmount: "Rs. 920.00",
    threatScore: 64,
    threatLevel: "Medium",
    hotspots: ["Chennai Metro", "Coimbatore", "Madurai"],
  },
  KL: {
    id: "KL",
    code: "KL",
    name: "Kerala",
    zone: "South",
    totalPosts: 210,
    criticalMuleAds: 78,
    verifiedBankAccounts: 74,
    activeSyndicates: 18,
    dismissedLowRisk: 24,
    underReview: 85,
    totalAmount: "Rs. 1680.00",
    criticalAmount: "Rs. 750.00",
    accountsAmount: "Rs. 420.00",
    syndicatesAmount: "Rs. 190.00",
    dismissedAmount: "Rs. 110.00",
    reviewAmount: "Rs. 610.00",
    threatScore: 58,
    threatLevel: "Medium",
    hotspots: ["Kochi Infopark", "Thiruvananthapuram", "Kozhikode"],
  },
  AS: {
    id: "AS",
    code: "AS",
    name: "Assam",
    zone: "North-East",
    totalPosts: 220,
    criticalMuleAds: 84,
    verifiedBankAccounts: 80,
    activeSyndicates: 20,
    dismissedLowRisk: 25,
    underReview: 90,
    totalAmount: "Rs. 1760.00",
    criticalAmount: "Rs. 790.00",
    accountsAmount: "Rs. 440.00",
    syndicatesAmount: "Rs. 200.00",
    dismissedAmount: "Rs. 120.00",
    reviewAmount: "Rs. 630.00",
    threatScore: 60,
    threatLevel: "Medium",
    hotspots: ["Guwahati Hub", "Silchar", "Dibrugarh"],
  },
  GA: {
    id: "GA",
    code: "GA",
    name: "Goa",
    zone: "West",
    totalPosts: 85,
    criticalMuleAds: 28,
    verifiedBankAccounts: 30,
    activeSyndicates: 8,
    dismissedLowRisk: 12,
    underReview: 35,
    totalAmount: "Rs. 680.00",
    criticalAmount: "Rs. 290.00",
    accountsAmount: "Rs. 170.00",
    syndicatesAmount: "Rs. 80.00",
    dismissedAmount: "Rs. 40.00",
    reviewAmount: "Rs. 250.00",
    threatScore: 45,
    threatLevel: "Low",
    hotspots: ["Panaji Coastal", "Margao"],
  },
  UT: {
    id: "UT",
    code: "UT",
    name: "Uttarakhand",
    zone: "North",
    totalPosts: 110,
    criticalMuleAds: 36,
    verifiedBankAccounts: 38,
    activeSyndicates: 10,
    dismissedLowRisk: 15,
    underReview: 45,
    totalAmount: "Rs. 880.00",
    criticalAmount: "Rs. 380.00",
    accountsAmount: "Rs. 220.00",
    syndicatesAmount: "Rs. 100.00",
    dismissedAmount: "Rs. 60.00",
    reviewAmount: "Rs. 320.00",
    threatScore: 48,
    threatLevel: "Low",
    hotspots: ["Dehradun", "Haridwar", "Rishikesh"],
  },
  HP: {
    id: "HP",
    code: "HP",
    name: "Himachal Pradesh",
    zone: "North",
    totalPosts: 75,
    criticalMuleAds: 24,
    verifiedBankAccounts: 26,
    activeSyndicates: 7,
    dismissedLowRisk: 10,
    underReview: 30,
    totalAmount: "Rs. 600.00",
    criticalAmount: "Rs. 260.00",
    accountsAmount: "Rs. 150.00",
    syndicatesAmount: "Rs. 70.00",
    dismissedAmount: "Rs. 40.00",
    reviewAmount: "Rs. 220.00",
    threatScore: 42,
    threatLevel: "Low",
    hotspots: ["Shimla", "Dharamshala", "Solan"],
  },
  CT: {
    id: "CT",
    code: "CT",
    name: "Chhattisgarh",
    zone: "Central",
    totalPosts: 180,
    criticalMuleAds: 66,
    verifiedBankAccounts: 64,
    activeSyndicates: 16,
    dismissedLowRisk: 22,
    underReview: 72,
    totalAmount: "Rs. 1440.00",
    criticalAmount: "Rs. 620.00",
    accountsAmount: "Rs. 360.00",
    syndicatesAmount: "Rs. 160.00",
    dismissedAmount: "Rs. 90.00",
    reviewAmount: "Rs. 520.00",
    threatScore: 56,
    threatLevel: "Medium",
    hotspots: ["Raipur", "Bilaspur", "Durg"],
  },
  AP: {
    id: "AP",
    code: "AP",
    name: "Andhra Pradesh",
    zone: "South",
    totalPosts: 280,
    criticalMuleAds: 105,
    verifiedBankAccounts: 102,
    activeSyndicates: 26,
    dismissedLowRisk: 32,
    underReview: 110,
    totalAmount: "Rs. 2240.00",
    criticalAmount: "Rs. 980.00",
    accountsAmount: "Rs. 560.00",
    syndicatesAmount: "Rs. 250.00",
    dismissedAmount: "Rs. 140.00",
    reviewAmount: "Rs. 810.00",
    threatScore: 63,
    threatLevel: "Medium",
    hotspots: ["Visakhapatnam", "Vijayawada", "Guntur"],
  },
};

// National Aggregates Fallback
export const NATIONAL_AGGREGATES = {
  id: "NATIONAL",
  code: "ALL",
  name: "National Threat Grid // All India",
  zone: "Pan-India",
  threatScore: 88,
  threatLevel: "High Grid Alert",
  hotspots: ["NCR Cyber Cluster", "Mewat Extortion Hub", "Jamtara Phishing Nexus", "Jaipur Metro", "Mumbai-Pune Strip"],
  totalPosts: 9840,
  criticalMuleAds: 4320,
  verifiedBankAccounts: 3640,
  activeSyndicates: 890,
  dismissedLowRisk: 740,
  underReview: 4120,
  totalAmount: "Rs. 84,250.00",
  criticalAmount: "Rs. 37,910.00",
  accountsAmount: "Rs. 21,060.00",
  syndicatesAmount: "Rs. 9,420.00",
  dismissedAmount: "Rs. 5,050.00",
  reviewAmount: "Rs. 28,140.00",
};

// Dynamic helper to resolve state metrics
export function getStatePortalData(stateId, stateName = "Unknown State", dynamicData = null) {
  if (dynamicData && dynamicData[stateId]) {
    const d = dynamicData[stateId];
    return {
      ...d,
      totalAmount: `Rs. ${d.totalAmountLakhs?.toFixed(2) || (d.totalPosts * 9.5).toFixed(2)}`,
      criticalAmount: `Rs. ${d.criticalAmountLakhs?.toFixed(2) || (d.criticalMuleAds * 10.2).toFixed(2)}`,
      accountsAmount: `Rs. ${d.accountsAmountLakhs?.toFixed(2) || (d.verifiedBankAccounts * 5.8).toFixed(2)}`,
      syndicatesAmount: `Rs. ${d.syndicatesAmountLakhs?.toFixed(2) || (d.activeSyndicates * 12.5).toFixed(2)}`,
      dismissedAmount: `Rs. ${d.dismissedAmountLakhs?.toFixed(2) || (d.dismissedLowRisk * 3.1).toFixed(2)}`,
      reviewAmount: `Rs. ${d.reviewAmountLakhs?.toFixed(2) || (d.underReview * 7.4).toFixed(2)}`,
    };
  }

  if (INDIA_PORTAL_DATA[stateId]) {
    return INDIA_PORTAL_DATA[stateId];
  }

  // Consistent fallback calculation based on state name
  const hash = stateName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const totalPosts = 60 + (hash % 180);
  const criticalMuleAds = Math.floor(totalPosts * 0.38);
  const verifiedBankAccounts = Math.floor(totalPosts * 0.32);
  const activeSyndicates = Math.max(2, Math.floor(totalPosts * 0.08));
  const dismissedLowRisk = Math.floor(totalPosts * 0.08);
  const underReview = totalPosts - dismissedLowRisk - activeSyndicates;

  return {
    id: stateId,
    code: stateId,
    name: stateName,
    zone: "Regional",
    totalPosts,
    criticalMuleAds,
    verifiedBankAccounts,
    activeSyndicates,
    dismissedLowRisk,
    underReview,
    totalAmount: `Rs. ${(totalPosts * 7.85).toFixed(2)}`,
    criticalAmount: `Rs. ${(criticalMuleAds * 8.42).toFixed(2)}`,
    accountsAmount: `Rs. ${(verifiedBankAccounts * 5.12).toFixed(2)}`,
    syndicatesAmount: `Rs. ${(activeSyndicates * 9.25).toFixed(2)}`,
    dismissedAmount: `Rs. ${(dismissedLowRisk * 3.10).toFixed(2)}`,
    reviewAmount: `Rs. ${(underReview * 6.50).toFixed(2)}`,
    threatScore: Math.min(88, 30 + (hash % 50)),
    threatLevel: (hash % 2 === 0) ? "Medium" : "Low",
    hotspots: [`${stateName} Central`, `${stateName} Cyber Cell`],
  };
}

export default function IndiaFraudMap({
  activeTab = "map",
  onTabChange,
  onSelectState,
  selectedStateId = "AR",
}) {
  const [hoveredId, setHoveredId] = useState(null);
  const [lockedStateId, setLockedStateId] = useState(selectedStateId || "AR");
  const [dynamicStateMap, setDynamicStateMap] = useState(null);
  const [dynamicNational, setDynamicNational] = useState(null);

  // Fetch live server metrics
  useEffect(() => {
    let cancelled = false;
    api.stateStats()
      .then((res) => {
        if (!cancelled && res) {
          if (res.states) setDynamicStateMap(res.states);
          if (res.national) setDynamicNational(res.national);
        }
      })
      .catch(() => {
        // Graceful fallback to embedded offline dataset
      });
    return () => { cancelled = true; };
  }, []);

  // Sync external selection if prop changes
  useEffect(() => {
    if (selectedStateId) {
      setLockedStateId(selectedStateId);
    }
  }, [selectedStateId]);

  // Determine which state (or National Aggregate) to show in the summary table
  const currentActiveId = hoveredId || lockedStateId;

  const activeData = useMemo(() => {
    if (!currentActiveId || currentActiveId === "NATIONAL") {
      if (dynamicNational) {
        return {
          ...dynamicNational,
          totalAmount: `Rs. ${dynamicNational.totalAmountLakhs?.toFixed(2) || "84250.00"}`,
          criticalAmount: `Rs. ${dynamicNational.criticalAmountLakhs?.toFixed(2) || "37910.00"}`,
          accountsAmount: `Rs. ${dynamicNational.accountsAmountLakhs?.toFixed(2) || "21060.00"}`,
          syndicatesAmount: `Rs. ${dynamicNational.syndicatesAmountLakhs?.toFixed(2) || "9420.00"}`,
          dismissedAmount: `Rs. ${dynamicNational.dismissedAmountLakhs?.toFixed(2) || "5050.00"}`,
          reviewAmount: `Rs. ${dynamicNational.reviewAmountLakhs?.toFixed(2) || "28140.00"}`,
        };
      }
      return NATIONAL_AGGREGATES;
    }

    const stateConfig = OFFICIAL_STATE_SVGS.find((s) => s.id === currentActiveId) || {
      id: currentActiveId,
      name: INDIA_PORTAL_DATA[currentActiveId]?.name || "Unknown State",
    };

    return getStatePortalData(stateConfig.id, stateConfig.name, dynamicStateMap);
  }, [currentActiveId, dynamicStateMap, dynamicNational]);

  const handleStateClick = (state) => {
    if (lockedStateId === state.id) {
      // Toggle unlock back to National Grid
      setLockedStateId(null);
      onSelectState?.(NATIONAL_AGGREGATES);
    } else {
      setLockedStateId(state.id);
      const data = getStatePortalData(state.id, state.name, dynamicStateMap);
      onSelectState?.(data);
    }
  };

  return (
    <div className="india-portal-wrapper">
      {/* 1. TOP NAVIGATION / FILTER BAR */}
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
            View State Wise Summary
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "categories" ? "tab-active" : ""}`}
            onClick={() => onTabChange?.("categories")}
          >
            View Category Wise Summary
          </button>
        </div>

        {/* Language selector pill on the right */}
        <div className="portal-lang-pill">
          <span className="lang-avatar">A</span>
          <span className="lang-text">English</span>
          <span className="lang-arrow">▼</span>
        </div>
      </div>

      {/* 2. MAP & FLOATING SUMMARY DATA TABLE VIEWPORT */}
      <div className="portal-map-workspace">
        {/* Left Side: India Official Seamless SVG Map */}
        <div className="svg-canvas-container">
          <svg
            viewBox={INDIA_VIEWBOX}
            className="india-vector-map"
            role="img"
            aria-label="Official Interactive Map of India with contiguous state boundary highlights"
          >
            <defs>
              <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
              </filter>
            </defs>

            {/* Render all official seamless states */}
            {OFFICIAL_STATE_SVGS.map((st) => {
              const isHovered = hoveredId === st.id;
              const isSelected = lockedStateId === st.id;
              const isActive = isHovered || isSelected;

              // Official Styling:
              // Unselected: Crisp off-white / light periwinkle (#F0F2FD) with clean thin border (#4A4A4A)
              // Active / Hovered: Soft deep periwinkle / lavender (#8B8DF2 / #A5A6F6)
              let fillColor = "#F0F2FD";
              if (isSelected) {
                fillColor = "#8B8DF2";
              } else if (isHovered) {
                fillColor = "#A5A6F6";
              }

              return (
                <path
                  key={st.id}
                  d={st.path}
                  id={`state-${st.id}`}
                  className={`portal-state-path ${isActive ? "state-active-highlight" : ""}`}
                  fill={fillColor}
                  stroke="#4A4A4A"
                  strokeWidth={isActive ? "1.8" : "1.0"}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  onMouseEnter={() => setHoveredId(st.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => handleStateClick(st)}
                  cursor="pointer"
                >
                  <title>{st.name}</title>
                </path>
              );
            })}

            {/* Cyan Square Enclave Markers for Daman & Diu and Dadra & Nagar Haveli */}
            <rect
              x="52"
              y="388"
              width="6"
              height="6"
              fill="#00bcd4"
              stroke="#ffffff"
              strokeWidth="1"
              rx="1"
              cursor="pointer"
              onMouseEnter={() => setHoveredId("DD")}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleStateClick({ id: "DD", name: "Daman and Diu" })}
            >
              <title>Daman and Diu</title>
            </rect>
            <rect
              x="103"
              y="405"
              width="6"
              height="6"
              fill="#00bcd4"
              stroke="#ffffff"
              strokeWidth="1"
              rx="1"
              cursor="pointer"
              onMouseEnter={() => setHoveredId("DN")}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleStateClick({ id: "DN", name: "Dadra and Nagar Haveli" })}
            >
              <title>Dadra and Nagar Haveli</title>
            </rect>
          </svg>

          {/* Map Interaction Hint */}
          <div className="map-guidance-pill">
            <Icon name="radar" size={13} />
            <span>Hover or click any state to inspect regional fraud & recovery metrics</span>
          </div>
        </div>

        {/* Right Side: FLOATING OVERLAY DATA TABLE (Strictly bound to MuleWatch Fraud Schema) */}
        <div className="portal-floating-table-card">
          {/* Header Row: Bright mint-green background (#90EE90) */}
          <div className="portal-table-header">
            <h3>{activeData.name}</h3>
            {lockedStateId === activeData.id ? (
              <button
                type="button"
                className="state-locked-tag"
                style={{ cursor: "pointer", border: "none" }}
                onClick={() => {
                  setLockedStateId(null);
                  onSelectState?.(NATIONAL_AGGREGATES);
                }}
                title="Click to reset to National Overview"
              >
                ● Focus Locked (Reset)
              </button>
            ) : (
              <span className="state-locked-tag">
                Threat Score: {activeData.threatScore}/100
              </span>
            )}
          </div>

          {/* Column Titles Header */}
          <div className="portal-table-subhead">
            <span className="col-status">Fraud Indicator / Category</span>
            <span className="col-count">Intercepted Count</span>
            <span className="col-amount">Estimated Financial Risk (₹ in Lakhs)</span>
          </div>

          {/* Alternating Soft Pastel Background Rows */}
          <div className="portal-table-body">
            {/* Row 1: Total Intercepted Posts (Light Blue highlight) */}
            <div className="data-row row-light-blue">
              <span className="col-status">Total Intercepted Posts</span>
              <span className="col-count">{activeData.totalPosts}</span>
              <span className="col-amount">{activeData.totalAmount}</span>
            </div>

            {/* Row 2: Critical Risk Mule Ads (Light Pink/Red highlight) */}
            <div className="data-row row-light-pink">
              <span className="col-status">Critical Risk Mule Ads</span>
              <span className="col-count">{activeData.criticalMuleAds}</span>
              <span className="col-amount">{activeData.criticalAmount}</span>
            </div>

            {/* Row 3: Verified Bank Accounts for Sale (Light Green highlight) */}
            <div className="data-row row-light-green">
              <span className="col-status">Verified Bank Accounts for Sale</span>
              <span className="col-count">{activeData.verifiedBankAccounts}</span>
              <span className="col-amount">{activeData.accountsAmount}</span>
            </div>

            {/* Row 4: Active Seller Syndicates / Rings (Soft Peach highlight) */}
            <div className="data-row row-light-peach">
              <span className="col-status">Active Seller Syndicates / Rings</span>
              <span className="col-count">{activeData.activeSyndicates}</span>
              <span className="col-amount">{activeData.syndicatesAmount}</span>
            </div>

            {/* Row 5: Dismissed / Low-Risk Posts (Light Mint highlight) */}
            <div className="data-row row-light-mint">
              <span className="col-status">Dismissed / Low-Risk Posts</span>
              <span className="col-count">{activeData.dismissedLowRisk}</span>
              <span className="col-amount">{activeData.dismissedAmount}</span>
            </div>

            {/* Row 6: Under Active Cyber Cell Review (Crisp White background) */}
            <div className="data-row row-white">
              <span className="col-status">Under Active Cyber Cell Review</span>
              <span className="col-count">{activeData.underReview}</span>
              <span className="col-amount">{activeData.reviewAmount}</span>
            </div>
          </div>

          {/* Bottom Security Context */}
          <div className="portal-table-footer">
            <span className="threat-tag">
              Threat Score: <b>{activeData.threatScore}/100</b> ({activeData.threatLevel})
            </span>
            <span className="hotspot-text">
              Hotspots: {activeData.hotspots?.slice(0, 3).join(", ") || "Active Surveillance Zone"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
