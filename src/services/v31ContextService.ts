import { LoopExecutionInput } from "./intelligence";
import {
  V31EvidenceContext,
  V31ObservedOutcome,
  V31ContextualEvidenceItem,
  V31ContextDomain,
  V31AttributionContext,
  V31EvidenceQuality,
} from "../types";

/**
 * V3.1 IMPLEMENTATION — EVIDENCE & CONTEXT INTELLIGENCE SERVICE
 * 
 * Pure, deterministic context assembly service that surrounds an observed operational outcome
 * with structured contextual evidence across:
 * - Learner & Capability
 * - Work Environment & Congestion
 * - Technology & Hardware
 * - Process & Logistics
 * - Human Manager Observations
 * - Temporal & Historical Trajectory
 * 
 * STRICT MANDATES:
 * 1. An observed metric is an outcome, NOT automatically a diagnosis.
 * 2. Does NOT select actions or make recommendations.
 * 3. Does NOT call LLMs or alter governance rules.
 * 4. Preserves ambiguity & competing factors when evidence points to multiple domains.
 */

export function assembleV31EvidenceContext(
  input: LoopExecutionInput,
  overrideOutcome?: V31ObservedOutcome
): V31EvidenceContext {
  const dayNumber = input.dayNumber;
  const workSignal = input.workSignal;
  const canonicalEvidence = input.canonicalEvidence;
  const dailySignal = input.dailySignal;
  const managerSignal = input.managerSignal;
  const hire = input.hire;

  // 1. Determine the Primary Observed Operational Outcome
  const currentPickRate = canonicalEvidence?.performance?.productivity ?? workSignal?.actualPickRate;
  const targetPickRate = canonicalEvidence?.performance?.targetProductivity ?? workSignal?.targetPickRate ?? 50;
  const accuracyRate = canonicalEvidence?.performance?.accuracy ?? workSignal?.accuracyRate;

  let observation: V31ObservedOutcome;
  if (overrideOutcome) {
    observation = overrideOutcome;
  } else if (currentPickRate !== undefined) {
    let direction: V31ObservedOutcome["direction"] = "stable";
    if (currentPickRate < targetPickRate - 5) {
      direction = "declining";
    } else if (currentPickRate >= targetPickRate) {
      direction = "improving";
    }
    observation = {
      metricName: "actualPickRate",
      observedValue: currentPickRate,
      targetValue: targetPickRate,
      direction,
      dayNumber,
    };
  } else if (accuracyRate !== undefined) {
    observation = {
      metricName: "accuracyRate",
      observedValue: accuracyRate,
      targetValue: 98,
      direction: accuracyRate < 98 ? "declining" : "stable",
      dayNumber,
    };
  } else {
    observation = {
      metricName: "floorTelemetry",
      observedValue: "awaiting",
      targetValue: "standard",
      direction: "unknown",
      dayNumber,
    };
  }

  const isPickRateDeclining = observation.metricName === "actualPickRate" && observation.direction === "declining";
  const isAccuracyDeclining = observation.metricName === "accuracyRate" && observation.direction === "declining";
  const isOutcomeDeclining = isPickRateDeclining || isAccuracyDeclining || observation.direction === "declining";

  const items: V31ContextualEvidenceItem[] = [];

  // Helper text searches
  const dailyText = `${dailySignal?.issue || ""} ${dailySignal?.rawText || ""} ${dailySignal?.category || ""}`.toLowerCase();
  const managerNotes = `${managerSignal?.notes || ""} ${canonicalEvidence?.observation?.supervisorNote || ""} ${canonicalEvidence?.observation?.behaviorNote || ""}`.toLowerCase();
  const envText = `${workSignal?.externalBottleneck || ""} ${canonicalEvidence?.environment?.externalBottleneck || ""} ${canonicalEvidence?.environment?.environmentalIssue || ""}`.toLowerCase();

  // 2. Learner & Capability Context Domain
  const helpRequestsCount = canonicalEvidence?.support?.helpRequests ?? workSignal?.helpRequestsCount ?? dailySignal?.helpRequestsCount ?? 0;
  const navigationTime = workSignal?.navigationTime;
  const hasAisleSearchMention = dailyText.includes("aisle") || dailyText.includes("find") || dailyText.includes("rack") || dailyText.includes("shelf") || dailyText.includes("location");

  if (navigationTime !== undefined && navigationTime > 45) {
    items.push({
      id: `ev-learner-nav-${dayNumber}`,
      source: "work_signal",
      domain: "learner",
      description: `Elevated search & navigation time (${navigationTime}s per pick item)`,
      relationship: isOutcomeDeclining ? "supports" : "contextualizes",
      quality: helpRequestsCount > 2 || hasAisleSearchMention ? "strong" : "moderate",
      metricName: "navigationTime",
      value: navigationTime,
      timestampDay: dayNumber,
    });
  }

  if (helpRequestsCount > 0) {
    items.push({
      id: `ev-learner-help-${dayNumber}`,
      source: "work_signal",
      domain: "capability",
      description: `Worker requested floor assistance / buddy guidance ${helpRequestsCount} times`,
      relationship: isOutcomeDeclining ? "supports" : "contextualizes",
      quality: helpRequestsCount >= 4 ? "strong" : "moderate",
      metricName: "helpRequestsCount",
      value: helpRequestsCount,
      timestampDay: dayNumber,
    });
  }

  if (hasAisleSearchMention) {
    items.push({
      id: `ev-learner-search-${dayNumber}`,
      source: "work_signal",
      domain: "capability",
      description: "Reported difficulty locating product coordinates or specific bin positions in Aisles 4-8",
      relationship: isOutcomeDeclining ? "supports" : "contextualizes",
      quality: "moderate",
      timestampDay: dayNumber,
    });
  }

  // 3. Technology & Hardware Domain
  const scannerErrors = workSignal?.scannerErrors;
  const toolStatus = canonicalEvidence?.toolSystem?.toolStatus;
  const isToolCategory = dailySignal?.category === "Tool" || managerSignal?.issueCategory === "Tool";
  const hasHardwareMention = dailyText.includes("scanner") || dailyText.includes("bluetooth") || dailyText.includes("battery") || dailyText.includes("hardware") || dailyText.includes("disconnect");

  if ((scannerErrors !== undefined && scannerErrors > 0) || toolStatus === "Failed" || isToolCategory || hasHardwareMention) {
    items.push({
      id: `ev-tech-tool-${dayNumber}`,
      source: "tool_system",
      domain: "technology",
      description: canonicalEvidence?.toolSystem?.toolProblem || (toolStatus === "Failed" ? "Terminal scanner hardware failure" : `Scanner / device connection disruption logged (${scannerErrors ?? 1} errors)`),
      relationship: isOutcomeDeclining ? "supports" : "contextualizes",
      quality: toolStatus === "Failed" || (scannerErrors !== undefined && scannerErrors > 3) ? "strong" : "moderate",
      metricName: "scannerErrors",
      value: scannerErrors ?? 1,
      timestampDay: dayNumber,
    });
  }

  // 4. Work Environment & Bottleneck Domain
  const hasCongestion = workSignal?.congestion === true || envText.includes("congestion") || envText.includes("crowded");
  const multipleWorkersAffected = workSignal?.multipleWorkersAffected === true || envText.includes("facility bottleneck") || envText.includes("multiple workers");
  const hasExternalBottleneck = Boolean(canonicalEvidence?.environment?.externalBottleneck) || Boolean(canonicalEvidence?.environment?.environmentalIssue) || Boolean(canonicalEvidence?.toolSystem?.systemDowntime) || Boolean(workSignal?.externalBottleneck) || envText.includes("conveyor") || envText.includes("spill") || envText.includes("system down");

  if (hasCongestion || multipleWorkersAffected || hasExternalBottleneck) {
    items.push({
      id: `ev-env-bottleneck-${dayNumber}`,
      source: "environment_process",
      domain: "work_environment",
      description: canonicalEvidence?.environment?.externalBottleneck || canonicalEvidence?.environment?.environmentalIssue || (hasCongestion ? "High aisle congestion in central picking thoroughfare" : "External dark store facility disruption"),
      relationship: isOutcomeDeclining ? "supports" : "contextualizes",
      quality: multipleWorkersAffected || hasExternalBottleneck ? "strong" : "moderate",
      timestampDay: dayNumber,
    });
  }

  // 5. Human Manager & Daily Report Observations Domain
  if (dailySignal && dailySignal.issue) {
    const isAlreadyCovered = items.some((i) => i.domain === "capability" || i.domain === "technology" || i.domain === "work_environment");
    if (!isAlreadyCovered) {
      items.push({
        id: `ev-daily-narrative-${dayNumber}`,
        source: "work_signal",
        domain: dailySignal.category === "Tool" ? "technology" : (dailySignal.category === "Environment" ? "work_environment" : "learner"),
        description: dailySignal.issue || dailySignal.rawText || "Single daily shift note logged",
        relationship: isOutcomeDeclining ? "supports" : "contextualizes",
        quality: "weak", // Uncorroborated single narrative report
        timestampDay: dayNumber,
      });
    }
  }

  if (managerSignal) {
    const isManagerReportingStruggle = managerSignal.state === "Struggling" || managerSignal.state === "Needs support";
    const isManagerReportingGood = managerSignal.state === "Doing well";

    items.push({
      id: `ev-human-mgr-${dayNumber}`,
      source: "manager_signal",
      domain: "human_manager",
      description: managerSignal.notes || `Manager observation: ${managerSignal.state} (${managerSignal.issueCategory || "General"})`,
      relationship: isOutcomeDeclining ? (isManagerReportingStruggle ? "supports" : "contradicts") : (isManagerReportingGood ? "supports" : "contextualizes"),
      quality: "strong", // Direct human floor observation is high quality
      timestampDay: dayNumber,
    });
  }

  // 6. Temporal & Historical Trajectory Domain
  const daysHistory = hire.daysHistory || [];
  if (daysHistory.length >= 2) {
    const previousShift = daysHistory[daysHistory.length - 2];
    const prevPickRate = previousShift.workSignal?.actualPickRate;

    if (prevPickRate !== undefined && currentPickRate !== undefined) {
      const isConsistentTrend = (prevPickRate < targetPickRate && currentPickRate < targetPickRate);
      const isAnomalousDip = (prevPickRate >= targetPickRate && currentPickRate < targetPickRate - 10);

      items.push({
        id: `ev-temporal-history-${dayNumber}`,
        source: "historical_trajectory",
        domain: "temporal_history",
        description: isConsistentTrend
          ? `Multi-shift performance pattern: Pick rate remained below target (${prevPickRate} UPH -> ${currentPickRate} UPH)`
          : (isAnomalousDip ? `Anomalous single-shift dip after previous solid performance (${prevPickRate} UPH -> ${currentPickRate} UPH)` : `Historical trajectory: previous shift ${prevPickRate} UPH`),
        relationship: isConsistentTrend ? "supports" : (isAnomalousDip ? "contradicts" : "contextualizes"),
        quality: daysHistory.length >= 3 ? "strong" : "moderate",
        metricName: "historicalPickRate",
        value: prevPickRate,
        timestampDay: dayNumber - 1,
      });
    }
  } else if (daysHistory.length === 1 && isOutcomeDeclining) {
    // Single isolated shift observation without historical baseline
    items.push({
      id: `ev-temporal-isolated-${dayNumber}`,
      source: "historical_trajectory",
      domain: "temporal_history",
      description: "Single shift observation; insufficient longitudinal baseline",
      relationship: "contextualizes",
      quality: "weak",
      timestampDay: dayNumber,
    });
  }

  // 7. Calculate Aggregations & Attributions
  const supportingItems = items.filter((i) => i.relationship === "supports");
  const contradictingItems = items.filter((i) => i.relationship === "contradicts");

  const supportingCount = supportingItems.length;
  const contradictingCount = contradictingItems.length;

  const primaryDomains = Array.from(new Set(items.map((i) => i.domain)));

  // Check competing factors: do we have supporting evidence in BOTH learner/capability AND technology/environment?
  const hasLearnerEvidence = supportingItems.some((i) => i.domain === "learner" || i.domain === "capability");
  const hasEnvTechEvidence = supportingItems.some((i) => i.domain === "work_environment" || i.domain === "technology");

  const hasCompetingFactors = hasLearnerEvidence && hasEnvTechEvidence;
  const hasCorroboration = supportingCount >= 2;

  // Determine Overall Attribution
  let overallAttribution: V31AttributionContext = "unknown";

  if (supportingCount === 0) {
    overallAttribution = "not_yet_assessed";
  } else if (hasCompetingFactors) {
    overallAttribution = "mixed";
  } else if (hasEnvTechEvidence && !hasLearnerEvidence) {
    overallAttribution = "environment";
  } else if (hasLearnerEvidence && !hasEnvTechEvidence) {
    overallAttribution = "learner";
  } else {
    overallAttribution = "unknown";
  }

  // Determine Overall Quality
  let overallQuality: V31EvidenceQuality = "moderate";
  if (supportingCount === 0) {
    overallQuality = "insufficient";
  } else if (items.some((i) => i.quality === "weak") && supportingCount === 1) {
    overallQuality = "weak";
  } else if (hasCorroboration && supportingItems.some((i) => i.quality === "strong")) {
    overallQuality = "strong";
  } else if (supportingCount >= 1) {
    overallQuality = "moderate";
  }

  return {
    observation,
    contextualItems: items,
    primaryDomains,
    overallAttribution,
    overallQuality,
    supportingCount,
    contradictingCount,
    hasCorroboration,
    hasCompetingFactors,
  };
}
