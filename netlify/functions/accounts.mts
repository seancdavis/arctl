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

  const res = await fetch("https://api.netlify.com/api/v1/accounts", {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch accounts" }, { status: 502 });
  }

  const accounts = await res.json();
  const result = accounts.map((a: { id: string; slug: string; name: string }) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
  }));

  return Response.json(result);
};

export const config: Config = {
  path: "/api/accounts",
};
