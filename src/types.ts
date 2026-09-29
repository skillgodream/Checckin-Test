import { CanonicalEvidence } from "./services/intelligence";

export type NewHireStatus = "Doing well" | "Needs attention" | "At risk";
export type LearnerSection = "home" | "modules" | "journey" | "dial" | "dashboard" | "buddy" | "control_tower" | "progress" | "learner_dashboard" | "todays_goal";

export type TransferStatus = 
  | "NOT_TESTED"
  | "EMERGING"
  | "TRANSFERRED"
  | "BREAKS_UNDER_VARIATION"
  | "INSUFFICIENT_EVIDENCE";

export interface VariationContext {
  contextType: string; // e.g., "zone", "workload", "scanner_condition"
  contextKey: string;  // e.g., "Zone-B", "high_congestion"
  observedDay: number;
  capabilityId: number;
  performanceEvidence: "pass" | "fail" | "needs_support";
  outcome: string;
  sourceEvidenceIds: string[];
}

export interface TransferEvidence {
  capabilityId: number;
  baselineContext: string;
  variationContexts: VariationContext[];
  transferStatus: TransferStatus;
  supportingEvidenceIds: string[];
  observedDays: number[];
}

export type SignalCategory =
  | "Environment"
  | "Process"
  | "Tool"
  | "Confidence"
  | "Physical"
  | "General";

export type ManagerIssueType =
  | "Speed"
  | "Accuracy"
  | "Process"
  | "Tool"
  | "Confidence"
  | "Other";

export type ActionType =
  | "buddy_walkthrough"
  | "manager_observation"
  | "demonstrate_task"
  | "explain_process"
  | "provide_sop"
  | "let_try_again"
  | "practice"
  | "clarify_expectations"
  | "escalate_issue"
  | "no_action";

// ==========================================
// 20 Capabilities Universe (Dark Store Picker)
// ==========================================

export type CapabilityCategory =
  | "Foundations & Safety"
  | "Core Fulfillment & Accuracy"
  | "Exceptions & Pacing"
  | "Dispatch & Autonomous Ops";

export interface CapabilityDefinition {
  id: number;                     // 1 to 20
  code: string;                   // e.g. "DSP-03-LOCATION-NAV"
  name: string;                   // Human readable capability name
  description: string;
  category: CapabilityCategory;
  defaultOrder: number;           // Normal sequence: 1 -> 20
  prerequisites: number[];        // Required predecessor capability IDs
  targetMetrics?: {
    minPickRate?: number;         // items/hr
    minAccuracy?: number;         // percentage
  };
}

// 4 Distinct Dimensions: Module Completion != Capability Mastery
export type ExposureState = "not_exposed" | "exposed" | "reinforced";
export type EvidenceLevel = "none" | "emerging" | "demonstrated" | "inconsistent";
export type PerformanceHealth = "below_target" | "on_target" | "exceeding" | "unknown";
export type MasteryStatus = "locked" | "in_progress" | "proficient" | "mastered";

export interface CapabilityState {
  capabilityId: number;
  exposure: ExposureState;
  evidence: EvidenceLevel;
  performance: PerformanceHealth;
  mastery: MasteryStatus;
  lastAssessedAt: string;
  reinforcementCount: number;
  notes?: string;
}

// Adaptive Gear Shift Decisions
export type AdaptiveGearDecision =
  | "advance_default"        // Move to default next capability (1 -> 2 -> 3)
  | "reinforce_current"      // Repeat or practice current capability (3 -> 3 reinforce)
  | "return_prerequisite"    // Step back to unmastered prerequisite (5 -> 2)
  | "jump_ahead"             // Worker demonstrated skill; leap ahead (3 -> 8)
  | "buddy_support"          // Senior peer floor walkthrough
  | "supervisor_demo"        // 10-minute supervisor standard demonstration
  | "tool_remedy"            // Fix hardware/terminal/scanner issue
  | "process_support"        // Floor SOP or workflow clarification
  | "environment_support"    // Layout, aisle shelf labeling or signage adjustment
  | "communication_support"  // Shift briefing or peer confidence check-in
  | "no_action_monitor";     // Smooth progression; continue quiet observation

export const DARK_STORE_CAPABILITIES: CapabilityDefinition[] = [
  {
    id: 1,
    code: "DSP-01-SAFETY-ZONES",
    name: "Store Safety",
    description: "Emergency exits, slip hazard prevention, safety shoe compliance, and main floor traffic thoroughfares.",
    category: "Foundations & Safety",
    defaultOrder: 1,
    prerequisites: [],
  },
  {
    id: 2,
    code: "DSP-02-SCANNER-BASICS",
    name: "Scanner Basics",
    description: "Terminal login, Bluetooth ring-scanner pairing, battery dock exchange, and basic barcode aiming.",
    category: "Foundations & Safety",
    defaultOrder: 2,
    prerequisites: [1],
  },
  {
    id: 3,
    code: "DSP-03-LOCATION-NAV",
    name: "Coordinate Navigation",
    description: "Reading the Rack-Bay-Shelf-Bin coordinate numbering system (Aisles 1–8) and navigating high-frequency zones.",
    category: "Foundations & Safety",
    defaultOrder: 3,
    prerequisites: [2],
    targetMetrics: { minPickRate: 35 },
  },
  {
    id: 4,
    code: "DSP-04-COLD-CHAIN-ENTRY",
    name: "Cold Room Protocols",
    description: "Chilled dairy/beverage room entry, thermal gear usage, fast door-close discipline, and lens condensation clearing.",
    category: "Foundations & Safety",
    defaultOrder: 4,
    prerequisites: [1, 3],
  },
  {
    id: 5,
    code: "DSP-05-SINGLE-ORDER-PICK",
    name: "Single-Order Pick",
    description: "Accepting a single customer order on terminal, following the directed pick path, and confirming bin barcode scans.",
    category: "Foundations & Safety",
    defaultOrder: 5,
    prerequisites: [2, 3],
    targetMetrics: { minPickRate: 40, minAccuracy: 98 },
  },
  {
    id: 6,
    code: "DSP-06-VARIANT-CHECK",
    name: "Variant Differentiation",
    description: "Distinguishing look-alike packaging variants (e.g. 200g vs 500g pouch, diet vs regular) before scanning.",
    category: "Core Fulfillment & Accuracy",
    defaultOrder: 6,
    prerequisites: [5],
    targetMetrics: { minAccuracy: 99 },
  },
  {
    id: 7,
    code: "DSP-07",
    name: "Produce Weighment",
    description: "Selecting fresh produce, visual quality check, digital scale taring, and price look-up barcode printing.",
    category: "Core Fulfillment & Accuracy",
    defaultOrder: 7,
    prerequisites: [5],
  },
  {
    id: 8,
    code: "DSP-08-FRAGILE-HANDLING",
    name: "Fragile Handling",
    description: "Careful handling of eggs, glass jars, and bakery items; preventing crushing under heavy staples.",
    category: "Core Fulfillment & Accuracy",
    defaultOrder: 8,
    prerequisites: [5],
  },
  {
    id: 9,
    code: "DSP-09-MULTI-QTY-PICK",
    name: "Multi-Item Batching",
    description: "Accurately picking multiple identical items (e.g. 6x instant noodles), verifying exact unit count into tote.",
    category: "Core Fulfillment & Accuracy",
    defaultOrder: 9,
    prerequisites: [5, 6],
    targetMetrics: { minPickRate: 45 },
  },
  {
    id: 10,
    code: "DSP-10-TOTE-PACKING",
    name: "Tote Balancing",
    description: "Heavy grocery items at bottom, chemical isolation from food products, and optimal tote space utilization.",
    category: "Core Fulfillment & Accuracy",
    defaultOrder: 10,
    prerequisites: [8, 9],
  },
  {
    id: 11,
    code: "DSP-11-STOCK-EXCEPTIONS",
    name: "Stock Exceptions",
    description: "Executing 30-sec secondary shelf checks, backstock bin queries, and system-approved digital substitutions.",
    category: "Exceptions & Pacing",
    defaultOrder: 11,
    prerequisites: [3, 5],
  },
  {
    id: 12,
    code: "DSP-12-DAMAGED-QC",
    name: "Damaged Goods & QC",
    description: "Inspecting expiration dates, seal integrity, and dented packaging; routing damaged items to quarantine bin.",
    category: "Exceptions & Pacing",
    defaultOrder: 12,
    prerequisites: [5, 6],
  },
  {
    id: 13,
    code: "DSP-13-MANUAL-BARCODE",
    name: "Manual Barcode Entry",
    description: "Rapid manual 13-digit EAN entry on terminal when product barcodes are smudged, torn, or unreadable.",
    category: "Exceptions & Pacing",
    defaultOrder: 13,
    prerequisites: [2, 5],
  },
  {
    id: 14,
    code: "DSP-14-ROUTE-OPTIMIZE",
    name: "Route Optimization",
    description: "Anticipating next pick along serpentine layout to eliminate backtracking and reduce unnecessary floor walking.",
    category: "Exceptions & Pacing",
    defaultOrder: 14,
    prerequisites: [3, 5, 9],
    targetMetrics: { minPickRate: 50 },
  },
  {
    id: 15,
    code: "DSP-15-SLA-TIMER-PACING",
    name: "SLA Timer Pacing",
    description: "Pacing under 10-minute delivery countdown timers; escalating pick bottlenecks before SLA breaches occur.",
    category: "Exceptions & Pacing",
    defaultOrder: 15,
    prerequisites: [9, 14],
    targetMetrics: { minPickRate: 50 },
  },
  {
    id: 16,
    code: "DSP-16-DISPATCH-HANDOFF",
    name: "Dispatch Staging",
    description: "Transporting completed pick totes to dispatch buffer, scanning tote barcodes, and handoff to QC checkers.",
    category: "Dispatch & Autonomous Ops",
    defaultOrder: 16,
    prerequisites: [5, 10],
  },
  {
    id: 17,
    code: "DSP-17-RIDER-BAG-SEAL",
    name: "Rider Bag Sealing",
    description: "Securing tamper-evident zip seals and thermal insulation bags for chilled goods prior to rider dispatch.",
    category: "Dispatch & Autonomous Ops",
    defaultOrder: 17,
    prerequisites: [4, 16],
  },
  {
    id: 18,
    code: "DSP-18-TEAM-ESCALATION",
    name: "Floor Escalation",
    description: "Proactively reporting aisle congestion, inventory discrepancies, and hazards via floor radio or shift supervisor.",
    category: "Dispatch & Autonomous Ops",
    defaultOrder: 18,
    prerequisites: [1, 11],
  },
  {
    id: 19,
    code: "DSP-19-SHIFT-CLOSEOUT",
    name: "Shift Closeout",
    description: "Returning handheld terminals to battery charging docks, sanitizing pick totes, and completing shift log.",
    category: "Dispatch & Autonomous Ops",
    defaultOrder: 19,
    prerequisites: [2],
  },
  {
    id: 20,
    code: "DSP-20-AUTONOMOUS-MASTERY",
    name: "Autonomous Picking",
    description: "Sustaining independent high-velocity picking across all 8 dark-store aisles with 50+ items/hr and 99% accuracy.",
    category: "Dispatch & Autonomous Ops",
    defaultOrder: 20,
    prerequisites: [14, 15, 16],
    targetMetrics: { minPickRate: 50, minAccuracy: 99 },
  },
];

export interface DailySignal {
  id?: string;
  dayNumber?: number;
  rawText?: string;
  inputMethod?: "voice" | "text" | "quick_select";
  issue?: string;
  confidence?: "Low" | "Medium" | "High";
  possibleImpact?: string;
  category?: SignalCategory;
  summary?: string;
  companionResponse?: string;
  timestamp?: string;
  helpRequestsCount?: number;
}

export interface ManagerSignal {
  id?: string;
  dayNumber?: number;
  managerName?: string;
  state: "Doing well" | "Needs support" | "Struggling";
  issueCategory?: ManagerIssueType;
  notes?: string;
  timestamp?: string;
}

export interface WorkSignal {
  dayNumber?: number;
  targetPickRate?: number; // e.g. 50 items/hr
  actualPickRate?: number; // e.g. 35 items/hr
  accuracyRate?: number; // e.g. 98%
  ordersCompleted?: number;
  targetOrders?: number;
  gapIdentified?: string;
  externalBottleneck?: string;
  helpRequestsCount?: number;
  hasWorkEvidence?: boolean;
  navigationTime?: number;
  scannerErrors?: number;
  congestion?: boolean;
  multipleWorkersAffected?: boolean;
}

export interface IdentifiedPattern {
  id: string;
  dayNumber: number;
  patternName: string;
  patternConfidence: "High" | "Medium" | "Low";
  diagnosis: string;
  category: SignalCategory;
  connectedSignalSummary: string[];
  detectedAt: string;
}

export interface RecommendedAction {
  id: string;
  dayNumber: number;
  actionType: ActionType;
  title: string;
  description: string;
  targetActor: string;
  urgency: "Immediate" | "Next Shift" | "Monitor";
  smallestPracticalStep: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  createdAt: string;
  // Adaptive Intelligence attributes
  decisionType?: AdaptiveGearDecision;
  targetCapabilityId?: number; // Target capability 1..20 if capability-related
  rationale?: string;          // Why this intervention was chosen over a curriculum step
  whyThisAction?: string;      // Explanatory rationale
}

export interface CandidatePattern {
  isPattern: boolean;
  category?: "Recurring Capability Issue" | "Persistent Performance Gap" | "Intervention Response" | "Intervention Failure / Partial Response" | "Environmental Pattern" | "Improvement Pattern" | "Evidence Gap";
  supportingEvidence?: string;
}

export interface ActionOutcome {
  id?: string;
  actionId?: string;
  dayNumber?: number;
  performedBy?: string;
  performedAt?: string;
  improved?: "yes" | "no" | "partial";
  notes?: string;
  subsequentPickRate?: number;
  subsequentAccuracy?: number;
  evaluatedAt?: string;
  // Treatment Memory Context (AI Interpreted)
  treatmentContext?: {
    reason?: string;
    remainingIssue?: string;
  };
}

export interface DayRecord {
  dayNumber: number;
  date?: string;
  dailySignal?: DailySignal;
  managerSignal?: ManagerSignal;
  workSignal?: WorkSignal;
  identifiedPattern?: IdentifiedPattern;
  recommendedAction?: RecommendedAction;
  actionOutcome?: ActionOutcome;
  statusAtEnd?: NewHireStatus;
  statusAtEndOfDay?: NewHireStatus;
  statusReason?: string;
  canonicalEvidence?: CanonicalEvidence;
}

export interface ModuleActivity {
  id: string;
  type: "video" | "quiz" | "simulation" | "practice" | "assessment";
  title: string;
  titleHi?: string;
  durationMinutes: number;
  completed: boolean;
  score?: number; // e.g. 95%
}

export interface TrainingModule {
  dayNumber: number; // 1 to 10
  id: string;        // e.g. "lms-mod-01"
  code: string;      // e.g. "LMS-MOD-01"
  title: string;
  titleHi?: string;
  description: string;
  descriptionHi?: string;
  durationMinutes: number;
  mappedCapabilityIds: number[];
  activities: ModuleActivity[];
  passingScore: number;
}

export interface NewHire {
  id: string;
  name: string;
  roleId?: string;
  roleTitle: string;
  storeLocation?: string;
  avatar?: string;
  startDate: string;
  currentDay: number; // Logged shift days in ramp
  shift?: string;
  supervisor?: string;
  buddy?: string;
  status: NewHireStatus;
  statusReason: string;
  recommendedActionSnippet?: string;
  // Adaptive Intelligence & Training Journey extensions
  modulesCompleted?: number;                  // 0-10 mandatory LMS modules completed
  quizAverageScore?: number;                  // LMS quiz score % (e.g. 95)
  completedModuleIds?: string[];               // List of completed module IDs
  currentCapabilityId?: number;                // Primary capability currently active/focused
  overallReadinessScore?: number;             // 0-100% summary of verified floor capabilities
  capabilities?: Record<number, CapabilityState>; // Ledger of all 20 capabilities
  day10Evaluation?: any;
  daysHistory: DayRecord[];
  learnerStateV2?: LearnerStateV2;            // Phase 1B: Structured longitudinal memory & context
}

// ==========================================
// Phase 1B: Learner State V2 Foundation Specifications
// ==========================================

export type TrajectoryRecencyTrend = "improving" | "stable" | "declining" | "insufficient_evidence";
export type TrajectoryStabilityIndex = "stable" | "fluctuating" | "erratic" | "insufficient_evidence";

export interface CurrentStateV2 {
  currentDay: number;
  currentCapabilityId?: number;
  activeBlockerCount: number;
  hasUnresolvedBlockers: boolean;
  currentShiftFriction?: string;
  helpRequestsCount: number;
  modulesCompleted: number;
  overallReadinessScore: number;
}

export interface TrajectoryMemoryV2 {
  recencyTrend: TrajectoryRecencyTrend;
  velocity: number | null;        // Delta readiness points / shift over available history (null if < 2 points)
  acceleration: number | null;    // Rate of change of velocity (null if < 3 points)
  stabilityIndex: TrajectoryStabilityIndex;
  dataPointCount: number;
}

export interface CapabilityMemoryRecordV2 {
  capabilityId: number;
  firstExposedDay: number | null; // Earliest day with evidence-supported exposure
  attemptsCount: number;          // Count of shifts with work/practice/assessment evidence
  failureCount: number;           // Count of below-target/friction shifts
  prerequisiteStruggles: number[];// Capability IDs of prerequisites that caused friction
  masteryDay: number | null;      // First day where mastery === "mastered"
}

export type LearningDebtStatus = "ACTIVE_DEBT" | "RECOVERING_DEBT" | "PREREQUISITE_BLOCKER";

export interface LearningDebtItemV2 {
  capabilityId: number;
  status: LearningDebtStatus;
  ageInShifts: number;
  impactedFutureCapIds: number[];
  attemptedInterventions: string[]; // Action types attempted for this capability
}

export interface LearningDebtV2 {
  activeDebts: LearningDebtItemV2[];
}

export type InterventionOutcomeStatus = "SUCCESS" | "PARTIAL" | "FAILED";

export interface InterventionMemoryItemV2 {
  dayNumber: number;
  actionType: string;
  targetCapabilityId?: number;
  outcome: InterventionOutcomeStatus;
  recoveryShifts: number | null; // Null if recovery duration cannot be reliably determined
  notes?: string;
}

export interface InterventionMemoryV2 {
  history: InterventionMemoryItemV2[];
}

export interface LearnerStateV2 {
  currentState: CurrentStateV2;
  trajectoryMemory: TrajectoryMemoryV2;
  capabilityMemory: Record<number, CapabilityMemoryRecordV2>;
  transferEvidence: Record<number, TransferEvidence>;
  learningDebt: LearningDebtV2;
  interventionMemory: InterventionMemoryV2;
  futureContext?: FutureContextV1;
}

// ==========================================
// Phase 2B: Future Context V1 Specifications
// ==========================================

export type FutureBottleneckStatus = "POTENTIAL" | "ACTIVE" | "RESOLVED" | "INSUFFICIENT_EVIDENCE";

export interface FutureBottleneckItemV1 {
  capabilityId: number;
  status: FutureBottleneckStatus;
  prerequisiteForCapIds: number[];
  reason: string;
}

export interface FutureContextV1 {
  futureBottlenecks: FutureBottleneckItemV1[];
  silentDriftDetected: boolean;
  accelerationEligible: boolean;
  forecastedTrajectoryTrend: TrajectoryRecencyTrend;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  storeName: string;
  totalNewHires: number;
  doingWellCount: number;
  needsAttentionCount: number;
  atRiskCount: number;
  commonProblems: { problem: string; count: number; impact: string }[];
  emergingPatterns: { pattern: string; trend: string; impactedCount: number }[];
  urgentAttentionIds: string[];
}

// ==========================================
// 19 Evidence Categories for Intelligence Snapshot & Dashboard
// ==========================================
export type SnapshotEvidenceCategory =
  | "required_training_incomplete"
  | "training_completed"
  | "assessment_weakness"
  | "work_performance"
  | "accuracy"
  | "productivity"
  | "independence"
  | "repeated_help_dependency"
  | "capability_gap"
  | "tool_problem"
  | "environment_problem"
  | "process_problem"
  | "safety_issue"
  | "intervention_performed"
  | "intervention_succeeded"
  | "intervention_failed"
  | "recovery_improvement"
  | "no_meaningful_problem"
  | "insufficient_evidence";

export interface SnapshotEvidenceItem {
  id: string;
  category: SnapshotEvidenceCategory;
  titleEn: string;
  titleHi: string;
  metricValue?: string;
  metricUnit?: string;
  contextTextEn: string;
  contextTextHi: string;
  badgeEn?: string;
  badgeHi?: string;
  iconName: "TrendingUp" | "ShieldCheck" | "Package" | "AlertTriangle" | "CheckCircle2" | "BookOpen" | "UserCheck" | "Wrench" | "Compass" | "Sparkles" | "ThumbsUp" | "HelpCircle" | "Clock";
  themeColor: "purple" | "emerald" | "amber" | "blue" | "rose" | "indigo" | "slate";
  progressPct?: number;
  priorityWeight: number; // Higher weight = higher priority for Home 4-grid selection
  source?: string;
  evidenceType?: string;
  timestampDay?: number;
  observedValue?: string | number;
  capabilityId?: number;
  confidence?: "high" | "medium" | "low";
  comparisonToPrevious?: string;
  direction?: "supporting" | "conflicting" | "neutral";
}

// ==========================================
// V3.1 Implementation — Evidence & Context Intelligence Types
// ==========================================

export type V31ContextDomain =
  | "learner"
  | "capability"
  | "work_environment"
  | "technology"
  | "process"
  | "human_manager"
  | "temporal_history";

export type V31EvidenceSource =
  | "work_signal"
  | "capability_ledger"
  | "manager_signal"
  | "tool_system"
  | "environment_process"
  | "historical_trajectory";

export type V31RelationshipToObservation =
  | "supports"
  | "contradicts"
  | "contextualizes"
  | "unrelated"
  | "unknown";

export type V31AttributionContext =
  | "learner"
  | "environment"
  | "mixed"
  | "unknown"
  | "not_yet_assessed";

export type V31EvidenceQuality =
  | "strong"
  | "moderate"
  | "weak"
  | "insufficient";

export interface V31ContextualEvidenceItem {
  id: string;
  source: V31EvidenceSource;
  domain: V31ContextDomain;
  description: string;
  relationship: V31RelationshipToObservation;
  quality: V31EvidenceQuality;
  metricName?: string;
  value?: number | string;
  timestampDay?: number;
}

export interface V31ObservedOutcome {
  metricName: string;
  observedValue?: number | string;
  targetValue?: number | string;
  direction: "declining" | "improving" | "stable" | "anomalous" | "unknown";
  dayNumber: number;
}

export interface V31EvidenceContext {
  observation: V31ObservedOutcome;
  contextualItems: V31ContextualEvidenceItem[];
  primaryDomains: V31ContextDomain[];
  overallAttribution: V31AttributionContext;
  overallQuality: V31EvidenceQuality;
  supportingCount: number;
  contradictingCount: number;
  hasCorroboration: boolean;
  hasCompetingFactors: boolean;
}

// ==========================================
// V3.3 — DEAN 360° EVIDENCE STREAM TYPES
// ==========================================

export type EvidenceSourceDomain =
  | "WORK_SIGNAL"
  | "MANAGER_SIGNAL"
  | "DAILY_SIGNAL"
  | "ACTION_OUTCOME"
  | "TOOL_SIGNAL"
  | "ENVIRONMENT_SIGNAL"
  | "SAFETY_SIGNAL"
  | "CAPABILITY_EVIDENCE"
  | "PRACTICE_RESULT"
  | "EXPERIENCE_MEMORY"
  | "LEARNER_TRAJECTORY";

export interface EvidenceStreamEvent {
  eventId: string;
  sourceDomain: EvidenceSourceDomain;
  hireId: string;
  dayNumber: number;
  timestamp: string;
  signalType: string; // e.g. "PICK_RATE_METRIC", "MANAGER_OBSERVATION", "SCANNER_FAILURE"
  payload: Record<string, any>;
  directionalChange?: "improving" | "declining" | "stable" | "anomalous" | "unknown";
  evidenceQuality?: V31EvidenceQuality;
  provenance: {
    sourceName: string;
    rawText?: string;
    inputMethod?: string;
  };
  temporalContext: {
    shiftDay: number;
    shiftPhase?: string;
  };
}

export interface EvidenceStream {
  hireId: string;
  dayNumber: number;
  assembledAt: string;
  totalEventsCount: number;
  events: EvidenceStreamEvent[];
  domainBreakdown: Record<EvidenceSourceDomain, number>;
  hasContradictorySignals: boolean;
}

// ==========================================
// V3.4 — DEAN CAUSAL CAPABILITY INTELLIGENCE TYPES
// ==========================================

export type RelationshipType = 
  | "PREREQUISITE_OF"
  | "INFLUENCES_OUTCOME"
  | "OBSERVABLE_THROUGH"
  | "OPERATIONAL_CONTEXT_FOR";

export interface CausalRelationship {
  sourceId: string; // e.g., "CAP-3" or "EV-PICK-RATE"
  targetId: string; // e.g., "CAP-5" or "EV-CYCLE-TIME"
  type: RelationshipType;
  strength?: "High" | "Medium" | "Low";
  context?: string;
}

export interface ActionAuditLog {
  id: string;
  hireId: string;
  dayNumber: number;
  timestamp: string;
  decidedAction: any; // Using any for governance result type to avoid circular dependencies
  governanceResult: any;
  evidenceSummary: string;
  rationale: string;
}

export type ExperienceOutcomeState =
  | "SUCCESS"
  | "PARTIAL"
  | "FAILED"
  | "NO_MEASURABLE_OUTCOME";

export type ExperienceCaseStatus = "IN_PROGRESS" | "COMPLETED" | "CLOSED";

export interface ExperienceSituationSnapshot {
  observedMetric?: string;
  observedValue?: number | string;
  targetValue?: number | string;
  direction?: "declining" | "improving" | "stable" | "anomalous" | "unknown";
  description: string;
  dayNumber: number;
}

export interface ExperienceEvidenceSnapshot {
  canonicalEvidence?: CanonicalEvidence;
  workSignal?: WorkSignal;
  dailySignal?: DailySignal;
  managerSignal?: ManagerSignal;
  v31Context?: V31EvidenceContext;
}

export interface ExperienceContextSnapshot {
  primaryDomains?: V31ContextDomain[];
  overallAttribution?: V31AttributionContext;
  overallQuality?: V31EvidenceQuality;
  capabilityId?: number;
  roleTitle?: string;
  environmentalFactors?: string[];
}

export interface ExperienceFollowUpSnapshot {
  postActionMetric?: number | string;
  measurableChange?: number | string;
  recoveryTimeDays?: number;
  summaryNote?: string;
}

export interface ExperienceCase {
  id: string;
  hireId: string;
  dayNumber: number;
  situation: ExperienceSituationSnapshot;
  evidenceSnapshot: ExperienceEvidenceSnapshot;
  context: ExperienceContextSnapshot;
  diagnosisText?: string;
  rootCause?: string;
  patternCategory?: SignalCategory;
  patternName?: string;
  decisionAction: string; // Canonical action type or title
  actionExecuted: string;
  outcomeState: ExperienceOutcomeState;
  followUpEvidence?: ExperienceFollowUpSnapshot;
  caseStatus: ExperienceCaseStatus;
  timestamp: string;
}

export interface HistoricalExperienceQueryResult {
  querySituation?: string;
  targetCapabilityId?: number;
  relevantCases: ExperienceCase[];
  totalMatchesCount: number;
  hasSuccessfulPrecedents: boolean;
  hasFailedPrecedents: boolean;
  hasContradictoryPrecedents: boolean;
}


