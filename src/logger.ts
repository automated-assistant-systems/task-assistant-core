/**
 * logger.ts
 * Structured logging for orchestrator-core.
 *
 * Produces GitHub-safe console output, supports verbosity flags,
 * and integrates with OrchestratorError.
 */

import { OrchestratorError } from "./errors";
import { getEnv } from "./env";
const env = getEnv();

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  debug?: boolean;
}

/**
 * Simple structured logger with GitHub Actions–safe output.
 * Future extension: emit logs to telemetry service.
 */
class Logger {
  private debugEnabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.debugEnabled = options.debug ?? false;
  }

  private format(level: LogLevel, msg: string): string {
    const ts = new Date().toISOString();
    return `[${ts}] [${level.toUpperCase()}] ${msg}`;
  }

  debug(msg: string): void {
    if (!this.debugEnabled) return;
    console.log(this.format("debug", msg));
  }

  info(msg: string): void {
    console.log(this.format("info", msg));
  }

  warn(msg: string): void {
    console.warn(this.format("warn", msg));
  }

  error(err: unknown): void {
    if (err instanceof OrchestratorError) {
      console.error(
        this.format(
          "error",
          err.toDisplay(this.debugEnabled)
        )
      );
    } else if (err instanceof Error) {
      console.error(
        this.format(
          "error",
          this.debugEnabled ? err.stack ?? err.message : err.message
        )
      );
    } else {
      console.error(
        this.format("error", String(err))
      );
    }
  }
}

/**
 * Create a configured logger based on environment.
 * - In development: debug enabled
 * - In production: debug disabled unless explicitly set
 */
export const logger = new Logger({
  debug: env.NODE_ENV === "development"
});
