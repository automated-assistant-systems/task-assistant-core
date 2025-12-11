export function isStale(issue: any, config: any): boolean {
  const daysBeforeStale = config?.stale?.days ?? 30;

  if (!issue.updated_at) return false;

  const updated = new Date(issue.updated_at).getTime();
  const now = Date.now();
  const diffDays = (now - updated) / (1000 * 60 * 60 * 24);

  return diffDays >= daysBeforeStale;
}
