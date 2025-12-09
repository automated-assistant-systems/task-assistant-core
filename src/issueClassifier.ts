import * as github from "@actions/github";
import { ClassificationResult, OrchestratorConfig } from "./types";

export function classifyIssue(config: OrchestratorConfig): ClassificationResult {
  const issue = github.context.payload.issue;

  if (!issue) {
    throw new Error("No issue found in GitHub context payload.");
  }

  const labels = (issue.labels || []).map((l: any) =>
    typeof l === "string" ? l : l.name
  );

  // Find first existing track label
  const existingTrackLabel = labels.find((l:string) => typeof l === "string" && l.startsWith("track/"));

  if (existingTrackLabel) {
    const trackId = existingTrackLabel.replace("track/", "");
    return {
      track: trackId,
      trackLabelToApply: null,
      violations: [],
      actions: []
    };
  }

  // No existing track: pick default (prefer id === "sprint", otherwise first track)
  const sprintTrack = config.tracks.find((t) => t.id === "sprint");
  const defaultTrack = sprintTrack ?? config.tracks[0];

  const trackLabelToApply = `track/${defaultTrack.id}`;

  return {
    track: defaultTrack.id,
    trackLabelToApply,
    violations: ["missing-track"],
    actions: [`apply-label:${trackLabelToApply}`]
  };
}
