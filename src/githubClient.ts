/**
 * githubClient.ts
 * GitHub API abstraction for task-assistant-core.
 *
 * Provides typed, error-safe helpers around Octokit.
 * No global state. No implicit auth. Fully injectable.
 */

import type { Octokit } from "@octokit/rest";
import { logger } from "./logger";
import { githubApiError } from "./errors";

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
 * GitHub API helper functions.
 * Octokit must be provided by the caller.
 */
export const github = {
  /**
   * Fetch a single issue.
   */
  async getIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number
  ) {
    return safeCall(
      () =>
        octokit.issues.get({
          owner,
          repo,
          issue_number: issueNumber,
        }),
      `getIssue(${owner}/${repo}#${issueNumber})`
    );
  },

  /**
   * Update an issue.
   */
  async updateIssue(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    updates: Record<string, unknown>
  ) {
    return safeCall(
      () =>
        octokit.issues.update({
          owner,
          repo,
          issue_number: issueNumber,
          ...updates,
        }),
      `updateIssue(${owner}/${repo}#${issueNumber})`
    );
  },

  /**
   * List all labels in a repository.
   */
  async listLabels(
    octokit: Octokit,
    owner: string,
    repo: string
  ) {
    return safeCall(
      () =>
        octokit.issues.listLabelsForRepo({
          owner,
          repo,
        }),
      `listLabels(${owner}/${repo})`
    );
  },

  /**
   * Add labels to an issue.
   */
  async addLabels(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    labels: string[]
  ) {
    return safeCall(
      () =>
        octokit.issues.addLabels({
          owner,
          repo,
          issue_number: issueNumber,
          labels,
        }),
      `addLabels(${owner}/${repo}#${issueNumber})`
    );
  },

  /**
   * Remove a label from an issue.
   */
  async removeLabel(
    octokit: Octokit,
    owner: string,
    repo: string,
    issueNumber: number,
    name: string
  ) {
    return safeCall(
      () =>
        octokit.issues.removeLabel({
          owner,
          repo,
          issue_number: issueNumber,
          name,
        }),
      `removeLabel(${owner}/${repo}#${issueNumber})`
    );
  },
};
