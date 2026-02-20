/**
 * Shared GitHub API utilities used by PR status, merge, and webhook handlers.
 */

export function parsePrUrl(
  url: string
): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

export function githubHeaders(pat: string): Record<string, string> {
  return {
    Authorization: `token ${pat}`,
    Accept: "application/vnd.github.v3+json",
  };
}

export function computeReviewDecision(reviews: any[]): string | null {
  const latestByReviewer = new Map<string, string>();
  for (const review of reviews) {
    if (review.state === "COMMENTED" || review.state === "DISMISSED") continue;
    latestByReviewer.set(review.user.login, review.state);
  }

  const states = [...latestByReviewer.values()];
  if (states.length === 0) return null;
  if (states.includes("CHANGES_REQUESTED")) return "changes_requested";
  if (states.includes("APPROVED")) return "approved";
  return "pending";
}

export function computeOverallCheckStatus(checkRuns: any[]): string | null {
  if (checkRuns.length === 0) return null;

  const hasFailure = checkRuns.some(
    (c: any) =>
      c.conclusion === "failure" ||
      c.conclusion === "timed_out" ||
      c.conclusion === "action_required"
  );
  const hasPending = checkRuns.some((c: any) => c.status !== "completed");

  if (hasFailure) return "failure";
  if (hasPending) return "pending";
  return "success";
}

/**
 * Fetch all checks (check runs + commit statuses) for a given commit SHA.
 * Returns normalized checks list and deploy preview URL if found.
 */
export async function fetchAllChecks(
  owner: string,
  repo: string,
  headSha: string,
  pat: string
): Promise<{
  allChecks: Array<{ name: string; status: string; conclusion: string | null; detailsUrl: string | null }>;
  deployPreviewUrl: string | null;
}> {
  const headers = githubHeaders(pat);

  const [checksRes, statusesRes] = await Promise.all([
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/check-runs`,
      { headers }
    ),
    fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${headSha}/statuses`,
      { headers }
    ),
  ]);

  const checksData = checksRes.ok ? await checksRes.json() : { check_runs: [] };
  const statuses = statusesRes.ok ? await statusesRes.json() : [];

  // Normalize check runs
  const checkRuns = (checksData.check_runs || []).map((c: any) => ({
    name: c.name,
    status: c.status,
    conclusion: c.conclusion,
    detailsUrl: c.details_url || c.html_url || null,
  }));

  // Normalize commit statuses (dedupe: take latest per context)
  const latestStatuses = new Map<string, any>();
  for (const s of Array.isArray(statuses) ? statuses : []) {
    if (!latestStatuses.has(s.context)) {
      latestStatuses.set(s.context, s);
    }
  }
  const statusChecks = [...latestStatuses.values()].map((s: any) => ({
    name: s.context,
    status: s.state === "pending" ? "in_progress" : "completed",
    conclusion:
      s.state === "success"
        ? "success"
        : s.state === "pending"
        ? null
        : "failure",
    detailsUrl: s.target_url || null,
  }));

  const allChecks = [...checkRuns, ...statusChecks];

  // Find deploy preview URL from Netlify deploy status
  const deployStatus = latestStatuses.get("deploy/netlify");
  const deployPreviewUrl = deployStatus?.target_url || null;

  return { allChecks, deployPreviewUrl };
}
