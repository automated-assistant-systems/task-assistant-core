/**
 * milestoneRules.ts
 * Track → Milestone logic for orchestrator-core.
 *
 * Given a track name (from issueClassifier) and orchestrator config,
 * this module determines which milestone title should be used.
 */

import { logger } from "./logger";

export interface MilestoneRule {
  title: string;
}

export interface OrchestratorConfig {
  tracks?: Record<string, string[]>;
  milestones?: Record<string, MilestoneRule>;
}

export function inferMilestoneTitle(
  config: OrchestratorConfig,
  track: string | null
): string | null {
  if (!track) {
    logger.debug("No track found → cannot infer milestone.");
    return null;
  }

  const milestoneRules = config.milestones ?? {};

  // Look up matching milestone rule
  const rule = milestoneRules[track];

  if (!rule) {
    logger.debug(`No milestone rule found for track '${track}'.`);
    return null;
  }

  // Future extensibility: dynamic templates, sprint numbers, etc.
  logger.debug(
    `Milestone for track '${track}' → title '${rule.title}'`
  );

  return rule.title;
}
