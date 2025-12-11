/**
 * env.ts
 * Centralized environment validation for orchestrator-core.
 *
 * Ensures required variables are present and optional ones
 * have safe defaults. This module should be imported at the
 * top of all entrypoints so validation occurs immediately.
 */

export interface OrchestratorEnv {
  GITHUB_TOKEN: string;

  // Optional configuration settings
  ORCHESTRATOR_TELEMETRY_ENABLED: boolean;
  ORCHESTRATOR_RUN_MODE: "action" | "app" | "local";

  // Optional JSON-based configuration
  ORCHESTRATOR_TRACK_CONFIG?: Record<string, unknown>;
  ORCHESTRATOR_MILESTONE_RULES?: Record<string, unknown>;

  // Node env
  NODE_ENV: "development" | "production" | "test";
  // Telemetry repo
  ORCHESTRATOR_TELEMETRY_ROOT: string;
}

/**
 * Reads and validates all environment variables.
 * Throws descriptive errors if required variables are missing.
 */
export function loadEnv(): OrchestratorEnv {
  const errors: string[] = [];

  // --- Required Variables ---------------------------------------------------

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    errors.push(
      "Missing GITHUB_TOKEN. This action requires token permissions " +
      "to call GitHub APIs."
    );
  }

  // --- Optional Flags -------------------------------------------------------

  const ORCHESTRATOR_TELEMETRY_ENABLED =
    (process.env.ORCHESTRATOR_TELEMETRY_ENABLED ?? "true").toLowerCase() ===
    "true";

  const ORCHESTRATOR_RUN_MODE = (
    process.env.ORCHESTRATOR_RUN_MODE ?? "action"
  ) as OrchestratorEnv["ORCHESTRATOR_RUN_MODE"];

  // Validate run-mode is one of allowed values
  if (!["action", "app", "local"].includes(ORCHESTRATOR_RUN_MODE)) {
    errors.push(
      `Invalid ORCHESTRATOR_RUN_MODE: '${ORCHESTRATOR_RUN_MODE}'. ` +
      "Allowed values: action | app | local"
    );
  }

  // --- Optional JSON Config -------------------------------------------------

  let ORCHESTRATOR_TRACK_CONFIG: Record<string, unknown> | undefined =
    undefined;

  if (process.env.ORCHESTRATOR_TRACK_CONFIG) {
    try {
      ORCHESTRATOR_TRACK_CONFIG = JSON.parse(
        process.env.ORCHESTRATOR_TRACK_CONFIG
      );
    } catch (err) {
      errors.push(
        "ORCHESTRATOR_TRACK_CONFIG is not valid JSON. " +
        "Provide JSON-encoded object, e.g. {\"track\": \"sprint\"}."
      );
    }
  }

  let ORCHESTRATOR_MILESTONE_RULES: Record<string, unknown> | undefined =
    undefined;

  if (process.env.ORCHESTRATOR_MILESTONE_RULES) {
    try {
      ORCHESTRATOR_MILESTONE_RULES = JSON.parse(
        process.env.ORCHESTRATOR_MILESTONE_RULES
      );
    } catch (err) {
      errors.push(
        "ORCHESTRATOR_MILESTONE_RULES is not valid JSON. " +
        "Provide JSON-encoded rules object."
      );
    }
  }

  // --- Node Environment -----------------------------------------------------

  const NODE_ENV = (process.env.NODE_ENV ?? "production") as
    OrchestratorEnv["NODE_ENV"];

  if (!["production", "development", "test"].includes(NODE_ENV)) {
    errors.push(
      `Invalid NODE_ENV '${NODE_ENV}'. Must be one of: ` +
      "production | development | test"
    );
  }

  // --- Fail Fast ------------------------------------------------------------

  if (errors.length > 0) {
    throw new Error(
      "Environment validation failed:\n" + errors.map((e) => `- ${e}`).join("\n")
    );
  }

  // --- Return structured, typed config --------------------------------------

  return {
    GITHUB_TOKEN: GITHUB_TOKEN!,
    ORCHESTRATOR_TELEMETRY_ENABLED,
    ORCHESTRATOR_RUN_MODE,
    ORCHESTRATOR_TRACK_CONFIG,
    ORCHESTRATOR_MILESTONE_RULES,
    NODE_ENV,
    ORCHESTRATOR_TELEMETRY_ROOT:
      process.env.ORCHESTRATOR_TELEMETRY_ROOT ?? "telemetry",
  };
}

// Default export for convenience
export const env = loadEnv();
