import { ActionAuditLog, RecommendedAction } from "../../types";

/**
 * V3.5 — DEAN ACTION GOVERNANCE AUDIT SERVICE
 * 
 * Provides transparent logging of DEAN's action governance decisions.
 */

const auditLog: ActionAuditLog[] = [];

export function logActionAudit(
  hireId: string,
  dayNumber: number,
  action: any,
  governanceResult: any,
  evidenceSummary: string,
  rationale: string
): void {
  const auditEntry: ActionAuditLog = {
    id: `audit-${Date.now()}`,
    hireId,
    dayNumber,
    timestamp: new Date().toISOString(),
    decidedAction: action,
    governanceResult,
    evidenceSummary,
    rationale,
  };
  auditLog.push(auditEntry);
  console.log(`[ACTION AUDIT] Action ${action.actionTitle || "unknown"} logged. Status: ${governanceResult.governanceVerdict}`);
}

export function getActionAuditLogs(): ActionAuditLog[] {
  return auditLog;
}
