import type { Context, Config } from "@netlify/functions";
import { requireAuth, handleAuthError } from "./_shared/auth.mts";

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    return handleAuthError(err);
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // /api/accounts/:slug/sites → slug is at index 3
  const slug = pathParts[3];

  if (!slug) {
    return Response.json({ error: "Account slug required" }, { status: 400 });
  }

  const res = await fetch(
    `https://api.netlify.com/api/v1/${slug}/sites?per_page=100`,
    { headers: { Authorization: `Bearer ${auth.accessToken}` } }
  );

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch sites" }, { status: 502 });
  }

  const netlifySites = await res.json();
  const result = netlifySites
    .map((s: { id: string; name: string }) => ({
      id: s.id,
      name: s.name,
    }))
    .sort((a: { name: string }, b: { name: string }) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

  return Response.json(result);
};

export const config: Config = {
  path: "/api/accounts/:slug/sites",
};
