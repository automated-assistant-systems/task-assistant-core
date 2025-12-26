/**
 * milestoneRules.ts
 * Track → Milestone logic for task-assistant-core.
 *
 * Given a track name (from issueClassifier) and task assistant config,
 * this module determines which milestone title should be used.
 */

import { logger } from "./logger";

export interface MilestoneRule {
  title: string;
}

export interface TaskAssistantConfig {
  tracks?: Record<string, string[]>;
  milestones?: Record<string, MilestoneRule>;
}

export function inferMilestoneTitle(
  config: TaskAssistantConfig,
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
