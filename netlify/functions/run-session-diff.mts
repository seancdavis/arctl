import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sessions } from "../../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const { id: runId, sessionId } = context.params;

  if (!runId || !sessionId) {
    return Response.json({ error: "Run ID and session ID required" }, { status: 400 });
  }

  // Verify run ownership
  const [run] = await db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.userId, auth.userId)));

  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  // Verify session belongs to run
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.runId, runId)));

  if (!session) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const diffType = url.searchParams.get("type") === "cumulative" ? "cumulative" : "result";

  const diffRes = await fetch(
    `https://api.netlify.com/api/v1/agent_runners/${runId}/sessions/${sessionId}/diff/${diffType}`,
    { headers: { Authorization: `Bearer ${auth.accessToken}` } }
  );

  if (!diffRes.ok) {
    if (diffRes.status === 404) {
      return Response.json({ diff: null, type: diffType });
    }
    const error = await diffRes.text();
    return Response.json(
      { error: `Failed to fetch diff: ${error}` },
      { status: diffRes.status }
    );
  }

  const diff = await diffRes.text();
  return Response.json({ diff, type: diffType });
};

export const config: Config = {
  path: "/api/runs/:id/sessions/:sessionId/diff",
};
