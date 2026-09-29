import {
  EvidenceStream,
  EvidenceStreamEvent,
  EvidenceSourceDomain,
} from "../types";
import { LoopExecutionInput } from "./intelligence";
import { getExperienceCases } from "./experienceMemoryService";

/**
 * V3.3 — DEAN 360° EVIDENCE STREAM SERVICE
 * 
 * Assembles operational signals from all existing sources into a temporally
 * coherent evidence stream.
 * 
 * CORE PRINCIPLE:
 * THE STREAM SUPPLIES EVIDENCE.
 * DEAN SUPPLIES INTELLIGENCE AND DECISION.
 */

export function assemble360EvidenceStream(input: LoopExecutionInput): EvidenceStream {
  const hireId = input.hire?.id || "unknown-hire";
  const dayNumber = input.dayNumber || input.hire?.currentDay || 1;
  const assembledAt = new Date().toISOString();
  const events: EvidenceStreamEvent[] = [];

  let eventCounter = 0;
  const generateEventId = (prefix: string) => `evt-${prefix}-${dayNumber}-${++eventCounter}`;

  // 1. WORK SIGNAL TELEMETRY
  if (input.workSignal) {
    const ws = input.workSignal;
    let directionalChange: "improving" | "declining" | "stable" | "unknown" = "unknown";
    if (ws.actualPickRate !== undefined && ws.targetPickRate !== undefined) {
      if (ws.actualPickRate >= ws.targetPickRate) {
        directionalChange = "stable";
      } else if (ws.targetPickRate - ws.actualPickRate > 10) {
        directionalChange = "declining";
      } else {
        directionalChange = "improving";
      }
    }

    events.push({
      eventId: generateEventId("work"),
      sourceDomain: "WORK_SIGNAL",
      hireId,
      dayNumber: ws.dayNumber || dayNumber,
      timestamp: assembledAt,
      signalType: "WORK_TELEMETRY_RECORD",
      payload: {
        actualPickRate: ws.actualPickRate,
        targetPickRate: ws.targetPickRate,
        accuracyRate: ws.accuracyRate,
        ordersCompleted: ws.ordersCompleted,
        targetOrders: ws.targetOrders,
        gapIdentified: ws.gapIdentified,
        externalBottleneck: ws.externalBottleneck,
        helpRequestsCount: ws.helpRequestsCount,
        navigationTime: ws.navigationTime,
        scannerErrors: ws.scannerErrors,
        congestion: ws.congestion,
        multipleWorkersAffected: ws.multipleWorkersAffected,
      },
      directionalChange,
      evidenceQuality: ws.hasWorkEvidence !== false ? "strong" : "moderate",
      provenance: {
        sourceName: "WORK_SIGNAL",
        rawText: ws.gapIdentified ? `Gap: ${ws.gapIdentified}` : undefined,
      },
      temporalContext: {
        shiftDay: ws.dayNumber || dayNumber,
        shiftPhase: "active_shift",
      },
    });
  }

  // 2. MANAGER SIGNAL OBSERVATION
  if (input.managerSignal) {
    const ms = input.managerSignal;
    events.push({
      eventId: generateEventId("mgr"),
      sourceDomain: "MANAGER_SIGNAL",
      hireId,
      dayNumber: ms.dayNumber || dayNumber,
      timestamp: ms.timestamp || assembledAt,
      signalType: "MANAGER_OBSERVATION",
      payload: {
        managerState: ms.state,
        issueCategory: ms.issueCategory,
        notes: ms.notes,
        managerName: ms.managerName,
      },
      evidenceQuality: "strong",
      provenance: {
        sourceName: "MANAGER_SIGNAL",
        rawText: ms.notes,
        inputMethod: "manager_log",
      },
      temporalContext: {
        shiftDay: ms.dayNumber || dayNumber,
        shiftPhase: "supervisor_check",
      },
    });
  }

  // 3. DAILY SIGNAL (LEARNER SELF-REPORT)
  if (input.dailySignal) {
    const ds = input.dailySignal;
    events.push({
      eventId: generateEventId("daily"),
      sourceDomain: "DAILY_SIGNAL",
      hireId,
      dayNumber: ds.dayNumber || dayNumber,
      timestamp: ds.timestamp || assembledAt,
      signalType: "LEARNER_SELF_REPORT",
      payload: {
        issue: ds.issue,
        rawText: ds.rawText,
        confidence: ds.confidence,
        category: ds.category,
        summary: ds.summary,
        helpRequestsCount: ds.helpRequestsCount,
      },
      evidenceQuality: ds.confidence === "High" ? "strong" : ds.confidence === "Medium" ? "moderate" : "weak",
      provenance: {
        sourceName: "DAILY_SIGNAL",
        rawText: ds.rawText,
        inputMethod: ds.inputMethod,
      },
      temporalContext: {
        shiftDay: ds.dayNumber || dayNumber,
        shiftPhase: "shift_debrief",
      },
    });
  }

  // 4. ACTION OUTCOME / INTERVENTION EVALUATION
  if (input.actionOutcome) {
    const ao = input.actionOutcome;
    events.push({
      eventId: generateEventId("outcome"),
      sourceDomain: "ACTION_OUTCOME",
      hireId,
      dayNumber: ao.dayNumber || dayNumber,
      timestamp: ao.performedAt || assembledAt,
      signalType: "INTERVENTION_EVALUATION",
      payload: {
        actionId: ao.actionId,
        improved: ao.improved,
        notes: ao.notes,
        subsequentPickRate: ao.subsequentPickRate,
        subsequentAccuracy: ao.subsequentAccuracy,
        performedBy: ao.performedBy,
        treatmentContext: ao.treatmentContext,
      },
      directionalChange: ao.improved === "yes" ? "improving" : ao.improved === "no" ? "declining" : "unknown",
      evidenceQuality: "strong",
      provenance: {
        sourceName: "ACTION_OUTCOME",
        rawText: ao.notes,
      },
      temporalContext: {
        shiftDay: ao.dayNumber || dayNumber,
      },
    });
  }

  // 5. CANONICAL EVIDENCE (TOOL, ENVIRONMENT, SAFETY)
  if (input.canonicalEvidence) {
    const ce = input.canonicalEvidence;

    if (ce.toolSystem && ce.toolSystem.toolStatus) {
      events.push({
        eventId: generateEventId("tool"),
        sourceDomain: "TOOL_SIGNAL",
        hireId,
        dayNumber,
        timestamp: assembledAt,
        signalType: "HARDWARE_SYSTEM_STATUS",
        payload: {
          toolStatus: ce.toolSystem.toolStatus,
          toolProblem: ce.toolSystem.toolProblem,
          systemDowntime: ce.toolSystem.systemDowntime,
        },
        directionalChange: ce.toolSystem.toolStatus === "Failed" ? "declining" : "stable",
        evidenceQuality: "strong",
        provenance: {
          sourceName: "CANONICAL_TOOL_SYSTEM",
          rawText: ce.toolSystem.toolProblem,
        },
        temporalContext: {
          shiftDay: dayNumber,
        },
      });
    }

    if (ce.environment && (ce.environment.environmentalIssue || ce.environment.externalBottleneck || ce.environment.workloadCondition)) {
      events.push({
        eventId: generateEventId("env"),
        sourceDomain: "ENVIRONMENT_SIGNAL",
        hireId,
        dayNumber,
        timestamp: assembledAt,
        signalType: "FLOOR_ENVIRONMENT_CONDITION",
        payload: {
          workloadCondition: ce.environment.workloadCondition,
          environmentalIssue: ce.environment.environmentalIssue,
          externalBottleneck: ce.environment.externalBottleneck,
        },
        evidenceQuality: "strong",
        provenance: {
          sourceName: "CANONICAL_ENVIRONMENT",
          rawText: ce.environment.environmentalIssue || ce.environment.externalBottleneck,
        },
        temporalContext: {
          shiftDay: dayNumber,
        },
      });
    }

    if (ce.support && (ce.support.helpRequests !== undefined || ce.support.supervisorAssistance !== undefined)) {
      events.push({
        eventId: generateEventId("safety"),
        sourceDomain: "SAFETY_SIGNAL",
        hireId,
        dayNumber,
        timestamp: assembledAt,
        signalType: "FLOOR_SUPPORT_AND_SAFETY",
        payload: {
          helpRequests: ce.support.helpRequests,
          supervisorAssistance: ce.support.supervisorAssistance,
        },
        evidenceQuality: "strong",
        provenance: {
          sourceName: "CANONICAL_SUPPORT",
        },
        temporalContext: {
          shiftDay: dayNumber,
        },
      });
    }
  }

  // 6. CAPABILITY EVIDENCE
  if (input.hire?.capabilities) {
    const caps = input.hire.capabilities;
    Object.values(caps).forEach((capState) => {
      if (capState.evidence !== "none" || capState.exposure !== "not_exposed") {
        events.push({
          eventId: generateEventId(`cap-${capState.capabilityId}`),
          sourceDomain: "CAPABILITY_EVIDENCE",
          hireId,
          dayNumber,
          timestamp: capState.lastAssessedAt || assembledAt,
          signalType: "CAPABILITY_LEDGER_STATE",
          payload: {
            capabilityId: capState.capabilityId,
            mastery: capState.mastery,
            evidence: capState.evidence,
            exposure: capState.exposure,
            performance: capState.performance,
            reinforcementCount: capState.reinforcementCount,
            notes: capState.notes,
          },
          evidenceQuality: capState.evidence === "demonstrated" ? "strong" : "moderate",
          provenance: {
            sourceName: "CAPABILITY_LEDGER",
            rawText: capState.notes,
          },
          temporalContext: {
            shiftDay: dayNumber,
          },
        });
      }
    });
  }

  // 7. LEARNER TRAJECTORY / PRIOR DAYS HISTORY
  if (input.hire?.daysHistory && input.hire.daysHistory.length > 0) {
    input.hire.daysHistory.forEach((dayRec) => {
      if (dayRec.dayNumber < dayNumber && dayRec.workSignal) {
        events.push({
          eventId: generateEventId(`traj-${dayRec.dayNumber}`),
          sourceDomain: "LEARNER_TRAJECTORY",
          hireId,
          dayNumber: dayRec.dayNumber,
          timestamp: dayRec.date || assembledAt,
          signalType: "HISTORICAL_WORK_SIGNAL",
          payload: {
            dayNumber: dayRec.dayNumber,
            actualPickRate: dayRec.workSignal.actualPickRate,
            targetPickRate: dayRec.workSignal.targetPickRate,
            accuracyRate: dayRec.workSignal.accuracyRate,
            statusAtEnd: dayRec.statusAtEnd || dayRec.statusAtEndOfDay,
            statusReason: dayRec.statusReason,
          },
          evidenceQuality: "moderate",
          provenance: {
            sourceName: "DAYS_HISTORY",
          },
          temporalContext: {
            shiftDay: dayRec.dayNumber,
          },
        });
      }
    });
  }

  // 8. EXPERIENCE MEMORY
  const expCases = getExperienceCases(hireId);
  if (expCases && expCases.length > 0) {
    expCases.slice(-3).forEach((ec) => {
      events.push({
        eventId: generateEventId(`exp-${ec.id}`),
        sourceDomain: "EXPERIENCE_MEMORY",
        hireId,
        dayNumber: ec.dayNumber,
        timestamp: ec.timestamp,
        signalType: "HISTORICAL_CASE_PRECEDENT",
        payload: {
          caseId: ec.id,
          situationDescription: ec.situation.description,
          decisionAction: ec.decisionAction,
          outcomeState: ec.outcomeState,
          capabilityId: ec.context.capabilityId,
        },
        evidenceQuality: "strong",
        provenance: {
          sourceName: "EXPERIENCE_MEMORY_STORE",
        },
        temporalContext: {
          shiftDay: ec.dayNumber,
        },
      });
    });
  }

  // Check for contradiction between manager signal & work telemetry
  let hasContradictorySignals = false;
  const mgrEvt = events.find((e) => e.sourceDomain === "MANAGER_SIGNAL");
  const wrkEvt = events.find((e) => e.sourceDomain === "WORK_SIGNAL");

  if (mgrEvt && wrkEvt) {
    const mgrState = mgrEvt.payload.managerState;
    const actual = wrkEvt.payload.actualPickRate;
    const target = wrkEvt.payload.targetPickRate;

    if (mgrState === "Doing well" && actual !== undefined && target !== undefined && actual < target * 0.8) {
      hasContradictorySignals = true;
    } else if ((mgrState === "Needs support" || mgrState === "Struggling") && actual !== undefined && target !== undefined && actual >= target) {
      hasContradictorySignals = true;
    }
  }

  // Domain Breakdown
  const domainBreakdown: Record<EvidenceSourceDomain, number> = {
    WORK_SIGNAL: 0,
    MANAGER_SIGNAL: 0,
    DAILY_SIGNAL: 0,
    ACTION_OUTCOME: 0,
    TOOL_SIGNAL: 0,
    ENVIRONMENT_SIGNAL: 0,
    SAFETY_SIGNAL: 0,
    CAPABILITY_EVIDENCE: 0,
    PRACTICE_RESULT: 0,
    EXPERIENCE_MEMORY: 0,
    LEARNER_TRAJECTORY: 0,
  };

  events.forEach((evt) => {
    domainBreakdown[evt.sourceDomain] = (domainBreakdown[evt.sourceDomain] || 0) + 1;
  });

  return {
    hireId,
    dayNumber,
    assembledAt,
    totalEventsCount: events.length,
    events,
    domainBreakdown,
    hasContradictorySignals,
  };
}
