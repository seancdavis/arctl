import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { sites } from "../../db/schema.ts";
import { asc, eq, and } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

export default async (req: Request, context: Context) => {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  if (req.method === "GET") {
    const result = await db
      .select()
      .from(sites)
      .where(eq(sites.userId, auth.userId))
      .orderBy(asc(sites.name));
    return Response.json(result);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return Response.json({ error: "id and name are required" }, { status: 400 });
    }

    const now = new Date();
    const [site] = await db
      .insert(sites)
      .values({ id, name, userId: auth.userId, updatedAt: now })
      .onConflictDoUpdate({
        target: [sites.id, sites.userId],
        set: { name, updatedAt: now },
      })
      .returning();

    return Response.json(site);
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/sites",
};
