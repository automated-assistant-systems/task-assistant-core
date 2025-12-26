// src/index.ts

import { Octokit } from "@octokit/rest";
import { getEnv } from "./env";
import { logger } from "./logger";
import { loadConfig } from "./config";
import { classifyIssue } from "./issueClassifier";
import { inferMilestoneTitle } from "./milestoneRules";
import { ensureMilestone, attachMilestoneToIssue } from "./milestoneManager";
import { writeTelemetry } from "./telemetry";
import { TaskAssistantResult, TelemetryPayload } from "./types";
import { github as ghClient } from "./githubClient";

export async function run(deps: {
  context: {
    repo: { owner: string; repo: string };
    payload: any;
  };
  getInput?: (name: string) => string;
  setOutput?: (name: string, value: string) => void;
  setFailed?: (message: string) => void;
}) {
  const { context, getInput, setOutput, setFailed } = deps;
  const env = getEnv();
  const token = env.GITHUB_TOKEN;
  const octokit = new Octokit({
    auth: token,
    userAgent: "task-assistant-core/1.0.0",
  });
  try {
    logger.info("🚀 Task-Assistant-core starting...");
    logger.debug(`Run mode: ${env.TASK_ASSISTANT_RUN_MODE}`);

    const configPath =
      getInput?.("config-path") || ".github/task-assistant.yml";
    const config = loadConfig(configPath);

    const issue = context?.payload?.issue;

    if (!issue) {
      logger.info(
        "No issue in event payload - skipping execution."
      );
      return;
    }

    const { owner, repo } = context.repo;
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
      await ghClient.addLabels(octokit, owner, repo, issue.number, [
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
          octokit,
          { owner, repo },
          desiredMilestoneTitle
        );
        await attachMilestoneToIssue(
          octokit,
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
      env.TASK_ASSISTANT_TELEMETRY_ENABLED;

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
    const result: TaskAssistantResult = {
      track: classification.track,
      actions: classification.actions,
      milestone: finalMilestoneTitle,
      telemetryFile,
    };

    setOutput?.("result", JSON.stringify(result));
    logger.info("✅ Task Assistant-core completed successfully.");
  } catch (err: any) {
    logger.error(err);

    if (err instanceof Error) {
      setFailed?.(`❌ Task Assistant error: ${err.message}`);
    } else {
      setFailed?.("❌ Task Assistant error: unknown error");
    }

    process.exitCode = 1;
  }
}

export interface RunCoreInput {
  owner: string;
  repo: string;
  issue: any;
  githubToken?: string;
}

export async function runCore(input: RunCoreInput) {
  const { owner, repo, issue, githubToken } = input;

  const config = loadConfig(".github/task-assistant.yml");

  const labels = (issue.labels || []).map((l: any) =>
    typeof l === "string" ? l : l.name
  );
  const env = getEnv();
  const token =
    input.githubToken ??
    process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "No GitHub token provided. " +
      "Provide githubToken when running as a GitHub App."
    );
  }
  const octokit = new Octokit({ auth: token });
  const repoRef = { owner, repo };
  const classification = classifyIssue(config, labels);

  // Self-healing: labels
  if (classification.trackLabelToApply) {
    await octokit.issues.addLabels({
      owner,
      repo,
      issue_number: issue.number,
      labels: [classification.trackLabelToApply]
    });
  }

  // Milestone enforcement
  const desiredMilestone = inferMilestoneTitle(config, classification.track);
  if (desiredMilestone) {
    const milestoneNumber = await ensureMilestone(
      octokit,
      repoRef,
      desiredMilestone
    );
    await attachMilestoneToIssue(
      octokit,
      repoRef,
      issue.number,
      milestoneNumber
    );
  }

  // Telemetry
  writeTelemetry(issue.number, {
    version: 1,
    event: "issue",
    repository: repoRef,
    issue: {
      id: issue.id,
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: (issue.labels || []).map((l: any) =>
        typeof l === "string" ? l : l.name
      ),
      milestone: issue.milestone?.title ?? null,
      created_at: issue.created_at,
      updated_at: issue.updated_at
    },
    classification,
    generated_at: new Date().toISOString()
  });

  return {
    classification,
    milestone: desiredMilestone
  };
}

/**
 * GitHub Action entrypoint.
 * This must ONLY run when invoked by GitHub Actions.
 */
export function runAction(deps: {
  context: any;
  getInput: (name: string) => string;
  setOutput: (name: string, value: string) => void;
  setFailed: (message: string) => void;
}) {

  const { context, getInput, setOutput, setFailed } = deps;

  run({
    context,
    getInput,
    setOutput,
    setFailed
  });
}
