import type { Context, Config } from "@netlify/functions";
import { sql, runMigrations } from "./lib/db.mts";

export default async (req: Request, context: Context) => {
  await runMigrations();

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
    const sessions = await sql`
      SELECT * FROM sessions WHERE run_id = ${runId} ORDER BY created_at ASC
    `;
    return new Response(JSON.stringify(sessions), {
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

    // Get the run to find the site_id
    const [run] = await sql`SELECT * FROM runs WHERE id = ${runId}`;
    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const pat = Netlify.env.get("NETLIFY_PAT");
    if (!pat) {
      return new Response(
        JSON.stringify({ error: "NETLIFY_PAT not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create session via Netlify API
    const createRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${run.site_id}/agent/runs/${runId}/sessions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
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
    const now = new Date().toISOString();

    // Insert into our database
    await sql`
      INSERT INTO sessions (id, run_id, state, prompt, created_at, updated_at)
      VALUES (
        ${netlifySession.id},
        ${runId},
        ${netlifySession.state || "NEW"},
        ${prompt},
        ${netlifySession.created_at || now},
        ${netlifySession.updated_at || now}
      )
    `;

    // Update run state to RUNNING if it was DONE
    if (run.state === "DONE") {
      await sql`
        UPDATE runs SET state = 'RUNNING', updated_at = ${now}
        WHERE id = ${runId}
      `;
    }

    // Trigger sync to ensure background worker is running
    await fetch(`${context.site.url}/.netlify/functions/sync-trigger`, {
      method: "POST",
    });

    const [session] = await sql`SELECT * FROM sessions WHERE id = ${netlifySession.id}`;
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
