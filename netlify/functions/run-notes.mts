import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, notes } from "../../db/schema.ts";
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
  // Path: /api/runs/:id/notes
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
      .from(notes)
      .where(eq(notes.runId, runId))
      .orderBy(asc(notes.createdAt));

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: "content is required" }), {
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

    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(notes).values({
      id,
      runId,
      content: content.trim(),
      createdAt: now,
      userId: auth.userId,
    });

    const [note] = await db.select().from(notes).where(eq(notes.id, id));

    return new Response(JSON.stringify(note), {
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
  path: "/api/runs/:id/notes",
};
