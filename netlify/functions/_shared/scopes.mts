export const VALID_SCOPES = [
  "agent_runners:read",
  "agent_runners:write",
  "agent_runners:deploy",
] as const;

export type Scope = (typeof VALID_SCOPES)[number];

export const SCOPE_LABELS: Record<
  Scope,
  { label: string; description: string; risk: string }
> = {
  "agent_runners:read": {
    label: "Read",
    description: "List and view runners, sessions, and diffs",
    risk: "Low",
  },
  "agent_runners:write": {
    label: "Write",
    description: "Create, update, and stop runners and sessions",
    risk: "Medium",
  },
  "agent_runners:deploy": {
    label: "Deploy",
    description: "Create PRs, commit to branches, redeploy",
    risk: "High",
  },
};

interface ScopeResolution {
  scope: Scope;
  action: string;
}

const DEPLOY_PATH_SEGMENTS = [
  "pull_request",
  "commit",
  "redeploy",
  "deploy",
];

export function resolveScope(
  method: string,
  path: string
): ScopeResolution | null {
  if (!path.startsWith("/agent_runners")) return null;

  const segments = path.split("/").filter(Boolean);

  const lastSegment = segments[segments.length - 1];
  if (DEPLOY_PATH_SEGMENTS.includes(lastSegment)) {
    return { scope: "agent_runners:deploy", action: `${method} ${path}` };
  }

  if (method === "GET") {
    return { scope: "agent_runners:read", action: `${method} ${path}` };
  }

  return { scope: "agent_runners:write", action: `${method} ${path}` };
}

export function hasScope(keyScopes: string[], required: Scope): boolean {
  return keyScopes.includes(required);
}
