import { describe, it, expect } from "vitest";
import { logActionAudit, getActionAuditLogs } from "./actionAuditService";
import { RecommendedAction } from "../../types";

describe("V3.5 Action Governance Audit", () => {
  it("Logs an action audit entry", () => {
    const action: RecommendedAction = {
      id: "act-1",
      dayNumber: 1,
      actionType: "practice",
      title: "Test Action",
      description: "Description",
      targetActor: "Test Hire",
      urgency: "Monitor",
      smallestPracticalStep: "Step",
      status: "pending",
      createdAt: "12:00",
    };
    logActionAudit("test-hire", 1, action, { status: "APPROVED" }, "Test diagnosis", "Test rationale");
    const logs = getActionAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].hireId).toBe("test-hire");
    expect(logs[0].decidedAction.id).toBe("act-1");
  });
});
