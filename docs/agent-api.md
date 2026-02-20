# Agent Runner API

Use this API to create, monitor, and manage Netlify Agent Runners programmatically.

All requests go through a proxy that authenticates with an API key and forwards to the Netlify Agent Runners API.

## Authentication

Every request requires a `Bearer` token in the `Authorization` header. The token is an API key created through the app's Settings page.

```
Authorization: Bearer oc_<key>
```

API keys are scoped to a single site and have granular permissions (see [Scopes](#scopes) below). The proxy automatically injects the correct `site_id` — you never need to provide it.

## Base URL

```
https://<your-app>.netlify.app/api/proxy
```

All endpoint paths below are relative to this base. For example, listing runners is:

```
GET https://<your-app>.netlify.app/api/proxy/agent_runners
```

## Scopes

Each API key has one or more scopes that control what it can do:

| Scope | Grants | Risk |
|-------|--------|------|
| `agent_runners:read` | GET on any endpoint | Low |
| `agent_runners:write` | POST/PATCH/DELETE on runners and sessions | Medium |
| `agent_runners:deploy` | Create PRs, commit to branches, redeploy | High |

A key with all three scopes has full access. If a request requires a scope the key doesn't have, the proxy returns `403`.

## Endpoints

### List Runners

```
GET /agent_runners
```

Returns all runners for the API key's site.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Results per page (default/max: 100) |
| `state` | string | Filter by state: `live`, `error` |

**Scope:** `agent_runners:read`

**Example:**

```bash
curl -H "Authorization: Bearer oc_abc123..." \
  https://<your-app>.netlify.app/api/proxy/agent_runners
```

**Response:** Array of runner objects. Runners with a `pr_url` are enriched with additional PR status fields (see [PR Status Enrichment](#pr-status-enrichment)).

```json
[
  {
    "id": "runner-id",
    "site_id": "site-id",
    "state": "done",
    "title": "Add contact form to homepage",
    "branch": "main",
    "pr_url": "https://github.com/owner/repo/pull/42",
    "pr_state": "open",
    "has_result_diff": true,
    "current_task": null,
    "created_at": "2026-01-24T13:02:09.924Z",
    "updated_at": "2026-01-24T13:04:33.231Z",
    "latest_session_state": "done",
    "latest_session_deploy_url": "https://agent-runner-id--site-name.netlify.app",
    "pr_mergeable": true,
    "pr_behind_by": 0,
    "pr_review_state": "approved",
    "pr_checks_status": "success"
  }
]
```

---

### Get Runner

```
GET /agent_runners/{runner_id}
```

**Scope:** `agent_runners:read`

```bash
curl -H "Authorization: Bearer oc_abc123..." \
  https://<your-app>.netlify.app/api/proxy/agent_runners/RUNNER_ID
```

---

### Create Runner

```
POST /agent_runners
```

Creates a new runner with an initial session. The `site_id` is injected automatically from the API key.

**Scope:** `agent_runners:write`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | The task for the agent |
| `agent` | string | No | Agent type: `claude`, `gemini`, `codex` |
| `model` | string | No | Specific model variant |
| `branch` | string | No | Branch to build from (default: main) |
| `deploy_id` | string | No | Start from a specific deploy |
| `file_keys` | string[] | No | S3 keys of uploaded files to attach |

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer oc_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add a contact form to the homepage", "agent": "claude"}' \
  https://<your-app>.netlify.app/api/proxy/agent_runners
```

**Response:** Runner object with `state: "running"`.

---

### Stop Runner

```
DELETE /agent_runners/{runner_id}
```

Stops the currently running session.

**Scope:** `agent_runners:write`

**Response:** `202 Accepted`

---

### Get Diff

```
GET /agent_runners/{runner_id}/diff
```

Returns the cumulative code diff as plain text.

**Scope:** `agent_runners:read`

```bash
curl -H "Authorization: Bearer oc_abc123..." \
  https://<your-app>.netlify.app/api/proxy/agent_runners/RUNNER_ID/diff
```

**Response:** `text/plain` unified diff.

---

### Create Pull Request

```
POST /agent_runners/{runner_id}/pull_request
```

Creates a GitHub PR from the runner's changes.

**Scope:** `agent_runners:deploy`

```bash
curl -X POST \
  -H "Authorization: Bearer oc_abc123..." \
  https://<your-app>.netlify.app/api/proxy/agent_runners/RUNNER_ID/pull_request
```

**Response:** Runner object with `pr_url`, `pr_branch`, `pr_state`, and `pr_number` populated.

---

### Commit to Branch

```
POST /agent_runners/{runner_id}/commit
```

Commits changes to an existing PR branch (cannot be main).

**Scope:** `agent_runners:deploy`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `target_branch` | string | Yes | Branch to commit to |

```bash
curl -X POST \
  -H "Authorization: Bearer oc_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"target_branch": "agent-contact-form-a1b2"}' \
  https://<your-app>.netlify.app/api/proxy/agent_runners/RUNNER_ID/commit
```

---

### List Sessions

```
GET /agent_runners/{runner_id}/sessions
```

**Scope:** `agent_runners:read`

```bash
curl -H "Authorization: Bearer oc_abc123..." \
  https://<your-app>.netlify.app/api/proxy/agent_runners/RUNNER_ID/sessions
```

**Response:** Array of session objects.

```json
[
  {
    "id": "session-id",
    "agent_runner_id": "runner-id",
    "state": "done",
    "prompt": "Add a contact form to the homepage",
    "result": "# Added Contact Form\n\nCreated a responsive contact form...",
    "duration": 180000,
    "mode": "normal",
    "has_result_diff": true,
    "created_at": "2026-01-24T13:24:47.649Z"
  }
]
```

---

### Create Session (Follow-up)

```
POST /agent_runners/{runner_id}/sessions
```

Adds a follow-up prompt to an existing runner (the runner must be in `done` state).

**Scope:** `agent_runners:write`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | The follow-up task |
| `agent` | string | No | Agent type |
| `model` | string | No | Model variant |

```bash
curl -X POST \
  -H "Authorization: Bearer oc_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add email validation to the contact form"}' \
  https://<your-app>.netlify.app/api/proxy/agent_runners/RUNNER_ID/sessions
```

---

### Redeploy Session

```
POST /agent_runners/{runner_id}/sessions/{session_id}/redeploy
```

Rebuilds the deploy preview without re-running the AI agent. Useful after changing environment variables or site settings.

**Scope:** `agent_runners:deploy`

---

### Revert Runner

```
POST /agent_runners/{runner_id}/revert
```

Reverts to a previous session, discarding all sessions after it.

**Scope:** `agent_runners:write`

**Request body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | string | Yes | Session to revert to |

---

## Runner States

| State | Description |
|-------|-------------|
| `new` | Just created, queued |
| `running` | Agent is actively working |
| `done` | Completed successfully |
| `error` | Failed |
| `cancelled` | Manually stopped |
| `archived` | Soft-deleted |

## Typical Workflow

### 1. Create a runner

```bash
curl -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add dark mode support", "agent": "claude"}' \
  $BASE_URL/agent_runners
```

Save the `id` from the response.

### 2. Poll until done

```bash
curl -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/agent_runners/$RUNNER_ID
```

Check `state` — repeat every 15-30 seconds until it's `done` or `error`.

### 3. Review the diff

```bash
curl -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/agent_runners/$RUNNER_ID/diff
```

### 4. (Optional) Add a follow-up session

```bash
curl -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Also add a toggle button in the header"}' \
  $BASE_URL/agent_runners/$RUNNER_ID/sessions
```

Repeat steps 2-3 to wait for completion and review.

### 5. Create a PR

```bash
curl -X POST \
  -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/agent_runners/$RUNNER_ID/pull_request
```

The response includes `pr_url` with the GitHub PR link.

### 6. Update the PR (after more sessions)

If you add more sessions after creating the PR, commit the new changes to the PR branch:

```bash
curl -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"target_branch": "agent-dark-mode-a1b2"}' \
  $BASE_URL/agent_runners/$RUNNER_ID/commit
```

Use the `pr_branch` value from step 5's response as the `target_branch`.

### 7. Check PR status

After creating a PR, the runner GET endpoints automatically include PR status fields. No additional calls are needed — just fetch the runner:

```bash
curl -H "Authorization: Bearer $API_KEY" \
  $BASE_URL/agent_runners/$RUNNER_ID
```

The response includes `pr_mergeable`, `pr_behind_by`, `pr_review_state`, and `pr_checks_status` alongside the standard runner fields.

## PR Status Enrichment

When a runner has a `pr_url`, GET responses for `/agent_runners` and `/agent_runners/{id}` are automatically enriched with four additional fields fetched from the GitHub API. This requires the `GITHUB_PAT` environment variable to be set on the server.

| Field | Type | Description |
|-------|------|-------------|
| `pr_mergeable` | boolean \| null | Whether the PR can be merged cleanly (`null` if GitHub is still computing) |
| `pr_behind_by` | number \| null | How many commits the PR branch is behind the base branch |
| `pr_review_state` | string \| null | Review status: `approved`, `changes_requested`, or `null` if no reviews |
| `pr_checks_status` | string \| null | CI check status: `success`, `failure`, `pending`, or `null` if no checks |

These fields are cached for 60 seconds to avoid GitHub API rate limits. Runners without a `pr_url` are returned unmodified.

## Error Responses

All errors return JSON with an `error` field:

```json
{"error": "API key missing required scope: agent_runners:deploy"}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing fields, invalid endpoint) |
| 401 | Invalid or missing API key |
| 403 | Key revoked, expired, wrong scope, or site mismatch |
| 404 | Runner or session not found |
| 405 | Method not allowed |
| 422 | Validation error |
| 500 | Server error |

## Data Freshness

- **Proxy responses are always live** — they come directly from the Netlify API, not from a cache. When you `GET /agent_runners/{runner_id}`, you get the current state from Netlify.
- **The kanban board syncs asynchronously** — after any write operation (POST, PATCH, DELETE), a background sync is triggered automatically so the board reflects changes within ~30 seconds.
- **Polling is recommended** — when waiting for a runner to complete, poll `GET /agent_runners/{runner_id}` every 15-30 seconds. Responses are live from the Netlify API, so you always see the latest state.
