import type { Context, Config } from "@netlify/functions";
import { sql, runMigrations } from "./lib/db.mts";

export default async (req: Request, context: Context) => {
  await runMigrations();

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  // Path: /api/runs/:id/pull-request
  const pathParts = url.pathname.split("/");
  const runId = pathParts[pathParts.length - 2];

  if (!runId) {
    return new Response(JSON.stringify({ error: "Run ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get the run to find the site_id
  const [run] = await sql`SELECT * FROM runs WHERE id = ${runId}`;
  if (!run) {
    return new Response(JSON.stringify({ error: "Run not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (run.state !== "DONE") {
    return new Response(
      JSON.stringify({ error: "Run must be completed before creating PR" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (run.pull_request_url) {
    return new Response(
      JSON.stringify({ error: "PR already exists", pull_request_url: run.pull_request_url }),
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

  // Create PR via Netlify API
  const createRes = await fetch(
    `https://api.netlify.com/api/v1/sites/${run.site_id}/agent/runs/${runId}/pull_request`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pat}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!createRes.ok) {
    const error = await createRes.text();
    return new Response(
      JSON.stringify({ error: `Failed to create PR: ${error}` }),
      { status: createRes.status, headers: { "Content-Type": "application/json" } }
    );
  }

  const result = await createRes.json();
  const now = new Date().toISOString();

  // Update our database with the PR URL
  await sql`
    UPDATE runs SET
      pull_request_url = ${result.pull_request_url || result.url},
      updated_at = ${now}
    WHERE id = ${runId}
  `;

  const [updatedRun] = await sql`SELECT * FROM runs WHERE id = ${runId}`;
  return new Response(JSON.stringify(updatedRun), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/runs/:id/pull-request",
};
