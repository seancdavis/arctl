import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs } from "../../db/schema.ts";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";
import { maybeSync } from "./_shared/maybeSync.mts";

export default async (req: Request, context: Context) => {
  console.log(`[runs] ${req.method} ${req.url}`);

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("archived") === "true";
    console.log(`[runs] GET runs (archived: ${includeArchived})`);

    const result = includeArchived
      ? await db
          .select()
          .from(runs)
          .where(and(eq(runs.userId, auth.userId), isNotNull(runs.archivedAt)))
          .orderBy(desc(runs.archivedAt))
      : await db
          .select()
          .from(runs)
          .where(and(eq(runs.userId, auth.userId), isNull(runs.archivedAt)))
          .orderBy(desc(runs.createdAt));

    console.log(`[runs] GET returning ${result.length} runs`);

    // SWR: return stale data immediately, trigger background sync if needed
    const origin = new URL(req.url).origin;
    maybeSync({ origin, accessToken: auth.accessToken });

    return Response.json(result);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { site_id, branch, prompt, agent } = body;
    console.log(`[runs] POST new run for site ${site_id} (agent: ${agent || 'default'})`);

    if (!site_id || !prompt) {
      return Response.json(
        { error: "site_id and prompt are required" },
        { status: 400 }
      );
    }

    // Create run via Netlify API
    const apiUrl = `https://api.netlify.com/api/v1/agent_runners?site_id=${site_id}`;
    console.log(`[runs] Calling Netlify API: POST ${apiUrl}`);
    const createRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ branch, prompt, agent }),
    });

    if (!createRes.ok) {
      const error = await createRes.text();
      console.error(`[runs] Netlify API error: ${createRes.status} ${error}`);
      return Response.json(
        { error: `Failed to create run: ${error}` },
        { status: createRes.status }
      );
    }

    const netlifyRun = await createRes.json();

    // Get site name
    const siteRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${site_id}`,
      { headers: { Authorization: `Bearer ${auth.accessToken}` } }
    );
    const site = siteRes.ok ? await siteRes.json() : null;

    const now = new Date();

    await db.insert(runs).values({
      id: netlifyRun.id,
      siteId: site_id,
      siteName: site?.name || null,
      title: netlifyRun.title || prompt.substring(0, 100),
      state: (netlifyRun.state || "NEW").toUpperCase(),
      branch: branch || null,
      pullRequestUrl: netlifyRun.pr_url || null,
      pullRequestState: netlifyRun.pr_state || null,
      deployPreviewUrl: netlifyRun.latest_session_deploy_url || null,
      createdAt: netlifyRun.created_at ? new Date(netlifyRun.created_at) : now,
      updatedAt: netlifyRun.updated_at ? new Date(netlifyRun.updated_at) : now,
      syncedAt: now,
      userId: auth.userId,
    });

    // Force sync so the board picks up the new run quickly
    const origin = new URL(req.url).origin;
    maybeSync({ origin, accessToken: auth.accessToken, force: true });

    const [run] = await db.select().from(runs).where(eq(runs.id, netlifyRun.id));
    console.log(`[runs] Created run ${run.id} (${run.state})`);

    return Response.json(run, { status: 201 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/runs",
};
