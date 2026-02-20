import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs } from "../../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";
import { parsePrUrl, githubHeaders } from "./_shared/github.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const { id: runId } = context.params;

  if (!runId) {
    return Response.json({ error: "Run ID required" }, { status: 400 });
  }

  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, auth.userId)));

  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  if (!run.pullRequestUrl) {
    return Response.json({ error: "Run has no pull request" }, { status: 400 });
  }

  if (run.pullRequestState !== "open") {
    return Response.json(
      { error: `Cannot merge PR with state: ${run.pullRequestState}` },
      { status: 400 }
    );
  }

  const githubPat = Netlify.env.get("GITHUB_PAT");
  if (!githubPat) {
    return Response.json({ error: "GITHUB_PAT not configured" }, { status: 500 });
  }

  const parsed = parsePrUrl(run.pullRequestUrl);
  if (!parsed) {
    return Response.json({ error: "Could not parse PR URL" }, { status: 400 });
  }

  const { owner, repo, number } = parsed;

  const mergeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/merge`,
    {
      method: "PUT",
      headers: {
        ...githubHeaders(githubPat),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ merge_method: "squash" }),
    }
  );

  if (!mergeRes.ok) {
    const error = await mergeRes.json().catch(() => ({ message: "Merge failed" }));
    return Response.json(
      { error: error.message || "Failed to merge PR" },
      { status: mergeRes.status }
    );
  }

  const now = new Date();
  await db
    .update(runs)
    .set({
      pullRequestState: "merged",
      mergedAt: now,
      updatedAt: now,
    })
    .where(eq(runs.id, runId));

  const [updated] = await db.select().from(runs).where(eq(runs.id, runId));
  return Response.json(updated);
};

export const config: Config = {
  path: "/api/runs/:id/pr-merge",
};
