import type { Context, Config } from "@netlify/functions";
import { sql, runMigrations } from "./lib/db.mts";
import type { Run } from "./lib/types.mts";

export default async (req: Request, context: Context) => {
  await runMigrations();

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const runId = pathParts[pathParts.length - 1];

  if (!runId) {
    return new Response(JSON.stringify({ error: "Run ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "GET") {
    const [run] = await sql`SELECT * FROM runs WHERE id = ${runId}`;

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Also get sessions for this run
    const sessions = await sql`
      SELECT * FROM sessions WHERE run_id = ${runId} ORDER BY created_at ASC
    `;

    return new Response(JSON.stringify({ ...run, sessions }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    const body = await req.json();
    const { custom_notes, archived } = body;

    const [existingRun] = await sql`SELECT * FROM runs WHERE id = ${runId}`;
    if (!existingRun) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    if (archived === true) {
      await sql`
        UPDATE runs SET
          archived_at = ${now},
          updated_at = ${now}
        WHERE id = ${runId}
      `;
    } else if (archived === false) {
      await sql`
        UPDATE runs SET
          archived_at = NULL,
          updated_at = ${now}
        WHERE id = ${runId}
      `;
    }

    if (custom_notes !== undefined) {
      await sql`
        UPDATE runs SET
          custom_notes = ${custom_notes},
          updated_at = ${now}
        WHERE id = ${runId}
      `;
    }

    const [run] = await sql`SELECT * FROM runs WHERE id = ${runId}`;
    return new Response(JSON.stringify(run), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/runs/:id",
};
