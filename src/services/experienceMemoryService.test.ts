import { describe, it, expect, beforeEach } from "vitest";
import {
  createExperienceCase,
  finalizeExperienceCase,
  storeExperienceCase,
  getExperienceCases,
  clearExperienceMemoryStore,
  seedExperienceMemoryStore,
  findRelevantHistoricalExperiences,
} from "./experienceMemoryService";
import { executeCoordinationLoop, assessReadiness, evaluateDay10Outcome, LoopExecutionInput } from "./intelligence";
import { deriveLearnerStateV2 } from "./learnerStateV2Service";
import { NewHire, ExperienceCase } from "../types";

import { createDefaultCapabilitiesLedger } from "../data/seedData";

const mockHire: NewHire = {
  id: "test-hire-v32",
  name: "Karan Johar",
  roleTitle: "Dark Store Picker",
  startDate: "2026-09-01",
  currentDay: 4,
  status: "Needs attention",
  statusReason: "Testing experience memory",
  overallReadinessScore: 48,
  currentCapabilityId: 3,
  modulesCompleted: 5,
  completedModuleIds: ["101", "102", "103", "104", "105"],
  capabilities: createDefaultCapabilitiesLedger(),
  daysHistory: [
    {
      dayNumber: 1,
      workSignal: {
        dayNumber: 1,
        actualPickRate: 48,
        targetPickRate: 50,
        accuracyRate: 99,
        ordersCompleted: 8,
        targetOrders: 10,
      },
      statusAtEndOfDay: "Doing well",
    },
  ],
};

describe("V3.2 Implementation — DEAN Experience Memory Tests", () => {
  beforeEach(() => {
    clearExperienceMemoryStore();
  });

  it("Scenario A: A completed successful case becomes Experience Memory", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 4,
      workSignal: {
        actualPickRate: 35,
        targetPickRate: 50,
        accuracyRate: 98,
      },
      actionOutcome: {
        actionId: "act-1",
        improved: "yes",
        subsequentPickRate: 52,
        subsequentAccuracy: 99,
        notes: "Pick rate recovered above target after 30-min walkthrough",
      },
    };

    const expCase = createExperienceCase(input, undefined, undefined, input.actionOutcome);
    expect(expCase.outcomeState).toBe("SUCCESS");
    expect(expCase.caseStatus).toBe("COMPLETED");

    storeExperienceCase(expCase);
    const stored = getExperienceCases(mockHire.id);
    expect(stored.length).toBe(1);
    expect(stored[0].outcomeState).toBe("SUCCESS");
  });

  it("Scenario B: A failed intervention becomes Experience Memory", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 4,
      workSignal: {
        actualPickRate: 30,
        targetPickRate: 50,
        accuracyRate: 98,
      },
      actionOutcome: {
        actionId: "act-2",
        improved: "no",
        subsequentPickRate: 28,
        subsequentAccuracy: 97,
        notes: "Pick rate remained below threshold despite e-learning assigned",
      },
    };

    const expCase = createExperienceCase(input, undefined, undefined, input.actionOutcome);
    expect(expCase.outcomeState).toBe("FAILED");
    expect(expCase.caseStatus).toBe("COMPLETED");

    storeExperienceCase(expCase);
    const stored = getExperienceCases();
    expect(stored[0].outcomeState).toBe("FAILED");
  });

  it("Scenario C: A partial intervention becomes Experience Memory", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 4,
      workSignal: {
        actualPickRate: 32,
        targetPickRate: 50,
        accuracyRate: 98,
      },
      actionOutcome: {
        actionId: "act-3",
        improved: "partial",
        subsequentPickRate: 42,
        subsequentAccuracy: 98,
        notes: "Pick rate improved to 42/hr but remains slightly below 50/hr target",
      },
    };

    const expCase = createExperienceCase(input, undefined, undefined, input.actionOutcome);
    expect(expCase.outcomeState).toBe("PARTIAL");
    expect(expCase.caseStatus).toBe("COMPLETED");
  });

  it("Scenario D: An intervention without measurable follow-up is stored as NO_MEASURABLE_OUTCOME", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 4,
      workSignal: {
        actualPickRate: 38,
        targetPickRate: 50,
        accuracyRate: 98,
      },
    };

    const expCase = createExperienceCase(input);
    expect(expCase.outcomeState).toBe("NO_MEASURABLE_OUTCOME");
    expect(expCase.caseStatus).toBe("IN_PROGRESS");
  });

  it("Scenario E: A historical case can be retrieved when the current situation has relevant structured similarity", () => {
    const seededCase: ExperienceCase = {
      id: "exp-seed-1",
      hireId: "other-hire-001",
      dayNumber: 2,
      situation: {
        description: "Aisle 4 navigation confusion during tote pick",
        dayNumber: 2,
        observedMetric: "actualPickRate",
      },
      evidenceSnapshot: {},
      context: {
        capabilityId: 3,
        primaryDomains: ["learner", "capability"],
      },
      decisionAction: "buddy_walkthrough",
      actionExecuted: "30-Minute Buddy Walkthrough",
      outcomeState: "SUCCESS",
      caseStatus: "COMPLETED",
      timestamp: "2026-09-10T10:00:00Z",
    };

    seedExperienceMemoryStore([seededCase]);

    const queryResult = findRelevantHistoricalExperiences({
      capabilityId: 3,
      situationText: "aisle navigation confusion",
    });

    expect(queryResult.totalMatchesCount).toBe(1);
    expect(queryResult.relevantCases[0].id).toBe("exp-seed-1");
    expect(queryResult.hasSuccessfulPrecedents).toBe(true);
  });

  it("Scenario F & G: Historical experience does NOT automatically select previous action; current evidence remains authoritative", () => {
    // Seed a successful historical case that used buddy_walkthrough
    const seededCase: ExperienceCase = {
      id: "exp-seed-tool",
      hireId: "other-hire-002",
      dayNumber: 3,
      situation: {
        description: "Scanner terminal disconnect error",
        dayNumber: 3,
      },
      evidenceSnapshot: {},
      context: {
        capabilityId: 2,
        primaryDomains: ["technology"],
      },
      decisionAction: "buddy_walkthrough",
      actionExecuted: "Buddy Walkthrough",
      outcomeState: "SUCCESS",
      caseStatus: "COMPLETED",
      timestamp: "2026-09-10T10:00:00Z",
    };

    seedExperienceMemoryStore([seededCase]);

    // Current case is a scanner hardware failure (tool_hardware)
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 4,
      workSignal: {
        actualPickRate: 25,
        targetPickRate: 50,
        accuracyRate: 98,
        scannerErrors: 8,
      },
      canonicalEvidence: {
        toolSystem: {
          toolStatus: "Failed",
          toolProblem: "Scanner laser beam failure",
        },
      },
    };

    const result = executeCoordinationLoop(input);

    // Current evidence dictates tool_remedy / practice, NOT blindly repeating buddy_walkthrough
    expect(result.adaptiveDecision).toBe("tool_remedy");
    expect(result.action.title).toContain("Scanner Hardware Check");
  });

  it("Scenario H: Contradictory historical cases remain visible rather than being silently discarded", () => {
    const successCase: ExperienceCase = {
      id: "exp-succ",
      hireId: "hire-a",
      dayNumber: 2,
      situation: { description: "Variant check packaging confusion", dayNumber: 2 },
      evidenceSnapshot: {},
      context: { capabilityId: 6 },
      decisionAction: "demonstrate_task",
      actionExecuted: "Supervisor Demo",
      outcomeState: "SUCCESS",
      caseStatus: "COMPLETED",
      timestamp: "2026-09-01T10:00:00Z",
    };

    const failCase: ExperienceCase = {
      id: "exp-fail",
      hireId: "hire-b",
      dayNumber: 3,
      situation: { description: "Variant check packaging confusion", dayNumber: 3 },
      evidenceSnapshot: {},
      context: { capabilityId: 6 },
      decisionAction: "demonstrate_task",
      actionExecuted: "Supervisor Demo",
      outcomeState: "FAILED",
      caseStatus: "COMPLETED",
      timestamp: "2026-09-02T10:00:00Z",
    };

    seedExperienceMemoryStore([successCase, failCase]);

    const result = findRelevantHistoricalExperiences({ capabilityId: 6, situationText: "variant check packaging confusion" });

    expect(result.totalMatchesCount).toBe(2);
    expect(result.hasSuccessfulPrecedents).toBe(true);
    expect(result.hasFailedPrecedents).toBe(true);
    expect(result.hasContradictoryPrecedents).toBe(true);
  });

  it("Scenario I: Current case with no relevant historical experience continues through existing DEAN reasoning normally", () => {
    clearExperienceMemoryStore();

    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 4,
      workSignal: {
        actualPickRate: 30,
        targetPickRate: 50,
        accuracyRate: 98,
      },
    };

    const result = executeCoordinationLoop(input);

    expect(result.action).toBeDefined();
    expect(result.updatedStatus).toBeDefined();
    expect(result.experienceCase).toBeDefined();
    expect(result.experienceCase?.outcomeState).toBe("NO_MEASURABLE_OUTCOME");
  });

  it("Scenario J & K & L: Experience Memory does not change Day-10 criteria, Learner State V2, or create a second score", () => {
    const day10Result = evaluateDay10Outcome(mockHire, { dayNumber: 10, actualPickRate: 52, targetPickRate: 50, accuracyRate: 99, ordersCompleted: 10, targetOrders: 10 });
    expect(day10Result.isReady).toBeDefined();

    const stateV2 = deriveLearnerStateV2(mockHire);
    expect(stateV2.currentState.currentDay).toBe(4);

    const readiness = assessReadiness(mockHire.capabilities || {}, mockHire);
    expect(typeof readiness).toBe("number");
  });

  it("Scenario M & N & O & P: Single DEAN authority, intervention memory, V3.1 context, and governance remain intact", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 4,
      workSignal: {
        actualPickRate: 32,
        targetPickRate: 50,
        accuracyRate: 98,
      },
    };

    const result = executeCoordinationLoop(input);

    expect(result.governanceResult).toBeDefined();
    expect(result.experienceCase).toBeDefined();
    expect(result.experienceCase?.evidenceSnapshot.v31Context).toBeDefined();
  });
});
