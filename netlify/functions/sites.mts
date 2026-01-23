import type { Context, Config } from "@netlify/functions";
import { sql, runMigrations } from "./lib/db.mts";
import type { Site } from "./lib/types.mts";

export default async (req: Request, context: Context) => {
  await runMigrations();

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
  const cachedSites = await sql`SELECT * FROM sites ORDER BY updated_at DESC`;

  // Check if cache is fresh (less than 5 minutes old)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const hasFreshCache =
    cachedSites.length > 0 &&
    cachedSites.some((s: Site) => s.updated_at > fiveMinutesAgo);

  if (hasFreshCache) {
    return new Response(JSON.stringify(cachedSites), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fetch sites from Netlify API
  const sitesRes = await fetch("https://api.netlify.com/api/v1/sites?per_page=100", {
    headers: { Authorization: `Bearer ${pat}` },
  });

  if (!sitesRes.ok) {
    // If API fails but we have cached data, return that
    if (cachedSites.length > 0) {
      return new Response(JSON.stringify(cachedSites), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ error: "Failed to fetch sites" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  const netlifySites = await sitesRes.json();
  const now = new Date().toISOString();

  // Update cache
  for (const site of netlifySites) {
    await sql`
      INSERT INTO sites (id, name, updated_at)
      VALUES (${site.id}, ${site.name}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = EXCLUDED.updated_at
    `;
  }

  const sites = await sql`SELECT * FROM sites ORDER BY updated_at DESC`;

  return new Response(JSON.stringify(sites), {
    headers: { "Content-Type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/sites",
};
