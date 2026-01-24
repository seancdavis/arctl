import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { sites } from "../../db/schema.ts";
import { eq } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  const siteId = pathParts[pathParts.length - 1];

  if (!siteId) {
    return new Response(JSON.stringify({ error: "Site ID required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method === "PATCH") {
    const body = await req.json();
    const { syncEnabled } = body;

    console.log(`[site] PATCH ${siteId} syncEnabled=${syncEnabled}`);

    const [existing] = await db.select().from(sites).where(eq(sites.id, siteId));

    if (!existing) {
      return new Response(JSON.stringify({ error: "Site not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await db
      .update(sites)
      .set({ syncEnabled: syncEnabled ?? existing.syncEnabled })
      .where(eq(sites.id, siteId));

    const [updated] = await db.select().from(sites).where(eq(sites.id, siteId));

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/sites/:id",
};
