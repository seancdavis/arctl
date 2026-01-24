import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { sites } from "../../db/schema.ts";
import { desc } from "drizzle-orm";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
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

  // Try to get sites from cache first
  const cachedSites = await db.select().from(sites).orderBy(desc(sites.updatedAt));

  // Check if cache is fresh (less than 5 minutes old)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const hasFreshCache =
    cachedSites.length > 0 &&
    cachedSites.some((s) => s.updatedAt > fiveMinutesAgo);

  if (hasFreshCache) {
    console.log(`[sites] Returning ${cachedSites.length} cached sites`);
    return new Response(JSON.stringify(cachedSites), {
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[sites] Cache stale, fetching from Netlify API");

  // Fetch sites from Netlify API
  const sitesRes = await fetch(
    "https://api.netlify.com/api/v1/sites?per_page=100",
    { headers: { Authorization: `Bearer ${pat}` } }
  );

  if (!sitesRes.ok) {
    // If API fails but we have cached data, return that
    if (cachedSites.length > 0) {
      return new Response(JSON.stringify(cachedSites), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Failed to fetch sites" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const netlifySites = await sitesRes.json();
  const now = new Date();

  // Update cache - upsert each site
  for (const site of netlifySites) {
    await db
      .insert(sites)
      .values({
        id: site.id,
        name: site.name,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sites.id,
        set: { name: site.name, updatedAt: now },
      });
  }

  const result = await db.select().from(sites).orderBy(desc(sites.updatedAt));
  console.log(`[sites] Fetched and cached ${result.length} sites`);

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/sites",
};
