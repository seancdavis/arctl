import type { Context, Config } from "@netlify/functions";
import { randomBytes } from "node:crypto";
import { getRedirectUri } from "./_shared/origin.mts";

export default async (request: Request, _context: Context) => {
  const clientId = Netlify.env.get("NETLIFY_OAUTH_CLIENT_ID");
  if (!clientId) {
    console.error("[auth-login] NETLIFY_OAUTH_CLIENT_ID is not set");
    return Response.json({ error: "OAuth not configured" }, { status: 500 });
  }

  const redirectUri = getRedirectUri(request);
  const state = randomBytes(16).toString("hex");

  const authUrl = new URL("https://app.netlify.com/authorize");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  console.log("[auth-login] Redirecting to Netlify OAuth");

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl.toString(),
      "Set-Cookie": `oc_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
};

export const config: Config = {
  path: "/api/auth/login",
  method: "GET",
};
