import { db } from "../../../db/index.ts";
import { users } from "../../../db/schema.ts";
import { eq } from "drizzle-orm";
import { getUserIdFromRequest } from "./session.mts";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export interface AuthResult {
  userId: string;
  accessToken: string;
  user: { id: string; email: string | null; fullName: string | null; avatarUrl: string | null };
}

export async function requireAuth(request: Request): Promise<AuthResult> {
  const sessionUserId = getUserIdFromRequest(request);
  if (!sessionUserId) {
    throw new AuthError("Unauthorized", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionUserId))
    .limit(1);

  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }

  // Check allowlist
  const allowedIds = Netlify.env.get("ALLOWED_NETLIFY_USER_IDS");
  if (allowedIds) {
    const allowed = allowedIds.split(",").map((id) => id.trim());
    if (!allowed.includes(user.netlifyUserId)) {
      throw new AuthError("Forbidden", 403);
    }
  }

  return {
    userId: user.id,
    accessToken: user.accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    },
  };
}

export function handleAuthError(err: unknown): Response {
  if (err instanceof AuthError) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  throw err;
}
