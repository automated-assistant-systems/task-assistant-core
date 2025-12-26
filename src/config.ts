// src/config.ts
//
// Loads task-assistant.yml configuration, applies defaults,
// and emits warnings for unknown or invalid fields.
// Never throws — config errors must not break the task assistant engine.

import fs from "fs";
import yaml from "js-yaml";
import { logger } from "./logger";

export interface TaskAssistantConfig {
  tracks?: Record<string, string[]>;
  milestone_rules?: Record<string, string>;
  selfHealing?: {
    enabled?: boolean;
    fixMissingTrack?: boolean;
    fixMissingMilestone?: boolean;
  };
  telemetry?: {
    enabled?: boolean;
    path?: string;
  };

  // Allow unknown keys (loose typing)
  [key: string]: any;
}

const KNOWN_KEYS = new Set([
  "tracks",
  "milestone_rules",
  "self_healing",
  "telemetry"
]);

/**
 * Normalize key variants
 * GitHub users often write `self-healing`, `selfHealing`, or `self_healing`
 */
function normalizeKey(key: string): string {
  return key.replace(/-/g, "_");
}

function warnUnknownKeys(doc: any) {
  for (const key of Object.keys(doc)) {
    const norm = normalizeKey(key);
    if (!KNOWN_KEYS.has(norm)) {
      logger.warn(`⚠️  Unknown config key '${key}' — ignoring.`);
    }
  }
}

function validateTracks(tracks: any): Record<string, string[]> | undefined {
  if (tracks == null) return undefined;

  if (typeof tracks !== "object" || Array.isArray(tracks)) {
    logger.warn("⚠️  config.tracks should be a mapping of string → string[]. Ignoring tracks section.");
    return undefined;
  }

  const out: Record<string, string[]> = {};

  for (const [track, patterns] of Object.entries(tracks)) {
    if (!Array.isArray(patterns) || patterns.some(p => typeof p !== "string")) {
      logger.warn(`⚠️  tracks.${track} should be an array of strings. Ignoring this track.`);
      continue;
    }
    out[track] = patterns;
  }

  if (Object.keys(out).length === 0) {
    logger.warn("⚠️  No valid tracks found in config.tracks — classification may be limited.");
  }

  return out;
}

function validateMilestoneRules(m: any): Record<string, string> | undefined {
  if (m == null) return undefined;

  if (typeof m !== "object" || Array.isArray(m)) {
    logger.warn("⚠️ config.milestone_rules should be a mapping of track → milestone.");
    return undefined;
  }

  const out: Record<string, string> = {};

  for (const [track, title] of Object.entries(m)) {
    if (typeof title !== "string") {
      logger.warn(`⚠️ milestone_rules.${track} must be a string. Ignoring this rule.`);
      continue;
    }
    out[track] = title;
  }

  return out;
}

function validateSelfHealing(s: any): TaskAssistantConfig["selfHealing"] {
  if (!s) return {};

  const out: TaskAssistantConfig["selfHealing"] = {};

  if (typeof s.enabled !== "boolean") {
    logger.warn("⚠️ self_healing.enabled should be boolean. Defaulting to false.");
    out.enabled = false;
  } else {
    out.enabled = s.enabled;
  }

  if (s.fix_missing_track != null && typeof s.fix_missing_track !== "boolean") {
    logger.warn("⚠️ self_healing.fix_missing_track should be boolean.");
  } else {
    out.fixMissingTrack = s.fix_missing_track ?? false;
  }

  if (s.fix_missing_milestone != null && typeof s.fix_missing_milestone !== "boolean") {
    logger.warn("⚠️ self_healing.fix_missing_milestone should be boolean.");
  } else {
    out.fixMissingMilestone = s.fix_missing_milestone ?? false;
  }

  return out;
}

function validateTelemetry(t: any): TaskAssistantConfig["telemetry"] {
  const out: TaskAssistantConfig["telemetry"] = {};

  if (!t) {
    // default telemetry ON
    out.enabled = true;
    out.path = "telemetry";
    return out;
  }

  if (typeof t.enabled !== "boolean") {
    logger.warn("⚠️ telemetry.enabled should be boolean. Defaulting to true.");
    out.enabled = true;
  } else {
    out.enabled = t.enabled;
  }

  if (t.path && typeof t.path !== "string") {
    logger.warn("⚠️ telemetry.path must be a string. Using default 'telemetry'.");
    out.path = "telemetry";
  } else {
    out.path = t.path || "telemetry";
  }

  return out;
}

/**
 * Main config loader.
 * Always returns a config object — never throws.
 */
export function loadConfig(path: string): TaskAssistantConfig {
  try {
    if (!fs.existsSync(path)) {
      logger.warn(`⚠️ Config file not found at ${path}. Using defaults.`);
      return {};
    }

    const raw = fs.readFileSync(path, "utf8");
    const doc = yaml.load(raw) as any;

    if (!doc || typeof doc !== "object") {
      logger.warn("⚠️ Config YAML is empty or invalid. Using defaults.");
      return {};
    }

    // Normalize keys first
    const normalized: any = {};
    for (const [key, value] of Object.entries(doc)) {
      normalized[normalizeKey(key)] = value;
    }

    warnUnknownKeys(normalized);

    const config: TaskAssistantConfig = {
      tracks: validateTracks(normalized.tracks),
      milestone_rules: validateMilestoneRules(normalized.milestone_rules),
      selfHealing: validateSelfHealing(normalized.self_healing),
      telemetry: validateTelemetry(normalized.telemetry),
    };

    return config;
  } catch (err: any) {
    logger.error(`Failed to load configuration: ${err?.message}`);
    return {};
  }
}
