/**
 * githubClient.ts
 * GitHub API abstraction for orchestrator-core.
 *
 * Provides a typed, error-safe wrapper around Octokit
 * and normalizes error output using OrchestratorError.
 */

import { Octokit } from "@octokit/rest";
import { getEnv } from "./env";
const env = getEnv();
import { logger } from "./logger";
import {
  githubApiError,
  OrchestratorError,
} from "./errors";

/**
 * Create the Octokit client using the validated GITHUB_TOKEN.
 * Future expansion: support GitHub App installation tokens.
 */
function createOctokit(): Octokit {
  logger.debug("Initializing Octokit GitHub client...");
  return new Octokit({
    auth: env.GITHUB_TOKEN,
    userAgent: "mindforge-orchestrator-core/1.0.0",
  });
}

const client = createOctokit();

/**
 * Wrapper around Octokit API calls to normalize errors.
 */
async function safeCall<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    logger.error(
      githubApiError(
        `GitHub API error in ${context}`,
        error instanceof Error ? error : undefined
      )
    );
    throw error;
  }
}

/**
 * Exported GitHub API client with safe helpers.
 */
export const github = {
  raw: client,

  async getIssue(owner: string, repo: string, issueNumber: number) {
    return safeCall(
      () =>
        client.issues.get({
          owner,
          repo,
          issue_number: issueNumber,
        }),
      `getIssue(${owner}/${repo}#${issueNumber})`
    );
  },

  async updateIssue(
    owner: string,
    repo: string,
    issueNumber: number,
    updates: Record<string, unknown>
  ) {
    return safeCall(
      () =>
        client.issues.update({
          owner,
          repo,
          issue_number: issueNumber,
          ...updates,
        }),
      `updateIssue(${owner}/${repo}#${issueNumber})`
    );
  },

  async listLabels(owner: string, repo: string) {
    return safeCall(
      () =>
        client.issues.listLabelsForRepo({
          owner,
          repo,
        }),
      `listLabels(${owner}/${repo})`
    );
  },

  async addLabels(
    owner: string,
    repo: string,
    issueNumber: number,
    labels: string[]
  ) {
    return safeCall(
      () =>
        client.issues.addLabels({
          owner,
          repo,
          issue_number: issueNumber,
          labels,
        }),
      `addLabels(${owner}/${repo}#${issueNumber})`
    );
  },

  async removeLabel(
    owner: string,
    repo: string,
    issueNumber: number,
    name: string
  ) {
    return safeCall(
      () =>
        client.issues.removeLabel({
          owner,
          repo,
          issue_number: issueNumber,
          name,
        }),
      `removeLabel(${owner}/${repo}#${issueNumber})`
    );
  },
};
