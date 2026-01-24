import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sites } from "../../db/schema.ts";
import { eq, isNull, isNotNull, desc } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  console.log(`[runs] ${req.method} ${req.url}`);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("archived") === "true";
    console.log(`[runs] GET runs (archived: ${includeArchived})`);

    const result = includeArchived
      ? await db
          .select()
          .from(runs)
          .where(isNotNull(runs.archivedAt))
          .orderBy(desc(runs.archivedAt))
      : await db
          .select()
          .from(runs)
          .where(isNull(runs.archivedAt))
          .orderBy(desc(runs.createdAt));

    console.log(`[runs] GET returning ${result.length} runs:`, result.map(r => ({ id: r.id, state: r.state, title: r.title?.substring(0, 30) })));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { site_id, branch, prompt, model } = body;
    console.log(`[runs] POST new run for site ${site_id} (model: ${model || 'default'})`);

    if (!site_id || !prompt) {
      return new Response(
        JSON.stringify({ error: "site_id and prompt are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const pat = Netlify.env.get("NETLIFY_PAT");
    if (!pat) {
      return new Response(
        JSON.stringify({ error: "NETLIFY_PAT not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create run via Netlify API
    const apiUrl = `https://api.netlify.com/api/v1/agent_runners?site_id=${site_id}`;
    console.log(`[runs] Calling Netlify API: POST ${apiUrl}`);
    const createRes = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ branch, prompt, model }),
      }
    );

    if (!createRes.ok) {
      const error = await createRes.text();
      console.error(`[runs] Netlify API error: ${createRes.status} ${error}`);
      return new Response(
        JSON.stringify({ error: `Failed to create run: ${error}` }),
        { status: createRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const netlifyRun = await createRes.json();
    console.log(`[runs] Netlify API response:`, JSON.stringify(netlifyRun, null, 2));

    // Get site name
    const siteRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${site_id}`,
      { headers: { Authorization: `Bearer ${pat}` } }
    );
    const site = siteRes.ok ? await siteRes.json() : null;

    const now = new Date();

    // Insert into our database
    await db.insert(runs).values({
      id: netlifyRun.id,
      siteId: site_id,
      siteName: site?.name || null,
      title: netlifyRun.title || prompt.substring(0, 100),
      state: (netlifyRun.state || "NEW").toUpperCase(),
      branch: branch || null,
      pullRequestUrl: netlifyRun.pr_url || null,
      deployPreviewUrl: netlifyRun.latest_session_deploy_url || null,
      createdAt: netlifyRun.created_at ? new Date(netlifyRun.created_at) : now,
      updatedAt: netlifyRun.updated_at ? new Date(netlifyRun.updated_at) : now,
      syncedAt: now,
    });

    // Trigger sync
    const siteUrl = new URL(req.url).origin;
    try {
      await fetch(`${siteUrl}/api/sync/trigger`, {
        method: "POST",
      });
    } catch (e) {
      console.error("Failed to trigger sync:", e);
    }

    const [run] = await db.select().from(runs).where(eq(runs.id, netlifyRun.id));
    console.log(`[runs] Created run ${run.id} (${run.state})`);

    return new Response(JSON.stringify(run), {
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
  path: "/api/runs",
};
