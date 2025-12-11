/**
 * milestoneManager.ts
 * Milestone creation + attachment engine for orchestrator-core.
 *
 * Provides safe, structured wrappers around GitHub milestone operations.
 */

import { github } from "./githubClient";
import { logger } from "./logger";
import {
  githubApiError,
  OrchestratorError,
} from "./errors";

export interface RepoRef {
  owner: string;
  repo: string;
}

/**
 * Fetch all milestones for a repo.
 */
async function listMilestones(ref: RepoRef) {
  logger.debug(`Listing milestones for ${ref.owner}/${ref.repo}`);
  try {
    const res = await github.raw.issues.listMilestones({
      owner: ref.owner,
      repo: ref.repo,
      state: "open",
    });
    return res.data;
  } catch (err) {
    throw githubApiError(
      `Failed to list milestones for ${ref.owner}/${ref.repo}`,
      err
    );
  }
}

/**
 * Finds a milestone by title (exact match).
 */
async function findMilestoneByTitle(
  ref: RepoRef,
  title: string
): Promise<number | null> {
  const milestones = await listMilestones(ref);

  for (const m of milestones) {
    if (m.title === title) return m.number;
  }
  return null;
}

/**
 * Creates a milestone if it doesn't already exist.
 */
export async function ensureMilestone(
  ref: RepoRef,
  title: string
): Promise<number> {
  logger.info(`Ensuring milestone '${title}' exists`);

  const existing = await findMilestoneByTitle(ref, title);
  if (existing !== null) {
    logger.debug(`Milestone '${title}' already exists (#${existing})`);
    return existing;
  }

  logger.info(`Creating milestone '${title}'`);
  try {
    const res = await github.raw.issues.createMilestone({
      owner: ref.owner,
      repo: ref.repo,
      title,
    });
    return res.data.number;
  } catch (err) {
    throw githubApiError(
      `Failed to create milestone '${title}'`,
      err
    );
  }
}

/**
 * Attaches a milestone to an issue.
 */
export async function attachMilestoneToIssue(
  ref: RepoRef,
  issueNumber: number,
  milestoneNumber: number
): Promise<void> {
  logger.info(
    `Attaching milestone #${milestoneNumber} to issue #${issueNumber}`
  );

  try {
    await github.raw.issues.update({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: issueNumber,
      milestone: milestoneNumber,
    });
  } catch (err) {
    throw githubApiError(
      `Failed to attach milestone #${milestoneNumber} to issue #${issueNumber}`,
      err
    );
  }
}
