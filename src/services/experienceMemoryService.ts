import {
  LoopExecutionInput,
  UnderstoodDiagnosis,
  DecidedAction,
} from "./intelligence";
import {
  RecommendedAction,
  ActionOutcome,
  ExperienceCase,
  ExperienceOutcomeState,
  ExperienceCaseStatus,
  ExperienceSituationSnapshot,
  ExperienceEvidenceSnapshot,
  ExperienceContextSnapshot,
  ExperienceFollowUpSnapshot,
  HistoricalExperienceQueryResult,
  V31ContextDomain,
} from "../types";
import { assembleV31EvidenceContext } from "./v31ContextService";

/**
 * V3.2 IMPLEMENTATION — DEAN EXPERIENCE MEMORY SERVICE
 * 
 * Preserves completed operational cases into structured historical experience:
 * SITUATION → CONTEXT → DIAGNOSIS → DECISION → ACTION → OUTCOME
 * 
 * STRICT MANDATES:
 * 1. Experience Memory is NOT a recommendation engine; it is historical evidence.
 * 2. DEAN remains the single intelligence / execution authority.
 * 3. Does NOT alter readiness, modify capability mastery, or call LLMs.
 * 4. Preserves both successful, partial, failed, and NO_MEASURABLE_OUTCOME experiences.
 */

// Global in-memory experience store
let experienceMemoryStore: ExperienceCase[] = [];

/**
 * Creates an Experience Case from canonical DEAN execution data.
 */
export function createExperienceCase(
  input: LoopExecutionInput,
  diagnosis?: UnderstoodDiagnosis,
  decidedAction?: DecidedAction | RecommendedAction,
  actionOutcome?: ActionOutcome,
  followUp?: ExperienceFollowUpSnapshot,
  explicitOutcomeState?: ExperienceOutcomeState
): ExperienceCase {
  const dayNumber = input.dayNumber;
  const hire = input.hire;
  const workSignal = input.workSignal;
  const dailySignal = input.dailySignal;
  const managerSignal = input.managerSignal;

  const v31Context = diagnosis?.v31Context || assembleV31EvidenceContext(input);
  const v31Obs = v31Context.observation;

  const situation: ExperienceSituationSnapshot = {
    observedMetric: v31Obs.metricName,
    observedValue: v31Obs.observedValue ?? workSignal?.actualPickRate,
    targetValue: v31Obs.targetValue ?? workSignal?.targetPickRate ?? 50,
    direction: v31Obs.direction,
    description: dailySignal?.issue || dailySignal?.rawText || managerSignal?.notes || `Day ${dayNumber} shift observation`,
    dayNumber,
  };

  const evidenceSnapshot: ExperienceEvidenceSnapshot = {
    canonicalEvidence: input.canonicalEvidence,
    workSignal: input.workSignal,
    dailySignal: input.dailySignal,
    managerSignal: input.managerSignal,
    v31Context,
  };

  const context: ExperienceContextSnapshot = {
    primaryDomains: v31Context.primaryDomains,
    overallAttribution: v31Context.overallAttribution,
    overallQuality: v31Context.overallQuality,
    capabilityId: diagnosis?.targetCapId || hire.currentCapabilityId || 3,
    roleTitle: hire.roleTitle || "Dark Store Picker",
  };

  // Determine outcome state strictly without fabrication
  let outcomeState: ExperienceOutcomeState = "NO_MEASURABLE_OUTCOME";

  if (explicitOutcomeState) {
    outcomeState = explicitOutcomeState;
  } else if (actionOutcome) {
    if (actionOutcome.improved === "yes") {
      outcomeState = "SUCCESS";
    } else if (actionOutcome.improved === "partial") {
      outcomeState = "PARTIAL";
    } else if (actionOutcome.improved === "no") {
      outcomeState = "FAILED";
    }
  } else if (followUp) {
    if (typeof followUp.measurableChange === "number") {
      outcomeState = followUp.measurableChange > 0 ? "SUCCESS" : (followUp.measurableChange < 0 ? "FAILED" : "PARTIAL");
    } else if (followUp.summaryNote) {
      outcomeState = "SUCCESS";
    }
  }

  const caseStatus: ExperienceCaseStatus =
    outcomeState !== "NO_MEASURABLE_OUTCOME" || actionOutcome || followUp
      ? "COMPLETED"
      : "IN_PROGRESS";

  const decisionAction = decidedAction
    ? ("actionType" in decidedAction ? decidedAction.actionType : decidedAction.decisionType)
    : "monitor";

  const actionExecuted = decidedAction
    ? ("title" in decidedAction ? decidedAction.title : decidedAction.actionTitle)
    : "Standard Observation";

  const caseId = `exp-${hire.id}-d${dayNumber}-${Date.now() % 1000000}`;

  return {
    id: caseId,
    hireId: hire.id,
    dayNumber,
    situation,
    evidenceSnapshot,
    context,
    diagnosisText: diagnosis?.diagnosisText,
    rootCause: diagnosis?.rootCause,
    patternCategory: diagnosis?.patternCategory,
    patternName: diagnosis?.patternName,
    decisionAction,
    actionExecuted,
    outcomeState,
    followUpEvidence: followUp,
    caseStatus,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Finalizes an existing in-progress Experience Case with follow-up outcome data.
 */
export function finalizeExperienceCase(
  existingCase: ExperienceCase,
  followUp: ExperienceFollowUpSnapshot,
  outcomeState: ExperienceOutcomeState
): ExperienceCase {
  return {
    ...existingCase,
    outcomeState,
    followUpEvidence: followUp,
    caseStatus: "COMPLETED",
  };
}

/**
 * Stores an Experience Case in memory.
 */
export function storeExperienceCase(experienceCase: ExperienceCase): void {
  const existingIdx = experienceMemoryStore.findIndex((c) => c.id === experienceCase.id);
  if (existingIdx >= 0) {
    experienceMemoryStore[existingIdx] = experienceCase;
  } else {
    experienceMemoryStore.push(experienceCase);
  }
}

/**
 * Retrieves all stored Experience Cases (optionally filtered by hire ID).
 */
export function getExperienceCases(hireId?: string): ExperienceCase[] {
  if (hireId) {
    return experienceMemoryStore.filter((c) => c.hireId === hireId);
  }
  return [...experienceMemoryStore];
}

/**
 * Clears the experience memory store (for testing or reset).
 */
export function clearExperienceMemoryStore(): void {
  experienceMemoryStore = [];
}

/**
 * Seeds the experience memory store with initial cases.
 */
export function seedExperienceMemoryStore(cases: ExperienceCase[]): void {
  experienceMemoryStore = [...cases];
}

/**
 * Deterministic retrieval mechanism for historical experience based on structured similarity.
 * MUST NOT rank interventions, make decisions, or bypass DEAN reasoning.
 */
export function findRelevantHistoricalExperiences(
  query:
    | LoopExecutionInput
    | {
        capabilityId?: number;
        situationText?: string;
        domain?: V31ContextDomain;
        actionType?: string;
        hireId?: string;
      },
  storeOverride?: ExperienceCase[]
): HistoricalExperienceQueryResult {
  const store = storeOverride || experienceMemoryStore;

  let targetCapabilityId: number | undefined;
  let queryText = "";
  let queryDomains: V31ContextDomain[] = [];

  if ("hire" in query) {
    // LoopExecutionInput
    targetCapabilityId = query.hire.currentCapabilityId;
    queryText = `${query.dailySignal?.issue || ""} ${query.dailySignal?.rawText || ""} ${query.managerSignal?.notes || ""}`.toLowerCase();
    const v31Ctx = assembleV31EvidenceContext(query);
    queryDomains = v31Ctx.primaryDomains;
  } else {
    targetCapabilityId = query.capabilityId;
    queryText = (query.situationText || "").toLowerCase();
    if (query.domain) {
      queryDomains = [query.domain];
    }
  }

  // Filter relevant historical cases based on structured similarity
  const relevantCases = store.filter((c) => {
    const capMatch = targetCapabilityId !== undefined && (c.context.capabilityId === targetCapabilityId);
    
    const domainMatch = queryDomains.some((d) => c.context.primaryDomains?.includes(d));

    const textMatch =
      queryText.length > 0 &&
      (c.situation.description.toLowerCase().includes(queryText) ||
        queryText.includes(c.situation.description.toLowerCase()) ||
        (c.diagnosisText && c.diagnosisText.toLowerCase().includes(queryText)));

    return capMatch || domainMatch || textMatch;
  });

  const hasSuccessfulPrecedents = relevantCases.some((c) => c.outcomeState === "SUCCESS");
  const hasFailedPrecedents = relevantCases.some((c) => c.outcomeState === "FAILED");
  const hasContradictoryPrecedents = hasSuccessfulPrecedents && hasFailedPrecedents;

  return {
    querySituation: queryText || `Capability ${targetCapabilityId || "General"}`,
    targetCapabilityId,
    relevantCases,
    totalMatchesCount: relevantCases.length,
    hasSuccessfulPrecedents,
    hasFailedPrecedents,
    hasContradictoryPrecedents,
  };
}
