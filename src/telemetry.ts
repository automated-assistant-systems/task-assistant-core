/**
 * telemetry.ts
 * Centralized telemetry writer for orchestrator-core.
 *
 * Telemetry writes are non-blocking: failures are logged but NEVER
 * cause orchestrator-core to fail execution.
 *
 * Directory structure (inside telemetry root):
 *
 *   <repo-name>/events/<issue>-<timestamp>.json
 *
 * TELEMETRY_ROOT is controlled by:
 *   ORCHESTRATOR_TELEMETRY_ROOT (default: "telemetry")
 */

import fs from "fs";
import path from "path";

import { logger } from "./logger";
import { env } from "./env";
import { TelemetryPayload } from "./types";  // ⬅ NEW

/**
 * Safely ensure a directory exists.
 */
function ensureDir(dirPath: string): void {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    logger.warn(`Failed to create directory ${dirPath}: ${err}`);
  }
}

/**
 * Sanitize a string for use in a filename.
 */
function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9\-_:]/g, "-");
}

/**
 * Write telemetry event to disk following the correct structure.
 *
 * Returns the path written (or "" on failure).
 */
export function writeTelemetry(
  issueNumber: number,
  payload: TelemetryPayload
): string {
  try {
    const root = env.ORCHESTRATOR_TELEMETRY_ROOT; // default: "telemetry"

    // Repo-name scoped directory (no owner-level nesting)
    const repoDir = path.join(root, payload.repository.repo);

    const eventsDir = path.join(repoDir, "events");
    ensureDir(eventsDir);

    const timestamp = new Date().toISOString();
    const safeTime = sanitize(timestamp);

    const filename = `${issueNumber}-${safeTime}.json`;
    const fullPath = path.join(eventsDir, filename);

    fs.writeFileSync(fullPath, JSON.stringify(payload, null, 2), "utf8");

    logger.debug(`Telemetry event written to ${fullPath}`);
    return fullPath;
  } catch (err: any) {
    logger.warn(
      `Failed to write telemetry event: ${err?.message ?? String(err)}`
    );
    return "";
  }
}
