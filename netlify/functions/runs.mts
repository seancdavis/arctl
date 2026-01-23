import type { Context, Config } from "@netlify/functions";
import { sql, runMigrations } from "./lib/db.mts";
import type { Run } from "./lib/types.mts";

export default async (req: Request, context: Context) => {
  await runMigrations();

  if (req.method === "GET") {
    // List all runs (excluding archived by default)
    const url = new URL(req.url);
    const includeArchived = url.searchParams.get("archived") === "true";

    let runs: Run[];
    if (includeArchived) {
      runs = await sql`
        SELECT * FROM runs
        WHERE archived_at IS NOT NULL
        ORDER BY archived_at DESC
      `;
    } else {
      runs = await sql`
        SELECT * FROM runs
        WHERE archived_at IS NULL
        ORDER BY created_at DESC
      `;
    }

    return new Response(JSON.stringify(runs), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    // Create a new run via Netlify API
    const body = await req.json();
    const { site_id, branch, prompt } = body;

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
    const createRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${site_id}/agent/runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch,
          prompt,
        }),
      }
    );

    if (!createRes.ok) {
      const error = await createRes.text();
      return new Response(
        JSON.stringify({ error: `Failed to create run: ${error}` }),
        { status: createRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const netlifyRun = await createRes.json();

    // Get site name
    const siteRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${site_id}`,
      {
        headers: { Authorization: `Bearer ${pat}` },
      }
    );
    const site = siteRes.ok ? await siteRes.json() : null;

    const now = new Date().toISOString();

    // Insert into our database
    await sql`
      INSERT INTO runs (
        id, site_id, site_name, title, state, branch,
        pull_request_url, deploy_preview_url, created_at, updated_at, synced_at
      ) VALUES (
        ${netlifyRun.id},
        ${site_id},
        ${site?.name || null},
        ${netlifyRun.title || prompt.substring(0, 100)},
        ${netlifyRun.state || "NEW"},
        ${branch || null},
        ${netlifyRun.pull_request_url || null},
        ${netlifyRun.deploy_preview_url || null},
        ${netlifyRun.created_at || now},
        ${netlifyRun.updated_at || now},
        ${now}
      )
    `;

    // Trigger sync to ensure background worker is running
    await fetch(`${context.site.url}/.netlify/functions/sync-trigger`, {
      method: "POST",
    });

    const [run] = await sql`SELECT * FROM runs WHERE id = ${netlifyRun.id}`;

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
