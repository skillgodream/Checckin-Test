import React, { useState, useEffect } from "react";
import {
  NewHire,
  ManagerSignal,
  WorkSignal,
  ActionOutcome,
  ManagerIssueType,
} from "../types";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  User,
  Zap,
  Sparkles,
  Sliders,
  FileCheck2,
  ChevronRight,
  Phone,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  X,
  Clock,
  ThumbsUp,
} from "lucide-react";

interface ManagerViewProps {
  newHires: NewHire[];
  activeHireId: string;
  onSelectHire: (id: string) => void;
  currentDay: number;
  onManagerSignalSubmitted: (hireId: string, signal: ManagerSignal) => void;
  onWorkSignalUpdated: (hireId: string, workSignal: WorkSignal) => void;
  onActionOutcomeRecorded: (hireId: string, outcome: ActionOutcome) => void;
}

export const ManagerView: React.FC<ManagerViewProps> = ({
  newHires,
  activeHireId,
  onSelectHire,
  currentDay,
  onManagerSignalSubmitted,
  onWorkSignalUpdated,
  onActionOutcomeRecorded,
}) => {
  const activeHire = newHires.find((h) => h.id === activeHireId) || newHires[0];

  // Active hire's authoritative day: prefer their individual journey day or the selected day
  const effectiveDay = activeHire.currentDay || currentDay || 1;

  // Find record for effective day (or latest available record in history)
  const currentRecord = activeHire.daysHistory.find((d) => d.dayNumber === effectiveDay) ||
    activeHire.daysHistory[activeHire.daysHistory.length - 1] || {
    dayNumber: effectiveDay,
    date: `Day ${effectiveDay}`,
    workSignal: {
      dayNumber: effectiveDay,
      targetPickRate: 50,
      actualPickRate: 35,
      accuracyRate: 98,
      ordersCompleted: 44,
      targetOrders: 65,
    },
    statusAtEnd: activeHire.status,
    statusReason: activeHire.statusReason,
  };

  // Manager 5-second fast input state
  const [managerState, setManagerState] = useState<"Doing well" | "Needs support" | "Struggling">(
    currentRecord.managerSignal?.state || "Needs support"
  );
  const [issueType, setIssueType] = useState<ManagerIssueType>(
    currentRecord.managerSignal?.issueCategory || "Process"
  );
  const [managerNote, setManagerNote] = useState(
    currentRecord.managerSignal?.notes ||
      (currentDay === 3 ? "Repeated location searches on multi-aisle grocery orders." : "")
  );
  const [isSavingManagerSignal, setIsSavingManagerSignal] = useState(false);

  // Work Signal manual inputs
  const [targetRate, setTargetRate] = useState(currentRecord.workSignal?.targetPickRate ?? 50);
  const [actualRate, setActualRate] = useState(currentRecord.workSignal?.actualPickRate ?? 0);
  const [accuracyRate, setAccuracyRate] = useState(currentRecord.workSignal?.accuracyRate ?? 100);
  const [isUpdatingWorkSignal, setIsUpdatingWorkSignal] = useState(false);

  // Action Check / Outcome state
  const [outcomeStatus, setOutcomeStatus] = useState<"yes" | "no" | "partial">("yes");
  const [outcomeNotes, setOutcomeNotes] = useState(
    `Buddy ${activeHire.buddy.split(" ")[0]} walked aisles 4-8 with ${activeHire.name.split(" ")[0]}. Navigation improved and pick pace recovered.`
  );
  const [isRecordingOutcome, setIsRecordingOutcome] = useState(false);
  const [showOutcomeDrawer, setShowOutcomeDrawer] = useState(false);

  // Modal inspection for individual dossier tiles
  const [activeTileModal, setActiveTileModal] = useState<"worker_signal" | "pattern" | "action" | "metrics" | null>(null);

  // Synchronize internal form fields when active employee or day changes
  useEffect(() => {
    setManagerState(
      currentRecord.managerSignal?.state || (activeHire.status === "Doing well" ? "Doing well" : "Needs support")
    );
    setIssueType(currentRecord.managerSignal?.issueCategory || "Process");
    setManagerNote(
      currentRecord.managerSignal?.notes ||
        (effectiveDay === 3 && activeHire.id === "nh-rahul-01"
          ? "Repeated location searches on multi-aisle grocery orders."
          : "")
    );
    setTargetRate(currentRecord.workSignal?.targetPickRate ?? 50);
    setActualRate(currentRecord.workSignal?.actualPickRate ?? 0);
    setAccuracyRate(currentRecord.workSignal?.accuracyRate ?? 100);
    setOutcomeStatus(currentRecord.actionOutcome?.improved || "yes");
    setOutcomeNotes(
      currentRecord.actionOutcome?.notes ||
        `Buddy ${activeHire.buddy.split(" ")[0]} walked aisles 4-8 with ${activeHire.name.split(" ")[0]}. Navigation improved and pick pace recovered.`
    );
  }, [effectiveDay, activeHire.id, currentRecord.managerSignal, currentRecord.workSignal, currentRecord.actionOutcome]);

  const handleSaveManagerSignal = () => {
    setIsSavingManagerSignal(true);
    const signal: ManagerSignal = {
      id: `mgr-${Date.now()}`,
      dayNumber: effectiveDay,
      managerName: `${activeHire.supervisor.split(" ")[0]} (Shift Supervisor)`,
      state: managerState,
      issueCategory: managerState !== "Doing well" ? issueType : undefined,
      notes: managerNote,
      timestamp: "Just now",
    };
    onManagerSignalSubmitted(activeHire.id, signal);
    setTimeout(() => setIsSavingManagerSignal(false), 300);
  };

  const handleSaveWorkSignal = () => {
    setIsUpdatingWorkSignal(true);
    const workSignal: WorkSignal = {
      dayNumber: effectiveDay,
      targetPickRate: Number(targetRate),
      actualPickRate: Number(actualRate),
      accuracyRate: Number(accuracyRate),
      ordersCompleted: Math.round(Number(actualRate) * 1.2),
      targetOrders: Math.round(Number(targetRate) * 1.3),
      gapIdentified:
        Number(targetRate) - Number(actualRate) > 8
          ? `${Number(targetRate) - Number(actualRate)} picks/hr below expected ramp curve`
          : "Within expected ramp curve",
    };
    onWorkSignalUpdated(activeHire.id, workSignal);
    setTimeout(() => setIsUpdatingWorkSignal(false), 300);
  };

  const handleRecordOutcome = () => {
    setIsRecordingOutcome(true);
    const outcome: ActionOutcome = {
      id: `out-${Date.now()}`,
      actionId: currentRecord.recommendedAction?.id || "act-default",
      dayNumber: effectiveDay,
      performedBy: `${activeHire.supervisor.split(" ")[0]} (Supervisor) & ${activeHire.buddy.split(" ")[0]} (Buddy)`,
      performedAt: "Floor Check completed",
      improved: outcomeStatus,
      notes: outcomeNotes,
      subsequentPickRate:
        outcomeStatus === "yes"
          ? Math.max(48, Number(targetRate) - 2)
          : outcomeStatus === "partial"
          ? Math.max(Number(actualRate) + 5, 41)
          : Number(actualRate),
      subsequentAccuracy: outcomeStatus === "yes" ? 99 : 98,
    };
    onActionOutcomeRecorded(activeHire.id, outcome);
    setShowOutcomeDrawer(false);
    setTimeout(() => setIsRecordingOutcome(false), 300);
  };

  // Status metrics counts
  const needsAttentionCount = newHires.filter((h) => h.status === "Needs attention").length;
  const atRiskCount = newHires.filter((h) => h.status === "At risk").length;
  const doingWellCount = newHires.filter((h) => h.status === "Doing well").length;

  const isSupportCompleted = Boolean(currentRecord.actionOutcome && currentRecord.actionOutcome.improved);

  return (
    <div className="max-w-md mx-auto px-4 py-3 space-y-4 pb-8 select-none text-white bg-[#14161d]">
      {/* ========================================================= */}
      {/* 1. TOP GREETING & SHIFT OVERVIEW                          */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Shift Triage</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              DS #104
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Shift Supervisor Overview • Day {effectiveDay}
          </p>
        </div>

        {/* Status Counter Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-slate-300">{needsAttentionCount} Need Support</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ACTIVE COHORT SELECTOR                                 */}
      {/* ========================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Team Cohort ({newHires.length})
          </span>
          <span className="text-[11px] text-slate-500">Select worker</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
          {newHires.map((hire) => {
            const isSelected = hire.id === activeHire.id;
            const hireDay = hire.currentDay || currentDay || 1;
            const hireRecord = hire.daysHistory.find((d) => d.dayNumber === hireDay) ||
              hire.daysHistory[hire.daysHistory.length - 1] ||
              hire.daysHistory[0];

            const pickSpeed = Math.round(hireRecord?.workSignal?.actualPickRate || (hire as any).pickRate || 0);
            const accuracy = Math.round(hireRecord?.workSignal?.accuracyRate || 98);

            return (
              <button
                key={hire.id}
                id={`hire-chip-${hire.id}`}
                onClick={() => onSelectHire(hire.id)}
                className={`snap-start min-w-[170px] p-3 rounded-2xl border text-left transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-[#1e2230] text-white border-cyan-500/80 shadow-md ring-1 ring-cyan-500/30"
                    : "bg-[#141720] border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <img
                      src={hire.avatar}
                      alt={hire.name}
                      className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate leading-tight">{hire.name.split(" ")[0]}</h4>
                      <span className="text-[10px] text-slate-400">Day {hireDay}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                      hire.status === "Doing well"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : hire.status === "Needs attention"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {hire.status === "Doing well" ? "On Track" : hire.status === "Needs attention" ? "Support" : "At Risk"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-white/5 font-mono">
                  <span className={isSelected ? "text-cyan-400 font-semibold" : "text-slate-400"}>
                    {pickSpeed} UPH
                  </span>
                  <span className="text-slate-400">
                    {accuracy}% Acc
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. HERO WORKER CARD & DEAN SYNTHESIS                     */}
      {/* ========================================================= */}
      <div className="bg-[#181a24] rounded-2xl p-4 sm:p-5 border border-white/10 shadow-lg space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={activeHire.avatar}
              alt={activeHire.name}
              className="w-11 h-11 rounded-full object-cover border-2 border-cyan-500/40 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{activeHire.name}</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSupportCompleted
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : activeHire.status === "Doing well"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : activeHire.status === "Needs attention"
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {isSupportCompleted
                    ? "Check Completed ✅"
                    : activeHire.status === "Doing well"
                    ? "Ramp On Track"
                    : activeHire.status === "Needs attention"
                    ? "Needs Support"
                    : "At Risk"}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {(activeHire as any).role || "Frontline Picker"} • Buddy: <strong className="text-slate-300 font-medium">{activeHire.buddy}</strong>
              </p>
            </div>
          </div>

          <button
            id="open-check-outcome-btn"
            onClick={() => setShowOutcomeDrawer(!showOutcomeDrawer)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm transition-all border border-cyan-400/30 cursor-pointer shrink-0"
          >
            {isSupportCompleted ? "View Check" : "Record Check"}
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 bg-[#12141c] p-3 rounded-xl border border-white/5 text-center">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Pick Speed</span>
            <span className="text-sm font-bold text-cyan-400 font-mono mt-0.5 block">
              {Math.round(currentRecord.workSignal?.actualPickRate || (activeHire as any).pickRate || 0)} <span className="text-[10px] text-slate-400 font-normal">UPH</span>
            </span>
            <span className="text-[10px] text-slate-500 block">Target: {currentRecord.workSignal?.targetPickRate || (activeHire as any).targetPickRate || 50}</span>
          </div>
          <div className="border-x border-white/5">
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Accuracy</span>
            <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
              {Math.round(currentRecord.workSignal?.accuracyRate || 98)}%
            </span>
            <span className="text-[10px] text-slate-500 block">Target: 98%</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">Module Exposure</span>
            <span className="text-sm font-bold text-indigo-300 font-mono mt-0.5 block">
              {activeHire.completedModuleIds?.length ?? 10} / 19
            </span>
            <span className="text-[10px] text-slate-500 block">Learning Universe</span>
          </div>
        </div>

        {/* DEAN Diagnosis Summary (Cleaned up text) */}
        {(() => {
          let diagnosis = currentRecord.identifiedPattern?.diagnosis || "Worker is progressing along the ramp curve with stable accuracy and consistent floor pace.";
          
          // Clean up technical artifacts if present
          if (diagnosis.includes(" | Longitudinal Pattern (")) {
            diagnosis = diagnosis.split(" | Longitudinal Pattern (")[0];
          }

          return (
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Dean's Shift Diagnosis</span>
              </div>
              <p className="text-xs text-indigo-100 leading-relaxed">
                {diagnosis}
              </p>
            </div>
          );
        })()}
      </div>

      {/* ========================================================= */}
      {/* 4. RECOMMENDED ACTION & QUICK TILES                       */}
      {/* ========================================================= */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-0.5 block">
          Recommended Action & Signals
        </span>

        {/* Recommended Action Card */}
        {currentRecord.recommendedAction && (
          <div className="bg-[#181a24] p-4 rounded-2xl border border-emerald-500/30 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentRecord.recommendedAction.actionType.replace(/_/g, " ")}
              </span>
              <span className="text-[11px] text-slate-400">
                Assigned: <strong className="text-slate-200">{currentRecord.recommendedAction.targetActor}</strong>
              </span>
            </div>

            <h3 className="text-xs font-bold text-white">
              {currentRecord.recommendedAction.title}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {currentRecord.recommendedAction.description}
            </p>

            {currentRecord.recommendedAction.rationale && (
              <p className="text-[11px] text-emerald-400/90 italic pt-1 border-t border-white/5">
                Rationale: {currentRecord.recommendedAction.rationale}
              </p>
            )}
          </div>
        )}

        {/* Quick Signal Inspection Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTileModal("worker_signal")}
            className="p-3 rounded-xl bg-[#181a24] border border-white/10 hover:border-cyan-500/40 text-left transition-all cursor-pointer flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-white block truncate">Worker Signal</span>
              <span className="text-[10px] text-slate-400 truncate block">View voice note</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTileModal("metrics")}
            className="p-3 rounded-xl bg-[#181a24] border border-white/10 hover:border-amber-500/40 text-left transition-all cursor-pointer flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-white block truncate">Adjust Metrics</span>
              <span className="text-[10px] text-slate-400 truncate block">Set UPH & Accuracy</span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. SUPERVISOR 5-SECOND CHECK-IN CARD                      */}
      {/* ========================================================= */}
      <div className="bg-[#181a24] rounded-2xl p-4 sm:p-5 border border-white/10 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-white">
              Supervisor Check-in ({activeHire.name.split(" ")[0]})
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            Fast Rating
          </span>
        </div>

        {/* 3 Status Touch Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {(["Doing well", "Needs support", "Struggling"] as const).map((st) => (
            <button
              key={st}
              id={`mgr-state-${st.toLowerCase().replace(" ", "-")}`}
              onClick={() => setManagerState(st)}
              className={`py-2.5 px-1 text-center rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                managerState === st
                  ? st === "Doing well"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : st === "Needs support"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "bg-rose-600 text-white shadow-sm"
                  : "bg-[#12141c] text-slate-300 border border-white/5 hover:bg-white/5"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Issue Category Chips */}
        {managerState !== "Doing well" && (
          <div className="space-y-1.5 pt-1">
            <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Issue Area:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(["Speed", "Accuracy", "Process", "Tool", "Confidence"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setIssueType(cat)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                    issueType === cat
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "bg-[#12141c] text-slate-300 border border-white/5 hover:bg-white/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Floor Note */}
        <div>
          <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
            Supervisor Note:
          </span>
          <input
            id="mgr-note-input"
            type="text"
            value={managerNote}
            onChange={(e) => setManagerNote(e.target.value)}
            placeholder="e.g. Navigation lag in Aisles 4-8..."
            className="w-full text-xs p-2.5 rounded-xl border border-white/10 bg-[#12141c] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <button
          id="submit-mgr-signal-btn"
          onClick={handleSaveManagerSignal}
          disabled={isSavingManagerSignal}
          className="w-full py-3 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-95 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 border border-cyan-400/30"
        >
          {isSavingManagerSignal ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Saving signal...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-slate-950" />
              <span>Save Observation & Update Intelligence</span>
            </>
          )}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 6. OUTCOME RECORDING DRAWER / MODAL                       */}
      {/* ========================================================= */}
      {showOutcomeDrawer && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1e26] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/10 space-y-4 animate-in fade-in zoom-in duration-150 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Floor Intervention Check
                  </h3>
                  <p className="text-[11px] text-slate-400">Close the feedback loop</p>
                </div>
              </div>
              <button
                onClick={() => setShowOutcomeDrawer(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-350 leading-relaxed">
              Did the situation improve after buddy <strong>{activeHire.buddy.split(" ")[0]}</strong>'s walkthrough with <strong>{activeHire.name.split(" ")[0]}</strong>?
            </p>

            <div className="grid grid-cols-3 gap-2">
              {(["yes", "partial", "no"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setOutcomeStatus(st)}
                  className={`py-2.5 px-1 rounded-2xl text-center font-bold text-xs cursor-pointer transition-all shadow-2xs ${
                    outcomeStatus === st
                      ? st === "yes"
                        ? "bg-emerald-600 text-white"
                        : st === "partial"
                        ? "bg-amber-500 text-white"
                        : "bg-rose-600 text-white"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {st === "yes" ? "Improved 👍" : st === "partial" ? "Partial ⏳" : "Stalled ❌"}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Floor Outcome Notes:
              </label>
              <textarea
                id="outcome-notes-input"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-2xl border border-white/10 bg-[#13151b] text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowOutcomeDrawer(false)}
                className="flex-1 py-2.5 rounded-2xl bg-white/5 text-slate-300 border border-white/5 hover:bg-white/10 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-outcome-btn"
                onClick={handleRecordOutcome}
                disabled={isRecordingOutcome}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all active:scale-95 border border-white/10"
              >
                {isRecordingOutcome ? "Saving..." : "Save Outcome"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DOSSIER TILE DETAIL MODALS                                */}
      {/* ========================================================= */}
      {activeTileModal === "worker_signal" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1e26] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/10 space-y-3.5 animate-in fade-in zoom-in duration-150 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Worker Voice Signal</h3>
                  <p className="text-[11px] text-slate-400">{activeHire.name} • Spoken</p>
                </div>
              </div>
              <button onClick={() => setActiveTileModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 text-xs text-cyan-300 italic">
              "{currentRecord.dailySignal?.rawText || "Confused where products are located in Aisles 4-8."}"
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p><strong className="text-white">Input Method:</strong> {currentRecord.dailySignal?.inputMethod || "Voice note"}</p>
              <p><strong className="text-white">Reported:</strong> {currentRecord.dailySignal?.timestamp || "Morning shift"}</p>
              <p><strong className="text-white">Companion Reassurance:</strong> {currentRecord.dailySignal?.companionResponse || "Buddy Vikram alerted to help."}</p>
            </div>

            <button onClick={() => setActiveTileModal(null)} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl text-xs font-black cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

      {activeTileModal === "pattern" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1e26] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/10 space-y-3.5 animate-in fade-in zoom-in duration-150 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Central Synthesis</h3>
                  <p className="text-[11px] text-slate-400">3-Signal Cross-Referencing</p>
                </div>
              </div>
              <button onClick={() => setActiveTileModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs space-y-1">
              <span className="text-[10px] font-bold text-blue-300 uppercase">Diagnosis:</span>
              <p className="text-slate-200 font-medium">
                {currentRecord.identifiedPattern?.diagnosis ||
                  "Navigation bottleneck in Aisles 4-8. Accuracy is solid (98%), indicating high diligence. Only physical shelf familiarity is missing."}
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <p><strong className="text-white">Confidence:</strong> {currentRecord.identifiedPattern?.patternConfidence || "High"}</p>
              <p><strong className="text-white">Risk Level:</strong> {activeHire.status}</p>
            </div>

            <button onClick={() => setActiveTileModal(null)} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl text-xs font-black cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

      {activeTileModal === "action" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1e26] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/10 space-y-3.5 animate-in fade-in zoom-in duration-150 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Smallest Practical Action</h3>
                  <p className="text-[11px] text-slate-400">Targeted Floor Step</p>
                </div>
              </div>
              <button onClick={() => setActiveTileModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 space-y-1.5">
              {currentRecord.recommendedAction?.decisionType && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 inline-block mb-1 border border-emerald-500/10">
                  {currentRecord.recommendedAction.decisionType.replace(/_/g, " ")}
                </span>
              )}
              <h4 className="text-xs font-bold text-white">
                {currentRecord.recommendedAction?.title || "15-minute Aisle 4-8 Walkthrough"}
              </h4>
              <p className="text-xs text-slate-300">
                {currentRecord.recommendedAction?.description || "Senior Buddy walks rack locations before the evening rush."}
              </p>
              {currentRecord.recommendedAction?.rationale && (
                <p className="text-[11px] text-emerald-300/95 italic pt-0.5">
                  <strong>Adaptive Rationale:</strong> {currentRecord.recommendedAction.rationale}
                </p>
              )}
              <p className="text-[11px] font-semibold text-emerald-400 pt-1 border-t border-emerald-500/10">
                Assigned to: {currentRecord.recommendedAction?.targetActor || "Buddy Vikram"}
              </p>
            </div>

            <button onClick={() => setActiveTileModal(null)} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl text-xs font-black cursor-pointer">
              Close
            </button>
          </div>
        </div>
      )}

      {activeTileModal === "metrics" && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1e26] rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-white/10 space-y-3.5 animate-in fade-in zoom-in duration-150 text-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Floor Metrics Tuning</h3>
                  <p className="text-[11px] text-slate-400">Actual pace & scanner accuracy</p>
                </div>
              </div>
              <button onClick={() => setActiveTileModal(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-350">
                  <span>Pick Pace:</span>
                  <span className="font-bold text-white">{actualRate} items/hr (Target: {targetRate})</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={70}
                  value={actualRate}
                  onChange={(e) => setActualRate(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1 font-semibold text-slate-350">
                  <span>Scanning Accuracy:</span>
                  <span className="font-bold text-emerald-400">{accuracyRate}%</span>
                </div>
                <input
                  type="range"
                  min={80}
                  max={100}
                  value={accuracyRate}
                  onChange={(e) => setAccuracyRate(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setActiveTileModal(null)} className="flex-1 py-2.5 rounded-2xl bg-white/5 text-slate-350 border border-white/5 hover:bg-white/10 text-xs font-bold cursor-pointer">
                Cancel
              </button>
              <button
                id="update-work-signal-btn"
                onClick={() => {
                  handleSaveWorkSignal();
                  setActiveTileModal(null);
                }}
                disabled={isUpdatingWorkSignal}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-xs font-black cursor-pointer border border-white/10 hover:opacity-95"
              >
                {isUpdatingWorkSignal ? "Saving..." : "Save Metrics"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
