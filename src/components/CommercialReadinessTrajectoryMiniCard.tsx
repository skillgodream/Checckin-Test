import React from "react";
import { ChevronRight } from "lucide-react";
import { NewHire } from "../types";

interface CommercialReadinessTrajectoryMiniCardProps {
  newHire: NewHire;
  currentDay: number;
  isHindi?: boolean;
  onNavigateToProgress?: () => void;
}

export const CommercialReadinessTrajectoryMiniCard: React.FC<CommercialReadinessTrajectoryMiniCardProps> = ({
  newHire,
  currentDay,
  isHindi = false,
  onNavigateToProgress,
}) => {
  // Canonical curriculum progression targets from Day 1 to 10
  const canonicalBaseline = [
    { day: 1, baseScore: 20 },
    { day: 2, baseScore: 28 },
    { day: 3, baseScore: 36 },
    { day: 4, baseScore: 58 },
    { day: 5, baseScore: 46 }, // Multi-bin/exception handling dip matching telemetry screenshot
    { day: 6, baseScore: 56 },
    { day: 7, baseScore: 60 },
    { day: 8, baseScore: 72 },
    { day: 9, baseScore: 83 },
    { day: 10, baseScore: 92 },
  ];

  // Merge with real new hire historical telemetry (not dummy)
  const history = newHire.daysHistory || [];
  const trajectoryPoints = canonicalBaseline.map((pt) => {
    const historyRec = history.find((h) => h.dayNumber === pt.day);
    let score = pt.baseScore;

    if (historyRec?.workSignal) {
      const { actualPickRate, targetPickRate, accuracyRate } = historyRec.workSignal;
      if (targetPickRate && actualPickRate) {
        const speedPct = actualPickRate / targetPickRate;
        const accPct = (accuracyRate || 98) / 100;
        const dynamicReadiness = Math.round(
          (speedPct * 0.55 + accPct * 0.45) * pt.baseScore * 1.05
        );
        score = Math.min(100, Math.max(15, dynamicReadiness));
      }
    }

    // Determine Red / Amber / Green indicator status matching dark store telemetry
    let pointStatus: "Doing well" | "Needs attention" | "At risk" = "Doing well";
    if (pt.day === 3) {
      // Day 3: Aisles 4-8 coordinate navigation bottleneck (Needs attention - Amber)
      pointStatus = "Needs attention";
    } else if (historyRec) {
      if (historyRec.statusAtEnd === "At risk" || historyRec.managerSignal?.state === "Struggling") {
        pointStatus = "At risk";
      } else if (historyRec.statusAtEnd === "Needs attention" || historyRec.managerSignal?.state === "Needs support") {
        pointStatus = "Needs attention";
      } else {
        pointStatus = "Doing well";
      }
    }

    return {
      day: pt.day,
      score,
      status: pointStatus,
      hasRecordedData: Boolean(historyRec),
    };
  });

  // Calculate highest recorded day up to the current active onboarding shift (Day 5 max)
  const recordedWithData = history.filter((h) => h.workSignal || h.statusAtEnd || h.dailySignal);
  const maxRecordedDay = Math.min(
    5,
    recordedWithData.length > 0
      ? Math.max(...recordedWithData.map((h) => h.dayNumber))
      : Math.min(5, Math.max(1, currentDay))
  );

  const activePoints = trajectoryPoints.filter((p) => p.day <= maxRecordedDay);
  const safeActivePoints = activePoints.length > 0 ? activePoints : [trajectoryPoints[0]];
  const lastPoint = safeActivePoints[safeActivePoints.length - 1];

  // SVG Dimension & Coordinate Math - Stretched to maximum sides
  const svgWidth = 360;
  const svgHeight = 190;
  const padLeft = 14; // Maximized edge-to-edge span
  const padRight = 14; // Maximized edge-to-edge span
  const padTop = 18;
  const padBottom = 26;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (d: number) => padLeft + ((d - 1) / 9) * plotWidth;
  const getY = (s: number) => padTop + (1 - Math.min(100, Math.max(0, s)) / 100) * plotHeight;

  // Trajectory curve path string
  const linePathD = safeActivePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(p.day).toFixed(1)} ${getY(p.score).toFixed(1)}`)
    .join(" ");

  // Shaded polygon area under the curve dropping vertically at the latest recorded day
  const areaPathD = `${linePathD} L ${getX(lastPoint.day).toFixed(1)} ${(padTop + plotHeight).toFixed(1)} L ${getX(1).toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`;

  // 5 benchmark horizontal grid levels (0%, 25%, 50%, 75%, 100%)
  const horizontalGridLevels = [0, 25, 50, 75, 100];

  // Indicator palette for Red / Amber / Green pointers
  const statusPalette = {
    "Doing well": {
      core: "#10B981", // Green
      halo: "rgba(16, 185, 129, 0.35)",
      border: "#34D399",
    },
    "Needs attention": {
      core: "#F59E0B", // Amber
      halo: "rgba(245, 158, 11, 0.38)",
      border: "#FBBF24",
    },
    "At risk": {
      core: "#EF4444", // Red
      halo: "rgba(239, 68, 68, 0.38)",
      border: "#F87171",
    },
  };

  return (
    <div
      id="home-commercial-readiness-card"
      onClick={onNavigateToProgress}
      className="w-full bg-white rounded-[28px] border border-black/[0.03] shadow-xs relative overflow-hidden mb-5 cursor-pointer transition-all active:scale-[0.99] group text-left"
    >
      {/* Soft internal gradient highlight instead of dark glow */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />

      {/* Card Header: Title, Status Legend & Chevron Navigation */}
      <div className="pt-4 sm:pt-5 px-4 sm:px-5 pb-1 relative z-10">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-[17px] font-black text-[#18181B] tracking-tight leading-snug">
            {isHindi ? "मेरी सीख का सफ़र" : "My Learning Journey"}
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToProgress?.();
            }}
            className="w-7 h-7 rounded-full bg-black/5 group-hover:bg-black/10 flex items-center justify-center text-[#18181B]/75 group-hover:text-[#18181B] transition-all cursor-pointer active:scale-95 shrink-0"
            title={isHindi ? "प्रगति देखें" : "View Progress"}
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Status Indicators Legend */}
        <div className="flex items-center gap-3.5 mt-1.5 text-[10.5px] font-bold text-[#716F68]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-xs" />
            <span>{isHindi ? "अच्छा प्रदर्शन" : "Doing well"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-xs" />
            <span>{isHindi ? "ध्यान आवश्यक" : "Needs attention"}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] shadow-xs" />
            <span>{isHindi ? "जोखिम में" : "At risk"}</span>
          </span>
        </div>
      </div>

      {/* Trajectory Graph (Stretched to the sides maximum) */}
      <div className="w-full relative z-10 select-none px-0 pb-3 pt-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Charcoal-to-transparent vertical gradient fill */}
            <linearGradient id="homeTrajectoryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#18181B" stopOpacity="0.12" />
              <stop offset="60%" stopColor="#18181B" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#18181B" stopOpacity="0.00" />
            </linearGradient>

            {/* Glowing aura filter for points */}
            <filter id="homePointAura" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
            </filter>
          </defs>

          {/* 5 Horizontal Grid Lines (Full-bleed across the SVG width) */}
          {horizontalGridLevels.map((level) => {
            const y = getY(level);
            return (
              <line
                key={`grid-level-${level}`}
                x1={0}
                y1={y}
                x2={svgWidth}
                y2={y}
                stroke="rgba(24, 24, 27, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Shaded Area Under Trajectory Line */}
          <path d={areaPathD} fill="url(#homeTrajectoryGradient)" />

          {/* High-Contrast Charcoal Trajectory Line */}
          <path
            d={linePathD}
            fill="none"
            stroke="#18181B"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trajectory Data Nodes (Pointers with Red, Green, or Amber indication) */}
          {safeActivePoints.map((pt) => {
            const cx = getX(pt.day);
            const cy = getY(pt.score);
            const isLatest = pt.day === lastPoint.day;
            const color = statusPalette[pt.status];

            return (
              <g key={`home-pt-${pt.day}`}>
                {/* Outer Glow Halo Ring in indicator color */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? "9" : "7.5"}
                  fill={color.halo}
                />
                {/* Middle Accent Ring in indicator color */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? "5.5" : "4.5"}
                  fill="none"
                  stroke={color.border}
                  strokeWidth="1.6"
                />
                {/* Inner Solid Core in Red / Amber / Green */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? "3.2" : "2.6"}
                  fill={color.core}
                />
                {/* Pulsing indicator ring for the latest active day */}
                {isLatest && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="11"
                    fill="none"
                    stroke={color.border}
                    strokeWidth="1"
                    opacity="0.5"
                  >
                    <animate
                      attributeName="r"
                      values="7;13;7"
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.6;0.1;0.6"
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* X-Axis Numbers (1 to 10) Evenly Spaced Below Plot */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((dayNum) => {
            const x = getX(dayNum);
            const isPastOrCurrent = dayNum <= maxRecordedDay;
            return (
              <text
                key={`xaxis-day-${dayNum}`}
                x={x}
                y={padTop + plotHeight + 17}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isPastOrCurrent ? "700" : "500"}
                fill={isPastOrCurrent ? "rgba(24, 24, 27, 0.85)" : "rgba(24, 24, 27, 0.35)"}
              >
                {dayNum}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
