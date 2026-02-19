import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "oc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = Netlify.env.get("SESSION_SECRET");
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(userId: string): string {
  const timestamp = Date.now().toString();
  const payload = `${userId}.${timestamp}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(
  token: string
): { userId: string; timestamp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [userId, timestampStr, signature] = parts;
  const payload = `${userId}.${timestampStr}`;
  const expected = sign(payload);

  const sigBuf = Buffer.from(signature, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  const timestamp = parseInt(timestampStr, 10);
  const ageMs = Date.now() - timestamp;
  if (ageMs > MAX_AGE_SECONDS * 1000) return null;

  return { userId, timestamp };
}

export function sessionCookieValue(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookieValue(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const sessionCookie = cookies.find((c) =>
    c.startsWith(`${SESSION_COOKIE}=`)
  );
  if (!sessionCookie) return null;

  return sessionCookie.split("=")[1];
}

export function getUserIdFromRequest(request: Request): string | null {
  const token = getSessionFromRequest(request);
  if (!token) return null;

  const result = verifySessionToken(token);
  return result?.userId ?? null;
}
