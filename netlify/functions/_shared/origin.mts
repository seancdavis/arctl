export function getRedirectUri(request: Request): string {
  const envUri = Netlify.env.get("NETLIFY_REDIRECT_URI");
  if (envUri) {
    return envUri;
  }

  const origin = new URL(request.url).origin;
  const uri = `${origin}/api/auth/callback`;
  console.warn("[auth] NETLIFY_REDIRECT_URI not set, falling back to:", uri);
  return uri;
}

export function getOrigin(request: Request): string {
  const envUri = Netlify.env.get("NETLIFY_REDIRECT_URI");
  if (envUri) {
    return new URL(envUri).origin;
  }
  return new URL(request.url).origin;
}
