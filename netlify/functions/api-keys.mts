import type { Context, Config } from "@netlify/functions";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../../db/index.ts";
import { apiKeys } from "../../db/schema.ts";
import { eq, and } from "drizzle-orm";
import { getUserIdFromRequest } from "./_shared/session.mts";
import { VALID_SCOPES } from "./_shared/scopes.mts";

function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = randomBytes(32);
  const raw = `oc_${bytes.toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = `oc_${bytes.toString("hex").slice(0, 6)}`;
  return { raw, hash, prefix };
}

export default async (request: Request, context: Context) => {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // GET /api/keys?siteId=xxx — list keys for a site
  if (request.method === "GET") {
    const url = new URL(request.url);
    const siteId = url.searchParams.get("siteId");
    console.log("[api-keys] Listing keys for user:", userId, "siteId:", siteId);

    const conditions = [eq(apiKeys.userId, userId)];
    if (siteId) {
      conditions.push(eq(apiKeys.siteId, siteId));
    }

    const keys = await db
      .select({
        id: apiKeys.id,
        keyPrefix: apiKeys.keyPrefix,
        name: apiKeys.name,
        siteId: apiKeys.siteId,
        siteName: apiKeys.siteName,
        scopes: apiKeys.scopes,
        isRevoked: apiKeys.isRevoked,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(and(...conditions))
      .orderBy(apiKeys.createdAt);

    return Response.json(keys);
  }

  // POST /api/keys — create a new key
  if (request.method === "POST") {
    const body = await request.json();
    const { name, siteId, siteName, scopes, expiresAt } = body;

    if (!name || !siteId || !siteName || !scopes?.length) {
      console.warn("[api-keys] Key creation missing required fields");
      return Response.json(
        { error: "name, siteId, siteName, and scopes are required" },
        { status: 400 }
      );
    }

    // Validate scopes
    const invalidScopes = scopes.filter(
      (s: string) =>
        !VALID_SCOPES.includes(s as (typeof VALID_SCOPES)[number])
    );
    if (invalidScopes.length > 0) {
      return Response.json(
        { error: `Invalid scopes: ${invalidScopes.join(", ")}` },
        { status: 400 }
      );
    }

    const { raw, hash, prefix } = generateApiKey();

    await db.insert(apiKeys).values({
      userId,
      keyHash: hash,
      keyPrefix: prefix,
      name,
      siteId,
      siteName,
      scopes,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });

    console.log("[api-keys] API key created:", prefix, "for site:", siteName);
    return Response.json({ rawKey: raw }, { status: 201 });
  }

  // DELETE /api/keys/:id — revoke a key
  if (request.method === "DELETE") {
    const { id: keyId } = context.params;

    if (!keyId) {
      return Response.json({ error: "Key ID required" }, { status: 400 });
    }

    const [key] = await db
      .select({ userId: apiKeys.userId, keyPrefix: apiKeys.keyPrefix })
      .from(apiKeys)
      .where(eq(apiKeys.id, keyId))
      .limit(1);

    if (!key || key.userId !== userId) {
      return Response.json({ error: "Key not found" }, { status: 404 });
    }

    await db
      .update(apiKeys)
      .set({ isRevoked: true })
      .where(eq(apiKeys.id, keyId));

    console.log("[api-keys] API key revoked:", key.keyPrefix);
    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};

export const config: Config = {
  path: ["/api/keys", "/api/keys/:id"],
  method: ["GET", "POST", "DELETE"],
};
