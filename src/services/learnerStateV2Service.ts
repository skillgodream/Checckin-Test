import {
  NewHire,
  LearnerStateV2,
  CurrentStateV2,
  TrajectoryMemoryV2,
  CapabilityMemoryRecordV2,
  LearningDebtV2,
  LearningDebtItemV2,
  LearningDebtStatus,
  InterventionMemoryV2,
  InterventionMemoryItemV2,
  InterventionOutcomeStatus,
  FutureContextV1,
  FutureBottleneckItemV1,
  FutureBottleneckStatus,
  DARK_STORE_CAPABILITIES,
  CapabilityState,
  TransferStatus,
  VariationContext,
  TransferEvidence,
} from "../types";

/**
 * PHASE 1B — LEARNER STATE V2 FOUNDATION SERVICE
 * 
 * Pure, deterministic supporting functions that reconstruct LearnerStateV2 from
 * authoritative existing NewHire data, shift logs (daysHistory), capability ledgers,
 * and evidence records.
 * 
 * CORE PRINCIPLE:
 * IDEAL PATH ≠ ACTUAL PATH
 * Evidence describes what happened. Learner State remembers.
 * DEAN remains the sole decision & intelligence authority.
 */

export function deriveCurrentStateV2(hire: NewHire): CurrentStateV2 {
  const history = hire.daysHistory || [];
  const latestRecord = history.length > 0 ? history[history.length - 1] : undefined;

  const helpRequestsCount =
    latestRecord?.workSignal?.helpRequestsCount ||
    latestRecord?.dailySignal?.helpRequestsCount ||
    0;

  const currentShiftFriction =
    latestRecord?.dailySignal?.issue ||
    latestRecord?.managerSignal?.notes ||
    undefined;

  const unresolvedBlockers = hire.day10Evaluation?.unresolvedBlockers || [];
  
  // Count active blockers from day10Evaluation or unmastered past-scheduled capabilities
  const caps = hire.capabilities || {};
  let capBlockersCount = 0;
  Object.values(caps).forEach((cap) => {
    if (cap.performance === "below_target" || cap.evidence === "inconsistent") {
      capBlockersCount++;
    }
  });

  const activeBlockerCount = Math.max(unresolvedBlockers.length, capBlockersCount);

  return {
    currentDay: hire.currentDay,
    currentCapabilityId: hire.currentCapabilityId,
    activeBlockerCount,
    hasUnresolvedBlockers: activeBlockerCount > 0,
    currentShiftFriction,
    helpRequestsCount,
    modulesCompleted: hire.modulesCompleted || 0,
    overallReadinessScore: hire.overallReadinessScore || 0,
  };
}

export function deriveTrajectoryMemoryV2(hire: NewHire): TrajectoryMemoryV2 {
  const history = hire.daysHistory || [];
  
  // Extract historical data points from shift history
  const points = history
    .filter((d) => d.workSignal !== undefined || d.canonicalEvidence !== undefined)
    .map((d) => {
      // Pick rate or accuracy or score proxy
      const uph = d.workSignal?.actualPickRate || 0;
      const acc = d.workSignal?.accuracyRate || 0;
      // Synthetic shift score combining accuracy and UPH pacing
      const shiftScore = Math.min(100, Math.round(acc * 0.6 + (uph / 50) * 40));
      return { day: d.dayNumber, score: shiftScore, uph, acc };
    });

  const dataPointCount = points.length;

  // Rule 9.2: Insufficient Evidence check
  if (dataPointCount < 2) {
    return {
      recencyTrend: "insufficient_evidence",
      velocity: null,
      acceleration: null,
      stabilityIndex: "insufficient_evidence",
      dataPointCount,
    };
  }

  // Calculate overall velocity over available history
  const firstPt = points[0];
  const latestPt = points[points.length - 1];
  const daySpan = Math.max(1, latestPt.day - firstPt.day);
  const velocity = Math.round(((latestPt.score - firstPt.score) / daySpan) * 10) / 10;

  // Rule 9.1: Three shifts are a RECENCY WINDOW
  const recentSlice = points.slice(-3);
  let recencyTrend: TrajectoryMemoryV2["recencyTrend"] = "stable";
  let acceleration: number | null = null;

  if (recentSlice.length >= 2) {
    const recentFirst = recentSlice[0];
    const recentLatest = recentSlice[recentSlice.length - 1];
    const recentSpan = Math.max(1, recentLatest.day - recentFirst.day);
    const recentVelocity = (recentLatest.score - recentFirst.score) / recentSpan;

    if (recentVelocity > 1.5) {
      recencyTrend = "improving";
    } else if (recentVelocity < -1.5) {
      recencyTrend = "declining";
    } else {
      recencyTrend = "stable";
    }

    if (points.length >= 3) {
      const prevSlice = points.slice(0, -1);
      const prevFirst = prevSlice[0];
      const prevLatest = prevSlice[prevSlice.length - 1];
      const prevSpan = Math.max(1, prevLatest.day - prevFirst.day);
      const prevVelocity = (prevLatest.score - prevFirst.score) / prevSpan;
      acceleration = Math.round((recentVelocity - prevVelocity) * 10) / 10;
    }
  }

  // Calculate stability index over recent 3 shifts
  const recentAccs = recentSlice.map((p) => p.acc);
  const avgAcc = recentAccs.reduce((a, b) => a + b, 0) / recentAccs.length;
  const variance = recentAccs.reduce((sum, val) => sum + Math.pow(val - avgAcc, 2), 0) / recentAccs.length;
  const stdDev = Math.sqrt(variance);

  let stabilityIndex: TrajectoryMemoryV2["stabilityIndex"] = "stable";
  if (stdDev > 6) {
    stabilityIndex = "erratic";
  } else if (stdDev > 2.5) {
    stabilityIndex = "fluctuating";
  } else {
    stabilityIndex = "stable";
  }

  return {
    recencyTrend,
    velocity,
    acceleration,
    stabilityIndex,
    dataPointCount,
  };
}

export function deriveCapabilityMemoryV2(hire: NewHire): Record<number, CapabilityMemoryRecordV2> {
  const history = hire.daysHistory || [];
  const caps = hire.capabilities || {};
  const result: Record<number, CapabilityMemoryRecordV2> = {};

  DARK_STORE_CAPABILITIES.forEach((def) => {
    const capId = def.id;
    const currentCapState: CapabilityState | undefined = caps[capId];

    let firstExposedDay: number | null = null;
    let attemptsCount = 0;
    let failureCount = 0;
    let masteryDay: number | null = null;

    // Search historical evidence per shift
    history.forEach((rec) => {
      const day = rec.dayNumber;
      const textBlob = `${rec.dailySignal?.issue || ""} ${rec.managerSignal?.notes || ""} ${rec.identifiedPattern?.diagnosis || ""}`.toLowerCase();
      
      const mentionsCap =
        textBlob.includes(def.name.toLowerCase()) ||
        textBlob.includes(def.code.toLowerCase()) ||
        rec.recommendedAction?.targetCapabilityId === capId;

      const isScheduledDay = day >= def.defaultOrder;

      if (mentionsCap || (isScheduledDay && rec.workSignal !== undefined)) {
        if (firstExposedDay === null) {
          firstExposedDay = day;
        }
        attemptsCount++;

        // Count meaningful evidence-supported failures
        if (
          rec.managerSignal?.state === "Struggling" ||
          rec.workSignal?.accuracyRate! < 95 ||
          rec.dailySignal?.category === "Tool" ||
          rec.actionOutcome?.improved === "no"
        ) {
          if (mentionsCap) {
            failureCount++;
          }
        }
      }
    });

    // Check fallback for exposure if not found in text logs
    if (firstExposedDay === null && currentCapState && currentCapState.exposure !== "not_exposed") {
      firstExposedDay = Math.min(hire.currentDay, def.defaultOrder);
      attemptsCount = Math.max(1, currentCapState.reinforcementCount || 1);
    }

    // Determine masteryDay
    if (currentCapState?.mastery === "mastered") {
      masteryDay = firstExposedDay !== null ? Math.max(firstExposedDay, def.defaultOrder) : hire.currentDay;
    }

    // Determine prerequisite struggles
    const prerequisiteStruggles: number[] = [];
    (def.prerequisites || []).forEach((prereqId) => {
      const prereqState = caps[prereqId];
      if (prereqState && (prereqState.performance === "below_target" || prereqState.evidence === "inconsistent")) {
        prerequisiteStruggles.push(prereqId);
      }
    });

    result[capId] = {
      capabilityId: capId,
      firstExposedDay,
      attemptsCount,
      failureCount,
      prerequisiteStruggles,
      masteryDay,
    };
  });

  return result;
}

export function deriveLearningDebtV2(
  hire: NewHire,
  capMemory: Record<number, CapabilityMemoryRecordV2>
): LearningDebtV2 {
  const history = hire.daysHistory || [];
  const caps = hire.capabilities || {};
  const activeDebts: LearningDebtItemV2[] = [];

  DARK_STORE_CAPABILITIES.forEach((def) => {
    const capId = def.id;
    const capState = caps[capId];
    const mem = capMemory[capId];

    const isNotMastered = capState ? capState.mastery !== "mastered" : true;

    // Evidence-driven debt criteria (CALENDAR DUE ≠ LEARNING DEBT, NOT EXPOSED ≠ LEARNING DEBT)
    const hasExposure = (mem && mem.firstExposedDay !== null) || (capState && capState.exposure !== "not_exposed");
    const hasFriction = (mem && mem.failureCount > 0) || (capState && (capState.performance === "below_target" || capState.evidence === "inconsistent"));

    // Check if blocked by an unmastered prerequisite that has active evidence/exposure
    const prereqBlocked = (def.prerequisites || []).some((pId) => {
      const pState = caps[pId];
      const pMem = capMemory[pId];
      const pNotMastered = pState ? pState.mastery !== "mastered" : true;
      const pHasEvidence = (pMem && pMem.firstExposedDay !== null) ||
        (pState && pState.exposure !== "not_exposed") ||
        (pState && (pState.performance === "below_target" || pState.evidence === "inconsistent"));
      return pNotMastered && pHasEvidence;
    });

    const hasDebtEvidence = hasExposure || hasFriction || prereqBlocked;

    if (isNotMastered && hasDebtEvidence) {
      // Check if recovering from recent intervention
      const recentOutcome = history.slice(-2).find((r) => r.recommendedAction?.targetCapabilityId === capId)?.actionOutcome;
      const isRecovering = recentOutcome?.improved === "yes" || recentOutcome?.improved === "partial";

      let status: LearningDebtStatus = "ACTIVE_DEBT";
      if (prereqBlocked) {
        status = "PREREQUISITE_BLOCKER";
      } else if (isRecovering) {
        status = "RECOVERING_DEBT";
      }

      // Find impacted future capabilities (caps that list this capId in prerequisites)
      const impactedFutureCapIds = DARK_STORE_CAPABILITIES
        .filter((d) => (d.prerequisites || []).includes(capId))
        .map((d) => d.id);

      // Collect attempted interventions for this cap
      const attemptedInterventions = history
        .filter((r) => r.recommendedAction?.targetCapabilityId === capId && r.recommendedAction?.actionType)
        .map((r) => r.recommendedAction!.actionType);

      const ageInShifts = (mem && mem.firstExposedDay !== null)
        ? Math.max(1, hire.currentDay - mem.firstExposedDay + 1)
        : 1;

      activeDebts.push({
        capabilityId: capId,
        status,
        ageInShifts,
        impactedFutureCapIds,
        attemptedInterventions: Array.from(new Set(attemptedInterventions)),
      });
    }
  });

  return { activeDebts };
}

export function deriveInterventionMemoryV2(hire: NewHire): InterventionMemoryV2 {
  const history = hire.daysHistory || [];
  const items: InterventionMemoryItemV2[] = [];

  history.forEach((rec, idx) => {
    if (rec.recommendedAction) {
      const action = rec.recommendedAction;
      const outcomeRec = rec.actionOutcome;

      let outcome: InterventionOutcomeStatus = "PARTIAL";
      if (outcomeRec?.improved === "yes") {
        outcome = "SUCCESS";
      } else if (outcomeRec?.improved === "no") {
        outcome = "FAILED";
      } else if (outcomeRec?.improved === "partial") {
        outcome = "PARTIAL";
      }

      // Rule 12: Calculate recovery shifts if outcome is SUCCESS and subsequent shifts exist
      let recoveryShifts: number | null = null;
      if (outcome === "SUCCESS") {
        const nextRecords = history.slice(idx + 1);
        const recoveredIdx = nextRecords.findIndex((r) => (r.workSignal?.accuracyRate || 0) >= 98);
        if (recoveredIdx !== -1) {
          recoveryShifts = recoveredIdx + 1;
        } else {
          recoveryShifts = 1;
        }
      }

      items.push({
        dayNumber: rec.dayNumber,
        actionType: action.actionType,
        targetCapabilityId: action.targetCapabilityId,
        outcome,
        recoveryShifts,
        notes: outcomeRec?.notes || action.description,
      });
    }
  });

  return { history: items };
}

/**
 * PHASE 2B — FUTURE CONTEXT V1 DERIVATION
 * Pure, deterministic calculation of future context:
 * - Future Bottlenecks (Evidence & Dependency driven, non-calendar)
 * - Silent Drift Detection (High surfaced performance + declining trajectory + bottleneck risk)
 * - Acceleration Eligibility (Mastery of exposed skills + healthy trajectory + no active debt)
 * - Directional Trajectory Trend
 */
export function deriveFutureContextV1(
  hire: NewHire,
  capabilityMemory: Record<number, CapabilityMemoryRecordV2>,
  learningDebt: LearningDebtV2,
  trajectoryMemory: TrajectoryMemoryV2
): FutureContextV1 {
  const caps = hire.capabilities || {};
  const activeDebtCapIds = new Set((learningDebt.activeDebts || []).map((d) => d.capabilityId));
  const futureBottlenecks: FutureBottleneckItemV1[] = [];

  // 1. Identify Future Bottlenecks across 20 capabilities
  DARK_STORE_CAPABILITIES.forEach((def) => {
    const capId = def.id;
    const capState = caps[capId];
    const isMastered = capState ? capState.mastery === "mastered" : false;
    const isNotMastered = !isMastered;

    // Condition 1: Unresolved (not mastered)
    // Condition 2: Explicit Dependency (is an explicit prerequisite for at least one future capability)
    const dependentCapIds = DARK_STORE_CAPABILITIES
      .filter((other) => (other.prerequisites || []).includes(capId))
      .map((other) => other.id);

    const hasExplicitDependency = dependentCapIds.length > 0;

    // Condition 3: Not currently active debt (no active friction / immediate prerequisite blockage today)
    const isNotActiveDebt = !activeDebtCapIds.has(capId);

    if (isNotMastered && hasExplicitDependency) {
      let status: FutureBottleneckStatus = "POTENTIAL";

      const mem = capabilityMemory[capId];
      const hasEvidence = (mem && mem.attemptsCount > 0) || (mem && mem.firstExposedDay !== null) || (capState && capState.exposure !== "not_exposed");

      if (!hasEvidence && (hire.daysHistory || []).length === 0) {
        status = "INSUFFICIENT_EVIDENCE";
      } else {
        // Check if any dependent capability is currently active, exposed, or focused
        const isDependentActive = dependentCapIds.some((depId) => {
          const depState = caps[depId];
          return (
            hire.currentCapabilityId === depId ||
            (depState && depState.exposure !== "not_exposed")
          );
        });

        if (isDependentActive || (isNotActiveDebt && hire.currentCapabilityId && dependentCapIds.includes(hire.currentCapabilityId))) {
          status = "ACTIVE";
        } else {
          status = "POTENTIAL";
        }
      }

      futureBottlenecks.push({
        capabilityId: capId,
        status,
        prerequisiteForCapIds: dependentCapIds,
        reason: `Capability ${def.name} (${def.code}) is unmastered and is an explicit prerequisite for capabilities [${dependentCapIds.join(", ")}].`,
      });
    }
  });

  // 2. Silent Drift Detection (No synthetic score)
  // Accuracy >= 98% (surfaced work metrics ok) BUT declining/erratic trajectory AND bottleneck risk exists
  const history = hire.daysHistory || [];
  const latestWorkSignal = history.length > 0 ? history[history.length - 1].workSignal : undefined;
  const recentAccuracy = latestWorkSignal?.accuracyRate ?? 100;

  const isPerformanceSurfacedOk = recentAccuracy >= 98;
  const isTrajectoryDeclining = trajectoryMemory.recencyTrend === "declining" || trajectoryMemory.stabilityIndex === "erratic";
  const hasBottleneckRisk = futureBottlenecks.length > 0;

  const silentDriftDetected = isPerformanceSurfacedOk && isTrajectoryDeclining && hasBottleneckRisk;

  // 3. Acceleration Eligibility (Context for DEAN only)
  // - All currently exposed capabilities are mastered
  // - Trajectory is improving or stable
  // - Zero active debts and zero unresolved blockers
  const exposedCapIds = Object.keys(caps).map(Number).filter((id) => caps[id]?.exposure !== "not_exposed");
  const allExposedMastered = exposedCapIds.length > 0 && exposedCapIds.every((id) => caps[id]?.mastery === "mastered");
  const isTrajectoryHealthy = trajectoryMemory.recencyTrend === "improving" || trajectoryMemory.recencyTrend === "stable";
  const noActiveDebts = (learningDebt.activeDebts || []).length === 0;
  const noBlockers = (hire.daysHistory || []).slice(-1)[0]?.recommendedAction?.status !== "in_progress";

  const accelerationEligible = allExposedMastered && isTrajectoryHealthy && noActiveDebts && noBlockers;

  return {
    futureBottlenecks,
    silentDriftDetected,
    accelerationEligible,
    forecastedTrajectoryTrend: trajectoryMemory.recencyTrend,
  };
}

export function deriveTransferEvidence(hire: NewHire): Record<number, TransferEvidence> {
  const history = hire.daysHistory || [];
  const result: Record<number, TransferEvidence> = {};

  DARK_STORE_CAPABILITIES.forEach((def) => {
    const capId = def.id;
    const variationContexts: VariationContext[] = [];
    const observedDays: number[] = [];

    // Analyze history for variation context
    history.forEach((rec) => {
      const work = rec.workSignal || {};
      const daily = rec.dailySignal || {};
      
      // Broad variation detection: operational context changes
      const isEnvironmentVariation = work.congestion || work.externalBottleneck || daily.category === "Environment";
      const isToolVariation = (work.scannerErrors && work.scannerErrors > 0) || daily.category === "Tool";
      const isProcessVariation = daily.category === "Process" || (daily.rawText || "").toLowerCase().includes("process");
      
      const isVariation = isEnvironmentVariation || isToolVariation || isProcessVariation;
      
      if (isVariation) {
        // Holistic performance assessment (not just pickRate)
        const isPerformanceGood = 
            (work.actualPickRate || 0) >= (work.targetPickRate || 0) - 5 && // Slightly relaxed pick rate
            (work.accuracyRate || 100) >= 98 && 
            (work.helpRequestsCount || 0) === 0;

        // If performance is bad, is it explained by environmental/tool issues?
        const isExplainedByContext = isEnvironmentVariation || isToolVariation;

        let performanceEvidence: "pass" | "fail" | "needs_support" = "pass";
        
        if (isPerformanceGood) {
            performanceEvidence = "pass";
        } else if (isExplainedByContext) {
            // Drop explained by context: do not count as BREAKS_UNDER_VARIATION
            performanceEvidence = "needs_support";
        } else {
            // Drop not explained: count as BREAKS_UNDER_VARIATION
            performanceEvidence = "fail";
        }

        variationContexts.push({
          contextType: isEnvironmentVariation ? "environment" : isToolVariation ? "tool" : "process",
          contextKey: work.externalBottleneck || daily.issue || "operational_change",
          observedDay: rec.dayNumber,
          capabilityId: capId,
          performanceEvidence,
          outcome: "performance_observed",
          sourceEvidenceIds: [rec.dayNumber.toString()],
        });
        observedDays.push(rec.dayNumber);
      }
    });

    // Smarter transfer interpretation
    let transferStatus: TransferStatus = "NOT_TESTED";
    if (variationContexts.length === 0) {
      transferStatus = "NOT_TESTED";
    } else if (variationContexts.length >= 2 && variationContexts.every(v => v.performanceEvidence === "pass")) {
      transferStatus = "TRANSFERRED";
    } else if (variationContexts.some(v => v.performanceEvidence === "fail")) {
      transferStatus = "BREAKS_UNDER_VARIATION";
    } else if (variationContexts.length > 0) {
      transferStatus = "EMERGING";
    } else {
      transferStatus = "INSUFFICIENT_EVIDENCE";
    }

    result[capId] = {
      capabilityId: capId,
      baselineContext: "normal_conditions",
      variationContexts,
      transferStatus,
      supportingEvidenceIds: [],
      observedDays,
    };
  });

  return result;
}

/**
 * MASTER DERIVATION FUNCTION
 * Constructs complete LearnerStateV2 from NewHire object deterministically.
 */
export function deriveLearnerStateV2(hire: NewHire): LearnerStateV2 {
  const currentState = deriveCurrentStateV2(hire);
  const trajectoryMemory = deriveTrajectoryMemoryV2(hire);
  const capabilityMemory = deriveCapabilityMemoryV2(hire);
  const transferEvidence = deriveTransferEvidence(hire);
  const learningDebt = deriveLearningDebtV2(hire, capabilityMemory);
  const interventionMemory = deriveInterventionMemoryV2(hire);
  const futureContext = deriveFutureContextV1(hire, capabilityMemory, learningDebt, trajectoryMemory);

  return {
    currentState,
    trajectoryMemory,
    capabilityMemory,
    transferEvidence,
    learningDebt,
    interventionMemory,
    futureContext,
  };
}
