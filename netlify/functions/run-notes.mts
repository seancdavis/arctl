import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { runs, notes } from "../../db/schema.ts";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

export default async (req: Request, context: Context) => {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const { id: runId } = context.params;

  if (!runId) {
    return Response.json({ error: "Run ID required" }, { status: 400 });
  }

  // Verify run exists and belongs to user
  const [run] = await db.select().from(runs).where(and(eq(runs.id, runId), eq(runs.userId, auth.userId)));
  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  if (req.method === "GET") {
    const result = await db
      .select()
      .from(notes)
      .where(eq(notes.runId, runId))
      .orderBy(asc(notes.createdAt));

    return Response.json(result);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return Response.json({ error: "content is required" }, { status: 400 });
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

    return Response.json(note, { status: 201 });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/runs/:id/notes",
};
