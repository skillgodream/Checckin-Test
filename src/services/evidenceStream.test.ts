import { describe, it, expect } from "vitest";
import { assemble360EvidenceStream } from "./evidenceStreamService";
import { LoopExecutionInput } from "./intelligence";

describe("V3.3 Evidence Stream", () => {
  it("A. Existing daily/work evidence enters the stream", () => {
    const input: LoopExecutionInput = {
      hire: { id: "test-hire", name: "Test Hire" } as any,
      dayNumber: 1,
      workSignal: { dayNumber: 1, actualPickRate: 40, targetPickRate: 50, accuracyRate: 98, ordersCompleted: 5, targetOrders: 10 } as any,
    };
    const stream = assemble360EvidenceStream(input);
    expect(stream.events.some(e => e.sourceDomain === "WORK_SIGNAL")).toBe(true);
  });
});
