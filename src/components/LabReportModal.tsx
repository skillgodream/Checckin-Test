import React from "react";
import {
  X,
  Calendar,
  TrendingUp,
  ShieldCheck,
  Package,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Wrench,
  Clock,
  Sparkles,
  Target,
  ArrowRight,
  GraduationCap,
  FlaskConical,
} from "lucide-react";
import { NewHire, DayRecord, DARK_STORE_CAPABILITIES } from "../types";

interface LabReportModalProps {
  newHire: NewHire;
  currentDay: number;
  isHindi?: boolean;
  onClose: () => void;
  onOpenWorkTools?: () => void;
  onOpenModules?: () => void;
  onOpenBuddy?: () => void;
}

export const LabReportModal: React.FC<LabReportModalProps> = ({
  newHire,
  currentDay,
  isHindi = false,
  onClose,
  onOpenWorkTools,
  onOpenModules,
  onOpenBuddy,
}) => {
  const yesterdayNumber = Math.max(1, currentDay - 1);
  const isFirstDay = currentDay === 1;

  const yesterdayRecord: DayRecord | undefined = isFirstDay
    ? undefined
    : newHire.daysHistory.find((d) => d.dayNumber === yesterdayNumber) ||
      newHire.daysHistory.filter((d) => d.dayNumber < currentDay).pop();

  const buddyName = newHire.buddy.split(" ")[0];
  const supervisorName = newHire.supervisor.split(" ")[0];

  // Work metrics
  const prevWork = yesterdayRecord?.workSignal;
  const actualPace = prevWork?.actualPickRate ?? (isFirstDay ? 20 : 32);
  const targetPace = prevWork?.targetPickRate ?? (isFirstDay ? 25 : 35);
  const paceDiff = actualPace - targetPace;
  const accuracy = prevWork?.accuracyRate ?? 99;
  const ordersCompleted = prevWork?.ordersCompleted ?? (isFirstDay ? 15 : 38);
  const targetOrders = prevWork?.targetOrders ?? (isFirstDay ? 20 : 42);

  const prevDailySignal = yesterdayRecord?.dailySignal;
  const prevManagerSignal = yesterdayRecord?.managerSignal;
  const prevActionOutcome = yesterdayRecord?.actionOutcome;

  // Good/Bad status
  const isShiftGood =
    prevActionOutcome?.improved === "yes" || (actualPace >= targetPace && accuracy >= 98);

  // LMS modules snapshot
  const totalModules = 10;
  const completedCount = newHire.completedModuleIds?.length ?? 0;
  const quizAvg = newHire.quizAverageScore ?? 94;

  // Identify next capabilities to learn
  const nextCapabilities = DARK_STORE_CAPABILITIES.filter(cap => {
    const state = newHire.capabilities?.[cap.id];
    const isMastered = state?.mastery === "mastered" || state?.mastery === "proficient";
    const prerequisitesMet = cap.prerequisites.every(preId => 
      newHire.capabilities?.[preId]?.mastery === "mastered" || newHire.capabilities?.[preId]?.mastery === "proficient"
    );
    return !isMastered && prerequisitesMet;
  }).slice(0, 2);

  const trainingScore = Math.min(100, Math.round(((completedCount / totalModules) * 50 + (quizAvg / 100) * 50)));
  const speedScore = Math.min(100, Math.round((actualPace / targetPace) * 100));
  const accuracyScore = Math.min(100, Math.round(accuracy));
  const ordersScore = Math.min(100, Math.round((ordersCompleted / targetOrders) * 100));

  const compositeScore = Math.round(
    trainingScore * 0.25 + speedScore * 0.30 + accuracyScore * 0.30 + ordersScore * 0.15
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-slate-50 rounded-[32px] max-w-lg w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        
        {/* 1. MODAL HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-600 flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {isHindi ? "लैब रिपोर्ट" : "Lab Report"}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isHindi ? `Day ${yesterdayNumber} · ${newHire.roleTitle}` : `Day ${yesterdayNumber} · ${newHire.roleTitle}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* YOUR DAY */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your Day</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
            {yesterdayRecord?.workSignal ? 
             `You fulfilled ${yesterdayRecord.workSignal.ordersCompleted ?? "no"} orders with an accuracy of ${yesterdayRecord.workSignal.accuracyRate ?? "N/A"}%. ${yesterdayRecord.workSignal.actualPickRate && yesterdayRecord.workSignal.targetPickRate ? (yesterdayRecord.workSignal.actualPickRate < yesterdayRecord.workSignal.targetPickRate ? "Your picking pace is still developing." : "Your picking pace was consistent.") : "Picking pace data was not recorded for this shift."}` : 
             "No activity data was recorded for yesterday."}
          </p>
        </section>

        {/* WHAT YOU WERE GIVEN */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What you were given</h3>
          <ul className="space-y-1.5 text-sm text-slate-800">
            <li className="flex items-center gap-2">○ <span>Store Safety & PPE</span></li>
            <li className="flex items-center gap-2">○ <span>Scanner Basics</span></li>
            <li className="flex items-center gap-2">○ <span>Aisle Navigation Practice</span></li>
          </ul>
        </section>

        {/* WHAT YOU COMPLETED */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What you completed</h3>
          <ul className="space-y-1.5 text-sm text-slate-800">
            {completedCount > 0 ? (
              <li className="flex items-center gap-2">✓ <span>{completedCount} onboarding modules</span></li>
            ) : (
              <li className="text-slate-400 italic">No training modules completed.</li>
            )}
            {ordersCompleted > 0 && <li className="flex items-center gap-2">✓ <span>Floor picking shift</span></li>}
          </ul>
        </section>

        {/* WHAT YOU LEARNED */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What you learned</h3>
          <p className="text-sm text-slate-700">
            {accuracy >= 98 ? "You demonstrated consistent accuracy and scanner proficiency in your picking." : "Continue focusing on item verification and reducing scan errors."}
          </p>
        </section>

        {/* WHAT WENT WELL */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">What went well</h3>
          <ul className="space-y-1 text-sm text-slate-800">
            <li className="flex items-center gap-2">✓ <span>Accuracy Rate: {accuracy}%</span></li>
            {ordersCompleted > 0 && <li className="flex items-center gap-2">✓ <span>Orders fulfilled: {ordersCompleted}</span></li>}
            <li className="flex items-center gap-2">✓ <span>Consistent shift attendance</span></li>
          </ul>
        </section>

        {/* NEEDS MORE PRACTICE */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 mb-2">Needs more practice</h3>
          <p className="text-sm text-slate-800 font-medium">Picking pace & path navigation</p>
          <p className="text-sm text-slate-600 mt-0.5">Your pace is developing. Keep focusing on optimizing your aisle navigation to improve speed.</p>
        </section>

        {/* YOUR GOALS FOR DAY 10 */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your goals for Day 10</h3>
          <p className="text-[10px] text-slate-400 mb-3 uppercase tracking-wide">Things to demonstrate before ramp-up</p>
          <div className="space-y-2 text-sm text-slate-800">
            <div className="flex items-center justify-between">
              <span>Core job skills</span>
              <span className="text-emerald-600 font-bold">✓ Met</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Picking pace ({actualPace}/hr)</span>
              <span className="text-amber-600 font-bold">○ Target {targetPace}/hr</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Accuracy ({accuracy}%)</span>
              <span className="text-emerald-600 font-bold">✓ Met</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Independent work</span>
              <span className="text-emerald-600 font-bold">✓ Met</span>
            </div>
          </div>
        </section>

        {/* YOUR LEARNING STAGE */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your learning</h3>
          <div className="flex gap-2">
            <div className={`flex-1 h-1.5 rounded-full ${newHire.capabilities && Object.values(newHire.capabilities).some((c: any) => c.exposure === "reinforced") ? "bg-purple-600" : "bg-slate-200"}`}></div>
            <div className={`flex-1 h-1.5 rounded-full ${newHire.capabilities && Object.values(newHire.capabilities).some((c: any) => c.exposure === "reinforced") ? "bg-purple-600" : "bg-slate-200"}`}></div>
            <div className={`flex-1 h-1.5 rounded-full ${newHire.capabilities && Object.values(newHire.capabilities).some((c: any) => c.mastery === "mastered") ? "bg-purple-600" : "bg-slate-200"}`}></div>
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

        {/* SKILLS & MODULES TO COMPLETE */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-2">Remaining Skills to Master</h3>
          <ul className="space-y-2 text-sm text-slate-800">
            {DARK_STORE_CAPABILITIES.filter(cap => 
              newHire.capabilities?.[cap.id]?.mastery !== "mastered" && 
              newHire.capabilities?.[cap.id]?.mastery !== "proficient"
            ).length > 0 ? DARK_STORE_CAPABILITIES.filter(cap => 
              newHire.capabilities?.[cap.id]?.mastery !== "mastered" && 
              newHire.capabilities?.[cap.id]?.mastery !== "proficient"
            ).map(cap => (
              <li key={cap.id} className="flex items-start gap-2">
                <span className="text-purple-600">○</span> 
                <span>{cap.name}</span>
              </li>
            )) : (
              <li className="text-slate-500 italic">All skills mastered! Great work!</li>
            )}
          </ul>
        </section>

        {/* Footer */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
        >
          {isHindi ? "बंद करें" : "Continue"}
        </button>

      </div>
    </div>
  );
};
