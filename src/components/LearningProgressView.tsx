import React, { useState, useMemo } from "react";
import { NewHire } from "../types";
import {
  TrendingUp,
  Maximize2,
  Calendar,
  BarChart2,
  Flag,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  Check,
  X
} from "lucide-react";

interface DayTrajectoryPoint {
  day: number;
  score: number;
  status: "Doing well" | "Needs attention" | "At risk";
  trend: "up" | "down" | "stable";
  delta: number;
  prevDay: number;
  isCurrentDay: boolean;
  isPitStop: boolean;
  pitStopLabel?: string;
  isReadinessGate: boolean;
  detailNote: string;
}

interface LearningProgressViewProps {
  newHire: NewHire;
  currentDay: number;
  isHindi?: boolean;
}

export const LearningProgressView: React.FC<LearningProgressViewProps> = ({
  newHire,
  currentDay,
  isHindi = false,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(4);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Canonical baseline trajectory matching the exact trajectory values
  const canonicalPoints: {
    day: number;
    score: number;
    delta: number;
    prevDay: number;
    label?: string;
    isPitStop?: boolean;
    isReadinessGate?: boolean;
    status: "Doing well" | "Needs attention" | "At risk";
    note: string;
  }[] = [
    { day: 1, score: 20, delta: 0, prevDay: 1, status: "Doing well", note: isHindi ? "पहला दिन: मूल ओरिएंटेशन और सुरक्षा नियम" : "Day 1: Core orientation and warehouse basics" },
    { day: 2, score: 28, delta: 8, prevDay: 1, status: "Doing well", note: isHindi ? "दूसरा दिन: ज़ोन नेविगेशन और स्कैनर कार्य" : "Day 2: Zone navigation and scanner handling" },
    { day: 3, score: 36, delta: 8, prevDay: 2, status: "Needs attention", note: isHindi ? "तीसरा दिन: Aisles 4-8 नेविगेशन अड़चन" : "Day 3: Aisles 4-8 coordinate navigation bottleneck" },
    { day: 4, score: 58, delta: 22, prevDay: 3, label: "Pit Stop #1", isPitStop: true, status: "Doing well", note: isHindi ? "पिट स्टॉप #1: बडी वॉकथ्रू के बाद गति वृद्धि (+22%)" : "Pit Stop #1: Velocity jump with stable 98% accuracy (+22%)" },
    { day: 5, score: 46, delta: -12, prevDay: 4, status: "Doing well", note: isHindi ? "पांचवां दिन: अपवाद हैंडलिंग और वजन सत्यापन" : "Day 5: Weight exception handling and multi-bin items" },
    { day: 6, score: 56, delta: 10, prevDay: 5, status: "Doing well", note: isHindi ? "छठा दिन: पीक ऑवर सिम्युलेटर गति में सुधार" : "Day 6: Rush-hour replenishment & aisle flow" },
    { day: 7, score: 60, delta: 4, prevDay: 6, status: "Doing well", note: isHindi ? "सातवां दिन: मल्टी-टस्क और त्रुटि-मुक्त बैच" : "Day 7: Multi-tote routing and batch picking" },
    { day: 8, score: 72, delta: 12, prevDay: 7, label: "Pit Stop #2", isPitStop: true, status: "Doing well", note: isHindi ? "पिट स्टॉप #2: स्वतंत्र फ्लोर गति और उच्च सटीकता (+12%)" : "Pit Stop #2: Independent floor pacing and zero QC defects (+12%)" },
    { day: 9, score: 83, delta: 11, prevDay: 8, status: "Doing well", note: isHindi ? "नौवां दिन: वाणिज्यिक गति सीमा को पार करना" : "Day 9: Operating near standard benchmark rate" },
    { day: 10, score: 92, delta: 9, prevDay: 8, label: "Readiness Gate ★", isReadinessGate: true, status: "Doing well", note: isHindi ? "रेडीनेस गेट: पूर्ण वाणिज्यिक प्रमाणीकरण (92%)" : "Readiness Gate: Full commercial certification standard (92%)" },
  ];

  // Merge with live hire telemetry when present
  const history = newHire.daysHistory || [];
  const trajectoryPoints: DayTrajectoryPoint[] = canonicalPoints.map((pt) => {
    const isCurrent = pt.day === currentDay;
    const historyRec = history.find((h) => h.dayNumber === pt.day);

    let score = pt.score;
    let status = pt.status;
    let detailNote = pt.note;

    if (pt.day === 3) {
      status = "Needs attention";
    } else if (historyRec) {
      if (historyRec.statusAtEnd === "At risk") status = "At risk";
      else if (historyRec.statusAtEnd === "Needs attention") status = "Needs attention";
      else if (historyRec.statusAtEnd === "Doing well") status = "Doing well";

      if (historyRec.statusReason) {
        detailNote = historyRec.statusReason;
      }
    }

    return {
      day: pt.day,
      score,
      status,
      trend: pt.delta >= 0 ? "up" : "down",
      delta: pt.delta,
      prevDay: pt.prevDay,
      isCurrentDay: isCurrent,
      isPitStop: Boolean(pt.isPitStop),
      pitStopLabel: pt.label,
      isReadinessGate: Boolean(pt.isReadinessGate),
      detailNote,
    };
  });

  // Helper to resolve Red / Amber / Green indicator palette
  const getStatusDetails = (status: "Doing well" | "Needs attention" | "At risk") => {
    if (status === "Doing well") {
      return {
        core: "#10B981", // Emerald Green
        stroke: "#34D399",
        halo: "rgba(16, 185, 129, 0.15)",
        label: "Doing well",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (status === "Needs attention") {
      return {
        core: "#F59E0B", // Amber
        stroke: "#FBBF24",
        halo: "rgba(245, 158, 11, 0.15)",
        label: "Needs attention",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    return {
      core: "#EF4444", // Red
      stroke: "#F87171",
      halo: "rgba(239, 68, 68, 0.15)",
      label: "At risk",
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    };
  };

  const selectedPoint =
    trajectoryPoints.find((p) => p.day === selectedDay) ||
    trajectoryPoints.find((p) => p.day === currentDay) ||
    trajectoryPoints[0];

  // SVG Dimension Math
  const svgWidth = 370;
  const svgHeight = 240;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 48; // Room for milestone callouts
  const padBottom = 30; // Room for X-axis labels
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (d: number) => padLeft + ((d - 1) / 9) * plotWidth;
  const getY = (s: number) => padTop + (1 - Math.min(100, Math.max(0, s)) / 100) * plotHeight;

  // Calculate highest recorded day up to the active onboarding shift (Day 5 max)
  const recordedWithData = history.filter((h) => h.workSignal || h.statusAtEnd || h.dailySignal);
  const maxRecordedDay = Math.min(
    5,
    recordedWithData.length > 0
      ? Math.max(...recordedWithData.map((h) => h.dayNumber))
      : Math.min(5, Math.max(1, currentDay))
  );
  const effectiveCurrentDay = maxRecordedDay;

  const activePoints = trajectoryPoints.filter((p) => p.day <= maxRecordedDay);
  const safeActivePoints = activePoints.length > 0 ? activePoints : [trajectoryPoints[0]];
  const lastPoint = safeActivePoints[safeActivePoints.length - 1];

  // Till-date progress line path (solid)
  const linePathD = safeActivePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.day).toFixed(1)} ${getY(p.score).toFixed(1)}`)
    .join(" ");

  const areaPathD = `${linePathD} L ${getX(lastPoint.day).toFixed(1)} ${(padTop + plotHeight).toFixed(1)} L ${getX(1).toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`;

  const tillDateLinePathD = linePathD;
  const tillDateAreaPathD = areaPathD;
  const futureLinePathD = "";
  const futureAreaPathD = "";

  return (
    <div className="w-full min-h-screen bg-[#EBEAE5] text-stone-900 flex flex-col justify-start px-3 sm:px-4 pt-3 sm:pt-4 pb-24 select-none antialiased">
      {/* Container: Unified Zebra Light Telemetry Card */}
      <div className="w-full max-w-lg mx-auto bg-white rounded-[28px] border border-black/[0.03] shadow-xs relative overflow-hidden flex flex-col">
        
        {/* ======================================================== */}
        {/* HEADER: Title & Actions (Expand & Status Badge)          */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 pb-3 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 flex-1 w-full min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#18181B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[16px] sm:text-[17px] font-black text-[#18181B] tracking-tight leading-snug break-words">
                {isHindi ? "मेरी सीख का सफ़र" : "My Learning Journey"}
              </h1>
              <p className="text-[12px] text-[#8E8C85] font-normal mt-0.5 leading-tight">
                {isHindi ? "दिन 1 → दिन 10 • ऑनबोर्डिंग प्रगति" : "Day 1 → Day 10 • Onboarding Trajectory"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {/* Expand / Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#F4F3EE] hover:bg-[#E5E4DE] border border-black/[0.04] text-[11px] font-bold text-[#18181B] transition-all cursor-pointer active:scale-95"
              title={isHindi ? "विस्तृत दृश्य" : "Expand Full View"}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{isHindi ? "विस्तार" : "Expand"}</span>
            </button>

            {/* Health Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{isHindi ? "ट्रैक पर" : "On Track"}</span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LEGEND & STATUS STRIP (Till-Date Progress vs Trajectory) */}
        {/* ======================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#F4F3EE] border-y border-black/[0.04] text-[11px] font-bold text-[#716F68]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-[#18181B] rounded-full" />
              <span className="text-[#18181B]">{isHindi ? "आज तक" : "Till-Date"} (D1–D{effectiveCurrentDay})</span>
            </span>
            {effectiveCurrentDay < 10 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-0 border-b-2 border-dashed border-[#8E8C85]" />
                <span className="text-[#8E8C85]">{isHindi ? "प्रक्षेपवक्र" : "Trajectory"} (D{effectiveCurrentDay}–D10)</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]" />
              <span>{isHindi ? "अच्छा" : "Doing well"}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-amber-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
              <span>{isHindi ? "ध्यान दें" : "Needs attention"}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-rose-600">
              <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" />
              <span>{isHindi ? "जोखिम" : "At risk"}</span>
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* GRAPH VIEWPORT: Till-Date Solid & Future Trajectory      */}
        {/* ======================================================== */}
        <div className="w-full relative px-2 sm:px-3 pt-1 pb-1 z-10 bg-white">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              {/* Soft Vertical Gradient for Till-Date Area Fill */}
              <linearGradient id="tillDateAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#18181B" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#18181B" stopOpacity="0.00" />
              </linearGradient>

              {/* Glowing Aura Filter */}
              <filter id="pointAura" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
              </filter>
            </defs>

            {/* Horizontal Benchmark / Grid Lines */}
            {[100, 75, 50, 25, 0].map((level) => {
              const y = getY(level);
              return (
                <g key={`grid-${level}`}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotWidth}
                    y2={y}
                    stroke="#ECEAE3"
                    strokeWidth="1"
                    strokeDasharray={level === 0 || level === 100 ? undefined : "2 2"}
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="#8E8C85"
                  >
                    {level}%
                  </text>
                </g>
              );
            })}

            {/* Zone Benchmark Indicator Labels */}
            <g opacity="0.85">
              {/* Healthy Zone: ≥75% */}
              <text
                x={padLeft + 4}
                y={getY(75) - 6}
                fontSize="8"
                fontWeight="800"
                fill="#059669"
              >
                Healthy Zone (≥75%)
              </text>

              {/* Needs Attention Zone: 50-74% */}
              <text
                x={padLeft + 4}
                y={getY(75) + 12}
                fontSize="8"
                fontWeight="800"
                fill="#D97706"
              >
                Needs Attention (50–74%)
              </text>

              {/* At Risk Zone: <50% */}
              <text
                x={padLeft + 4}
                y={getY(50) + 12}
                fontSize="8"
                fontWeight="800"
                fill="#E11D48"
              >
                At Risk Zone (&lt;50%)
              </text>
            </g>

            {/* Vertical Milestone Guides (D4, D8, D10) */}
            {[4, 8, 10].map((dayNum) => {
              const x = getX(dayNum);
              return (
                <line
                  key={`guide-${dayNum}`}
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotHeight}
                  stroke="#E5E4DE"
                  strokeWidth="1.2"
                  strokeDasharray="2 3"
                />
              );
            })}

            {/* Area Fill Under Active Trajectory Curve */}
            <path d={areaPathD} fill="url(#tillDateAreaGradient)" />

            {/* Primary Progress Line: High Contrast Solid Black Curve */}
            <path
              d={linePathD}
              fill="none"
              stroke="#18181B"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Data Points (Recorded Days 1 to maxRecordedDay with Red / Green / Amber indicators) */}
            {safeActivePoints.map((pt) => {
              const cx = getX(pt.day);
              const cy = getY(pt.score);
              const isSelected = pt.day === selectedDay;
              const isCurrent = pt.day === maxRecordedDay;
              const isKeyMilestone = pt.day === 4 || pt.day === 8 || pt.day === 10;
              const colors = getStatusDetails(pt.status);

              return (
                <g
                  key={`point-${pt.day}`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedDay(pt.day)}
                >
                  {/* Tap Target */}
                  <circle cx={cx} cy={cy} r="14" fill="transparent" />

                  {/* Colored Halo Glow */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isCurrent ? "11" : isSelected ? "9.5" : "7.5"}
                    fill={colors.halo}
                  />

                  {/* Pulsing indicator ring for Current Active Day */}
                  {isCurrent && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="12"
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth="1.5"
                      opacity="0.8"
                    >
                      <animate
                        attributeName="r"
                        values="7;13;7"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.8;0.15;0.8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Outer Ring with Red/Amber/Green status stroke */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isCurrent ? "6.8" : isSelected ? "6" : isKeyMilestone ? "5.2" : "4.2"}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="1.8"
                  />

                  {/* Solid Red / Amber / Green Core Pointer Dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isCurrent ? "4.2" : isSelected ? "3.6" : "2.8"}
                    fill={colors.core}
                  />
                </g>
              );
            })}

            {/* ====================================================== */}
            {/* FLOATING MILESTONE CALLOUTS (Attachment 2 Design)     */}
            {/* ====================================================== */}

            {/* D4: Pit Stop #1 (58%  +18%) */}
            {(() => {
              const x = getX(4);
              const y = getY(58);
              return (
                <g className="cursor-pointer" onClick={() => setSelectedDay(4)}>
                  {/* Callout Box */}
                  <rect
                    x={x - 26}
                    y={y - 38}
                    width="52"
                    height="27"
                    rx="6"
                    fill="#F4F3EE"
                    stroke="#E5E4DE"
                    strokeWidth="1"
                  />
                  {/* Small pointer tick */}
                  <polygon
                    points={`${x - 4},${y - 11} ${x + 4},${y - 11} ${x},${y - 7}`}
                    fill="#F4F3EE"
                  />
                  {/* Text: Pit Stop #1 */}
                  <text
                    x={x}
                    y={y - 27}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="800"
                    fill="#8E8C85"
                  >
                    Pit Stop #1
                  </text>
                  {/* Text: 58%  +18% */}
                  <text x={x - 1} y={y - 16} textAnchor="end" fontSize="9" fontWeight="900" fill="#18181B">
                    58%
                  </text>
                  <text x={x + 2} y={y - 16} textAnchor="start" fontSize="7.5" fontWeight="800" fill="#059669">
                    +18%
                  </text>
                </g>
              );
            })()}

            {/* D8: Pit Stop #2 (72%  +14%) */}
            {(() => {
              const x = getX(8);
              const y = getY(72);
              return (
                <g className="cursor-pointer" onClick={() => setSelectedDay(8)}>
                  {/* Callout Box */}
                  <rect
                    x={x - 26}
                    y={y - 38}
                    width="52"
                    height="27"
                    rx="6"
                    fill="#F4F3EE"
                    stroke="#E5E4DE"
                    strokeWidth="1"
                  />
                  {/* Small pointer tick */}
                  <polygon
                    points={`${x - 4},${y - 11} ${x + 4},${y - 11} ${x},${y - 7}`}
                    fill="#F4F3EE"
                  />
                  {/* Text: Pit Stop #2 */}
                  <text
                    x={x}
                    y={y - 27}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="800"
                    fill="#8E8C85"
                  >
                    Pit Stop #2
                  </text>
                  {/* Text: 72%  +14% */}
                  <text x={x - 1} y={y - 16} textAnchor="end" fontSize="9" fontWeight="900" fill="#18181B">
                    72%
                  </text>
                  <text x={x + 2} y={y - 16} textAnchor="start" fontSize="7.5" fontWeight="800" fill="#059669">
                    +14%
                  </text>
                </g>
              );
            })()}

            {/* D10: Readiness Gate ★ (92%  +20%) */}
            {(() => {
              const x = getX(10);
              const y = getY(92);
              return (
                <g className="cursor-pointer" onClick={() => setSelectedDay(10)}>
                  {/* Callout Box (Shifted left so it doesn't clip right boundary) */}
                  <rect
                    x={x - 52}
                    y={y - 38}
                    width="54"
                    height="27"
                    rx="6"
                    fill="#F4F3EE"
                    stroke="#E5E4DE"
                    strokeWidth="1"
                  />
                  {/* Small pointer tick */}
                  <polygon
                    points={`${x - 12},${y - 11} ${x - 4},${y - 11} ${x - 8},${y - 7}`}
                    fill="#F4F3EE"
                  />
                  {/* Text: Readiness Gate ★ */}
                  <text
                    x={x - 25}
                    y={y - 27}
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="800"
                    fill="#5856D6"
                  >
                    Readiness ★
                  </text>
                  {/* Text: 92%  +20% */}
                  <text x={x - 28} y={y - 16} textAnchor="end" fontSize="9" fontWeight="900" fill="#18181B">
                    92%
                  </text>
                  <text x={x - 25} y={y - 16} textAnchor="start" fontSize="7.5" fontWeight="800" fill="#059669">
                    +20%
                  </text>
                </g>
              );
            })()}

            {/* X-Axis Day Markers (D1 to D10) */}
            {trajectoryPoints.map((pt) => {
              const x = getX(pt.day);
              const isSelected = pt.day === selectedDay;
              const isMilestone = pt.day === 4 || pt.day === 8 || pt.day === 10;
              const isPastOrCurrent = pt.day <= maxRecordedDay;

              return (
                <text
                  key={`day-label-${pt.day}`}
                  x={x}
                  y={padTop + plotHeight + 17}
                  textAnchor="middle"
                  fontSize={isMilestone || isSelected ? "9" : "8"}
                  fontWeight="800"
                  fill={
                    isSelected
                      ? "#18181B"
                      : isPastOrCurrent
                      ? "rgba(24, 24, 27, 0.85)"
                      : "rgba(24, 24, 27, 0.35)"
                  }
                  className="cursor-pointer"
                  onClick={() => setSelectedDay(pt.day)}
                >
                  D{pt.day}
                </text>
              );
            })}
          </svg>
        </div>

        {/* ======================================================== */}
        {/* ACTIVE INSPECTION CALLOUT (Context for tapped day)       */}
        {/* ======================================================== */}
        <div className="mx-4 mb-3.5 p-3 rounded-2xl bg-[#F4F3EE] border border-black/[0.03] flex items-center justify-between gap-3 text-xs text-[#18181B]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-extrabold text-[#18181B] shrink-0">Day {selectedPoint.day}:</span>
            <span className="text-[#716F68] truncate text-[11px] font-bold">
              {selectedPoint.detailNote}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono font-black text-[#18181B]">{selectedPoint.score}%</span>
            <span
              className={`text-[10px] font-black flex items-center ${
                selectedPoint.delta >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {selectedPoint.delta >= 0 ? `+${selectedPoint.delta}%` : `${selectedPoint.delta}%`}
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ONE UNIFIED PLACEMENT CARD WITH TIMELINE DETAILS         */}
        {/* enter day 4 day 5 day 19 content in that                  */}
        {/* ======================================================== */}
        <div className="mx-4 mb-5 bg-[#F4F3EE] rounded-3xl p-5 border border-black/[0.03] space-y-4 text-stone-900">
          <div className="flex items-center gap-2 pb-1 border-b border-[#E5E4DE]">
            <div className="w-2 h-2 rounded-full bg-[#18181B] shrink-0" />
            <h3 className="text-[12px] font-black uppercase tracking-wider text-[#18181B]">
              {isHindi ? "व्यावसायिक नियुक्ति विवरण" : "Unified Placement Plan"}
            </h3>
          </div>

          <div className="space-y-4">
            {/* Day 4 Row */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                D4
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-black text-[#18181B]">{isHindi ? "पिट स्टॉप #1: वेग कूद" : "Pit Stop #1: Velocity Jump"}</span>
                  <span className="text-[11px] font-bold text-emerald-600 shrink-0">+18% Delta</span>
                </div>
                <p className="text-[11.5px] text-[#8E8C85] leading-normal mt-0.5 font-medium">
                  {isHindi ? "बडी वॉकथ्रू और स्वतंत्र गाइड के बाद 98% सटीकता।" : "Velocity jump with stable 98% accuracy after targeted buddy floor walkthroughs."}
                </p>
              </div>
            </div>

            {/* Day 5 Row */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-300 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                D5
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-black text-[#18181B]">{isHindi ? "अपवाद प्रशिक्षण" : "Floor Practice & Exceptions"}</span>
                  <span className="text-[11px] font-bold text-emerald-600 shrink-0">+12% Delta</span>
                </div>
                <p className="text-[11.5px] text-[#8E8C85] leading-normal mt-0.5 font-medium">
                  {isHindi ? "मल्टी-बिन आइटम और वजन विसंगति नियमों का अभ्यास करना।" : "Weight exception verification, look-alike packaging check, and multi-bin items practice."}
                </p>
              </div>
            </div>

            {/* Day 19 Row */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                D19
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-black text-[#18181B]">{isHindi ? "स्वतंत्र सोलो डिस्पैच" : "Autonomous Solo Handoff"}</span>
                  <span className="text-[11px] font-bold text-emerald-600 shrink-0">Certified</span>
                </div>
                <p className="text-[11.5px] text-[#8E8C85] leading-normal mt-0.5 font-medium">
                  {isHindi ? "शून्य क्षति और त्रुटि मुक्त डिस्पैच के साथ स्वतंत्र पाली।" : "Full commercial certification clearance for 100% independent zero-damage solo dispatch shifts."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXPANDED FULLSCREEN MODAL VIEW                          */}
      {/* ======================================================== */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="w-full max-w-xl bg-white border border-black/[0.03] rounded-3xl p-5 shadow-2xl relative flex flex-col max-h-[92vh] overflow-y-auto text-[#18181B]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="flex items-center justify-between pb-3 border-b border-[#ECEAE3]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#18181B]" />
                <span className="text-base font-black text-[#18181B]">
                  {isHindi ? "मेरी सीख का सफ़र" : "My Learning Journey"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 rounded-full bg-[#F4F3EE] hover:bg-[#E5E4DE] text-[#18181B] flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Maximized Graph View */}
            <div className="py-4">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto overflow-visible select-none"
              >
                {/* Horizontal Grid */}
                {[100, 75, 50, 25, 0].map((level) => (
                  <g key={`modal-grid-${level}`}>
                    <line
                      x1={padLeft}
                      y1={getY(level)}
                      x2={padLeft + plotWidth}
                      y2={getY(level)}
                      stroke="#ECEAE3"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={padLeft - 6}
                      y={getY(level) + 3}
                      textAnchor="end"
                      fontSize="9.5"
                      fontWeight="700"
                      fill="#8E8C85"
                    >
                      {level}%
                    </text>
                  </g>
                ))}

                {/* Till-Date Area and Solid Line */}
                <path d={tillDateAreaPathD} fill="url(#tillDateAreaGradient)" />
                <path
                  d={tillDateLinePathD}
                  fill="none"
                  stroke="#18181B"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points with Red / Green / Amber color pointers */}
                {trajectoryPoints.map((pt) => {
                  const cx = getX(pt.day);
                  const cy = getY(pt.score);
                  const isSelected = pt.day === selectedDay;
                  const isCurrent = pt.day === effectiveCurrentDay;
                  const colors = getStatusDetails(pt.status);

                  return (
                    <g key={`modal-pt-${pt.day}`} className="cursor-pointer" onClick={() => setSelectedDay(pt.day)}>
                      <circle cx={cx} cy={cy} r="8" fill={colors.halo} />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected || isCurrent ? "5.5" : "4.2"}
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="1.6"
                      />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected || isCurrent ? "3.5" : "2.5"}
                        fill={colors.core}
                      />
                      <text
                        x={cx}
                        y={padTop + plotHeight + 17}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="800"
                        fill={isSelected ? "#18181B" : "rgba(24,24,27,0.4)"}
                      >
                        D{pt.day}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Selected Day Full Narrative */}
            <div className="p-4 rounded-2xl bg-[#F4F3EE] border border-black/[0.03] space-y-2 text-[#18181B]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#18181B]">
                  {isHindi ? `दिन ${selectedPoint.day} विश्लेषण` : `Day ${selectedPoint.day} Analysis`}
                </span>
                <span className="text-sm font-black text-[#18181B]">
                  {selectedPoint.score}% Readiness
                </span>
              </div>
              <p className="text-xs text-[#716F68] leading-relaxed font-semibold">
                {selectedPoint.detailNote}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
