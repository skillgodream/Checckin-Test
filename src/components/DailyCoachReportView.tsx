import React from "react";
import {
  X,
} from "lucide-react";
import { NewHire, DayRecord } from "../types";

interface DailyCoachReportViewProps {
  newHire: NewHire;
  currentDay: number;
  isHindi?: boolean;
  onClose: () => void;
}

export const DailyCoachReportView: React.FC<DailyCoachReportViewProps> = ({
  newHire,
  currentDay,
  isHindi = false,
  onClose,
}) => {
  const yesterdayDayNumber = Math.max(1, currentDay - 1);
  const yesterdayRecord: DayRecord | undefined =
    newHire.daysHistory.find((d) => d.dayNumber === yesterdayDayNumber) ||
    newHire.daysHistory[0];

  const workSignal = yesterdayRecord?.workSignal;
  const yOrders = workSignal?.ordersCompleted;
  const yActualPace = workSignal?.actualPickRate;
  const yTargetPace = workSignal?.targetPickRate;
  const yAccuracy = workSignal?.accuracyRate;
  const yScanAccuracy = yAccuracy;
  const isAccuracyRed = yAccuracy ? yAccuracy < 95 : false;

  const readiness = (typeof newHire.overallReadinessScore === "number" ? (newHire.overallReadinessScore <= 1 ? Math.round(newHire.overallReadinessScore * 100) : Math.round(newHire.overallReadinessScore)) : 0);
  const completedModules = newHire.completedModuleIds?.length ?? 0;
  const totalModules = 5;

  return (
    <div
      id="daily-coach-report-popup"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 font-sans"
    >
      <div className="relative max-w-sm sm:max-w-md w-full bg-white text-slate-900 rounded-[32px] shadow-2xl border border-white/80 p-5 sm:p-6 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900">
              {isHindi ? "कल की रिपोर्ट कार्ड" : "Yesterday's Report Card"}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isHindi ? `Day ${yesterdayDayNumber} · ${newHire.roleTitle}` : `Day ${yesterdayDayNumber} · ${newHire.roleTitle}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* YOUR DAY */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your Day</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            {yesterdayRecord ? 
             `You ${workSignal ? "had a productive shift fulfilling " + yOrders + " orders. " : ""}Your accuracy was ${yAccuracy}%. ${yActualPace < yTargetPace ? "Picking pace still needs practice." : "Picking pace was consistent."}` : 
             "No activity data available for yesterday."}
          </p>
        </section>

        {/* WHAT YOU WERE GIVEN */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What you were given</h3>
          <ul className="space-y-1.5 text-sm text-slate-800">
            <li className="flex items-center gap-2">○ <span>Store Safety & PPE</span></li>
            <li className="flex items-center gap-2">○ <span>Scanner Basics</span></li>
          </ul>
        </section>

        {/* WHAT YOU COMPLETED */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What you completed</h3>
          <ul className="space-y-1.5 text-sm text-slate-800">
            {completedModules > 0 ? (
              <li className="flex items-center gap-2">✓ <span>Onboarding modules</span></li>
            ) : (
              <li className="text-slate-400 italic">No modules completed yesterday.</li>
            )}
          </ul>
        </section>

        {/* WHAT YOU LEARNED */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What you learned</h3>
          <p className="text-sm text-slate-700">
            {isAccuracyRed === false ? "You demonstrated consistent accuracy in your picking." : "Continue focusing on item verification during picking."}
          </p>
        </section>

        {/* WHAT WENT WELL */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What went well</h3>
          <ul className="space-y-1 text-sm text-slate-800">
            <li className="flex items-center gap-2">✓ <span>Accuracy Rate: {yAccuracy}%</span></li>
          </ul>
        </section>

        {/* NEEDS MORE PRACTICE */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-2">Needs more practice</h3>
          <p className="text-sm text-slate-800 font-medium">Picking pace</p>
          <p className="text-sm text-slate-600 mt-0.5">Your pace is developing. Keep focusing on the picking sequence today.</p>
        </section>

        {/* YOUR GOALS FOR DAY 10 */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your goals for Day 10</h3>
          <p className="text-[10px] text-slate-400 mb-3 uppercase tracking-wide">Things to demonstrate before ramp-up</p>
          <ul className="space-y-2 text-sm text-slate-800">
            <li className="flex items-center gap-2">✓ <span>Safety & process compliance</span></li>
            <li className="flex items-center gap-2">○ <span>Picking pace: {yActualPace}/hr → target 50/hr</span></li>
          </ul>
        </section>

        {/* YOUR LEARNING */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your learning</h3>
          <div className="flex gap-2">
            <div className="flex-1 h-1.5 bg-purple-600 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full"></div>
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full"></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
            <span>Learn</span>
            <span>Practice</span>
            <span>Apply</span>
          </div>
        </section>

        {/* TODAY’S FOCUS */}
        <section className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">Today's Focus</h3>
          <p className="text-sm text-purple-900 font-medium">Improve picking speed while maintaining accuracy.</p>
        </section>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          {isHindi ? "बंद करें" : "Continue"}
        </button>
      </div>
    </div>
  );
};
