export async function fetchWithAuth(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 401) {
    window.location.href = "/api/auth/login";
    // Return the response in case the redirect doesn't happen immediately
    return res;
  }

  return res;
}
