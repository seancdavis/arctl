import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { sites } from "../../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

export default async (req: Request, context: Context) => {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const siteId = pathParts[pathParts.length - 1];

  if (!siteId) {
    return Response.json({ error: "Site ID required" }, { status: 400 });
  }

  if (req.method === "DELETE") {
    const [deleted] = await db
      .delete(sites)
      .where(and(eq(sites.id, siteId), eq(sites.userId, auth.userId)))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Site not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: "/api/sites/:id",
};
