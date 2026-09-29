import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  Sparkles,
  CheckCircle2,
  Play,
  ArrowRight,
  Clock,
  Languages,
  Check,
  Stethoscope,
  Pencil,
  BookOpen,
  ListTodo,
  X,
  Target,
  UserCheck,
  Activity,
  Radio,
  TrendingUp,
  Bell,
  AlertCircle,
  XCircle,
  Volume2,
  VolumeX,
  Users,
  PackageCheck,
  Lightbulb,
  ShieldCheck,
  MessageSquare,
  FlaskConical,
  Layers,
} from "lucide-react";
import { NewHire, TrainingModule, DayRecord, DARK_STORE_CAPABILITIES } from "../types";
import { MANDATORY_TRAINING_MODULES } from "../data/modulesData";
import { LearnerSection } from "../types";
import { CoordinateNavigationModuleView } from "./CoordinateNavigationModuleView";

interface TodaysGoalLandingViewProps {
  newHire: NewHire;
  currentDay: number;
  isHindi?: boolean;
  onToggleLanguage?: () => void;
  onBack: () => void;
  onSelectSection?: (section: LearnerSection) => void;
  onUpdateHire?: (updatedHire: NewHire) => void;
  onOpenBuddy?: () => void;
  onSelectModuleWithId?: (modId: string) => void;
  onSelectFloorTask?: (modalType: "buddy" | "scanner" | "work" | "target" | "map") => void;
  onOpenLabReport?: () => void;
}

interface CustomModule extends TrainingModule {
  rxReason?: string;
  rxReasonHi?: string;
}

interface CustomTask {
  id: string;
  title: string;
  category: string;
  duration: string;
  detailsEn: string;
  detailsHi: string;
}

export const TodaysGoalLandingView: React.FC<TodaysGoalLandingViewProps> = ({
  newHire,
  currentDay,
  isHindi = false,
  onToggleLanguage,
  onBack,
  onSelectSection,
  onUpdateHire,
  onOpenBuddy,
  onSelectModuleWithId,
  onSelectFloorTask,
  onOpenLabReport,
}) => {
  // Popup detail modals state
  const [activeModule, setActiveModule] = useState<CustomModule | null>(null);
  const [activeTask, setActiveTask] = useState<CustomTask | null>(null);

  // Switcher to view 3 different visual concepts live
  const [activeConcept, setActiveConcept] = useState<"option1" | "option2" | "option3">("option1");
  // Interactive mini-map layer selection for Option 2
  const [mapHeatmapLayer, setMapHeatmapLayer] = useState<"speed" | "accuracy" | "qc">("speed");

  // Interactive task completion state
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({
    task_1: true,
  });

  // Screenshot-accurate interactive checklist tasks state representing 11 total subtasks
  const [screenshotTasks, setScreenshotTasks] = useState([
    {
      id: "aisle_walk",
      title: "Aisle 4-8 physical walk",
      badge: "MAP WALK",
      subtext: "Review physical shelf heights and label alignment.",
      expanded: true, // starts expanded as shown in the screenshot
      items: [
        { id: "aisle_1", label: "Verify bin coordinates align with PDA guidelines", completed: false },
        { id: "aisle_2", label: "Trace vertical level labels (Levels 1 to 5) in Aisles 4-8", completed: false },
        { id: "aisle_3", label: "Confirm floor barcode integrity with Buddy Vikram", completed: false },
      ]
    },
    {
      id: "pick_50",
      title: "Pick 50 orders via ring scanner",
      badge: "SCANNER",
      subtext: "Pick with 0 mis-scans using wearable scanner.",
      expanded: false,
      items: [
        { id: "pick_1", label: "Equip ring wearable scanner and pair with PDA", completed: false },
        { id: "pick_2", label: "Aisle 4 traversal verification check", completed: false },
        { id: "pick_3", label: "Validate barcode response chimes", completed: false },
      ]
    },
    {
      id: "drills",
      title: "Active Floor Drills & Traversal SOP",
      badge: "DRILLS",
      subtext: "Demonstrate layout flow pacing benchmarks.",
      expanded: false,
      items: [
        { id: "drill_1", label: "Complete 1 segment simulation task", completed: false },
        { id: "drill_2", label: "Review floor dispatch routing instructions", completed: false },
        { id: "drill_3", label: "Maintain 100% correct barcode scanning scans", completed: false },
        { id: "drill_4", label: "LMS lesson variant verification test pass", completed: false },
        { id: "drill_5", label: "Audit 3 random packaging variants with supervisor", completed: false },
      ]
    }
  ]);

  const totalScreenshotItems = useMemo(() => {
    return screenshotTasks.reduce((acc, t) => acc + t.items.length, 0);
  }, [screenshotTasks]);

  const completedScreenshotItems = useMemo(() => {
    return screenshotTasks.reduce((acc, t) => acc + t.items.filter(i => i.completed).length, 0);
  }, [screenshotTasks]);

  const toggleSubItem = (taskId: string, subItemId: string) => {
    setScreenshotTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            items: task.items.map(item => {
              if (item.id === subItemId) {
                return { ...item, completed: !item.completed };
              }
              return item;
            })
          };
        }
        return task;
      })
    );
  };

  const markAllDone = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScreenshotTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            items: task.items.map(item => ({ ...item, completed: true }))
          };
        }
        return task;
      })
    );
  };

  const toggleExpandTask = (taskId: string) => {
    setScreenshotTasks(prev =>
      prev.map(task => {
        if (task.id === taskId) {
          return { ...task, expanded: !task.expanded };
        }
        return task;
      })
    );
  };

  const toggleTaskCompletion = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  // Metric popup state: "speed" | "accuracy" | "qc" | null
  const [activeMetricModal, setActiveMetricModal] = useState<"speed" | "accuracy" | "qc" | null>(null);

  // Today's shift focus checklist items
  const [completedFocusItems, setCompletedFocusItems] = useState<Record<string, boolean>>({
    lesson: false,
    weight: false,
    chime: false,
    speed: false,
    acc: false,
  });

  // Tab mode for shift goal cards: "what" (Targets) | "why" (Do Now) | "how" (Tips & Buddy)
  const [activeGoalTab, setActiveGoalTab] = useState<"what" | "why" | "how">("what");
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const handlePlayAudioTip = (textToSpeak: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = isHindi ? "hi-IN" : "en-IN";
      utterance.rate = 0.92;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      setIsPlayingAudio(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Expandable sections state (Prescribed training & Required floor actions)
  const [isPrescribedExpanded, setIsPrescribedExpanded] = useState<boolean>(true);
  const [isFloorActionsExpanded, setIsFloorActionsExpanded] = useState<boolean>(true);
  const [isShiftFocusExpanded, setIsShiftFocusExpanded] = useState<boolean>(false);
  const [isRxAlertActive, setIsRxAlertActive] = useState<boolean>(true);
  const [isDiagnosisNotesOpen, setIsDiagnosisNotesOpen] = useState<boolean>(false);
  const [isTodaysActivityModalOpen, setIsTodaysActivityModalOpen] = useState<boolean>(false);
  const [isEodSimulation, setIsEodSimulation] = useState<boolean>(false);
  const [isPlayingVideoModal, setIsPlayingVideoModal] = useState<boolean>(false);

  // Live floor performance data
  const currentRecord = (newHire?.daysHistory || []).find((d) => d.dayNumber === currentDay) || {
    dayNumber: currentDay,
  };

  const actualPickRate = currentRecord.workSignal?.actualPickRate;
  const targetPickRate = currentRecord.workSignal?.targetPickRate;
  const accuracyRate = currentRecord.workSignal?.accuracyRate;

  // Authoritative live career readiness score calculation
  const baseReadiness =
    (typeof newHire.overallReadinessScore === "number" ? (newHire.overallReadinessScore <= 1 ? Math.round(newHire.overallReadinessScore * 100) : Math.round(newHire.overallReadinessScore)) : 0);

  const tasksBonus = Object.values(completedTaskIds).filter(Boolean).length * 2;
  const liveReadinessPct = baseReadiness;

  // Today's shift performance / daily progress score matching Home page
  const completedCount = newHire.completedModuleIds?.length ?? 0;
  const totalActivities = 20;
  const quizAvg = newHire.quizAverageScore ?? 94;
  const ordersCompleted = currentRecord.workSignal?.ordersCompleted ?? 0;
  const targetOrders = currentRecord.workSignal?.targetOrders ?? 0;
  const trainingScore = Math.min(100, Math.round(((completedCount / 10) * 50 + (quizAvg / 100) * 50)));
  const speedScore = actualPickRate && targetPickRate ? Math.min(100, Math.round((actualPickRate / targetPickRate) * 100)) : 100;
  const accuracyScore = accuracyRate != null ? Math.min(100, Math.round(accuracyRate)) : 100;
  const ordersScore = targetOrders > 0 ? Math.min(100, Math.round((ordersCompleted / targetOrders) * 100)) : 100;
  const dailyShiftProgress = Math.round(
    trainingScore * 0.25 + speedScore * 0.30 + accuracyScore * 0.30 + ordersScore * 0.15
  );

  // Yesterday's record & composite score calculation
  const yesterdayNumber = Math.max(1, currentDay - 1);
  const isFirstDay = currentDay === 1;
  const yesterdayRecord: DayRecord | undefined = isFirstDay
    ? undefined
    : (newHire?.daysHistory || []).find((d) => d.dayNumber === yesterdayNumber) ||
      (newHire?.daysHistory || []).filter((d) => d.dayNumber < currentDay).pop();

  const prevWork = yesterdayRecord?.workSignal;
  const yestActualPace = prevWork?.actualPickRate ?? (isFirstDay ? 20 : 32);
  const yestTargetPace = prevWork?.targetPickRate ?? (isFirstDay ? 25 : 35);
  const yestAccuracy = prevWork?.accuracyRate ?? 99;
  const yestOrders = prevWork?.ordersCompleted ?? (isFirstDay ? 15 : 38);
  const yestTargetOrders = prevWork?.targetOrders ?? (isFirstDay ? 20 : 42);

  const yestSpeedScore = Math.min(100, Math.round((yestActualPace / yestTargetPace) * 100));
  const yestAccuracyScore = Math.min(100, Math.round(yestAccuracy));
  const yestOrdersScore = Math.min(100, Math.round((yestOrders / yestTargetOrders) * 100));
  const yesterdayScore = Math.round(
    trainingScore * 0.25 + yestSpeedScore * 0.30 + yestAccuracyScore * 0.30 + yestOrdersScore * 0.15
  );

  // Always display Present Day Performance on hero banner
  const displayedPercentage = dailyShiftProgress;
  const dialUnit = isHindi ? "% दैनिक लक्ष्य" : "% Day Goal";
  const dialSubtext = isHindi ? "आज का दैनिक प्रगति स्कोर" : "Present Day Performance";
  const dialBadgeText = dailyShiftProgress >= 75 ? (isHindi ? "लक्ष्य पर" : "On Track") : (isHindi ? "प्रगति में" : "Ramping Steady");

  // Radial dial calculations matching Telemetry
  const radius = 78;
  const circumference = 2 * Math.PI * radius; // ~490.09
  // Progress arc curves clockwise up to 72.8% of circle (from 12 o'clock to ~8:45)
  const arcPercentage = Math.min(0.728, Math.max(0.05, (displayedPercentage / 100) * 0.728));
  const strokeDashoffset = circumference * (1 - arcPercentage);

  const recAction = (currentRecord as any).recommendedAction || (newHire as any).recommendedAction;
  const actionOutcome = (currentRecord as any).actionOutcome;

  let longitudinalContext: { category: string; evidence: string } | null = null;
  const patternDiagnosis = (currentRecord as any).identifiedPattern?.diagnosis;
  if (patternDiagnosis) {
    const match = patternDiagnosis.match(/\|\s*Longitudinal Pattern\s*\((.*?)\):\s*(.*)/);
    if (match) {
      longitudinalContext = {
        category: match[1],
        evidence: match[2],
      };
    }
  }

  // Concise Doctor's suggestion for today
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);

  // Today's assigned/prescribed modules:
  // 1. Scheduled curriculum module for the current day
  // 2. Targeted micro-learning module for the recommended capability intervention (if any)
  const targetCapId = (recAction && recAction.targetCapabilityId) || newHire.currentCapabilityId;
  const targetCapability = DARK_STORE_CAPABILITIES.find(c => c.id === targetCapId);
  const scheduledCandidateModule = MANDATORY_TRAINING_MODULES.find(m => m.dayNumber === currentDay);
  
  // DEAN Authority check: Is DEAN re-prioritizing an actual telemetry intervention over the scheduled candidate module?
  const isDeanInterventionActive = Boolean(
    recAction && 
    recAction.targetCapabilityId && 
    scheduledCandidateModule && 
    !scheduledCandidateModule.mappedCapabilityIds.includes(recAction.targetCapabilityId) &&
    recAction.decisionType !== "advance_default" &&
    recAction.decisionType !== "no_action_monitor"
  );
  
  const todaysPrescribedModules: CustomModule[] = useMemo(() => {
    const modulesMap = new Map<string, CustomModule>();

    // 1. Add targeted module for DEAN's actual priority capability
    if (targetCapId) {
      const mappedModules = MANDATORY_TRAINING_MODULES.filter(m => 
        m.mappedCapabilityIds.includes(targetCapId)
      );
      mappedModules.forEach(m => modulesMap.set(m.id, { ...m }));
    }

    // 2. If no target capability module exists, fall back to scheduled day module
    if (modulesMap.size === 0 && scheduledCandidateModule) {
      modulesMap.set(scheduledCandidateModule.id, { ...scheduledCandidateModule });
    }

    return Array.from(modulesMap.values());
  }, [currentDay, targetCapId, scheduledCandidateModule]);

  const unmasteredCaps = useMemo(() => {
    return DARK_STORE_CAPABILITIES.filter((cap) => {
      if (cap.id === 20) return false;
      if (cap.id === targetCapId) return false;
      const state = newHire?.capabilities?.[cap.id];
      return !state || state.mastery !== "proficient";
    }).sort((a, b) => a.defaultOrder - b.defaultOrder);
  }, [newHire?.capabilities, targetCapId]);

  const predictivePath = useMemo(() => {
    const path = [];
    let capIndex = 0;
    for (let d = currentDay + 1; d <= 10; d++) {
      if (d === 4) {
        path.push({ day: 4, isCheckpoint: true, checkpointName: "Pit Stop #1", checkpointDesc: "Early trajectory check" });
      } else if (d === 8) {
        path.push({ day: 8, isCheckpoint: true, checkpointName: "Pit Stop #2", checkpointDesc: "Final trajectory correction" });
      } else if (d === 10) {
        path.push({ day: 10, isCheckpoint: true, checkpointName: "Final Commercial Readiness Gate", checkpointDesc: "Commercial readiness decision" });
      } else if (capIndex < unmasteredCaps.length) {
        path.push({ day: d, cap: unmasteredCaps[capIndex] });
        capIndex++;
      } else {
        path.push({ day: d, cap: null });
      }
    }
    return path;
  }, [currentDay, unmasteredCaps]);

  const doctorDiagnosis = recAction
    ? (recAction.whyThisAction || recAction.rationale || recAction.title)
    : "No current intervention required. Follow standard floor operations.";


  // Today's floor tasks with rich details for popups
  const todaysTasks: CustomTask[] = [];
  if (recAction) {
    todaysTasks.push({
      id: recAction.id,
      title: recAction.title,
      category: recAction.targetActor || "Floor Task",
      duration: recAction.smallestPracticalStep || "15 min",
      detailsEn: recAction.description,
      detailsHi: recAction.description,
    });
  }

  // 1. LMS tasks metrics for today
  const hasAssignedLms = todaysPrescribedModules.length > 0;
  const todayLmsTotal = todaysPrescribedModules.length;
  const todayLmsCompleted = hasAssignedLms
    ? todaysPrescribedModules.filter((m) => (newHire.completedModuleIds || []).includes(m.id)).length
    : 0;
  const completedModulesCount = (newHire.completedModuleIds || []).length;
  const lmsProgressPct = !hasAssignedLms
    ? 100
    : Math.min(100, Math.round((todayLmsCompleted / todayLmsTotal) * 100));

  // 2. Activity tasks metrics for today
  const totalActivityTasks = Math.max(1, (todaysTasks.length > 0 ? todaysTasks.length : 1) + 2); // Prescribed floor action + standard floor checks
  const completedActivityTasks = Math.min(totalActivityTasks, Object.values(completedTaskIds).filter(Boolean).length);
  const activityProgressPct = Math.min(100, Math.round((completedActivityTasks / totalActivityTasks) * 100));

  // Combined overall completion for today
  const overallTodayCompletionPct = !hasAssignedLms
    ? activityProgressPct
    : Math.round((lmsProgressPct + activityProgressPct) / 2);

  const handleStartModule = (modId: string) => {
    setActiveModule(null);
    if (onSelectModuleWithId) {
      onSelectModuleWithId(modId);
    } else if (onSelectSection) {
      onSelectSection("modules");
    }
  };

  const handleOpenTaskDestination = (taskId: string, taskCategory: string) => {
    setActiveTask(null);
    if (onSelectFloorTask) {
      if (taskId === "task_1") {
        onSelectFloorTask("map");
      } else if (taskId === "task_2") {
        onSelectFloorTask("scanner");
      } else if (taskId === "task_3") {
        onSelectFloorTask("work");
      } else if (taskId === "task_4") {
        onSelectFloorTask("target");
      } else {
        onSelectFloorTask("work");
      }
    } else if (onSelectSection) {
      onSelectSection("dial");
    }
  };

  return (
    <div className="w-full pb-28 pt-2 px-3 sm:px-4 select-none min-h-screen bg-[#EBEAE5] text-stone-900 relative font-sans antialiased overflow-x-hidden">
      {/* Soft Ambient Background Glow Orbs for Glass Reflection */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 -left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-80 -right-10 w-80 h-80 bg-rose-400/10 rounded-full blur-3xl" />
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <div className="max-w-md mx-auto space-y-3 relative z-10">
        {/* TOP HEADER CARD: Check-in Checkout Style Header Block */}
        <div
          id="telemetry-top-header-card"
          className="bg-white rounded-[28px] p-4 flex items-center justify-between shadow-xs border border-black/[0.03] mt-2 animate-in slide-in-from-top duration-200"
        >
          {/* Left: Back Button & Store / Title Info */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-2xl bg-[#18181B] text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-neutral-800 transition-colors cursor-pointer"
              title={isHindi ? "वापस जाएं" : "Back"}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.8]" />
            </button>

            <div>
              <h2 className="text-[14.5px] sm:text-[15px] font-bold text-[#18181B] leading-tight">
                {isHindi ? "आज का लक्ष्य" : "Today's Goal"}
              </h2>
            </div>
          </div>

          {/* Right: Pill Language Switcher matching Telemetry Header perfectly */}
          {onToggleLanguage ? (
            <div className="bg-[#E5E4DE] rounded-full p-0.5 flex items-center">
              <button
                type="button"
                onClick={() => isHindi && onToggleLanguage()}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  !isHindi
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-[#716F68] hover:text-[#18181B]"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => !isHindi && onToggleLanguage()}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                  isHindi
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "text-[#716F68] hover:text-[#18181B]"
                }`}
              >
                हिंदी
              </button>
            </div>
          ) : (
            <div className="bg-[#E5E4DE] rounded-full p-0.5 flex items-center">
              <span className="bg-[#18181B] text-white rounded-full px-3 py-1 text-xs font-bold">
                EN
              </span>
            </div>
          )}
        </div>

        {/* COMPACT TELEMETRY STATUS HUD (OPTION 1) */}
        <div
          id="telemetry-status-hud-card"
          className="bg-white text-stone-900 border border-black/[0.04] rounded-[28px] p-5 shadow-xs select-none relative overflow-hidden transition-all animate-in slide-in-from-top duration-300"
        >
          {/* Top Row: Mini-Metric Buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Speed segment */}
            <button
              type="button"
              onClick={() => setActiveMetricModal("speed")}
              title={isHindi ? "पिक स्पीड देखें" : "View Live Pick Speed"}
              className="flex flex-col items-center justify-center flex-1 py-2.5 px-1 bg-[#F4F3EE] hover:bg-stone-200 rounded-2xl border border-black/[0.02] text-center transition-colors shrink-0 cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-1">
                <Zap className="w-4 h-4 fill-current" />
              </div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#716F68] truncate w-full">SPEED</span>
              <span className="text-[13px] font-black text-[#18181B] mt-0.5">34 / 45 IPH</span>
            </button>

            {/* Accuracy segment */}
            <button
              type="button"
              onClick={() => setActiveMetricModal("accuracy")}
              title={isHindi ? "सटीकता देखें" : "View Live Accuracy"}
              className="flex flex-col items-center justify-center flex-1 py-2.5 px-1 bg-[#F4F3EE] hover:bg-stone-200 rounded-2xl border border-black/[0.02] text-center transition-colors shrink-0 cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-1">
                <Target className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#716F68] truncate w-full">ACCURACY</span>
              <span className="text-[13px] font-black text-[#18181B] mt-0.5">98.5% ACC</span>
            </button>

            {/* LMS Progress segment */}
            <button
              type="button"
              className="flex flex-col items-center justify-center flex-1 py-2.5 px-1 bg-[#F4F3EE] hover:bg-stone-200 rounded-2xl border border-black/[0.02] text-center transition-colors shrink-0 cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-1">
                <BookOpen className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#716F68] truncate w-full">LMS STATUS</span>
              <span className="text-[13px] font-black text-[#18181B] mt-0.5">83% DONE</span>
            </button>
          </div>

          {/* Bottom Segment: Live Progress Bars (actual / live) */}
          <div className="mt-4 pt-3.5 border-t border-black/5 space-y-3">
            {/* LMS Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-extrabold tracking-wide text-stone-700 leading-none">
                <span>LMS PROGRESS (ACTUAL)</span>
                <span className="font-bold text-[#18181B]">{!hasAssignedLms ? "100" : lmsProgressPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#E5E4DE] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 shadow-3xs transition-all duration-500"
                  style={{ width: `${!hasAssignedLms ? 100 : lmsProgressPct}%` }}
                />
              </div>
            </div>

            {/* Floor Activities Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-extrabold tracking-wide text-stone-700 leading-none">
                <span>ACTIVITY PROGRESS (LIVE)</span>
                <span className="font-bold text-[#18181B]">{activityProgressPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#E5E4DE] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#18181B] shadow-3xs transition-all duration-500"
                  style={{ width: `${activityProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Video SOP Card - rest of the text removed */}
        <div
          id="telemetry-terminal-sync-card"
          className="bg-white rounded-[24px] sm:rounded-[26px] p-3.5 sm:p-4 flex items-center justify-between shadow-xs border border-black/[0.03] cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsPlayingVideoModal(true)}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#F4F3EE] flex items-center justify-center text-[#18181B] shrink-0">
              <Radio className="w-5 h-5 stroke-[2.2] text-[#18181B] animate-pulse" />
            </div>
            <div>
              <h3 className="text-[14.5px] sm:text-[15px] font-black text-[#18181B] leading-none">
                {isHindi ? "आज का LMS वीडियो" : "Today's LMS Video"}
              </h3>
            </div>
          </div>

          {/* WATCH Button */}
          <button
            type="button"
            className="px-4 py-2 bg-[#18181B] hover:bg-neutral-800 text-white font-black text-xs rounded-full uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Play className="w-3 h-3 fill-white text-white" />
            <span>{isHindi ? "देखें" : "WATCH"}</span>
          </button>
        </div>

        {/* SECTION 3: TODAY'S SHIFT FOCUS (REIMAGINED AS 2X2 TELEMETRY ZONE-STYLE WHITE GRID CARDS) */}
        <div id="what-why-how-tab-container" className="space-y-3">
          <div className="bg-transparent text-stone-900 transition-all duration-300">
            {/* 2x2 Grid of 4 Focus Cards matching Telemetry Card Style Exactly */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Card 1: LMS Floor Training */}
              <div
                onClick={() => setCompletedFocusItems(prev => ({ ...prev, lesson: !prev.lesson }))}
                className="rounded-[24px] sm:rounded-[26px] p-4 flex flex-col justify-between min-h-[145px] sm:min-h-[150px] shadow-xs cursor-pointer transition-all active:scale-98 bg-white text-stone-900 border border-black/[0.03] hover:bg-stone-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-2xl bg-[#F4F3EE] text-[#18181B] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    completedFocusItems.lesson ? "bg-[#18181B] border-[#18181B] text-white" : "border-slate-300 bg-white text-transparent"
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className={`text-[14.5px] sm:text-[15px] font-bold leading-tight text-[#18181B] ${completedFocusItems.lesson ? "line-through text-stone-400" : ""}`}>
                    {isHindi ? "फ़्लोर ट्रेनिंग" : "Floor Training"}
                  </h3>
                  <p className="text-xs font-normal mt-0.5 leading-tight text-[#8E8C85]">
                    {isHindi ? "SOP नियम सीखें" : "Variant SOP Rules"}
                  </p>
                </div>
              </div>

              {/* Card 2: Pack Weight */}
              <div
                onClick={() => setCompletedFocusItems(prev => ({ ...prev, weight: !prev.weight }))}
                className="rounded-[24px] sm:rounded-[26px] p-4 flex flex-col justify-between min-h-[145px] sm:min-h-[150px] shadow-xs cursor-pointer transition-all active:scale-98 bg-white text-stone-900 border border-black/[0.03] hover:bg-stone-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-2xl bg-[#F4F3EE] text-[#18181B] flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    completedFocusItems.weight ? "bg-[#18181B] border-[#18181B] text-white" : "border-slate-300 bg-white text-transparent"
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className={`text-[14.5px] sm:text-[15px] font-bold leading-tight text-[#18181B] ${completedFocusItems.weight ? "line-through text-stone-400" : ""}`}>
                    {isHindi ? "वजन सत्यापन" : "Verify Weight"}
                  </h3>
                  <p className="text-xs font-normal mt-0.5 leading-tight text-[#8E8C85]">
                    {isHindi ? "200g vs 500g मिलान" : "Confirm packet option"}
                  </p>
                </div>
              </div>

              {/* Card 3: Scanner chime */}
              <div
                onClick={() => setCompletedFocusItems(prev => ({ ...prev, chime: !prev.chime }))}
                className="rounded-[24px] sm:rounded-[26px] p-4 flex flex-col justify-between min-h-[145px] sm:min-h-[150px] shadow-xs cursor-pointer transition-all active:scale-98 bg-white text-stone-900 border border-black/[0.03] hover:bg-stone-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-2xl bg-[#F4F3EE] text-[#18181B] flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    completedFocusItems.chime ? "bg-[#18181B] border-[#18181B] text-white" : "border-slate-300 bg-white text-transparent"
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className={`text-[14.5px] sm:text-[15px] font-bold leading-tight text-[#18181B] ${completedFocusItems.chime ? "line-through text-stone-400" : ""}`}>
                    {isHindi ? "पुष्टि बीप सुनें" : "Scanner Chime"}
                  </h3>
                  <p className="text-xs font-normal mt-0.5 leading-tight text-[#8E8C85]">
                    {isHindi ? "एक ही ग्रीन बीप सुनें" : "Wait for single beep"}
                  </p>
                </div>
              </div>

              {/* Card 4: Hit speed target */}
              <div
                onClick={() => setCompletedFocusItems(prev => ({ ...prev, speed: !prev.speed }))}
                className="rounded-[24px] sm:rounded-[26px] p-4 flex flex-col justify-between min-h-[145px] sm:min-h-[150px] shadow-xs cursor-pointer transition-all active:scale-98 bg-white text-stone-900 border border-black/[0.03] hover:bg-stone-50"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-2xl bg-[#F4F3EE] text-[#18181B] flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    completedFocusItems.speed ? "bg-[#18181B] border-[#18181B] text-white" : "border-slate-300 bg-white text-transparent"
                  }`}>
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className={`text-[14.5px] sm:text-[15px] font-bold leading-tight text-[#18181B] ${completedFocusItems.speed ? "line-through text-stone-400" : ""}`}>
                    {isHindi ? "स्पीड लक्ष्य" : "Speed Target"}
                  </h3>
                  <p className="text-xs font-normal mt-0.5 leading-tight text-[#8E8C85]">
                    {isHindi ? "45+ आइटम प्रति घंटा" : "Aim for 45+ items/hr"}
                  </p>
                </div>
              </div>
            </div>

            {/* Today's Task Completion Progress Card - matching screenshot */}
            <div className="bg-[#F4F3EE] rounded-[24px] p-4 border border-black/[0.03] shadow-3xs space-y-2.5 mb-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-center text-xs sm:text-[13px] font-black text-[#18181B] uppercase tracking-wide">
                <span>{isHindi ? "आज के कार्य का समापन" : "Today's Task Completion"}</span>
                <span>{completedScreenshotItems} / {totalScreenshotItems} Completed</span>
              </div>
              <div className="w-full h-2 bg-[#ECEAE3] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#18181B] rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((completedScreenshotItems / totalScreenshotItems) * 100)}%` }}
                />
              </div>
            </div>

            {/* Interactive screenshot-accurate task card list */}
            <div className="space-y-3.5">
              {screenshotTasks.map((task) => {
                const isTaskAllDone = task.items.every((i) => i.completed);

                return (
                  <div
                    key={task.id}
                    onClick={() => toggleExpandTask(task.id)}
                    className="bg-white rounded-[28px] border border-black/[0.04] p-4 shadow-3xs relative overflow-hidden transition-all duration-300 text-left"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Check Circle Icon on left */}
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                            isTaskAllDone
                              ? "bg-[#18181B] text-white shadow-2xs"
                              : "border border-stone-300 bg-[#F4F3EE]/40 text-stone-400"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                        </div>

                        {/* Title and subtext */}
                        <div className="min-w-0 pt-0.5">
                          <h4 className="text-[14.5px] sm:text-[15px] font-black text-[#18181B] leading-tight truncate">
                            {isHindi && (task as any).titleHi ? (task as any).titleHi : task.title}
                          </h4>
                          <p className="text-[11.5px] text-[#8E8C85] font-semibold leading-normal mt-0.5 truncate">
                            {isHindi && (task as any).subtextHi ? (task as any).subtextHi : task.subtext}
                          </p>
                        </div>
                      </div>

                      {/* Badge on Right */}
                      <span className="bg-[#18181B] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0">
                        {task.badge}
                      </span>
                    </div>

                    {/* Collapsible Panel of Sub Checklist items */}
                    {task.expanded && (
                      <div className="mt-3.5 p-3 bg-[#F4F3EE]/40 border border-black/[0.02] rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                        <div className="space-y-2">
                          {task.items.map((item) => (
                            <div
                              key={item.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSubItem(task.id, item.id);
                              }}
                              className="bg-white border border-[#EBEAE5] rounded-[18px] p-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors duration-150"
                            >
                              {/* Custom premium checkbox */}
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                                  item.completed
                                    ? "bg-[#18181B] border-[#18181B] text-white animate-in zoom-in-75 duration-100"
                                    : "border-stone-300 bg-white"
                                }`}
                              >
                                {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>

                              <span
                                className={`text-[12.5px] font-bold leading-snug ${
                                  item.completed ? "line-through text-stone-400" : "text-stone-800"
                                }`}
                              >
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Mark All Done button aligned bottom right */}
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={(e) => markAllDone(task.id, e)}
                            className="px-4 py-2 bg-[#F4F3EE] hover:bg-[#EBEAE5] text-stone-800 font-extrabold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer active:scale-95 transition-all shadow-3xs"
                          >
                            {isHindi ? "सभी पूर्ण करें" : "Mark All Done"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 4: PREDICTIVE LEARNING PLAN (MATCHING SLEEK CARD STYLING) */}
        <div className="bg-[#161824]/95 backdrop-blur-md rounded-[24px] sm:rounded-[26px] border border-white/10 shadow-xl overflow-hidden transition-all duration-300 text-white">
          <button
            type="button"
            onClick={() => setIsPlanExpanded(!isPlanExpanded)}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer hover:bg-white/[0.04] transition-colors"
          >
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 block">
                {isHindi ? "भविष्य कहनेवाला योजना" : "PREDICTIVE LEARNING PLAN"}
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {isHindi ? "दिन 10 तक आपका रास्ता" : "Your path to Day 10"}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {isHindi ? "डीन का वर्तमान अपेक्षित मार्ग देखें" : "See Dean's current expected learning path"}
              </p>
            </div>
            <div className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 transition-transform duration-300 ${isPlanExpanded ? "rotate-180" : ""}`}>
              <ChevronDown className="w-4 h-4 stroke-[2.5]" />
            </div>
          </button>
          
          {isPlanExpanded && (
            <div className="px-4 pb-5 sm:px-5 border-t border-white/10 bg-[#161824]">
              <div className="pt-4 space-y-3.5 relative">
                {/* Vertical connecting line */}
                <div className="absolute left-3.5 top-7 bottom-4 w-0.5 bg-white/10 rounded-full" />
                
                {/* Current Day */}
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <span className="text-[9px] font-bold">●</span>
                  </div>
                  <div className="pt-0.5 pb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 block">
                      DAY {currentDay} • TODAY
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {targetCapability?.name || "Floor Operations"}
                    </h4>
                    <span className="text-xs text-slate-400 font-medium">Current focus</span>
                  </div>
                </div>

                {/* Projected Days */}
                {predictivePath.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative z-10">
                    {step.isCheckpoint ? (
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center shrink-0 shadow-xs">
                        <span className="text-xs font-black">★</span>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#1c1f2e] text-slate-400 flex items-center justify-center shrink-0 border border-white/10">
                        <span className="text-[9px]">○</span>
                      </div>
                    )}
                    <div className="pt-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${step.isCheckpoint ? 'text-amber-400' : 'text-slate-400'}`}>
                        DAY {step.day}
                      </span>
                      {step.isCheckpoint ? (
                        <>
                          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{step.checkpointName}</h4>
                          <span className="text-[11px] text-slate-300 font-medium">{step.checkpointDesc}</span>
                        </>
                      ) : step.cap ? (
                        <>
                          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{step.cap.name}</h4>
                          <span className="text-[11px] text-slate-400 font-medium">Expected next</span>
                        </>
                      ) : (
                        <>
                          <h4 className="text-xs sm:text-sm font-medium text-slate-400 italic leading-snug">Evaluating</h4>
                          <span className="text-[11px] text-slate-500 font-medium">Dean is evaluating your next step</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic text-center">
                  {isHindi ? "यह मार्ग आपके सीखने और काम करने के साथ अपडेट होता है।" : "This path updates as you learn and work."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* ========================================================= */}
      {/* 10. CONTROL TOWER VIEW: DEAN PRESCRIBED ACTIVITIES LIST   */}
      {/* ========================================================= */}
      {isTodaysActivityModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl relative animate-in slide-in-from-bottom duration-300 text-black">
            {/* Close button */}
            <button
              onClick={() => setIsTodaysActivityModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-black border border-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1 pr-8">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono">
                  {isHindi ? "ट्रेनिंग व्यू" : "Training View"}
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isHindi ? `दिन ${currentDay} निगरानी` : `Day ${currentDay} Monitor`}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-black leading-tight">
                {isHindi ? "आज की ट्रेनिंग" : "Today's Training"}
              </h2>
              <p className="text-[11px] text-slate-700 font-medium">
                {isHindi
                  ? "यह ट्रेनिंग अवलोकन है। यहां से कोई कार्रवाई या सबमिशन नहीं होता।"
                  : "Read-only training viewpoint. Displays all LMS sub-modules and floor tasks with shift tracking."}
              </p>
            </div>

            {/* EOD Simulation Toggle Switch */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isEodSimulation ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-black text-black block">
                    {isHindi ? "एंड-ऑफ-डे (EOD) सिमुलेशन" : "End-of-Day (EOD) Shift Simulation"}
                  </span>
                  <span className="text-[10px] text-slate-700 font-medium">
                    {isEodSimulation
                      ? (isHindi ? "अपूर्ण कार्य लाल (Red) दिखाए जा रहे हैं" : "Unfinished tasks flagged Red for EOD")
                      : (isHindi ? "सक्रिय शिफ्ट - अपूर्ण कार्य पीले (Amber)" : "Active shift - unfinished tasks in Amber")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEodSimulation(!isEodSimulation)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEodSimulation ? 'bg-red-600' : 'bg-slate-400'}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEodSimulation ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Flat Control Tower List of Prescribed LMS Modules and 5 Sub-Activities */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-black block">
                {isHindi ? "1. निर्धारित एलएमएस मॉड्यूल" : "1. LMS Modules"}
              </span>

              <div className="space-y-2">
                {todaysPrescribedModules.map((prescribedMod) => {
                  const fullModData = MANDATORY_TRAINING_MODULES.find((m) => m.id === prescribedMod.id) || prescribedMod;
                  const activities = fullModData.activities || [];

                  return (
                    <div key={prescribedMod.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-200 font-mono">
                            {prescribedMod.code}
                          </span>
                          <span className="text-xs font-black text-black">
                            {isHindi ? prescribedMod.titleHi : prescribedMod.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 font-mono">
                          {prescribedMod.durationMinutes}m
                        </span>
                      </div>

                      {/* Flat list of 5 sub-activities (No nested cards) */}
                      <div className="space-y-1.5 pl-1">
                        {activities.map((act, actIdx) => {
                          const isDone = act.completed;
                          const statusColor = isDone
                            ? "text-black bg-emerald-50 border-emerald-300"
                            : isEodSimulation
                            ? "text-black bg-red-50 border-red-300"
                            : "text-black bg-white border-slate-200";

                          return (
                            <div
                              key={act.id || actIdx}
                              className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-2 text-xs cursor-pointer hover:border-blue-300 transition-colors ${statusColor}`}
                              onClick={() => handleStartModule(prescribedMod.id)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isDone ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : isEodSimulation ? (
                                  <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                )}
                                <span className="font-bold text-black truncate">
                                  {actIdx + 1}. {isHindi ? (act.titleHi || act.title) : act.title}
                                </span>
                              </div>

                              <div className="shrink-0">
                                {isDone ? (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {isHindi ? "पूर्ण" : "DONE"}
                                  </span>
                                ) : isEodSimulation ? (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                                    {isHindi ? "अपूर्ण (लाल)" : "OVERDUE"}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                    {isHindi ? "लंबित" : "PENDING"}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flat Control Tower List of Floor Practice Tasks */}
            <div className="space-y-2.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-black block">
                {isHindi ? "2. फ्लोर अभ्यास और कार्य" : "2. Floor Practice Tasks"}
              </span>

              <div className="space-y-1.5">
                {todaysTasks.map((t) => {
                  const isDone = completedTaskIds[t.id];
                  const statusColor = isDone
                    ? "text-black bg-emerald-50 border-emerald-300"
                    : isEodSimulation
                    ? "text-black bg-red-50 border-red-300"
                    : "text-black bg-slate-50 border-slate-200";

                  return (
                    <div
                      key={t.id}
                      className={`px-3 py-2.5 rounded-lg border flex items-center justify-between gap-2 text-xs cursor-pointer hover:border-blue-300 transition-colors ${statusColor}`}
                      onClick={() => handleOpenTaskDestination(t.id, t.category)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : isEodSimulation ? (
                          <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span className="font-bold text-black truncate">{t.title}</span>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-[9px] text-slate-700 font-mono font-bold">{t.duration}</span>
                        {isDone ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {isHindi ? "पूर्ण" : "DONE"}
                          </span>
                        ) : isEodSimulation ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                            {isHindi ? "लाल (EOD)" : "OVERDUE"}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            {isHindi ? "लंबित" : "PENDING"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2">
              <button
                onClick={() => setIsTodaysActivityModalOpen(false)}
                className="py-3 px-6 rounded-xl font-black text-xs uppercase tracking-wider bg-black hover:bg-neutral-900 text-white transition-all w-full cursor-pointer shadow-md"
              >
                <span>{isHindi ? "बंद करें" : "Close Training View"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LIVE METRIC POPUP MODAL (PICK SPEED, ACCURACY, QC CHECK)  */}
      {/* ========================================================= */}
      {activeMetricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#181a24] border border-white/15 rounded-3xl p-5 max-w-xs w-full text-white shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setActiveMetricModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Metric 1: Pick Speed */}
            {activeMetricModal === "speed" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center">
                    <Zap className="w-5 h-5 fill-cyan-400 text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{isHindi ? "पिक स्पीड (लाइव)" : "Pick Speed (Live)"}</h3>
                    <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider">{isHindi ? "वर्तमान पाली डेटा" : "Present Day Performance"}</span>
                  </div>
                </div>

                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white font-mono">{Math.round(actualPickRate || 45)}</span>
                      <span className="text-xs text-slate-400 font-semibold">P/H</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">{isHindi ? "लक्ष्य" : "Target"}</span>
                      <span className="text-xs font-bold text-cyan-300">{Math.round(targetPickRate || 50)} P/H</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round(((actualPickRate || 45) / (targetPickRate || 50)) * 100))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-white/5">
                    {(actualPickRate || 45) >= (targetPickRate || 50)
                      ? (isHindi ? "आप वर्तमान में स्टोर लक्ष्य गति से आगे चल रहे हैं।" : "Exceeding store target pick pace with consistent aisle traversal.")
                      : (isHindi ? "रैंप वक्र के अनुसार पिक स्पीड बढ़ रही है।" : "Pacing steadily along current shift ramp curve.")}
                  </p>
                </div>
              </div>
            )}

            {/* Metric 2: Accuracy */}
            {activeMetricModal === "accuracy" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center">
                    <Target className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{isHindi ? "पिक सटीकता (लाइव)" : "Pick Accuracy (Live)"}</h3>
                    <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">{isHindi ? "वर्तमान पाली डेटा" : "Present Day Performance"}</span>
                  </div>
                </div>

                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-white font-mono">{Math.round(accuracyRate || 98)}%</span>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">{isHindi ? "मानक" : "Standard"}</span>
                      <span className="text-xs font-bold text-emerald-300">98% Target</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.round(accuracyRate || 98))}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-white/5">
                    {(accuracyRate || 98) >= 98
                      ? (isHindi ? "उच्च गुणवत्ता और शून्य बारकोड त्रुटियां।" : "High precision picking with verified barcode scans.")
                      : (isHindi ? "आइटम वैरिएंट सत्यापन पर ध्यान दें।" : "Pay close attention to item variant packaging verification.")}
                  </p>
                </div>
              </div>
            )}

            {/* Metric 3: QC Check */}
            {activeMetricModal === "qc" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-amber-400 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{isHindi ? "क्यूसी चेक (लाइव)" : "QC Check (Live)"}</h3>
                    <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">{isHindi ? "वर्तमान पाली डेटा" : "Present Day Performance"}</span>
                  </div>
                </div>

                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-black text-white font-mono">18 / 20</span>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">{isHindi ? "पास दर" : "Pass Rate"}</span>
                      <span className="text-xs font-bold text-amber-300">100% Quality Verified</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: "90%" }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-white/5">
                    {isHindi
                      ? "18/20 ऑर्डर पर्यवेक्षक द्वारा सत्यापित। शून्य क्षति और शून्य गलत पैकेजिंग।"
                      : "18/20 orders audited by shift supervisor. Zero item damage and zero mis-pack errors."}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveMetricModal(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              {isHindi ? "बंद करें" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* NATIVE SIMULATED VIDEO TRAINING PLAYER MODAL */}
      {isPlayingVideoModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1c1f2e] rounded-3xl max-w-sm w-full p-5 border border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 text-white">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-400">
                <BookOpen className="w-4 h-4" />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {isHindi ? "वीडियो पाठ" : "Video Lesson"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPlayingVideoModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Video Player Box */}
            <div className="relative aspect-video rounded-2xl bg-black border border-white/10 overflow-hidden flex items-center justify-center group shadow-inner">
              {/* Overlay Thumbnail background */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent flex flex-col justify-end p-3">
                <span className="text-white text-xs font-black drop-shadow-md truncate">
                  {isHindi && todaysPrescribedModules[0]?.titleHi ? todaysPrescribedModules[0].titleHi : todaysPrescribedModules[0]?.title || "Product Variant Barcode Guide"}
                </span>
                <span className="text-slate-300 text-[10px] drop-shadow-md mt-0.5">
                  Duration: 3:15 • Dark Store SOP
                </span>
              </div>

              {/* Big play button centered */}
              <div className="w-12 h-12 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform z-10 cursor-pointer">
                <Play className="w-5 h-5 fill-white translate-x-0.5" />
              </div>

              {/* Ambient scanlines/glow */}
              <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[9px] font-mono text-violet-300 border border-violet-500/20">
                1080p HD
              </div>
            </div>

            {/* Subtitles/Transcripts container */}
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-[9px] font-black tracking-wider text-violet-400 uppercase">
                {isHindi ? "ऑडियो व्याख्या" : "LIVE AUDIO SYNC"}
              </span>
              <p className="text-xs text-slate-200 leading-normal font-semibold">
                {isHindi
                  ? "भैया, शेल्फ पर रखे प्रोडक्ट का वजन 200g है या 500g, टैग देखकर ही ट्रॉली में रखें। गलत वेरिएंट पैक करने से स्पीड खराब होती है।"
                  : "Always match the exact pouch weight with the shelf code variant label before scan. Prevents 100% of variant packing re-work!"}
              </p>
            </div>

            {/* Video Action Button */}
            <button
              type="button"
              onClick={() => {
                setIsPlayingVideoModal(false);
              }}
              className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer text-center"
            >
              {isHindi ? "पाठ पूरा करें" : "Mark Lesson Completed"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
