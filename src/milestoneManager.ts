import { Octokit } from "@octokit/rest";

interface RepoContext {
  owner: string;
  repo: string;
}

export async function ensureMilestone(
  octokit: Octokit,
  repo: RepoContext,
  desiredTitle: string
): Promise<number> {
  // 1. Try to find existing milestone by title
  const milestones = await octokit.issues.listMilestones({
    owner: repo.owner,
    repo: repo.repo,
    state: "open"
  });

  const existing = milestones.data.find((m:any) => m.title === desiredTitle);
  if (existing) {
    return existing.number;
  }

  // 2. Create a new milestone
  const created = await octokit.issues.createMilestone({
    owner: repo.owner,
    repo: repo.repo,
    title: desiredTitle
  });

  return created.data.number;
}

export async function attachMilestoneToIssue(
  octokit: Octokit,
  repo: RepoContext,
  issueNumber: number,
  milestoneNumber: number
): Promise<void> {
  await octokit.issues.update({
    owner: repo.owner,
    repo: repo.repo,
    issue_number: issueNumber,
    milestone: milestoneNumber
  });
}
