import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NewHire, DailySignal, DARK_STORE_CAPABILITIES } from "../types";
import { MANDATORY_TRAINING_MODULES } from "../data/modulesData";
import {analyzeDailyReport} from "../services/intelligence";
import { speakMessage, stopSpeaking } from "../utils/speech";
import { CircularDialWidget } from "./CircularDialWidget";
import { StoreZonesGrid } from "./StoreZonesGrid";
import { JobReadyHumanFigure } from "./JobReadyHumanFigure";
import { ModulesView } from "./ModulesView";
import { TenDaySkillJourneyView } from "./TenDaySkillJourneyView";
import { FloatingGlassMenu } from "./FloatingGlassMenu";
import { LearnerSection } from "../types";
import { LearningProgressView } from "./LearningProgressView";
import { CommercialReadinessTrajectoryMiniCard } from "./CommercialReadinessTrajectoryMiniCard";
import { LearnerJourneyRoadmap } from "./LearnerJourneyRoadmap";
import { LearnerDailyReportCard } from "./LearnerDailyReportCard";
import { YesterdayShiftDetailModal } from "./YesterdayShiftDetailModal";
import { LabReportModal } from "./LabReportModal";
import { TodaysGoalLandingView } from "./TodaysGoalLandingView";
import { DailyCoachReportView } from "./DailyCoachReportView";
import { DashboardHeader } from "./DashboardHeader";
import { CommercialCertificationCard } from "./CommercialCertificationCard";
import { TelemetryPageView } from "./TelemetryPageView";
import { ControlTowerView } from "./ControlTowerView";
import { LearnerDashboardView } from "./LearnerDashboardView";
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  Calendar,
  AlertTriangle,
  FileText,
  Phone,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MapPin,
  ScanLine,
  UserCheck,
  X,
  Sparkles,
  Target,
  Zap,
  Home,
  BookOpen,
  Briefcase,
  MessageCircle,
  User,
  ArrowRight,
  ArrowLeft,
  ChevronRight, ChevronUp, ChevronDown,
  FlaskConical,
  Footprints,
  ShieldCheck,
  PackageCheck,
  RotateCcw,
  Clock,
  TrendingUp,
  Package,
  Award,
  Compass,
  Eye,
  Globe,
  Check,
  Bell,
  ArrowUpRight,
  ArrowDownUp,
  ArrowDownRight,
  Snowflake,
  Truck,
  ShieldAlert,
  RefreshCw,
  Play,
  Filter,
  SlidersHorizontal
} from "lucide-react";


const HOME_LEARNING_METRICS = [
  {
    id: "basics",
    titleEn: "Basics & Safety",
    titleShortEn: "Basics",
    titleHi: "सुरक्षा",
    capIds: [1, 2, 3, 4, 5],
    icon: ShieldCheck
  },
  {
    id: "accuracy",
    titleEn: "Accuracy & Handling",
    titleShortEn: "Accuracy",
    titleHi: "सटीकता",
    capIds: [6, 7, 8, 10],
    icon: Target
  },
  {
    id: "exceptions",
    titleEn: "Floor Exceptions",
    titleShortEn: "Exceptions",
    titleHi: "अपवाद",
    capIds: [11, 12, 13, 18],
    icon: AlertTriangle
  },
  {
    id: "flow",
    titleEn: "Flow & Completion",
    titleShortEn: "Flow",
    titleHi: "प्रवाह",
    capIds: [9, 14, 15, 16, 17, 19],
    icon: Zap
  }
];

interface NewHireViewProps {
  newHire: NewHire;
  currentDay: number;
  onDailySignalSubmitted: (signal: DailySignal) => void;
  onAskHelp: (question: string) => Promise<string>;
  onSelectDay: (day: number) => void;
  onUpdateHire?: (updatedHire: NewHire) => void;
  isHindi?: boolean;
  onToggleLanguage?: () => void;
  setIsHindi?: (isHindi: boolean) => void;
  activeSection?: LearnerSection;
  onSelectSection?: (section: LearnerSection) => void;
  onOpenManagerConsole?: () => void;
  onOpenSimulator?: () => void;
  newHires?: NewHire[];
  onSelectHire?: (hireId: string) => void;
  onOpenSyncModal?: () => void;
  isSyncing?: boolean;
}

export const NewHireView: React.FC<NewHireViewProps> = ({
  newHire,
  currentDay,
  onDailySignalSubmitted,
  onAskHelp,
  onUpdateHire,
  isHindi: propIsHindi,
  onToggleLanguage: propOnToggleLanguage,
  setIsHindi: propSetIsHindi,
  activeSection: propActiveSection,
  onSelectSection: propOnSelectSection,
  onOpenManagerConsole,
  onOpenSimulator,
  newHires,
  onSelectHire,
  onOpenSyncModal,
  isSyncing = false,
}) => {
  // Current day record from authoritative state
  const currentRecord = (newHire?.daysHistory || []).find((d) => d.dayNumber === currentDay) || {
    dayNumber: currentDay,
    date: `Day ${currentDay}`,
    statusAtEnd: newHire?.status || "Doing well",
    statusReason: newHire?.statusReason || "Floor ramp on track",
  };

  // Language state: true = Hindi / Hinglish, false = Simple English (Default English)
  const [localIsHindi, setLocalIsHindi] = useState<boolean>(false);
  const isHindi = propIsHindi !== undefined ? propIsHindi : localIsHindi;
  const setIsHindi = propSetIsHindi || setLocalIsHindi;
  const handleToggleLanguage = propOnToggleLanguage || (() => setIsHindi(!isHindi));

  const totalModulesCount = 19;
  const completedModulesCount = newHire.completedModuleIds?.length ?? 0;
  const courseCompletionPercentage = Math.round((completedModulesCount / totalModulesCount) * 100);
  const isTrainingMet = completedModulesCount >= 19;

  // Automated Till-Date Performance & Shift Metrics
  const completedDays = (newHire.daysHistory || []).filter((d) => d.dayNumber <= currentDay && d.workSignal);
  const yesterdayNumber = Math.max(1, currentDay - 1);
  const yesterdayRecord = newHire.daysHistory?.find((d) => d.dayNumber === yesterdayNumber) ||
    newHire.daysHistory?.filter((d) => d.dayNumber < currentDay).pop() ||
    newHire.daysHistory?.[0];

  const prevWork = yesterdayRecord?.workSignal;

  // Real Till-Date Average Pick Rate & Benchmark Target (Guarded against 0/NaN)
  const rawActual = prevWork?.actualPickRate ?? (completedDays.length > 0
    ? Math.round(completedDays.reduce((acc, d) => acc + (d.workSignal?.actualPickRate || 0), 0) / completedDays.length)
    : 32);
  const actualPickRate = Number.isNaN(rawActual) || rawActual <= 0 ? 32 : rawActual;

  const rawTarget = prevWork?.targetPickRate ?? 50;
  const targetPickRate = Number.isNaN(rawTarget) || rawTarget <= 0 ? 50 : rawTarget;
  const isPickRateBad = actualPickRate < targetPickRate;

  // Real Till-Date Accuracy Rate
  const rawAccuracy = prevWork?.accuracyRate ?? (completedDays.length > 0
    ? Math.round(completedDays.reduce((acc, d) => acc + (d.workSignal?.accuracyRate || 99), 0) / completedDays.length)
    : 98);
  const accuracyRate = Number.isNaN(rawAccuracy) || rawAccuracy <= 0 ? 98 : rawAccuracy;
  const targetAccuracy = 98;
  const isAccuracyBad = accuracyRate < targetAccuracy;

  // Real Till-Date Demonstrated Capabilities Count
  const capabilities = newHire.capabilities || {};
  const demonstratedCount = Object.values(capabilities).filter(
    (c: any) => c && (c.evidence === "demonstrated" || c.mastery === "proficient" || c.mastery === "mastered")
  ).length || ((newHire as any).capabilitiesDemonstrated?.length ?? 2);
  const isCapabilitiesMet = demonstratedCount >= 10;

  // Real Till-Date Overall Shift Score Calculation
  const trainingScore = Math.min(100, Math.round((completedModulesCount / totalModulesCount) * 100));
  const speedScore = Math.min(100, Math.round((actualPickRate / targetPickRate) * 100));
  const accuracyScore = Math.min(100, accuracyRate);
  
  const calculatedShiftScore = Math.round(trainingScore * 0.30 + speedScore * 0.35 + accuracyScore * 0.35);
  const yesterdayShiftScore = Number.isNaN(calculatedShiftScore) || calculatedShiftScore <= 0 ? 75 : calculatedShiftScore;
  const targetShiftScore = 85;
  const isShiftScoreBad = yesterdayShiftScore < targetShiftScore;

  // Automated Certification Readiness Evaluation
  const readinessEval = (newHire.day10Evaluation || { isCommercialReady: false, isReady: false, reasons: [], unresolvedBlockers: [], criteria: {} });
  const blockerCount = readinessEval.unresolvedBlockers.length;
  const isCertifiedReady = readinessEval.isReady;
  const currentCertificationDate = currentRecord?.date || (isHindi ? `दिन ${currentDay}` : `Day ${currentDay}`);
  const automatedDate = yesterdayRecord?.date || (isHindi ? `दिन ${yesterdayNumber}` : `Day ${yesterdayNumber}`);

  // Active learner navigation tab: "home" | "modules" | "dial" | "dashboard" | "buddy"
  const [localActiveSection, setLocalActiveSection] = useState<LearnerSection>("home");
  const activeSection = propActiveSection !== undefined ? propActiveSection : localActiveSection;
  const setActiveSection = propOnSelectSection || setLocalActiveSection;

  // Learner Switcher Dropdown local states
  const [isLearnerDropdownOpen, setIsLearnerDropdownOpen] = useState<boolean>(false);
  const [showNextStepModal, setShowNextStepModal] = useState<boolean>(false);
  const learnerDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const buttonEl = document.getElementById("home-learner-dropdown-btn");
      const popoverEl = document.getElementById("home-learner-dropdown-popover");
      if (
        buttonEl?.contains(event.target as Node) || 
        popoverEl?.contains(event.target as Node) ||
        (learnerDropdownRef.current && learnerDropdownRef.current.contains(event.target as Node))
      ) {
        return;
      }
      setIsLearnerDropdownOpen(false);
    };
    if (isLearnerDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLearnerDropdownOpen]);

  // Active quick action modal
  const [activeModal, setActiveModal] = useState<"map" | "buddy" | "scanner" | "target" | "work" | "yesterday_detail" | null>(null);
  const [isPerformanceExpanded, setIsPerformanceExpanded] = useState<boolean>(true);
  const [isCertCriteriaExpanded, setIsCertCriteriaExpanded] = useState<boolean>(false);
  const [buddyAlertSent, setBuddyAlertSent] = useState<boolean>(false);
  const [showTodaysGoalView, setShowTodaysGoalView] = useState<boolean>(false);
  const [showDailyCoachReport, setShowDailyCoachReport] = useState<boolean>(false);
  const [selectedDeepLinkModuleId, setSelectedDeepLinkModuleId] = useState<string | null>(null);
  const [activeFloorTaskId, setActiveFloorTaskId] = useState<string | null>("t1");
  const [completedFloorTasks, setCompletedFloorTasks] = useState<Record<string, boolean>>({
    "t1_sub1": false,
    "t1_sub2": false,
    "t1_sub3": false,
    "t2_sub1": false,
    "t2_sub2": false,
    "t2_sub3": false,
    "t3_sub1": false,
    "t3_sub2": false,
    "t3_sub3": false,
    "t4_sub1": false,
    "t4_sub2": false,
  });

  const [completedWorkChecklist, setCompletedWorkChecklist] = useState<Record<string, boolean>>({
    walk: false,
    seal: false,
    pack: false,
  });
  const [completedScannerChecklist, setCompletedScannerChecklist] = useState<Record<string, boolean>>({
    laser: false,
    dist: false,
    battery: false,
  });
  const [completedTargetChecklist, setCompletedTargetChecklist] = useState<Record<string, boolean>>({
    orders: false,
    pacing: false,
    report: false,
  });

  // Voice recording & input states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showTextInput, setShowTextInput] = useState<boolean>(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Latest companion exchange (minimalist conversation card instead of heavy chat wall)
  const [latestInteraction, setLatestInteraction] = useState<{
    userText: string;
    replyText: string;
    timestamp: string;
  } | null>(null);

  // Authoritative Overall Job Readiness calculation
  const authoritativeReadiness = (typeof newHire.overallReadinessScore === "number" ? (newHire.overallReadinessScore <= 1 ? Math.round(newHire.overallReadinessScore * 100) : Math.round(newHire.overallReadinessScore)) : 0);

  // Derive simple human state from existing intelligence ledger with dynamic live readiness checks
  const requiredModulesForDay = Math.min(19, currentDay * 2);
  const requiredCapabilitiesForDay = Math.min(19, Math.round((currentDay / 10) * 14));
  const hasActiveBlockers = blockerCount > 0 || isPickRateBad || isAccuracyBad || !isTrainingMet || !isCapabilitiesMet;

  const dynamicStatus = (
    (currentRecord.statusAtEnd === "At risk" || newHire.status === "At risk")
      ? "At risk"
      : (currentRecord.statusAtEnd === "Needs attention" || newHire.status === "Needs attention" || hasActiveBlockers)
      ? "Needs attention"
      : "Doing well"
  );
  const effectiveStatus = dynamicStatus;
  const isSupportCompleted = Boolean(
    (currentRecord.actionOutcome && currentRecord.actionOutcome.improved) ||
    currentRecord.recommendedAction?.status === "completed" ||
    effectiveStatus === "Doing well"
  );
  const isSupportAssigned = Boolean(
    !isSupportCompleted &&
      currentRecord.recommendedAction &&
      currentRecord.recommendedAction.status !== "completed"
  );
  const isNeedsHelp = Boolean(
    !isSupportCompleted &&
      !isSupportAssigned &&
      (effectiveStatus === "Needs attention" ||
        effectiveStatus === "At risk" ||
        (currentRecord.dailySignal && currentRecord.dailySignal.confidence === "Low"))
  );

  // Synchronize latest exchange on day change
  useEffect(() => {
    if (currentRecord.dailySignal) {
      setLatestInteraction({
        userText: currentRecord.dailySignal.rawText,
        replyText:
          currentRecord.dailySignal.companionResponse ||
          (isNeedsHelp
            ? `${newHire.buddy.split(" ")[0]} will help you with floor picking today. Accuracy is ${currentRecord.workSignal?.accuracyRate ?? 98}%, no stress!`
            : "Shift reported! Great work keeping high accuracy."),
        timestamp: currentRecord.dailySignal.timestamp || "Today",
      });
    } else {
      setLatestInteraction(null);
    }
    setBuddyAlertSent(false);
    setInputText("");
    setShowTextInput(false);
  }, [currentDay, newHire.id, newHire.buddy, currentRecord.dailySignal, currentRecord.workSignal, isNeedsHelp]);

  // Audio speech player
  const handlePlayAudio = (id: string, text: string) => {
    if (playingAudioId === id) {
      stopSpeaking();
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      speakMessage(text, isHindi);
      const wordCount = text.split(" ").length;
      const durationMs = Math.max(2500, (wordCount / 2.5) * 1000);
      setTimeout(() => {
        setPlayingAudioId((curr) => (curr === id ? null : curr));
      }, durationMs);
    }
  };

  // WhatsApp-style Voice Toggle
  const handleToggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Friendly fallback in sandbox environments
      const sampleSpokenReports = isHindi
        ? [
            "भैया मुझे आइसल 4 से 8 में सामान ढूंढने में बहुत टाइम लग रहा है।",
            "दही और दूध का कोल्ड रूम कहां पर है?",
            "स्कैनर बारकोड नहीं पढ़ रहा है, लाल लाइट जल रही है।",
            "आज शिफ्ट अच्छी रही, 48 पैकेट फटाफट पैक कर दिए।",
          ]
        : [
            "I am taking too long to find items in Aisles 4 to 8.",
            "Where is the cold dairy room?",
            "The barcode scanner is not reading labels.",
            "Smooth shift today, picked items easily.",
          ];
      const randomText =
        sampleSpokenReports[Math.floor(Math.random() * sampleSpokenReports.length)];
      handleSendMessage(randomText);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = isHindi ? "hi-IN" : "en-IN";

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) handleSendMessage(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (e) {
      setIsListening(false);
      handleSendMessage(
        isHindi
          ? "मुझे आइसल 4 से 8 में सामान ढूंढने में देर लग रही है।"
          : "I am taking too long in aisles 4 to 8."
      );
    }
  };

  // Message dispatcher
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setInputText("");

    try {
      const lower = text.toLowerCase();
      const isQuestion =
        text.includes("?") ||
        lower.includes("kahan") ||
        lower.includes("where") ||
        lower.includes("how") ||
        lower.includes("kya") ||
        lower.includes("kaise") ||
        lower.startsWith("can i");

      if (isQuestion) {
        const answer = await onAskHelp(text);
        setLatestInteraction({
          userText: text,
          replyText: answer,
          timestamp: "Just now",
        });
        handlePlayAudio("latest-interaction", answer);
      } else {
        const analyzed = await analyzeDailyReport(text, newHire.name, currentDay);
        const replyText =
          analyzed.companionResponse ||
          (isHindi
            ? `समझ गया ${newHire.name.split(" ")[0]}! ${newHire.buddy.split(" ")[0]} भैया को बता दिया है, वो आपको फ्लोर पर समझा देंगे।`
            : `Got it, ${newHire.name.split(" ")[0]}! Buddy ${newHire.buddy.split(" ")[0]} has been alerted to walk through with you.`);

        const signal: DailySignal = {
          id: `sig-${Date.now()}`,
          dayNumber: currentDay,
          rawText: text,
          inputMethod: "voice",
          issue: analyzed.issue || "Floor experience",
          confidence: (analyzed.confidence as any) || "Medium",
          possibleImpact: analyzed.possibleImpact || "Ramp adjustment",
          category: (analyzed.category as any) || "General",
          summary: analyzed.summary || text.slice(0, 80),
          companionResponse: replyText,
          timestamp: "Just now",
        };

        onDailySignalSubmitted(signal);
        setLatestInteraction({
          userText: text,
          replyText,
          timestamp: "Just now",
        });
        handlePlayAudio("latest-interaction", replyText);
      }
    } catch (err) {
      console.error(err);
      const fallbackReply = isHindi
        ? "आपकी बात नोट कर ली गई है।"
        : "I heard you! Noted for your shift.";
      setLatestInteraction({
        userText: text,
        replyText: fallbackReply,
        timestamp: "Just now",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced status & intelligent prescription content answering the 6 core questions
  const getStatusContent = () => {
    const accuracy = currentRecord.workSignal?.accuracyRate ?? 98;
    const actualPace = currentRecord.workSignal?.actualPickRate ?? 35;
    const targetPace = currentRecord.workSignal?.targetPickRate ?? 50;
    const buddyName = (newHire?.buddy || "Anita M.").split(" ")[0];
    const supervisorName = (newHire?.supervisor || "Vikram S.").split(" ")[0];

    // 1. Tool / Hardware obstacle
    if (
      currentRecord.dailySignal?.category === "Tool" ||
      currentRecord.recommendedAction?.decisionType === "tool_remedy" ||
      currentRecord.identifiedPattern?.category === "Tool"
    ) {
      return {
        badge: isHindi ? "डिवाइस 🛠️" : "EQUIPMENT 🛠️",
        duration: "2 min",
        action: isHindi ? "स्कैनर लेंस साफ करें या बदलें" : "Clean scanner or swap at desk",
        shortWhy: isHindi ? "बारकोड पढ़ने में देरी सुधारें" : "Fix barcode read delay",
        target: isHindi ? "बीप के साथ तुरंत स्कैन होना चाहिए" : "Quick beep on every scan",
        primaryBtnText: isHindi ? "शुरू करें" : "START",
        primaryAction: () => setActiveModal("scanner"),
        secondaryBtnText: isHindi ? `${buddyName} को बताएं` : `Tell ${buddyName}`,
        secondaryAction: () => setActiveSection("buddy"),
      };
    }

    // 2. External store / facility bottleneck
    if (
      currentRecord.workSignal?.externalBottleneck ||
      currentRecord.identifiedPattern?.patternName.includes("Bottleneck") ||
      currentRecord.recommendedAction?.decisionType === "environment_support"
    ) {
      return {
        badge: isHindi ? "फ्लोर सूचना 🏢" : "FLOOR NOTICE 🏢",
        duration: isHindi ? "शिफ्ट लक्ष्य" : "This wave",
        action: isHindi ? "सावधानी से पिकिंग जारी रखें" : "Keep picking steady & safe",
        shortWhy: isHindi ? "कन्वेयर पर थोड़ा जाम है" : "Conveyor is moving slow",
        target: isHindi ? "98%+ सही स्कैन रखें" : "Keep 98%+ accuracy",
        primaryBtnText: isHindi ? "शुरू करें" : "START",
        primaryAction: () => setActiveModal("work"),
        secondaryBtnText: isHindi ? "स्टोर मैप" : "Store Map",
        secondaryAction: () => setActiveModal("map"),
      };
    }

    // 3. Support Completed / Intervention Succeeded (Intervention Memory)
    if (isSupportCompleted) {
      return {
        badge: isHindi ? "शाबाश 👍" : "SOLO READY 👍",
        duration: isHindi ? "सोलो शिफ्ट" : "Solo shift",
        action: isHindi ? "अकेले सोलो पिकिंग शुरू करें" : "Start solo order picking",
        shortWhy: isHindi ? "आपकी स्पीड अच्छी हो गई है" : "Pace is up with zero errors",
        target: isHindi ? "5 ऑर्डर अकेले पूरे करें" : "Pick 5 orders solo",
        primaryBtnText: isHindi ? "शुरू करें" : "START",
        primaryAction: () => setActiveModal("work"),
        secondaryBtnText: isHindi ? "साथी से बात करें" : `Talk to ${buddyName}`,
        secondaryAction: () => setActiveSection("buddy"),
      };
    }

    const targetCapId = currentRecord?.recommendedAction?.targetCapabilityId || newHire.currentCapabilityId || 3;
    const targetCapDef = DARK_STORE_CAPABILITIES.find((c) => c.id === targetCapId);
    const targetCapName = targetCapDef ? (targetCapDef.id === 3 ? "Finding locations" : targetCapDef.name) : "Finding locations";

    // 4. Support Assigned / Prescribed Walkthrough
    if (isSupportAssigned) {
      return {
        badge: isHindi ? "आज का मुख्य कदम 🤝" : "TODAY'S MAIN STEP 🤝",
        duration: "15 min",
        action: isHindi ? `${buddyName} भैया के साथ फ्लोर वॉक` : "Floor walk with Buddy",
        shortWhy: isHindi ? "सामान ढूंढने में सुधार करें" : "Improve location finding",
        target: isHindi ? "5 सामान बिना भटके पिक करें" : "Pick 5 items without backtracking",
        primaryBtnText: isHindi ? "शुरू करें" : "START",
        primaryAction: () => {
          setBuddyAlertSent(true);
          setActiveModal("buddy");
        },
        secondaryBtnText: isHindi ? "स्टोर मैप" : "Store Map",
        secondaryAction: () => setActiveModal("map"),
      };
    }

    // 5. Needs Help / Early Foundation
    if (isNeedsHelp) {
      return {
        badge: isHindi ? "अभ्यास 🤝" : "PRACTICE 🤝",
        duration: "10 min",
        action: isHindi ? "सामान ढूंढने का अभ्यास" : "Practice finding items",
        shortWhy: isHindi ? "शेल्फ कोड समझने में मदद लें" : "Learn shelf codes faster",
        target: isHindi ? "अगले 3 ऑर्डर सही पहचानें" : "Get next 3 shelf codes right",
        primaryBtnText: isHindi ? "शुरू करें" : "START",
        primaryAction: () => setActiveSection("buddy"),
        secondaryBtnText: isHindi ? "शिफ्ट टूल्स" : "Floor Tools",
        secondaryAction: () => setActiveModal("work"),
      };
    }

    // 6. Insufficient Evidence
    if (
      currentRecord.recommendedAction?.decisionType === "no_action_monitor" ||
      (currentRecord.identifiedPattern?.category as any) === "insufficient_evidence"
    ) {
      return {
        badge: isHindi ? "सामान्य काम 👍" : "NORMAL WORK 👍",
        duration: isHindi ? "आज की शिफ्ट" : "Shift goal",
        action: isHindi ? "आज का सामान्य काम जारी रखें" : "Continue today's normal work",
        shortWhy: isHindi ? "हम अभी आपके प्रदर्शन को समझ रहे हैं।" : "We're still learning about your performance.",
        target: "", // No target
        primaryBtnText: isHindi ? "शुरू करें" : "START",
        primaryAction: () => setActiveModal("work"),
        secondaryBtnText: isHindi ? "मॉड्यूल" : "Modules",
        secondaryAction: () => setActiveSection("modules"),
      };
    }

    // 7. Default Steady Ramp
    return {
      badge: isHindi ? "आज का मुख्य काम 👍" : "TODAY'S FOCUS 👍",
      duration: isHindi ? "आज की शिफ्ट" : "Shift goal",
      action: isHindi ? "सही सामान पिक और स्कैन करें" : "Pick & scan orders accurately",
      shortWhy: isHindi ? "स्पीड अपने आप बढ़ जाएगी" : "Accuracy builds good speed",
      target: isHindi ? "98%+ सही स्कैन रखें" : "Keep 98%+ accuracy",
      primaryBtnText: isHindi ? "शुरू करें" : "START",
      primaryAction: () => setActiveModal("work"),
      secondaryBtnText: isHindi ? "मॉड्यूल" : "Modules",
      secondaryAction: () => setActiveSection("modules"),
    };
  };

  const status = getStatusContent();

  const renderGlobalModals = () => {
    return (
      <>
        {activeModal === "yesterday_detail" &&
          createPortal(
            <LabReportModal
              newHire={newHire}
              currentDay={currentDay}
              isHindi={isHindi}
              onClose={() => setActiveModal(null)}
              onOpenWorkTools={() => {
                setActiveModal("work");
              }}
              onOpenModules={() => {
                setActiveModal(null);
                setShowTodaysGoalView(false);
                setActiveSection("modules");
              }}
              onOpenBuddy={() => {
                setActiveModal(null);
                setShowTodaysGoalView(false);
                setActiveSection("buddy");
              }}
            />,
            document.body
          )}

        {/* MODAL 1: DARK STORE AISLE & ITEM MAP */}
        {activeModal === "map" &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-blue-500 text-white flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isHindi ? "डार्क स्टोर गाइड" : "Dark Store Aisle Map"}
                      </h3>
                      <p className="text-[11px] text-slate-500">Dark Store #104</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-600">
                  {isHindi
                    ? "सामान का प्रकार चुनें, साथी तुरंत दिशा बताएगा:"
                    : "Select an item to get instant floor directions:"}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      handleSendMessage(
                        isHindi
                          ? "दही, दूध और पनीर का कोल्ड रूम कहां है?"
                          : "Where is the cold dairy section?"
                      );
                    }}
                    className="p-3 rounded-2xl border border-blue-200 bg-blue-50/70 text-left hover:bg-blue-100 cursor-pointer"
                  >
                    <span className="font-bold text-blue-950 block">🥛 Dairy & Milk</span>
                    <span className="text-[10px] text-blue-700 font-semibold">Aisle 8 (Cold Room)</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal(null);
                      handleSendMessage(
                        isHindi
                          ? "चिप्स, बिस्कुट और स्नैक्स कहां रखे हैं?"
                          : "Where are chips and snacks?"
                      );
                    }}
                    className="p-3 rounded-2xl border border-amber-200 bg-amber-50/70 text-left hover:bg-amber-100 cursor-pointer"
                  >
                    <span className="font-bold text-amber-950 block">🍪 Snacks & Maggi</span>
                    <span className="text-[10px] text-amber-700 font-semibold">Aisles 1 & 2 (Front)</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal(null);
                      handleSendMessage(
                        isHindi
                          ? "आटा, चावल और तेल की बोरियां कहां हैं?"
                          : "Where is flour, rice and oil?"
                      );
                    }}
                    className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 text-left hover:bg-emerald-100 cursor-pointer"
                  >
                    <span className="font-bold text-emerald-950 block">🌾 Atta, Rice & Oil</span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Aisles 4, 5, 6</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveModal(null);
                      handleSendMessage(
                        isHindi
                          ? "साबुन और सर्फ कहां रखे हैं?"
                          : "Where are soaps and cleaning?"
                      );
                    }}
                    className="p-3 rounded-2xl border border-purple-200 bg-purple-50/70 text-left hover:bg-purple-100 cursor-pointer"
                  >
                    <span className="font-bold text-purple-950 block">🧼 Soaps & Surf</span>
                    <span className="text-[10px] text-purple-700 font-semibold">Aisle 7</span>
                  </button>
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold cursor-pointer"
                >
                  {isHindi ? "बंद करें" : "Close Guide"}
                </button>
              </div>
            </div>,
            document.body
          )}

        {/* MODAL 2: CALL BUDDY VIKRAM */}
        {activeModal === "buddy" &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in duration-150 text-center">
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <img
                    src="/Vikram%20Pic.jpeg"
                    alt="Buddy Vikram"
                    className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 shadow-md mb-2"
                  />
                  <h3 className="text-base font-bold text-slate-900">
                    {newHire.buddy}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Senior Floor Buddy</p>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1.5 border border-emerald-200">
                    🟢 {isHindi ? "फ्लोर पर एक्टिव हैं" : "On Duty on Floor"}
                  </span>
                </div>

                {buddyAlertSent ? (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                    <p className="text-xs font-bold text-emerald-900">
                      {isHindi ? "✅ विक्रम भैया को सूचना भेज दी गई!" : "✅ Alert sent to Vikram!"}
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      {isHindi
                        ? "वो 2 मिनट में आपके रैक के पास पहुंच रहे हैं।"
                        : "He will walk over to your rack in 2 minutes."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setBuddyAlertSent(true)}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-bold shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Phone className="w-4 h-4" />
                      <span>
                        {isHindi ? "विक्रम भैया को यहां बुलाओ" : "Call Vikram to My Rack"}
                      </span>
                    </button>

                    <p className="text-[11px] text-slate-500">
                      {isHindi
                        ? "अगर कोई सामान नहीं मिल रहा तो तुरंत पूछें, झिझकें नहीं।"
                        : "Never hesitate to ask your buddy. They are here to help you ramp up!"}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
                >
                  {isHindi ? "वापस जाएं" : "Back to Shift"}
                </button>
              </div>
            </div>,
            document.body
          )}

        {/* MODAL 3: SCANNER TROUBLESHOOTING */}
        {activeModal === "scanner" &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
                      <ScanLine className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isHindi ? "स्कैनर काम ना करे तो?" : "Scanner Troubleshooting"}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {isHindi ? "2 मिनट का आसान हल" : "2 quick fixes"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <p className="text-[11px] font-black uppercase text-purple-700 tracking-wider">
                    {isHindi ? "सामान उठाने की प्रक्रिया और जांच सूची" : "PICKING PROCESS & CHECKLIST"}
                  </p>

                  <div
                    onClick={() => setCompletedScannerChecklist(prev => ({ ...prev, laser: !prev.laser }))}
                    className={`p-3 border rounded-2xl flex items-start gap-2.5 cursor-pointer transition-all active:scale-98 ${
                      completedScannerChecklist.laser ? "bg-emerald-50 border-emerald-200" : "bg-purple-50/70 border-purple-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={completedScannerChecklist.laser}
                      onChange={() => {}}
                      className="w-4 h-4 rounded mt-0.5 accent-emerald-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <strong className={`block font-bold ${completedScannerChecklist.laser ? "line-through text-slate-500" : "text-purple-950"}`}>
                        {isHindi ? "लाल शीशा साफ करें" : "Clean red laser glass"}
                      </strong>
                      <p className="text-[11px] text-purple-900 mt-0.5">
                        {isHindi
                          ? "स्कैनर के आगे का ग्लास अपनी टी-शर्ट या सूखे कपड़े से पोंछें।"
                          : "Dust often blocks the laser. Wipe the front glass with a dry cloth."}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setCompletedScannerChecklist(prev => ({ ...prev, dist: !prev.dist }))}
                    className={`p-3 border rounded-2xl flex items-start gap-2.5 cursor-pointer transition-all active:scale-98 ${
                      completedScannerChecklist.dist ? "bg-emerald-50 border-emerald-200" : "bg-blue-50/70 border-blue-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={completedScannerChecklist.dist}
                      onChange={() => {}}
                      className="w-4 h-4 rounded mt-0.5 accent-emerald-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <strong className={`block font-bold ${completedScannerChecklist.dist ? "line-through text-slate-500" : "text-blue-950"}`}>
                        {isHindi ? "दूरी सही रखें (15 सेमी)" : "Hold 15cm from barcode"}
                      </strong>
                      <p className="text-[11px] text-blue-900 mt-0.5">
                        {isHindi
                          ? "स्कैनर को पैकेट से बहुत चिपकाएं नहीं, 15 सेमी दूर रखकर ट्रिगर दबाएं।"
                          : "Don't press against the label. Keep 15cm distance."}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setCompletedScannerChecklist(prev => ({ ...prev, battery: !prev.battery }))}
                    className={`p-3 border rounded-2xl flex items-start gap-2.5 cursor-pointer transition-all active:scale-98 ${
                      completedScannerChecklist.battery ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={completedScannerChecklist.battery}
                      onChange={() => {}}
                      className="w-4 h-4 rounded mt-0.5 accent-emerald-600 shrink-0"
                    />
                    <div className="min-w-0">
                      <strong className={`block font-bold ${completedScannerChecklist.battery ? "line-through text-slate-500" : "text-slate-900"}`}>
                        {isHindi ? "बैटरी स्टेटस व रीसेट" : "Battery status & Reset"}
                      </strong>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {isHindi
                          ? "चेक करें कि लाइट हरी जल रही है या नहीं। जरूरत पड़ने पर रीसेट दबाएं।"
                          : "Check ring scanner green indicator light. Reset if needed."}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold cursor-pointer"
                >
                  {isHindi ? "समझ गया 👍" : "Got it 👍"}
                </button>
              </div>
            </div>,
            document.body
          )}

        {/* MODAL 4: TODAY'S TARGET & RAMP GOAL */}
        {activeModal === "target" &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-in fade-in zoom-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isHindi ? "आज का पिकिंग लक्ष्य" : "Today's Target"}
                      </h3>
                      <p className="text-[11px] text-slate-500">Day {currentDay} of 14</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        {isHindi ? "एक्यूरेसी (सही सामान)" : "Scanning Accuracy"}
                      </span>
                      <span className="text-[11px] text-emerald-700">Target: 95%+</span>
                    </div>
                    <span className="text-lg font-black text-emerald-700">98% 👍</span>
                  </div>

                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-blue-950 block">
                        {isHindi ? "पिक स्पीड (सामान/घंटा)" : "Pick Speed"}
                      </span>
                      <span className="text-[11px] text-blue-700">
                        {isSupportCompleted ? "After walkthrough" : "Day 3 ramp expectation"}
                      </span>
                    </div>
                    <span className="text-lg font-black text-blue-700">
                      {isSupportCompleted ? "48/hr" : "35 / 50"}
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {isHindi ? "लक्ष्य प्राप्ति हेतु आवश्यक कदम" : "STEPS FOR TODAY'S GOAL"}
                    </p>

                    <div
                      onClick={() => setCompletedTargetChecklist(prev => ({ ...prev, orders: !prev.orders }))}
                      className={`p-2.5 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                        completedTargetChecklist.orders ? "bg-emerald-50/70 border-emerald-200" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={completedTargetChecklist.orders}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                      />
                      <span className={`text-xs font-bold ${completedTargetChecklist.orders ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {isHindi ? "फिंगर स्कैनर से 50 ऑर्डर पैक करें" : "Pick 50 orders via finger scanner"}
                      </span>
                    </div>

                    <div
                      onClick={() => setCompletedTargetChecklist(prev => ({ ...prev, pacing: !prev.pacing }))}
                      className={`p-2.5 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                        completedTargetChecklist.pacing ? "bg-emerald-50/70 border-emerald-200" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={completedTargetChecklist.pacing}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                      />
                      <span className={`text-xs font-bold ${completedTargetChecklist.pacing ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {isHindi ? "45 से अधिक UPH की स्पीड बनाए रखें" : "Maintain >45 UPH picking pace"}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed px-1">
                    {isHindi
                      ? "💡 याद रखें: शुरुआत में एक्यूरेसी (सही सामान उठाना) स्पीड से ज्यादा जरूरी है। स्पीड अपने आप बढ़ जाएगी!"
                      : "💡 Remember: High accuracy is more important than raw speed. Speed naturally builds up as you memorize the aisles."}
                  </p>
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold cursor-pointer"
                >
                  {isHindi ? "समझ गया 👍" : "Got it 👍"}
                </button>
              </div>
            </div>,
            document.body
          )}

        {/* MODAL 5: FULL FLOOR REFERENCE TOOLS MODAL */}
        {activeModal === "work" &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
              <div className="bg-slate-50 rounded-3xl max-w-md w-full p-4 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {isHindi ? "ऑन-फ्लोर शिफ्ट टूल्स" : "On-Floor Shift Tools"}
                      </h3>
                      <p className="text-[10px] text-slate-500">Dark Store #104 • Day {currentDay}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <CircularDialWidget
                  pickRate={currentRecord.workSignal?.actualPickRate || (currentRecord as any).pickRate || 35}
                  targetPickRate={currentRecord.workSignal?.targetPickRate || 50}
                  accuracyRate={currentRecord.workSignal?.accuracyRate ?? 98}
                  readinessScore={authoritativeReadiness}
                  onCallBuddy={() => setActiveModal("buddy")}
                  onScannerFix={() => setActiveModal("scanner")}
                  onAisleMap={() => setActiveModal("map")}
                  onOpenTarget={() => setActiveModal("target")}
                  isHindi={isHindi}
                />

                <StoreZonesGrid
                  onSelectZone={(zoneId, zoneName) => {
                    setActiveModal(null);
                    if (zoneId === "aisles_4_8") {
                      handleSendMessage(
                        isHindi
                          ? "आइसल 4 से 8 में सामान ढूंढने में देर लग रही है, मदद चाहिए।"
                          : "Taking longer in Aisles 4-8. Where are the bulk grocery items?"
                      );
                    } else if (zoneId === "cold_room") {
                      handleSendMessage(
                        isHindi
                          ? "दूध और दही का कोल्ड रूम कहां है?"
                          : "Where is the cold room for dairy and frozen milk?"
                      );
                    } else if (zoneId === "scanner_dock") {
                      setActiveModal("scanner");
                    } else if (zoneId === "buddy_desk") {
                      setActiveModal("buddy");
                    } else {
                      handleSendMessage(
                        isHindi
                          ? `${zoneName} जोन में मदद चाहिए`
                          : `Need assistance in ${zoneName} zone`
                      );
                    }
                  }}
                  isHindi={isHindi}
                />

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {isHindi ? "फ्लोर रूटीन जांच सूची" : "FLOOR ROUTINE CHECKLIST"}
                  </p>

                  <div
                    onClick={() => setCompletedWorkChecklist(prev => ({ ...prev, walk: !prev.walk }))}
                    className={`p-2.5 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                      completedWorkChecklist.walk ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={completedWorkChecklist.walk}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                    />
                    <span className={`text-xs font-bold ${completedWorkChecklist.walk ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {isHindi ? "कोल्ड रूम डेयरी 90-सेकंड एसओपी और सील" : "Cold Room dairy 90-sec retrieval SOP"}
                    </span>
                  </div>

                  <div
                    onClick={() => setCompletedWorkChecklist(prev => ({ ...prev, seal: !prev.seal }))}
                    className={`p-2.5 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                      completedWorkChecklist.seal ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={completedWorkChecklist.seal}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                    />
                    <span className={`text-xs font-bold ${completedWorkChecklist.seal ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {isHindi ? "इंसुलेटेड बैग सीलिंग और टोट लेबल जांचें" : "Insulated bag sealing & tote check"}
                    </span>
                  </div>

                  <div
                    onClick={() => setCompletedWorkChecklist(prev => ({ ...prev, pack: !prev.pack }))}
                    className={`p-2.5 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                      completedWorkChecklist.pack ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={completedWorkChecklist.pack}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-emerald-600 rounded shrink-0"
                    />
                    <span className={`text-xs font-bold ${completedWorkChecklist.pack ? "line-through text-slate-400" : "text-slate-800"}`}>
                      {isHindi ? "मल्टी-टोट्स पैकेजिंग SOP पूर्ण करें" : "Complete Multi-Totes Packaging SOP"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-2xl text-xs font-bold cursor-pointer"
                >
                  {isHindi ? "बंद करें" : "Close Floor Tools"}
                </button>
              </div>
            </div>,
            document.body
          )}

        {showDailyCoachReport &&
          createPortal(
            <DailyCoachReportView
              newHire={newHire}
              currentDay={currentDay}
              isHindi={isHindi}
              onClose={() => setShowDailyCoachReport(false)}
            />,
            document.body
          )}
      </>
    );
  };

  if (showTodaysGoalView || activeSection === "todays_goal") {
    return (
      <div className="relative min-h-screen bg-[#F5F5F7]">
        <TodaysGoalLandingView
          newHire={newHire}
          currentDay={currentDay}
          isHindi={isHindi}
          onToggleLanguage={() => setIsHindi(!isHindi)}
          onBack={() => {
            setShowTodaysGoalView(false);
            setActiveSection("home");
          }}
          onSelectSection={(sec) => {
            setShowTodaysGoalView(false);
            setActiveSection(sec);
          }}
          onUpdateHire={onUpdateHire}
          onOpenLabReport={() => {
            setActiveModal("yesterday_detail");
          }}
          onOpenBuddy={() => {
            setShowTodaysGoalView(false);
            setActiveSection("buddy");
          }}
          onSelectModuleWithId={(modId) => {
            setSelectedDeepLinkModuleId(modId);
            setActiveSection("modules");
            setShowTodaysGoalView(false);
          }}
          onSelectFloorTask={(modalType) => {
            setActiveSection("dial");
            if (modalType === "map" || modalType === "buddy") {
              setActiveFloorTaskId("t1");
            } else if (modalType === "scanner") {
              setActiveFloorTaskId("t2");
            } else if (modalType === "work") {
              setActiveFloorTaskId("t3");
            } else if (modalType === "target") {
              setActiveFloorTaskId("t4");
            }
            setShowTodaysGoalView(false);
          }}
        />

        {renderGlobalModals()}

        {/* Global Bottom Navigation Floating Glass Menu */}
        <FloatingGlassMenu
          activeSection="todays_goal"
          onSelectSection={(sec) => {
            setShowTodaysGoalView(false);
            setActiveSection(sec);
          }}
          isHindi={isHindi}
          hasAttention={isNeedsHelp || isSupportAssigned}
          buddyAssigned={isSupportAssigned}
        />
      </div>
    );
  }

  if (activeSection === "modules") {
    return (
      <div 
        id="modules-view-container" 
        className="max-w-md mx-auto pb-36 select-none min-h-screen relative bg-[#EEEEEE] text-slate-900 overflow-hidden animate-in fade-in duration-200"
      >
        {/* Content wrapper */}
        <div className="relative z-10">
          <ModulesView
            newHire={newHire}
            onUpdateHire={onUpdateHire}
            isHindi={isHindi}
            initialModuleId={selectedDeepLinkModuleId}
            currentDay={currentDay}
          />
        </div>

        {renderGlobalModals()}

        <FloatingGlassMenu
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          isHindi={isHindi}
          hasAttention={isNeedsHelp || isSupportAssigned}
          buddyAssigned={isSupportAssigned}
        />
      </div>
    );
  }

  if (activeSection === "home") {
    return (
      <div className="max-w-md mx-auto pb-36 select-none min-h-screen relative bg-[#F5F5F7] text-slate-900 overflow-hidden font-sans">
        {/* Soft Ambient Background Glow Orbs for Glass Reflection */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 -left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute top-80 -right-10 w-80 h-80 bg-rose-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-10 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl" />
        </div>

        <div className="px-4 pt-5 space-y-4 relative z-10">
          {/* Top Header: Learner Profile Switcher & Controls */}
          <div className="flex items-center justify-between mb-1 relative z-20">
            <div className="relative" ref={learnerDropdownRef}>
              <button
                id="home-learner-dropdown-btn"
                type="button"
                onClick={() => setIsLearnerDropdownOpen(!isLearnerDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-white/80 shadow-2xs hover:bg-white transition-all cursor-pointer"
                title={newHire.name}
                aria-label="Learner profile"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-extrabold text-slate-900 truncate max-w-[110px]">{newHire.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {isLearnerDropdownOpen && newHires && newHires.length > 0 && (
                <div
                  id="home-learner-dropdown-popover"
                  className="absolute top-10 left-0 w-64 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-white/80 p-2 z-50 space-y-1 text-slate-800"
                >
                  <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    {isHindi ? "प्रशिक्षु स्विच करें" : "Switch Learner Profile"}
                  </div>
                  {newHires.map((hire) => (
                    <button
                      key={hire.id}
                      onClick={() => {
                        if (onSelectHire) onSelectHire(hire.id);
                        setIsLearnerDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        hire.id === newHire.id ? "bg-slate-100 text-slate-900 font-black" : "hover:bg-slate-50 text-slate-600 font-medium"
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-800 shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-black text-slate-900 tracking-tight truncate">{hire.name}</p>
                        <p className="text-[10px] text-slate-500 tracking-tight truncate">{(hire as any).role || "Frontline Picker"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onOpenSimulator && (
                <button
                  type="button"
                  onClick={onOpenSimulator}
                  className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-xl border border-white/80 flex items-center justify-center text-slate-700 hover:text-slate-900 shadow-2xs cursor-pointer"
                  title="Simulator"
                >
                  <Zap className="w-4 h-4 text-cyan-600" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveSection("dashboard")}
                className="relative w-9 h-9 rounded-full bg-white/80 backdrop-blur-xl border border-white/80 flex items-center justify-center text-slate-700 hover:text-slate-900 shadow-2xs cursor-pointer"
                title={isHindi ? "डैशबोर्ड" : "Dashboard"}
              >
                <User className="w-4 h-4 text-slate-700" />
              </button>

              <div className="bg-white/80 backdrop-blur-xl rounded-full p-0.5 flex items-center border border-white/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIsHindi(false)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                    !isHindi ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setIsHindi(true)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight transition-all cursor-pointer ${
                    isHindi ? "bg-slate-900 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  हिंदी
                </button>
              </div>
            </div>
          </div>

          {/* CARD 1: READINESS (Apple Fluid Glass - Expanded Hero Banner) */}
          <div className="bg-[#EBEAE5] rounded-3xl py-8 px-6 shadow-[0_12px_40px_rgba(0,0,0,0.05)] border border-black/[0.04] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs tracking-wider text-slate-600 uppercase">
                {isHindi ? "तत्परता" : "READINESS"}
              </span>
            </div>

            <div className="mt-6 mb-3 text-center">
              <span className="text-7xl sm:text-8xl font-bold tracking-tight text-slate-900 font-sans leading-none block">
                {Math.round(typeof authoritativeReadiness === "number" ? authoritativeReadiness : 88)}%
              </span>
              
              {/* Centered 'Days Remaining' Pill under the percentage */}
              <div className="flex justify-center mt-3">
                <span className="bg-rose-500/10 border border-rose-500/20 text-rose-700 px-3.5 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-3xs animate-pulse">
                  {Math.max(0, 10 - currentDay)} {isHindi ? "दिन शेष" : "DAYS REMAINING"}
                </span>
              </div>
            </div>
          </div>

          {/* COMPACT MAINTAIN STEADY RHYTHM CARD */}
          <div
            id="home-steady-rhythm-compact"
            onClick={() => setShowTodaysGoalView(true)}
            className="bg-gradient-to-r from-[#FF2D55] via-[#FF375F] to-[#FF453A] rounded-[24px] p-3.5 px-4.5 shadow-[0_8px_24px_rgba(255,45,85,0.18)] flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-95 group relative overflow-hidden"
          >
            {/* Soft background glow overlay */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 blur-xl pointer-events-none" />

            <div className="flex items-center gap-3 relative z-10 min-w-0">
              {/* Compact Compass Icon */}
              <div className="w-8 h-8 rounded-full bg-white/20 border border-white/10 flex items-center justify-center text-white shrink-0">
                <Compass className="w-4.5 h-4.5 text-white stroke-[2.2]" />
              </div>
              
              <div className="min-w-0">
                <h3 className="text-[14px] sm:text-[15px] font-black tracking-tight text-white leading-tight truncate">
                  {isHindi ? "लय बनाए रखें" : "Maintain Steady Rhythm"}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-bold uppercase text-white/75 tracking-wider">
                    {isHindi ? "अगला कदम" : "NEXT STEP"}
                  </span>
                  <span className="px-1.5 py-0.5 bg-white/20 border border-white/15 text-white text-[8px] font-black rounded-full uppercase">
                    {isHindi ? `दिन ${currentDay}` : `DAY ${currentDay}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Small White Play Button */}
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md shadow-[#FF2D55]/20 shrink-0 group-hover:scale-105 transition-transform relative z-10">
              <Play className="w-3.5 h-3.5 text-[#FF2D55] fill-current ml-0.5" />
            </div>
          </div>

          {/* CARD 2: COMMERCIAL READINESS TRAJECTORY GRAPH (Stays in the Middle matching screenshot) */}
          <div className="w-full">
            <CommercialReadinessTrajectoryMiniCard
              newHire={newHire}
              currentDay={currentDay}
              isHindi={isHindi}
              onNavigateToProgress={() => setActiveSection("progress")}
            />
          </div>

          {/* CARD 3: MY SKILLS - 4 CORE AREAS (Light theme premium consistent rhythm styling) */}
          <div className="bg-[#EBEAE5] rounded-[28px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/[0.04] space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="font-extrabold text-[12px] tracking-wider text-[#18181B] uppercase">
                {isHindi ? "मेरा कौशल" : "MY SKILLS"}
              </span>
              <span className="text-[10px] font-black text-[#716F68] uppercase tracking-widest">
                {isHindi ? "4 मुख्य क्षेत्र" : "4 Core Areas"}
              </span>
            </div>

            {/* Square style cards in horizontal row matching screenshot styling, but with premium light consistent styles */}
            <div className="grid grid-cols-4 gap-2.5">
              {HOME_LEARNING_METRICS.map((metric) => {
                let isUpToDate = true;
                if (metric.id === "basics") {
                  isUpToDate = completedModulesCount >= 5 || demonstratedCount >= 2;
                } else if (metric.id === "accuracy") {
                  isUpToDate = !isAccuracyBad;
                } else if (metric.id === "exceptions") {
                  isUpToDate = blockerCount === 0;
                } else if (metric.id === "flow") {
                  isUpToDate = !isPickRateBad;
                }

                const IconComp = metric.icon;

                return (
                  <div
                    key={metric.id}
                    onClick={() => setActiveSection("modules")}
                    className="group flex flex-col items-center justify-center bg-white/80 border border-black/[0.03] text-slate-800 rounded-[24px] p-2.5 flex-1 min-h-[110px] hover:bg-white shadow-[0_4px_16px_rgba(0,0,0,0.02)] active:scale-95 transition-all cursor-pointer text-center"
                  >
                    {/* Centered Circular Icon with custom container matching screenshot structure, but in light theme */}
                    <div className="w-11 h-11 rounded-full bg-[#18181B]/8 flex items-center justify-center text-[#18181B] shrink-0 mb-2 group-hover:scale-105 transition-transform">
                      <IconComp className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    
                    {/* Label beneath icon */}
                    <span className="text-[11px] sm:text-[12px] font-black text-[#18181B] tracking-tight leading-none">
                      {isHindi ? metric.titleHi : metric.titleShortEn}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD 4: YESTERDAY PERFORMANCE CARD (Apple Fluid Glass) */}
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.05)] border border-white/90 ring-1 ring-black/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs tracking-wider text-slate-600 uppercase">
                {isHindi ? "कल का प्रदर्शन" : "YESTERDAY PERFORMANCE"}
              </span>
              <button
                type="button"
                onClick={() => setActiveModal("yesterday_detail")}
                className="text-xs font-black text-blue-600 hover:underline uppercase tracking-wider cursor-pointer"
              >
                {isHindi ? "सभी" : "VIEW ALL"}
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-700">Pick Rate</span>
                <span className="font-mono font-bold text-slate-900">{actualPickRate} u/hr</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-700">Accuracy</span>
                <span className="font-mono font-bold text-slate-900">{accuracyRate}%</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="font-bold text-slate-700">Variance</span>
                <span className="font-mono font-bold text-slate-900">0.00%</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="font-bold text-slate-700">Exceptions</span>
                <span className="font-mono font-bold text-slate-900">12</span>
              </div>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModal("yesterday_detail")}
                  className="p-1 text-slate-700 hover:text-slate-900 transition-transform active:scale-110 cursor-pointer"
                >
                  <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {renderGlobalModals()}

        <FloatingGlassMenu
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          isHindi={isHindi}
          hasAttention={isNeedsHelp || isSupportAssigned}
          buddyAssigned={isSupportAssigned}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-36 select-none min-h-screen relative bg-[#090D16] text-white overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-12 -left-20 w-96 sm:w-[650px] h-96 sm:h-[650px] bg-[#1d4ed8]/55 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-44 -right-20 w-96 sm:w-[650px] h-96 sm:h-[650px] bg-[#e11d48]/45 rounded-full blur-3xl pointer-events-none" />
      </div>

      {activeSection === "dial" && (
        <div className="relative min-h-screen bg-[#EBEAE5] animate-in fade-in duration-200">
          <TelemetryPageView
            isHindi={isHindi}
            onToggleLanguage={handleToggleLanguage}
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            onOpenScannerModal={() => setActiveModal("scanner")}
            onOpenMapModal={() => setActiveModal("map")}
            onOpenBuddyModal={() => setActiveSection("buddy")}
            pickRate={34}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. BUDDY: LET ME TALK TO SOMEONE (VOICE-FIRST & NATURAL)  */}
      {/* ========================================================= */}
      {activeSection === "buddy" && (
        <div className="space-y-4 animate-in fade-in duration-200 text-slate-900">
          {/* Buddy Profile & Live Floor Stance */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/Vikram%20Pic.jpeg"
                alt="Buddy Vikram"
                className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
              />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">{newHire.buddy}</h3>
                <p className="text-xs text-slate-500 font-medium">Senior Floor Buddy</p>
                <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-200/60">
                  🟢 {isHindi ? "फ्लोर पर हैं (Aisles 4-8)" : "On Floor (Aisles 4-8)"}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setBuddyAlertSent(true);
                setActiveModal("buddy");
              }}
              className="px-3.5 py-2 bg-slate-900 text-white rounded-full text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 shrink-0 hover:bg-slate-800"
            >
              <Phone className="w-4 h-4 text-white" />
              <span>{isHindi ? "बुलाएं" : "Call to Rack"}</span>
            </button>
          </div>

          {/* Voice-First Push-to-Talk Action Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3.5">
            <div className="text-center space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                {isHindi ? "विक्रम भैया से पूछें" : "Talk to Buddy Vikram"}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {isHindi
                  ? "माइक दबाकर सवाल बोलें, विक्रम भैया जवाब देंगे:"
                  : "Tap the mic and speak naturally. Vikram answers aloud:"}
              </p>
            </div>

            <button
              id="big-voice-speak-btn"
              type="button"
              onClick={handleToggleVoice}
              disabled={isProcessing}
              className={`w-full py-4 px-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all cursor-pointer ${
                isListening
                  ? "bg-rose-600 text-white ring-4 ring-rose-600/30 animate-pulse"
                  : "bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10"
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5 animate-spin" />
                  <span>{isHindi ? "🔴 सुन रहा हूं... बोलिए" : "🔴 Listening... Speak now"}</span>
                </>
              ) : isProcessing ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>{isHindi ? "समझ रहा हूं..." : "Understanding question..."}</span>
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  <span>{isHindi ? "बोल कर पूछें (Tap to Speak)" : "Tap to Speak"}</span>
                </>
              )}
            </button>

            {/* Collapsible text typing fallback for noisy floor */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowTextInput(!showTextInput)}
                className="text-xs text-slate-400 hover:text-white font-semibold underline underline-offset-2 cursor-pointer"
              >
                {showTextInput
                  ? isHindi ? "टाइपिंग छुपाएं" : "Hide typing"
                  : isHindi ? "या लिख कर पूछें" : "Or type question"}
              </button>
            </div>

            {showTextInput && (
              <div className="flex items-center gap-2 animate-in fade-in duration-100">
                <input
                  id="learner-text-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={isHindi ? "सवाल लिखें..." : "Type your question..."}
                  disabled={isProcessing}
                  className="flex-1 text-sm px-4 py-2.5 rounded-2xl border border-white/10 bg-black/35 focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-2xs font-medium text-white"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isProcessing || !inputText.trim()}
                  className="p-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-30 cursor-pointer transition-all active:scale-95 shrink-0"
                  title="Send"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Conversation Exchange Card */}
          {latestInteraction ? (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {isHindi ? "विक्रम भैया का जवाब" : "Vikram's Answer"}
                </span>
                <button
                  onClick={() => handlePlayAudio("latest-interaction", latestInteraction.replyText)}
                  className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-full cursor-pointer border border-blue-200/60"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>{isHindi ? "दोबारा सुनें" : "Replay"}</span>
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700 italic">
                🗣️ "{latestInteraction.userText}"
              </div>

              <p className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                {latestInteraction.replyText}
              </p>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={handleToggleVoice}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isHindi ? "दूसरा सवाल पूछें" : "Ask follow-up question"}</span>
                </button>
                <span className="text-xs text-slate-400 font-medium">{latestInteraction.timestamp}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 text-xs sm:text-sm text-slate-700 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="leading-snug font-medium">
                {isHindi
                  ? "माइक दबाकर बोलें या नीचे दिए गए आम सवालों में से एक चुनें।"
                  : "Tap the mic above or tap any quick question below."}
              </p>
            </div>
          )}

          {/* Voice Practice Situation Chips */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-slate-500 px-1">
              {isHindi ? "आम सवाल (टैप करें):" : "Quick Questions (Tap to Ask):"}
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(isHindi
                ? [
                    "आइसल 4 से 8 में सामान ढूंढना",
                    "दूध और दही का कोल्ड रूम कहां है?",
                    "स्कैनर बारकोड नहीं पढ़ रहा",
                    "सामान का पैकेट फटा हुआ है",
                    "भारी सामान टोट में कैसे रखें?",
                  ]
                : [
                    "Finding Aisles 4 to 8 items",
                    "Where is cold dairy?",
                    "Scanner not reading barcode",
                    "Damaged package check",
                    "Heavy items tote packing",
                  ]
              ).map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  disabled={isProcessing}
                  className="px-3.5 py-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 text-xs font-semibold whitespace-nowrap shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}



      {activeSection === "control_tower" && (
        <div className="relative z-10 min-h-screen bg-slate-50/50 -mx-4 -my-3 pb-36 animate-in fade-in duration-200">
          <ControlTowerView newHire={newHire} currentDay={currentDay} />
        </div>
      )}

      {activeSection === "progress" && (
        <div className="relative z-10 min-h-screen bg-[#EBEAE5] -mx-4 -my-3 pb-24 animate-in fade-in duration-200">
          <LearningProgressView newHire={newHire} currentDay={currentDay} isHindi={isHindi} />
        </div>
      )}

      {activeSection === "learner_dashboard" && (
        <div className="relative z-10 animate-in fade-in duration-200">
          <LearnerDashboardView newHire={newHire} currentDay={currentDay} />
        </div>
      )}
      {activeSection === "dashboard" && (
        <div className="space-y-4 animate-in fade-in duration-200 bg-white text-slate-900 min-h-screen pb-36 px-0 pt-0 -mx-4 -my-3">
          {/* Royal Blue Full-Bleed Dashboard Header */}
          <DashboardHeader
            newHire={newHire}
            currentDay={currentDay}
            isHindi={isHindi}
            onToggleLanguage={() => setIsHindi(!isHindi)}
            onSelectSection={(section) => setActiveSection(section)}
          />

          {/* DAY 10 COMMERCIAL CERTIFICATION (7 CRITERIA) - 7 EXPANDABLE STEPS */}
          <CommercialCertificationCard
            newHire={newHire}
            currentDay={currentDay}
            isHindi={isHindi}
            onOpenModules={() => setActiveSection("modules")}
            onOpenWorkTools={() => setActiveModal("work")}
            onOpenBuddy={() => setActiveSection("buddy")}
          />

          {/* DAILY SHIFT REPORT & CONTINUITY (CLICKABLE FOR FULL SUMMARY MODAL) */}
          <div className="mx-4">
            <LearnerDailyReportCard
              newHire={newHire}
              currentDay={currentDay}
              isHindi={isHindi}
              isDashboardVariant={true}
              onOpenDetailedModal={() => setActiveModal("yesterday_detail")}
              onOpenWorkTools={() => setActiveModal("work")}
              onOpenBuddy={() => setActiveSection("buddy")}
              onOpenModules={() => setActiveSection("modules")}
            />
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* FLOATING BAR MENU: APPLE GLASS TRANSLUCENT                */}
      {/* ========================================================= */}
      <FloatingGlassMenu
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        isHindi={isHindi}
        hasAttention={isNeedsHelp || isSupportAssigned}
        buddyAssigned={isSupportAssigned}
      />

      {/* ========================================================= */}
      {/* MODAL 1: DARK STORE AISLE & ITEM MAP                      */}
      {/* ========================================================= */}
      {renderGlobalModals()}
    </div>
  );
};
