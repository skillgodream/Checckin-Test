import { CausalRelationship } from "../types";

/**
 * V3.4 — DEAN CAUSAL CAPABILITY INTELLIGENCE GRAPH
 * 
 * Deterministic domain knowledge map of operational relationships.
 * DEAN uses this map during UNDERSTAND/CONNECT to traverse evidence paths.
 */

const CAUSAL_GRAPH: CausalRelationship[] = [
  // Capability dependencies (extending existing capability definitions)
  { sourceId: "CAP-3", targetId: "CAP-5", type: "PREREQUISITE_OF", strength: "High", context: "Navigation enables efficient single-order picking." },
  { sourceId: "CAP-1", targetId: "CAP-4", type: "PREREQUISITE_OF", strength: "High", context: "Safety prerequisite for cold chain." },
  
  // Evidence influences
  { sourceId: "CAP-3", targetId: "EV-PICK-RATE", type: "INFLUENCES_OUTCOME", strength: "High", context: "Good navigation reduces travel time." },
  { sourceId: "EV-CYCLE-TIME", targetId: "EV-PICK-RATE", type: "INFLUENCES_OUTCOME", strength: "High", context: "High cycle time directly reduces UPH." },
  
  // Operational context
  { sourceId: "EV-CONGESTION", targetId: "EV-CYCLE-TIME", type: "OPERATIONAL_CONTEXT_FOR", strength: "Medium", context: "Congestion increases cycle time." },
  { sourceId: "EV-SCANNER-LATENCY", targetId: "EV-CYCLE-TIME", type: "OPERATIONAL_CONTEXT_FOR", strength: "Medium", context: "Scanner latency slows down individual picks." },
];

export function getRelevantRelationships(nodeId: string): CausalRelationship[] {
  return CAUSAL_GRAPH.filter(rel => rel.sourceId === nodeId || rel.targetId === nodeId);
}

export function getAllRelationships(): CausalRelationship[] {
  return CAUSAL_GRAPH;
}
