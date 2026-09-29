import { describe, it, expect } from "vitest";
import { getRelevantRelationships } from "./causalGraphService";

describe("V3.4 Causal Capability Intelligence", () => {
  it("A. Known capability relationship can be retrieved", () => {
    const relationships = getRelevantRelationships("CAP-3");
    expect(relationships.length).toBeGreaterThan(0);
    expect(relationships.some(r => r.targetId === "CAP-5")).toBe(true);
  });
});
