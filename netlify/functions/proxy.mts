import type { Context, Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { db } from "../../db/index.ts";
import { apiKeys, users, auditLog, runs } from "../../db/schema.ts";
import { eq, and, isNotNull } from "drizzle-orm";
import { resolveScope, hasScope } from "./_shared/scopes.mts";
import { maybeSync } from "./_shared/maybeSync.mts";
import {
  parsePrUrl,
  githubHeaders,
  computeReviewDecision,
  computeOverallCheckStatus,
  fetchAllChecks,
} from "./_shared/github.mts";

const NETLIFY_API_BASE = "https://api.netlify.com/api/v1";

// --- PR status enrichment for runner responses ---

interface PrStatusData {
  pr_state: string;
  pr_mergeable: boolean | null;
  pr_behind_by: number | null;
  pr_review_state: string | null;
  pr_checks_status: string | null;
}

const prStatusCache = new Map<
  string,
  { data: PrStatusData; expiresAt: number }
>();
const PR_STATUS_CACHE_TTL = 60_000; // 60 seconds

async function fetchPrStatus(
  prUrl: string,
  githubPat: string
): Promise<PrStatusData | null> {
  const cached = prStatusCache.get(prUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const parsed = parsePrUrl(prUrl);
  if (!parsed) return null;

  const { owner, repo, number } = parsed;
  const headers = githubHeaders(githubPat);

  try {
    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`,
      { headers }
    );
    if (!prRes.ok) return null;

    const pr = await prRes.json();
    const headSha = pr.head.sha;

    // Derive live pr_state from GitHub data (Netlify's pr_state can be stale)
    let prState: string;
    if (pr.merged) {
      prState = "merged";
    } else if (pr.state === "closed") {
      prState = "closed";
    } else if (pr.draft) {
      prState = "draft";
    } else {
      prState = "open";
    }

    const [reviewsRes, checksResult, compareRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/reviews`,
        { headers }
      ),
      fetchAllChecks(owner, repo, headSha, githubPat),
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/compare/${pr.base.ref}...${pr.head.ref}`,
        { headers }
      ),
    ]);

    const reviews = reviewsRes.ok ? await reviewsRes.json() : [];
    const reviewDecision = computeReviewDecision(
      Array.isArray(reviews) ? reviews : []
    );
    const { allChecks } = checksResult;
    const overallCheckStatus = computeOverallCheckStatus(allChecks);
    const compareData = compareRes.ok ? await compareRes.json() : null;

    const status: PrStatusData = {
      pr_state: prState,
      pr_mergeable: pr.mergeable ?? null,
      pr_behind_by: compareData?.behind_by ?? null,
      pr_review_state: reviewDecision,
      pr_checks_status: overallCheckStatus,
    };

    prStatusCache.set(prUrl, {
      data: status,
      expiresAt: Date.now() + PR_STATUS_CACHE_TTL,
    });
    return status;
  } catch (err) {
    console.warn("[proxy] Failed to fetch PR status for", prUrl, err);
    return null;
  }
}

// --- Derived state: distinguishes "merged" and "archived" from "done" ---

function computeDerivedState(runner: any): string {
  const state = (runner.state || "").toLowerCase();
  if (state === "archived") return "archived";
  if (state === "done" && runner.pr_state === "merged") return "merged";
  return state;
}

// --- Error message enrichment for error runners ---

const errorMessageCache = new Map<
  string,
  { message: string | null; expiresAt: number }
>();
const ERROR_MESSAGE_CACHE_TTL = 300_000; // 5 minutes (errors are terminal)

async function fetchErrorMessage(
  runnerId: string,
  accessToken: string
): Promise<string | null> {
  const cached = errorMessageCache.get(runnerId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.message;
  }

  try {
    const res = await fetch(
      `${NETLIFY_API_BASE}/agent_runners/${runnerId}/sessions`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const sessionList = await res.json();
    // Find the latest error session and return its result as the error message
    const errorSession = [...sessionList]
      .reverse()
      .find((s: any) => s.state === "error");
    const message = errorSession?.result || null;

    errorMessageCache.set(runnerId, {
      message,
      expiresAt: Date.now() + ERROR_MESSAGE_CACHE_TTL,
    });
    return message;
  } catch {
    return null;
  }
}

export default async (request: Request, _context: Context) => {
  // 1. Extract API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer oc_")) {
    return Response.json(
      {
        error:
          "Missing or invalid Authorization header. Expected: Bearer oc_...",
      },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice("Bearer ".length);
  const keyPrefix = rawKey.slice(0, 9); // oc_ + 6 chars

  // 2. Hash key and look up in DB
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  console.log("[proxy] Looking up key:", keyPrefix + "...");

  const [keyRecord] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, keyHash))
    .limit(1);

  if (!keyRecord) {
    console.warn("[proxy] Invalid API key used:", keyPrefix + "...");
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  // 3. Check if revoked or expired
  if (keyRecord.isRevoked) {
    console.warn("[proxy] Revoked key used:", keyRecord.keyPrefix);
    return Response.json(
      { error: "API key has been revoked" },
      { status: 403 }
    );
  }

  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    console.warn("[proxy] Expired key used:", keyRecord.keyPrefix);
    return Response.json({ error: "API key has expired" }, { status: 403 });
  }

  // 4. Parse the proxy path
  const url = new URL(request.url);
  const proxyPath = url.pathname.replace(/^\/api\/proxy/, "");

  if (!proxyPath || proxyPath === "/") {
    return Response.json({ error: "No endpoint specified" }, { status: 400 });
  }

  // 5. Only allow agent_runners paths
  if (!proxyPath.startsWith("/agent_runners")) {
    console.warn("[proxy] Blocked non-agent-runner path:", proxyPath);
    return Response.json(
      { error: "This endpoint is not accessible through the proxy" },
      { status: 400 }
    );
  }

  // 6. Resolve required scope
  const scopeResult = resolveScope(request.method, proxyPath);
  if (!scopeResult) {
    return Response.json(
      { error: "This endpoint is not accessible through the proxy" },
      { status: 400 }
    );
  }

  // 7. Check key has required scope
  if (!hasScope(keyRecord.scopes, scopeResult.scope)) {
    console.warn(
      "[proxy] Scope denied:",
      scopeResult.scope,
      "key:",
      keyRecord.keyPrefix
    );
    return Response.json(
      { error: `API key missing required scope: ${scopeResult.scope}` },
      { status: 403 }
    );
  }

  // 8. Get user's OAuth token
  const [user] = await db
    .select({ accessToken: users.accessToken })
    .from(users)
    .where(eq(users.id, keyRecord.userId))
    .limit(1);

  if (!user) {
    console.error("[proxy] Key owner not found in DB:", keyRecord.userId);
    return Response.json({ error: "User not found" }, { status: 500 });
  }

  // 9. Determine if this is a collection or item endpoint
  const pathSegments = proxyPath.split("/").filter(Boolean);
  const isCollectionEndpoint = pathSegments.length === 1; // /agent_runners

  let netlifyUrl: string;

  if (isCollectionEndpoint) {
    // Collection endpoint: inject site_id as query param
    const targetUrl = new URL(`${NETLIFY_API_BASE}${proxyPath}`);
    targetUrl.searchParams.set("site_id", keyRecord.siteId);
    // Forward any other query params from the original request
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });
    netlifyUrl = targetUrl.toString();
    console.log("[proxy] Collection endpoint, injecting site_id:", keyRecord.siteId);
  } else {
    // Item endpoint: preflight check to verify runner belongs to this site
    const runnerId = pathSegments[1]; // /agent_runners/:id/...
    const preflightUrl = `${NETLIFY_API_BASE}/agent_runners/${runnerId}`;
    const preflightRes = await fetch(preflightUrl, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    if (!preflightRes.ok) {
      const statusCode = preflightRes.status;
      await writeAuditLog(keyRecord, scopeResult.action, proxyPath, statusCode);
      return Response.json(
        { error: "Runner not found" },
        { status: preflightRes.status }
      );
    }

    const runnerData = await preflightRes.json();
    if (runnerData.site_id !== keyRecord.siteId) {
      console.warn("[proxy] Site mismatch for runner");
      await writeAuditLog(keyRecord, scopeResult.action, proxyPath, 403);
      return Response.json(
        { error: "Runner does not belong to this API key's site" },
        { status: 403 }
      );
    }

    netlifyUrl = `${NETLIFY_API_BASE}${proxyPath}`;
  }

  // 9b. Handle POST /agent_runners/:id/complete — arctl-local action (not proxied)
  const lastSegment = pathSegments[pathSegments.length - 1];
  if (request.method === "POST" && lastSegment === "complete" && pathSegments.length === 3) {
    const runnerId = pathSegments[1];
    const now = new Date();

    // Look up the run in arctl DB
    const [existingRun] = await db.select().from(runs).where(eq(runs.id, runnerId)).limit(1);
    if (!existingRun) {
      // Run not yet in arctl DB — insert a minimal record marked as completed
      try {
        const runnerRes = await fetch(`${NETLIFY_API_BASE}/agent_runners/${runnerId}`, {
          headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        if (runnerRes.ok) {
          const runner = await runnerRes.json();
          await db.insert(runs).values({
            id: runnerId,
            siteId: runner.site_id || keyRecord.siteId,
            siteName: runner.site_name || null,
            title: runner.title || null,
            state: (runner.state || "DONE").toUpperCase(),
            branch: runner.branch || null,
            pullRequestUrl: runner.pr_url || null,
            pullRequestState: runner.pr_state || null,
            pullRequestBranch: runner.pr_branch || null,
            deployPreviewUrl: runner.latest_session_deploy_url || null,
            createdAt: runner.created_at ? new Date(runner.created_at) : now,
            updatedAt: now,
            syncedAt: now,
            completedAt: now,
          });
        }
      } catch (e) {
        console.error("[proxy] Failed to fetch runner for complete:", e);
      }
    } else {
      await db.update(runs).set({ completedAt: now, updatedAt: now }).where(eq(runs.id, runnerId));
    }

    await db.update(apiKeys).set({ lastUsedAt: now }).where(eq(apiKeys.id, keyRecord.id));
    await writeAuditLog(keyRecord, "POST /agent_runners/:id/complete", proxyPath, 200);

    console.log("[proxy] Completed runner:", runnerId);
    return Response.json({ id: runnerId, completed: true, completed_at: now.toISOString() });
  }

  // 10. Proxy the request to Netlify API
  console.log("[proxy] Proxying:", request.method, netlifyUrl);
  const proxyHeaders: Record<string, string> = {
    Authorization: `Bearer ${user.accessToken}`,
  };

  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    proxyHeaders["Content-Type"] = contentType;
  }

  const proxyOptions: RequestInit = {
    method: request.method,
    headers: proxyHeaders,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    proxyOptions.body = await request.text();
  }

  const netlifyRes = await fetch(netlifyUrl, proxyOptions);

  // 11. Update last_used_at
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, keyRecord.id));

  // 12. Write audit log
  await writeAuditLog(
    keyRecord,
    scopeResult.action,
    proxyPath,
    netlifyRes.status
  );

  console.log(
    "[proxy] Proxied:",
    request.method,
    proxyPath,
    "->",
    netlifyRes.status,
    "key:",
    keyRecord.keyPrefix
  );

  // 13. Trigger background sync after successful mutations
  const isMutation = request.method !== "GET" && request.method !== "HEAD";
  if (isMutation && netlifyRes.ok) {
    const origin = new URL(request.url).origin;
    maybeSync({ origin, accessToken: user.accessToken, force: true });
  }

  // 14. Return Netlify API response (enriched for runner GETs)
  const responseBody = await netlifyRes.text();

  const isRunnerGetEndpoint =
    request.method === "GET" && netlifyRes.ok && pathSegments.length <= 2;

  if (isRunnerGetEndpoint) {
    try {
      const data = JSON.parse(responseBody);
      const githubPat = Netlify.env.get("GITHUB_PAT");

      // Build a set of completed runner IDs from arctl DB for this site
      const completedRuns = await db
        .select({ id: runs.id, completedAt: runs.completedAt })
        .from(runs)
        .where(and(eq(runs.siteId, keyRecord.siteId), isNotNull(runs.completedAt)));
      const completedMap = new Map(completedRuns.map((r) => [r.id, r.completedAt]));

      const enrichRunner = async (runner: any) => {
        let enriched = { ...runner };

        // Add completed status from arctl DB
        const completedAt = completedMap.get(runner.id);
        enriched.completed = !!completedAt;
        enriched.completed_at = completedAt ? new Date(completedAt).toISOString() : null;

        // PR status enrichment from GitHub (includes live pr_state)
        if (runner.pr_url && githubPat) {
          const prStatus = await fetchPrStatus(runner.pr_url, githubPat);
          if (prStatus) Object.assign(enriched, prStatus);
        }

        // Derived state: distinguishes merged/archived from done
        enriched.derived_state = computeDerivedState(enriched);

        // Error message enrichment
        if ((runner.state || "").toLowerCase() === "error") {
          enriched.error_message = await fetchErrorMessage(
            runner.id,
            user.accessToken
          );
        }

        return enriched;
      };

      if (Array.isArray(data)) {
        const enriched = await Promise.all(data.map(enrichRunner));
        // Filter out completed runners unless ?include_completed=true
        const includeCompleted = url.searchParams.get("include_completed") === "true";
        const filtered = includeCompleted ? enriched : enriched.filter((r: any) => !r.completed);
        return Response.json(filtered, { status: netlifyRes.status });
      } else if (data?.id) {
        const enriched = await enrichRunner(data);
        return Response.json(enriched, { status: netlifyRes.status });
      }
    } catch {
      // Enrichment failed, fall through to return original response
    }
  }

  return new Response(responseBody, {
    status: netlifyRes.status,
    headers: {
      "Content-Type":
        netlifyRes.headers.get("Content-Type") || "application/json",
    },
  });
};

async function writeAuditLog(
  keyRecord: { id: string; userId: string; siteId: string },
  action: string,
  endpoint: string,
  statusCode: number
) {
  await db.insert(auditLog).values({
    apiKeyId: keyRecord.id,
    userId: keyRecord.userId,
    action,
    siteId: keyRecord.siteId,
    netlifyEndpoint: endpoint,
    statusCode,
  });
}

export const config: Config = {
  path: "/api/proxy/*",
  method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
