// src/index.ts

import * as core from "@actions/core";
import * as gha from "@actions/github";

import { env } from "./env";
import { logger } from "./logger";
import { loadConfig } from "./config";
import { classifyIssue } from "./issueClassifier";
import { inferMilestoneTitle } from "./milestoneRules";
import { ensureMilestone, attachMilestoneToIssue } from "./milestoneManager";
import { writeTelemetry } from "./telemetry";
import { OrchestratorResult, TelemetryPayload } from "./types";
import { github as ghClient } from "./githubClient";

async function run() {
  try {
    logger.info("🚀 Orchestrator-core starting...");
    logger.debug(`Run mode: ${env.ORCHESTRATOR_RUN_MODE}`);

    const configPath =
      core.getInput("config-path") || ".github/orchestrator.yml";
    const config = loadConfig(configPath);

    const ctx = gha.context;
    const issue = ctx.payload.issue as any;

    if (!issue) {
      core.info(
        "No issue in event payload. This action should be triggered by an issue event."
      );
      return;
    }

    const { owner, repo } = ctx.repo;
    logger.info(`🔍 Processing issue #${issue.number} in ${owner}/${repo}`);

    const labels: string[] = (issue.labels || []).map((l: any) =>
      typeof l === "string" ? l : l.name
    );

    // 1. Classify issue track
    const classification = classifyIssue(config, labels);
    logger.info(`Track: ${classification.track ?? "none"}`);

    if (classification.violations.length > 0) {
      logger.warn(
        `Violations: ${classification.violations.join(", ")}`
      );
    }

    // 2. Self-healing behavior
    const selfHealing = config.selfHealing ?? {
      enabled: false,
      fixMissingTrack: false,
      fixMissingMilestone: false,
    };

    // 2a. Fix missing track label, if configured
    if (
      selfHealing.enabled &&
      selfHealing.fixMissingTrack &&
      classification.trackLabelToApply
    ) {
      logger.info(
        `Applying missing track label: ${classification.trackLabelToApply}`
      );
      await ghClient.addLabels(owner, repo, issue.number, [
        classification.trackLabelToApply,
      ]);
      classification.actions.push(
        `apply-track-label:${classification.trackLabelToApply}`
      );
    }

    // 2b. Milestone enforcement
    let finalMilestoneTitle: string | null =
      issue.milestone?.title ?? null;

    if (selfHealing.enabled && selfHealing.fixMissingMilestone) {
      const desiredMilestoneTitle = inferMilestoneTitle(
        config,
        classification.track
      );

      if (
        desiredMilestoneTitle &&
        desiredMilestoneTitle !== finalMilestoneTitle
      ) {
        logger.info(
          `Ensuring milestone '${desiredMilestoneTitle}' exists and is attached.`
        );

        const milestoneNumber = await ensureMilestone(
          { owner, repo },
          desiredMilestoneTitle
        );
        await attachMilestoneToIssue(
          { owner, repo },
          issue.number,
          milestoneNumber
        );

        finalMilestoneTitle = desiredMilestoneTitle;
        classification.actions.push(
          `set-milestone:${desiredMilestoneTitle}`
        );
      }
    }

    // 3. Telemetry
    const telemetryEnabled =
      (config.telemetry?.enabled ?? true) &&
      env.ORCHESTRATOR_TELEMETRY_ENABLED;

    let telemetryFile: string | null = null;

    if (telemetryEnabled) {
      const payload: TelemetryPayload = {
        version: 1,
        event: "issue_event",
        generated_at: new Date().toISOString(),
        repository: {
          owner,
          repo,
        },
        issue: {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels,
          milestone: finalMilestoneTitle,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        },
        classification,
        actions: classification.actions,
      };

      const writtenPath = writeTelemetry(issue.number, payload);
      telemetryFile = writtenPath || null;

      if (telemetryFile) {
        logger.info(`📦 Telemetry written to ${telemetryFile}`);
      } else {
        logger.warn("Telemetry was enabled but no file was written.");
      }
    } else {
      logger.info("Telemetry disabled by configuration or environment.");
    }

    // 4. Summarize result for downstream workflows
    const result: OrchestratorResult = {
      track: classification.track,
      actions: classification.actions,
      milestone: finalMilestoneTitle,
      telemetryFile,
    };

    core.setOutput("result", JSON.stringify(result));
    core.info("✅ Orchestrator-core completed successfully.");
  } catch (err: any) {
    logger.error(err);

    if (err instanceof Error) {
      core.setFailed(`❌ Orchestrator error: ${err.message}`);
    } else {
      core.setFailed("❌ Orchestrator error: unknown error");
    }

    process.exitCode = 1;
  }
}

run();
