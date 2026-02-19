import type { Context, Config } from "@netlify/functions";
import { clearSessionCookieValue } from "./_shared/session.mts";
import { getOrigin } from "./_shared/origin.mts";

export default async (request: Request, _context: Context) => {
  console.log("[auth-logout] User signed out");
  const origin = getOrigin(request);

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${origin}/`,
      "Set-Cookie": clearSessionCookieValue(),
    },
  });
};

export const config: Config = {
  path: "/api/auth/logout",
  method: ["GET", "POST"],
};
