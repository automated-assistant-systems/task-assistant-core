// src/issueClassifier.ts
//
// Track classification engine using pattern matching against issue labels.
// Tracks come from config.tracks: Record<string, string[]>

import { logger } from "./logger";
import { IssueClassification } from "./types";

export interface TaskAssistantConfig {
  tracks?: Record<string, string[]>;
}

/**
 * Classify an issue's track based on label patterns.
 */
export function classifyIssue(
  config: TaskAssistantConfig,
  labels: string[]
): IssueClassification {
  const classification: IssueClassification = {
    track: null,
    trackLabelToApply: null,
    violations: [],
    actions: [],
  };

  const tracks = config.tracks ?? {};

  let detectedTrack: string | null = null;

  const normalizedLabels = labels.map(l => l.toLowerCase());

  // Iterate over configured tracks
  for (const [trackName, patterns] of Object.entries(tracks)) {
    const match = patterns.some(pattern =>
      normalizedLabels.some(label =>
        label.includes(pattern.toLowerCase())
      )
    );

    if (match) {
      detectedTrack = trackName;
      break;
    }
  }

  if (detectedTrack) {
    classification.track = detectedTrack;
    classification.trackLabelToApply = `track:${detectedTrack}`;
  } else {
    classification.violations.push("no-track-matched");
  }

  return classification;
}
