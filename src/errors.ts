/**
 * errors.ts
 * Centralized error handling for task-assistant-core.
 *
 * Provides structured, typed error classes that can be used
 * throughout the engine to cleanly distinguish fatal vs recoverable
 * conditions and produce GitHub-friendly error messages.
 */

export type TaskAssistantErrorSeverity =
  | "fatal"
  | "recoverable"
  | "config"
  | "github-api"
  | "rule";

export interface TaskAssistantErrorData {
  severity: TaskAssistantErrorSeverity;
  message: string;
  cause?: unknown;
  details?: Record<string, unknown>;
}

export class TaskAssistantError extends Error {
  severity: TaskAssistantErrorSeverity;
  cause?: unknown;
  details?: Record<string, unknown>;

  constructor(data: TaskAssistantErrorData) {
    super(data.message);
    this.name = "TaskAssistantError";
    this.severity = data.severity;
    this.cause = data.cause;
    this.details = data.details;
  }

  /**
   * Convert error into a GitHub-safe display format
   * without leaking stacks unless explicitly enabled.
   */
  toDisplay(debug = false): string {
    let out = `[${this.severity.toUpperCase()}] ${this.message}`;

    if (this.details) {
      out += `\nDetails: ${JSON.stringify(this.details, null, 2)}`;
    }

    if (debug && this.cause instanceof Error) {
      out += `\nCause: ${this.cause.message}`;
      out += `\nStack: ${this.cause.stack}`;
    }

    return out;
  }
}

/**
 * Helper for creating fatal configuration errors
 */
export function configError(message: string, details?: Record<string, unknown>) {
  return new TaskAssistantError({
    severity: "config",
    message,
    details,
  });
}

/**
 * Helper for GitHub API-specific errors
 */
export function githubApiError(
  message: string,
  cause?: unknown,
  details?: Record<string, unknown>
) {
  return new TaskAssistantError({
    severity: "github-api",
    message,
    cause,
    details,
  });
}

/**
 * Helper for rule engine errors
 */
export function ruleError(
  message: string,
  details?: Record<string, unknown>
) {
  return new TaskAssistantError({
    severity: "rule",
    message,
    details,
  });
}

/**
 * Allows recoverable operations:
 * These errors do not halt the task assistant, but they should be logged.
 */
export function recoverableError(
  message: string,
  details?: Record<string, unknown>
) {
  return new TaskAssistantError({
    severity: "recoverable",
    message,
    details,
  });
}

/**
 * Helper for unrecoverable fatal errors
 */
export function fatalError(
  message: string,
  cause?: unknown,
  details?: Record<string, unknown>
) {
  return new TaskAssistantError({
    severity: "fatal",
    message,
    cause,
    details,
  });
}
