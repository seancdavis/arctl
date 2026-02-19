import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { users } from "../../db/schema.ts";
import { createSessionToken, sessionCookieValue } from "./_shared/session.mts";
import { getRedirectUri, getOrigin } from "./_shared/origin.mts";

export default async (request: Request, _context: Context) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    console.warn("[auth-callback] Missing code or state params");
    return Response.json({ error: "Missing code or state" }, { status: 400 });
  }

  // Verify CSRF state
  const cookieHeader = request.headers.get("Cookie") || "";
  const stateCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("oc_oauth_state="));
  const savedState = stateCookie?.split("=")[1];

  if (state !== savedState) {
    console.warn("[auth-callback] State mismatch — possible CSRF");
    return Response.json(
      { error: "Invalid state parameter" },
      { status: 403 }
    );
  }

  const redirectUri = getRedirectUri(request);
  const origin = getOrigin(request);

  // Exchange code for token
  console.log("[auth-callback] Exchanging code for token");
  const tokenRes = await fetch("https://api.netlify.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: Netlify.env.get("NETLIFY_OAUTH_CLIENT_ID")!,
      client_secret: Netlify.env.get("NETLIFY_OAUTH_CLIENT_SECRET")!,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("[auth-callback] Token exchange failed:", tokenRes.status, body);
    return Response.json({ error: "Token exchange failed" }, { status: 502 });
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Fetch user info from Netlify
  console.log("[auth-callback] Fetching user info");
  const userRes = await fetch("https://api.netlify.com/api/v1/user", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    const body = await userRes.text();
    console.error("[auth-callback] Failed to fetch user info:", userRes.status, body);
    return Response.json(
      { error: "Failed to fetch user info" },
      { status: 502 }
    );
  }

  const netlifyUser = await userRes.json();
  console.log("[auth-callback] User fetched:", netlifyUser.email);

  // Upsert user in database
  const [user] = await db
    .insert(users)
    .values({
      netlifyUserId: netlifyUser.id,
      email: netlifyUser.email,
      fullName: netlifyUser.full_name,
      avatarUrl: netlifyUser.avatar_url,
      accessToken,
    })
    .onConflictDoUpdate({
      target: users.netlifyUserId,
      set: {
        email: netlifyUser.email,
        fullName: netlifyUser.full_name,
        avatarUrl: netlifyUser.avatar_url,
        accessToken,
        updatedAt: new Date(),
      },
    })
    .returning();

  console.log("[auth-callback] User authenticated:", netlifyUser.email);

  // Create session and redirect to app
  const sessionToken = createSessionToken(user.id);
  const headers = new Headers();
  headers.set("Location", `${origin}/`);
  headers.append("Set-Cookie", sessionCookieValue(sessionToken));
  headers.append(
    "Set-Cookie",
    "oc_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return new Response(null, { status: 302, headers });
};

export const config: Config = {
  path: "/api/auth/callback",
  method: "GET",
};
