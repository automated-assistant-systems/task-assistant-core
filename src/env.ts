/**
 * env.ts
 * Centralized environment validation for task-assistant-core.
 *
 * Validation is run lazily via getEnv().
 * Rules vary by TASK_ASSISTANT_RUN_MODE.
 */

export interface TaskAssistantEnv {
  // GitHub auth (Action mode only)
  GITHUB_TOKEN?: string;

  // Runtime mode
  TASK_ASSISTANT_RUN_MODE: "action" | "app" | "local";

  // Telemetry
  TASK_ASSISTANT_TELEMETRY_ENABLED: boolean;
  TASK_ASSISTANT_TELEMETRY_ROOT: string;

  // Optional JSON-based configuration
  TASK_ASSISTANT_TRACK_CONFIG?: Record<string, unknown>;
  TASK_ASSISTANT_MILESTONE_RULES?: Record<string, unknown>;

  // Node env
  NODE_ENV: "development" | "production" | "test";
}

/**
 * Reads and validates all environment variables.
 * Throws descriptive errors if required variables are missing.
 */
export function loadEnv(): TaskAssistantEnv {
  const errors: string[] = [];

  // --- Run Mode ------------------------------------------------------------

  const TASK_ASSISTANT_RUN_MODE = (
    process.env.TASK_ASSISTANT_RUN_MODE ?? "action"
  ) as TaskAssistantEnv["TASK_ASSISTANT_RUN_MODE"];

  if (!["action", "app", "local"].includes(TASK_ASSISTANT_RUN_MODE)) {
    errors.push(
      `Invalid TASK_ASSISTANT_RUN_MODE '${TASK_ASSISTANT_RUN_MODE}'. ` +
        "Allowed values: action | app | local"
    );
  }

  // --- GitHub Token (Action mode only) -------------------------------------

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (TASK_ASSISTANT_RUN_MODE === "action" && !GITHUB_TOKEN) {
    errors.push(
      "Missing GITHUB_TOKEN. Required when TASK_ASSISTANT_RUN_MODE=action."
    );
  }

  // --- Telemetry -----------------------------------------------------------

  const TASK_ASSISTANT_TELEMETRY_ENABLED =
    (process.env.TASK_ASSISTANT_TELEMETRY_ENABLED ?? "true").toLowerCase() ===
    "true";

  const TASK_ASSISTANT_TELEMETRY_ROOT =
    process.env.TASK_ASSISTANT_TELEMETRY_ROOT ?? "telemetry";

  // --- Optional JSON Config ------------------------------------------------

  let TASK_ASSISTANT_TRACK_CONFIG: Record<string, unknown> | undefined;

  if (process.env.TASK_ASSISTANT_TRACK_CONFIG) {
    try {
      TASK_ASSISTANT_TRACK_CONFIG = JSON.parse(
        process.env.TASK_ASSISTANT_TRACK_CONFIG
      );
    } catch {
      errors.push(
        "TASK_ASSISTANT_TRACK_CONFIG is not valid JSON."
      );
    }
  }

  let TASK_ASSISTANT_MILESTONE_RULES: Record<string, unknown> | undefined;

  if (process.env.TASK_ASSISTANT_MILESTONE_RULES) {
    try {
      TASK_ASSISTANT_MILESTONE_RULES = JSON.parse(
        process.env.TASK_ASSISTANT_MILESTONE_RULES
      );
    } catch {
      errors.push(
        "TASK_ASSISTANT_MILESTONE_RULES is not valid JSON."
      );
    }
  }

  // --- Node Environment ----------------------------------------------------

  const NODE_ENV = (process.env.NODE_ENV ?? "production") as
    TaskAssistantEnv["NODE_ENV"];

  if (!["production", "development", "test"].includes(NODE_ENV)) {
    errors.push(
      `Invalid NODE_ENV '${NODE_ENV}'. Must be production | development | test`
    );
  }

  // --- Fail Fast -----------------------------------------------------------

  if (errors.length > 0) {
    throw new Error(
      "Environment validation failed:\n" +
        errors.map((e) => `- ${e}`).join("\n")
    );
  }

  // --- Return Typed Config -------------------------------------------------

  return {
    GITHUB_TOKEN,
    TASK_ASSISTANT_RUN_MODE,
    TASK_ASSISTANT_TELEMETRY_ENABLED,
    TASK_ASSISTANT_TELEMETRY_ROOT,
    TASK_ASSISTANT_TRACK_CONFIG,
    TASK_ASSISTANT_MILESTONE_RULES,
    NODE_ENV,
  };
}

// --------------------------------------------------------------------------

let cachedEnv: TaskAssistantEnv | null = null;

/**
 * Lazily loads and validates environment variables.
 * Safe for Action, App, and Local execution paths.
 */
export function getEnv(): TaskAssistantEnv {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
