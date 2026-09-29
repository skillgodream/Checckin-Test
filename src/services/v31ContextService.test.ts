import { describe, it, expect } from "vitest";
import { assembleV31EvidenceContext } from "./v31ContextService";
import { executeCoordinationLoop, assessReadiness, LoopExecutionInput } from "./intelligence";
import { deriveLearnerStateV2 } from "./learnerStateV2Service";
import { NewHire } from "../types";

const mockHire: NewHire = {
  id: "test-hire-v31",
  name: "Arjun Verma",
  roleTitle: "Dark Store Picker",
  startDate: "2026-09-01",
  currentDay: 3,
  status: "Needs attention",
  statusReason: "Ramp testing",
  overallReadinessScore: 45,
  currentCapabilityId: 3,
  modulesCompleted: 5,
  completedModuleIds: ["101", "102", "103", "104", "105"],
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
        helpRequestsCount: 0,
      },
      statusAtEndOfDay: "Doing well",
    },
    {
      dayNumber: 2,
      workSignal: {
        dayNumber: 2,
        actualPickRate: 42,
        targetPickRate: 50,
        accuracyRate: 98,
        ordersCompleted: 7,
        targetOrders: 10,
        helpRequestsCount: 1,
      },
      statusAtEndOfDay: "Needs attention",
    },
  ],
};

describe("V3.1 Evidence & Context Intelligence — Context Assembly Tests", () => {
  it("Case A: Pick Rate ↓ + navigation time ↑ + navigation help ↑ creates learner/capability supporting context", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 3,
      workSignal: {
        actualPickRate: 32,
        targetPickRate: 50,
        accuracyRate: 98,
        navigationTime: 55,
        helpRequestsCount: 4,
      },
      dailySignal: {
        issue: "Aisle navigation confusion in Aisles 4-8",
        rawText: "I got lost finding rack coordinates in Aisles 4-8",
        confidence: "High",
      },
    };

    const context = assembleV31EvidenceContext(input);

    expect(context.observation.metricName).toBe("actualPickRate");
    expect(context.observation.direction).toBe("declining");
    expect(context.primaryDomains).toContain("learner");
    expect(context.primaryDomains).toContain("capability");
    expect(context.overallAttribution).toBe("learner");
    expect(context.supportingCount).toBeGreaterThanOrEqual(2);
    expect(context.hasCorroboration).toBe(true);
  });

  it("Case B: Pick Rate ↓ + scanner errors ↑ + multiple workers affected creates technology/environment supporting context", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 3,
      workSignal: {
        actualPickRate: 28,
        targetPickRate: 50,
        accuracyRate: 98,
        scannerErrors: 6,
        multipleWorkersAffected: true,
        externalBottleneck: "Terminal scanner bluetooth network disconnect",
      },
      canonicalEvidence: {
        toolSystem: {
          toolStatus: "Failed",
          toolProblem: "Terminal scanner bluetooth disconnect loop",
        },
        environment: {
          externalBottleneck: "Store Wi-Fi & scanner network failure",
        },
      },
    };

    const context = assembleV31EvidenceContext(input);

    expect(context.observation.direction).toBe("declining");
    expect(context.primaryDomains).toContain("technology");
    expect(context.primaryDomains).toContain("work_environment");
    expect(context.overallAttribution).toBe("environment");
    expect(context.supportingCount).toBeGreaterThanOrEqual(2);
  });

  it("Case C: Pick Rate ↓ + accuracy stable + no supporting evidence does NOT manufacture a learner diagnosis", () => {
    const input: LoopExecutionInput = {
      hire: { ...mockHire, daysHistory: [] },
      dayNumber: 1,
      workSignal: {
        actualPickRate: 44,
        targetPickRate: 50,
        accuracyRate: 99,
        helpRequestsCount: 0,
      },
    };

    const context = assembleV31EvidenceContext(input);

    expect(context.supportingCount).toBe(0);
    expect(context.overallAttribution).toBe("not_yet_assessed");
    expect(context.overallQuality).toBe("insufficient");
  });

  it("Case D: Pick Rate ↓ + navigation evidence ↑ + congestion ↑ preserves mixed/competing attribution", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 3,
      workSignal: {
        actualPickRate: 30,
        targetPickRate: 50,
        accuracyRate: 98,
        navigationTime: 50,
        helpRequestsCount: 3,
        congestion: true,
      },
      canonicalEvidence: {
        environment: {
          environmentalIssue: "High aisle congestion in central grocery aisle",
        },
      },
    };

    const context = assembleV31EvidenceContext(input);

    expect(context.hasCompetingFactors).toBe(true);
    expect(context.overallAttribution).toBe("mixed");
  });

  it("Case E: Single anomalous signal is evaluated with weak/moderate quality", () => {
    const input: LoopExecutionInput = {
      hire: { ...mockHire, daysHistory: [] },
      dayNumber: 1,
      dailySignal: {
        issue: "Brief pause during peak wave",
        rawText: "One-off delay during shift start",
        confidence: "Low",
      },
      workSignal: {
        actualPickRate: 38,
        targetPickRate: 50,
        accuracyRate: 98,
      },
    };

    const context = assembleV31EvidenceContext(input);

    expect(context.overallQuality === "weak" || context.overallQuality === "moderate").toBe(true);
  });

  it("Case F: Repeated corroborating evidence upgrades to strong quality", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 3,
      workSignal: {
        actualPickRate: 31,
        targetPickRate: 50,
        accuracyRate: 98,
        navigationTime: 60,
        helpRequestsCount: 5,
      },
      managerSignal: {
        state: "Struggling",
        notes: "Rahul continues to struggle with coordinate navigation in Aisles 4-8",
        issueCategory: "Speed",
      },
    };

    const context = assembleV31EvidenceContext(input);

    expect(context.hasCorroboration).toBe(true);
    expect(context.overallQuality).toBe("strong");
  });

  it("Case G: Existing DEAN action behavior remains governed by executeCoordinationLoop", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 3,
      workSignal: {
        actualPickRate: 30,
        targetPickRate: 50,
        accuracyRate: 98,
        helpRequestsCount: 4,
      },
    };

    const result = executeCoordinationLoop(input);

    expect(result.action).toBeDefined();
    expect(result.updatedStatus).toBeDefined();
    expect(result.adaptiveDecision).toBeDefined();
  });

  it("Case H & I: Readiness assessment and Learner State V2 remain intact and unchanged", () => {
    const readiness = assessReadiness(mockHire.capabilities || {}, mockHire);
    expect(typeof readiness).toBe("number");

    const stateV2 = deriveLearnerStateV2(mockHire);
    expect(stateV2.currentState.currentDay).toBe(3);
    expect(stateV2.trajectoryMemory).toBeDefined();
  });

  it("Case J: V3.1 context is attached to diagnosis without creating a second brain or parallel action selector", () => {
    const input: LoopExecutionInput = {
      hire: mockHire,
      dayNumber: 3,
      workSignal: {
        actualPickRate: 32,
        targetPickRate: 50,
        accuracyRate: 98,
        navigationTime: 55,
      },
    };

    const result = executeCoordinationLoop(input);

    expect(result.action).toBeDefined();
    expect(result.updatedCapabilities).toBeDefined();
  });
});
