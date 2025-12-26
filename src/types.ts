// src/types.ts

/**
 * Shared types for task-assistant-core.
 * These are used by the main engine, telemetry, and (later) the GitHub App.
 */

export interface IssueClassification {
  track: string | null;
  trackLabelToApply: string | null;
  violations: string[];
  actions: string[];
}

export interface TaskAssistantResult {
  track: string | null;
  actions: string[];
  milestone: string | null;
  telemetryFile: string | null;
}

export interface TelemetryRepositoryInfo {
  owner: string;
  repo: string;
}

export interface TelemetryIssueInfo {
  id: number;
  number: number;
  title: string;
  state: string;
  labels: string[];
  milestone: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Canonical telemetry payload shape written by task-assistant-core.
 */
export interface TelemetryPayload {
  version: number;
  event: string;
  generated_at: string;

  repository: TelemetryRepositoryInfo;
  issue?: TelemetryIssueInfo;

  classification?: IssueClassification | any;
  actions?: string[];
}
