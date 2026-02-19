import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sessions } from "../../db/schema.ts";
import { eq, asc } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

export default async (req: Request, context: Context) => {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const url = new URL(req.url);
  // Path: /api/runs/:id/sessions
  const pathParts = url.pathname.split("/");
  const runId = pathParts[pathParts.length - 2];

  if (!runId) {
    return new Response(JSON.stringify({ error: "Run ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "GET") {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.runId, runId))
      .orderBy(asc(sessions.createdAt));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [run] = await db.select().from(runs).where(eq(runs.id, runId));
    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create session via Netlify API
    const createRes = await fetch(
      `https://api.netlify.com/api/v1/agent_runners/${runId}/sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      }
    );

    if (!createRes.ok) {
      const error = await createRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to create session: ${error}` }),
        { status: createRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const netlifySession = await createRes.json();
    const now = new Date();

    // Insert into our database
    await db.insert(sessions).values({
      id: netlifySession.id,
      runId: runId,
      state: netlifySession.state || "NEW",
      prompt: prompt,
      createdAt: netlifySession.created_at ? new Date(netlifySession.created_at) : now,
      updatedAt: netlifySession.updated_at ? new Date(netlifySession.updated_at) : now,
    });

    // Update run state to RUNNING if it was DONE
    const runUpdates: Partial<typeof runs.$inferInsert> = { updatedAt: now };
    if (run.state === "DONE") {
      runUpdates.state = "RUNNING";
    }
    if (run.pullRequestUrl) {
      runUpdates.prNeedsUpdate = true;
    }
    await db.update(runs).set(runUpdates).where(eq(runs.id, runId));

    // Trigger sync — pass accessToken for background worker
    const siteUrl = new URL(req.url).origin;
    try {
      await fetch(`${siteUrl}/api/sync/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: auth.accessToken }),
      });
    } catch (e) {
      console.error("Failed to trigger sync:", e);
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, netlifySession.id));

    return new Response(JSON.stringify(session), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/runs/:id/sessions",
};
