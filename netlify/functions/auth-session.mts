import type { Context, Config } from "@netlify/functions";
import { db } from "../../db/index.ts";
import { users } from "../../db/schema.ts";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest } from "./_shared/session.mts";

export default async (request: Request, _context: Context) => {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ user: null }, { status: 401 });
  }

  const [user] = await db
    .select({
      id: users.id,
      netlifyUserId: users.netlifyUserId,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return Response.json({ user: null }, { status: 401 });
  }

  // Check allowlist
  const allowedIds = Netlify.env.get("ALLOWED_NETLIFY_USER_IDS");
  let isAllowed = true;
  if (allowedIds) {
    const allowed = allowedIds.split(",").map((id) => id.trim());
    isAllowed = allowed.includes(user.netlifyUserId);
  }

  return Response.json({ user, isAllowed });
};

export const config: Config = {
  path: "/api/auth/session",
  method: "GET",
};
