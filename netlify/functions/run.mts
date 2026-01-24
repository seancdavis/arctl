import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, sessions } from "../../db/schema.ts";
import { eq, asc } from "drizzle-orm";

export default async (req: Request, context: Context) => {
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
    const [run] = await db.select().from(runs).where(eq(runs.id, runId));

    if (!run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const runSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.runId, runId))
      .orderBy(asc(sessions.createdAt));

    return new Response(JSON.stringify({ ...run, sessions: runSessions }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    const body = await req.json();
    const { custom_notes, archived } = body;

    const [existingRun] = await db.select().from(runs).where(eq(runs.id, runId));
    if (!existingRun) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const updates: Partial<typeof runs.$inferInsert> = { updatedAt: now };

    if (archived === true) {
      updates.archivedAt = now;
    } else if (archived === false) {
      updates.archivedAt = null;
    }

    if (custom_notes !== undefined) {
      updates.customNotes = custom_notes;
    }

    await db.update(runs).set(updates).where(eq(runs.id, runId));

    const [run] = await db.select().from(runs).where(eq(runs.id, runId));
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
