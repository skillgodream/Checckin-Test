import { describe, it, expect } from "vitest";
import { understand, connect } from "./intelligence";
import { LoopExecutionInput } from "./intelligence";
import { CapabilityDefinition } from "../types";

describe("V3.4 CONNECT Integration", () => {
  it("Causal relationships flow from understand to connect", () => {
    const input: LoopExecutionInput = {
      hire: { id: "test-hire", name: "Test Hire", roleTitle: "Picker" } as any,
      dayNumber: 1,
      workSignal: { dayNumber: 1, actualPickRate: 40, targetPickRate: 50 } as any,
    };
    
    // Simulate observed signals
    const observed = { structuredEvidence: [{ evidenceType: 'uph', value: 40 }] } as any;

    // Run understand
    const understood = understand(observed, [], input.hire, {}, undefined, undefined, undefined);
    expect(understood.causalRelationships).toBeDefined();
    
    // Run connect
    const connected = connect(understood, input.hire, undefined);
    
    // Verify flow
    expect(connected.causalRelationships).toEqual(understood.causalRelationships);
  });
});
