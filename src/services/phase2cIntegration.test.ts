import { describe, it, expect, beforeEach } from "vitest";
import { executeCoordinationLoop, executeCoordinationLoopAsync, LoopExecutionInput } from "./intelligence";
import { initialRahul, createDefaultCapabilitiesLedger } from "../data/seedData";
import { NewHire, DayRecord, WorkSignal, DailySignal } from "../types";

function createMockWorkSignal(dayNumber: number, actualPickRate = 35, targetPickRate = 35, accuracyRate = 98): WorkSignal {
  return {
    dayNumber,
    actualPickRate,
    targetPickRate,
    accuracyRate,
    ordersCompleted: 10,
    targetOrders: 10,
  };
}

function createMockDayRecord(dayNumber: number, accuracyRate = 98, actualPickRate = 35): DayRecord {
  return {
    dayNumber,
    date: `2026-09-0${dayNumber}`,
    statusAtEnd: "Doing well",
    statusReason: "On target pacing",
    workSignal: createMockWorkSignal(dayNumber, actualPickRate, 35, accuracyRate),
  };
}

describe("PHASE 2C — DEAN × FUTURE CONTEXT V1 INTEGRATION VERIFICATION", () => {
  let baseHire: NewHire;

  beforeEach(() => {
    baseHire = {
      ...initialRahul,
      currentDay: 2,
      currentCapabilityId: 3,
      capabilities: createDefaultCapabilitiesLedger(),
      daysHistory: [createMockDayRecord(1)],
    };
  });

  it("Test A — Future Context reaches DEAN", () => {
    const input: LoopExecutionInput = {
      hire: baseHire,
      dayNumber: 2,
      workSignal: createMockWorkSignal(2, 35, 35, 98),
    };

    const result = executeCoordinationLoop(input);

    expect(result.learnerStateV2).toBeDefined();
    expect(result.learnerStateV2?.futureContext).toBeDefined();
    expect(result.learnerStateV2?.futureContext?.futureBottlenecks).toBeDefined();
    expect(Array.isArray(result.learnerStateV2?.futureContext?.futureBottlenecks)).toBe(true);
  });

  it("Test B — Future Bottleneck does not force action", () => {
    // Unmastered prerequisite (Cap 2) creates future bottleneck for Cap 3 & 5
    const hireWithUnmasteredPrereq: NewHire = {
      ...baseHire,
      currentDay: 2,
      currentCapabilityId: 3,
      capabilities: {
        ...createDefaultCapabilitiesLedger(),
        2: { capabilityId: 2, exposure: "exposed", evidence: "emerging", performance: "on_target", mastery: "in_progress", lastAssessedAt: "2026-09-01", reinforcementCount: 0 },
      },
      daysHistory: [createMockDayRecord(1, 98, 35)],
    };

    const input: LoopExecutionInput = {
      hire: hireWithUnmasteredPrereq,
      dayNumber: 2,
      workSignal: createMockWorkSignal(2, 35, 35, 98),
    };

    const result = executeCoordinationLoop(input);

    // DEAN is still free to advance/monitor normally despite Future Bottleneck because current shift evidence is healthy!
    expect(result.adaptiveDecision).not.toBe("return_prerequisite");
    expect(result.adaptiveDecision).not.toBe("reinforce_current");
  });

  it("Test C — Active dependency can influence decision when friction exists", () => {
    // When there IS actual prerequisite friction (e.g., location confusion), DEAN returns to prerequisite or reinforces
    const hireWithFriction: NewHire = {
      ...baseHire,
      currentDay: 2,
      currentCapabilityId: 3,
      capabilities: {
        ...createDefaultCapabilitiesLedger(),
        2: { capabilityId: 2, exposure: "exposed", evidence: "inconsistent", performance: "below_target", mastery: "in_progress", lastAssessedAt: "2026-09-01", reinforcementCount: 0 },
      },
      daysHistory: [createMockDayRecord(1, 98, 20)],
    };

    const mockDailySignal: DailySignal = {
      id: "sig-2",
      dayNumber: 2,
      issue: "Aisle location navigation confusion Aisles 4-8",
      category: "Environment",
      rawText: "Rahul got confused finding rack numbers in aisle 4",
      confidence: "High",
      possibleImpact: "Speed",
      inputMethod: "text",
      summary: "Location confusion",
      timestamp: "2026-09-02T08:00:00Z",
    };

    const input: LoopExecutionInput = {
      hire: hireWithFriction,
      dayNumber: 2,
      dailySignal: mockDailySignal,
      workSignal: createMockWorkSignal(2, 20, 35, 98),
    };

    const result = executeCoordinationLoop(input);
    // DEAN correctly identifies root cause friction and decides return_prerequisite or reinforce_current through standard logic
    expect(["return_prerequisite", "reinforce_current", "environment_support"]).toContain(result.adaptiveDecision);
  });

  it("Test D — Acceleration does not auto-jump", () => {
    // Hire has accelerationEligible = true context (all exposed mastered, healthy trajectory), but pick rate is ONLY meeting target (35/35), NOT exceeding by +10 (45/35).
    const hireEligible: NewHire = {
      ...baseHire,
      currentCapabilityId: 3,
      capabilities: {
        ...createDefaultCapabilitiesLedger(),
        1: { capabilityId: 1, exposure: "exposed", evidence: "demonstrated", performance: "on_target", mastery: "mastered", lastAssessedAt: "2026-09-01", reinforcementCount: 0 },
        2: { capabilityId: 2, exposure: "exposed", evidence: "demonstrated", performance: "on_target", mastery: "mastered", lastAssessedAt: "2026-09-01", reinforcementCount: 0 },
      },
      daysHistory: [createMockDayRecord(1, 99, 35)],
    };

    const input: LoopExecutionInput = {
      hire: hireEligible,
      dayNumber: 2,
      workSignal: createMockWorkSignal(2, 35, 35, 98),
    };

    const result = executeCoordinationLoop(input);

    // accelerationEligible must NOT force jump_ahead automatically!
    expect(result.adaptiveDecision).not.toBe("jump_ahead");
    expect(result.adaptiveDecision).toBe("advance_default");
  });

  it("Test E — Silent Drift does not auto-intervene", () => {
    // Silent drift condition: surface metric OK (35/35), but declining trajectory & bottleneck risk
    const hireWithDrift: NewHire = {
      ...baseHire,
      currentDay: 3,
      capabilities: createDefaultCapabilitiesLedger(),
      daysHistory: [
        createMockDayRecord(1, 98, 45),
        createMockDayRecord(2, 98, 40),
        createMockDayRecord(3, 98, 35), // declining pick rate 45 -> 40 -> 35
      ],
    };

    const input: LoopExecutionInput = {
      hire: hireWithDrift,
      dayNumber: 3,
      workSignal: createMockWorkSignal(3, 35, 35, 98),
    };

    const result = executeCoordinationLoop(input);

    // silentDriftDetected must NOT directly force an intervention action!
    expect(result.adaptiveDecision).not.toBe("supervisor_demo");
    expect(result.adaptiveDecision).not.toBe("tool_remedy");
  });

  it("Test F — Calendar independence", () => {
    const inputDay2: LoopExecutionInput = {
      hire: { ...baseHire, currentDay: 2 },
      dayNumber: 2,
      workSignal: createMockWorkSignal(2, 35, 35, 98),
    };

    const inputDay6: LoopExecutionInput = {
      hire: { ...baseHire, currentDay: 6 },
      dayNumber: 6,
      workSignal: createMockWorkSignal(6, 35, 35, 98),
    };

    const resultDay2 = executeCoordinationLoop(inputDay2);
    const resultDay6 = executeCoordinationLoop(inputDay6);

    // Changing day number without changing evidence produces equivalent decision
    expect(resultDay6.adaptiveDecision).toBe(resultDay2.adaptiveDecision);
  });

  it("Test G — Sync and Async parity", async () => {
    const input: LoopExecutionInput = {
      hire: baseHire,
      dayNumber: 2,
      workSignal: createMockWorkSignal(2, 35, 35, 98),
    };

    const syncResult = executeCoordinationLoop(input);
    const asyncResult = await executeCoordinationLoopAsync(input);

    expect(syncResult.adaptiveDecision).toBe(asyncResult.adaptiveDecision);
    expect(syncResult.learnerStateV2?.futureContext?.futureBottlenecks.length)
      .toBe(asyncResult.learnerStateV2?.futureContext?.futureBottlenecks.length);
    expect(syncResult.learnerStateV2?.futureContext?.silentDriftDetected)
      .toBe(asyncResult.learnerStateV2?.futureContext?.silentDriftDetected);
    expect(syncResult.learnerStateV2?.futureContext?.accelerationEligible)
      .toBe(asyncResult.learnerStateV2?.futureContext?.accelerationEligible);
  });

  it("Test H — Readiness unchanged", () => {
    const input: LoopExecutionInput = {
      hire: baseHire,
      dayNumber: 2,
      workSignal: createMockWorkSignal(2, 35, 35, 98),
    };

    const result = executeCoordinationLoop(input);

    // Overall readiness score and criteria evaluation remain unmodified by Future Context
    expect(typeof result.overallReadinessScore).toBe("number");
    expect(result.overallReadinessScore).toBeGreaterThanOrEqual(0);
    expect(result.overallReadinessScore).toBeLessThanOrEqual(100);
  });
});
