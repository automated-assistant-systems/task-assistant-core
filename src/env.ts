/**
 * env.ts
 * Centralized environment validation for orchestrator-core.
 *
 * Validation is run lazily via getEnv().
 * Rules vary by ORCHESTRATOR_RUN_MODE.
 */

export interface OrchestratorEnv {
  // GitHub auth (Action mode only)
  GITHUB_TOKEN?: string;

  // Runtime mode
  ORCHESTRATOR_RUN_MODE: "action" | "app" | "local";

  // Telemetry
  ORCHESTRATOR_TELEMETRY_ENABLED: boolean;
  ORCHESTRATOR_TELEMETRY_ROOT: string;

  // Optional JSON-based configuration
  ORCHESTRATOR_TRACK_CONFIG?: Record<string, unknown>;
  ORCHESTRATOR_MILESTONE_RULES?: Record<string, unknown>;

  // Node env
  NODE_ENV: "development" | "production" | "test";
}

/**
 * Reads and validates all environment variables.
 * Throws descriptive errors if required variables are missing.
 */
export function loadEnv(): OrchestratorEnv {
  const errors: string[] = [];

  // --- Run Mode ------------------------------------------------------------

  const ORCHESTRATOR_RUN_MODE = (
    process.env.ORCHESTRATOR_RUN_MODE ?? "action"
  ) as OrchestratorEnv["ORCHESTRATOR_RUN_MODE"];

  if (!["action", "app", "local"].includes(ORCHESTRATOR_RUN_MODE)) {
    errors.push(
      `Invalid ORCHESTRATOR_RUN_MODE '${ORCHESTRATOR_RUN_MODE}'. ` +
        "Allowed values: action | app | local"
    );
  }

  // --- GitHub Token (Action mode only) -------------------------------------

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  if (ORCHESTRATOR_RUN_MODE === "action" && !GITHUB_TOKEN) {
    errors.push(
      "Missing GITHUB_TOKEN. Required when ORCHESTRATOR_RUN_MODE=action."
    );
  }

  // --- Telemetry -----------------------------------------------------------

  const ORCHESTRATOR_TELEMETRY_ENABLED =
    (process.env.ORCHESTRATOR_TELEMETRY_ENABLED ?? "true").toLowerCase() ===
    "true";

  const ORCHESTRATOR_TELEMETRY_ROOT =
    process.env.ORCHESTRATOR_TELEMETRY_ROOT ?? "telemetry";

  // --- Optional JSON Config ------------------------------------------------

  let ORCHESTRATOR_TRACK_CONFIG: Record<string, unknown> | undefined;

  if (process.env.ORCHESTRATOR_TRACK_CONFIG) {
    try {
      ORCHESTRATOR_TRACK_CONFIG = JSON.parse(
        process.env.ORCHESTRATOR_TRACK_CONFIG
      );
    } catch {
      errors.push(
        "ORCHESTRATOR_TRACK_CONFIG is not valid JSON."
      );
    }
  }

  let ORCHESTRATOR_MILESTONE_RULES: Record<string, unknown> | undefined;

  if (process.env.ORCHESTRATOR_MILESTONE_RULES) {
    try {
      ORCHESTRATOR_MILESTONE_RULES = JSON.parse(
        process.env.ORCHESTRATOR_MILESTONE_RULES
      );
    } catch {
      errors.push(
        "ORCHESTRATOR_MILESTONE_RULES is not valid JSON."
      );
    }
  }

  // --- Node Environment ----------------------------------------------------

  const NODE_ENV = (process.env.NODE_ENV ?? "production") as
    OrchestratorEnv["NODE_ENV"];

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
    ORCHESTRATOR_RUN_MODE,
    ORCHESTRATOR_TELEMETRY_ENABLED,
    ORCHESTRATOR_TELEMETRY_ROOT,
    ORCHESTRATOR_TRACK_CONFIG,
    ORCHESTRATOR_MILESTONE_RULES,
    NODE_ENV,
  };
}

// --------------------------------------------------------------------------

let cachedEnv: OrchestratorEnv | null = null;

/**
 * Lazily loads and validates environment variables.
 * Safe for Action, App, and Local execution paths.
 */
export function getEnv(): OrchestratorEnv {
  if (!cachedEnv) {
    cachedEnv = loadEnv();
  }
  return cachedEnv;
}
