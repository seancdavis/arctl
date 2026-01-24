# Agent Runners API Reference

Internal API reference for interacting with Agent Runner endpoints.

**See also:** `netlify-agent-runner-response-examples.md` for real response examples.

---

## Base URL

```
https://api.netlify.com/api/v1
```

All endpoints below are relative to this base. For example, listing agent runners is:

```
GET https://api.netlify.com/api/v1/agent_runners?site_id=YOUR_SITE_ID
```

---

## Quick Reference

| Action                      | Method | Endpoint                                              |
| --------------------------- | ------ | ----------------------------------------------------- |
| List runners                | GET    | `/agent_runners?site_id=X&account_id=Y`               |
| Get runner                  | GET    | `/agent_runners/{id}`                                 |
| Create runner               | POST   | `/agent_runners?site_id=X`                            |
| Update runner               | PATCH  | `/agent_runners/{id}`                                 |
| Stop runner                 | DELETE | `/agent_runners/{id}`                                 |
| Archive runner              | POST   | `/agent_runners/{id}/archive`                         |
| Revert runner               | POST   | `/agent_runners/{id}/revert`                          |
| Get diff                    | GET    | `/agent_runners/{id}/diff`                            |
| Create PR                   | POST   | `/agent_runners/{id}/pull_request`                    |
| Commit to branch            | POST   | `/agent_runners/{id}/commit`                          |
| Get upload URL              | POST   | `/agent_runners/upload_url`                           |
| Get delete URL              | POST   | `/agent_runners/delete_url`                           |
| List sessions               | GET    | `/agent_runners/{id}/sessions`                        |
| Get session                 | GET    | `/agent_runners/{id}/sessions/{sid}`                  |
| Create session              | POST   | `/agent_runners/{id}/sessions`                        |
| Update session              | PATCH  | `/agent_runners/{id}/sessions/{sid}`                  |
| Stop session                | DELETE | `/agent_runners/{id}/sessions/{sid}`                  |
| Get session result diff     | GET    | `/agent_runners/{id}/sessions/{sid}/diff/result`      |
| Get session cumulative diff | GET    | `/agent_runners/{id}/sessions/{sid}/diff/cumulative`  |
| Get diff upload URLs        | POST   | `/agent_runners/{id}/sessions/{sid}/diff/upload_urls` |

---

## Tying Runs to Sites and Users

### Site Association

Agent runners are always associated with a **site**. When creating an agent runner, you must provide a `site_id`:

```bash
POST /api/v1/agent_runners?site_id=YOUR_SITE_ID
```

The site determines:

- Which repository the agent works with
- Which account/team is billed
- Which deploy to start from (if not specified, uses main branch)

### User Association

The **user** is automatically determined from the access token. The authenticated user becomes:

- The creator of the agent runner
- Part of the `contributors` list for the runner
- Recorded in the `user` field of each session they create

### Account Association

The **account** (team) is derived from the site. The account must:

- Have agent runners enabled on their plan
- Have sufficient credits available

---

## Agent Runners

### List Agent Runners

```
GET /api/v1/agent_runners
```

List all agent runners for a site.

**Query Parameters:**

| Parameter       | Type    | Required | Description                         |
| --------------- | ------- | -------- | ----------------------------------- |
| `account_id`    | string  | Yes      | The ID of the account               |
| `site_id`       | string  | Yes      | The ID of the site                  |
| `page`          | integer | No       | Page of results (default: 1)        |
| `per_page`      | integer | No       | Results per page (default/max: 100) |
| `state`         | enum    | No       | Filter by state: `live`, `error`    |
| `title`         | string  | No       | Filter by title                     |
| `branch`        | string  | No       | Filter by source branch             |
| `result_branch` | string  | No       | Filter by result branch             |
| `user_id`       | string  | No       | Filter by creator user ID           |
| `from`          | integer | No       | Unix timestamp - created since      |
| `to`            | integer | No       | Unix timestamp - created before     |

**Response:** `200 OK` - Array of `AgentRunner` objects

---

### Get Agent Runner

```
GET /api/v1/agent_runners/{agent_runner_id}
```

Get a specific agent runner by ID.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Response:** `200 OK` - `AgentRunner` object

---

### Create Agent Runner

```
POST /api/v1/agent_runners
```

Create a new agent runner with an initial session.

**Query Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `site_id` | string | Yes      | The ID of the site |

**Request Body (JSON):**

| Field                    | Type            | Required | Description                                  |
| ------------------------ | --------------- | -------- | -------------------------------------------- |
| `prompt`                 | string          | Yes      | The task prompt for the agent                |
| `deploy_id`              | string          | No       | Deploy ID to start from (overrides `branch`) |
| `branch`                 | string          | No       | Branch to build (defaults to main branch)    |
| `agent`                  | string          | No       | Agent type identifier                        |
| `model`                  | string          | No       | LLM model to use                             |
| `parent_agent_runner_id` | string          | No       | Parent agent runner ID (for branching)       |
| `dev_server_image`       | string          | No       | Custom dev server image                      |
| `file_keys`              | array\<string\> | No       | S3 keys of uploaded files to attach          |

**Response:**

- `200 OK` - `AgentRunner` object
- `400 Bad Request` - No prompt provided
- `404 Not Found` - Site not found
- `422 Unprocessable Entity` - Deploy not found or zip doesn't exist

---

### Update Agent Runner

```
PATCH /api/v1/agent_runners/{agent_runner_id}
```

Update agent runner properties.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Request Body (JSON):**

| Field                | Type    | Required | Description                                  |
| -------------------- | ------- | -------- | -------------------------------------------- |
| `base_deploy_id`     | string  | No       | Deploy ID to use as base for future sessions |
| `result_diff`        | string  | No       | The result diff content                      |
| `result_diff_binary` | boolean | No       | Whether diff is binary                       |
| `result_diff_s3_key` | string  | No       | S3 key for stored diff                       |
| `sha`                | string  | No       | Start commit SHA                             |

**Response:** `200 OK` - `AgentRunner` object

---

### Stop Agent Runner

```
DELETE /api/v1/agent_runners/{agent_runner_id}
```

Stop the currently running session of an agent runner.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Response:** `202 Accepted`

---

### Archive Agent Runner

```
POST /api/v1/agent_runners/{agent_runner_id}/archive
```

Archive an agent runner (soft delete).

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Response:**

- `202 Accepted`
- `404 Not Found`
- `422 Unprocessable Entity`

---

### Revert Agent Runner

```
POST /api/v1/agent_runners/{agent_runner_id}/revert
```

Revert an agent runner to a specific session. All sessions after the specified session will be marked as discarded.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Request Body (JSON):**

| Field        | Type   | Required | Description                        |
| ------------ | ------ | -------- | ---------------------------------- |
| `session_id` | string | Yes      | The ID of the session to revert to |

**Response:**

- `200 OK` - `AgentRunner` object
- `400 Bad Request` - Cannot revert (e.g., first session or committed sessions)
- `404 Not Found` - Session not found

---

### Get Agent Runner Diff

```
GET /api/v1/agent_runners/{agent_runner_id}/diff
```

Get the result diff content from an agent runner.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Query Parameters:**

| Parameter      | Type    | Required | Description                          |
| -------------- | ------- | -------- | ------------------------------------ |
| `page`         | integer | No       | Page of files (omit for entire diff) |
| `per_page`     | integer | No       | Files per page (default/max: 100)    |
| `strip_binary` | boolean | No       | Strip binary content from diff       |

**Response:**

- `200 OK` - Plain text diff content (`text/plain`)
- `404 Not Found` - No diff available

---

### Create Pull Request

```
POST /api/v1/agent_runners/{agent_runner_id}/pull_request
```

Create a pull request for the agent runner using the most recent completed session with a diff.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Response:**

- `200 OK` - `AgentRunner` object (with `pr_url`, `pr_branch`, `pr_state`, `pr_number` populated)
- `400 Bad Request`
- `409 Conflict`
- `422 Unprocessable Entity`

---

### Commit to Branch

```
POST /api/v1/agent_runners/{agent_runner_id}/commit
```

Commit agent runner changes directly to a branch (cannot be main branch).

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Request Body (JSON):**

| Field           | Type   | Required | Description                    |
| --------------- | ------ | -------- | ------------------------------ |
| `target_branch` | string | Yes      | The target branch to commit to |

**Response:**

- `200 OK` - `AgentRunner` object (with `merge_commit_sha` populated)
- `400 Bad Request` - Missing target_branch or trying to commit to main
- `409 Conflict`
- `422 Unprocessable Entity`

---

### Create File Upload URL

```
POST /api/v1/agent_runners/upload_url
```

Generate a presigned S3 URL for uploading files to attach to agent runner sessions.

**Request Body (JSON):**

| Field          | Type   | Required | Description           |
| -------------- | ------ | -------- | --------------------- |
| `account_id`   | string | Yes      | The ID of the account |
| `filename`     | string | Yes      | Original filename     |
| `content_type` | string | Yes      | MIME type of the file |

**Allowed File Types:**

- Text: `.txt`, `.md`, `.html`, `.json`, `.yaml`, `.yml`, `.xml`, `.csv`
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`
- Code: `.js`, `.ts`, `.css`, `.scss`, `.sass`, `.less`, `.py`, `.java`, `.rb`, `.go`, `.php`, `.sql`
- Documents: `.pdf`

**Response:**

- `200 OK`:
  ```json
  {
    "upload_url": "https://s3...",
    "file_key": "user-uploaded-content/{account_id}/{uuid}/{filename}"
  }
  ```
- `400 Bad Request` - Missing required fields
- `422 Unprocessable Entity` - Invalid filename or file type not allowed

---

### Create File Delete URL

```
POST /api/v1/agent_runners/delete_url
```

Generate a presigned S3 URL for deleting an uploaded file.

**Request Body (JSON):**

| Field        | Type   | Required | Description               |
| ------------ | ------ | -------- | ------------------------- |
| `account_id` | string | Yes      | The ID of the account     |
| `file_key`   | string | Yes      | The S3 file key to delete |

**Response:**

- `200 OK`:
  ```json
  {
    "delete_url": "https://s3...",
    "file_key": "..."
  }
  ```
- `400 Bad Request` - Missing required fields
- `403 Forbidden` - Unauthorized to delete this file (wrong account)

---

## Agent Runner Sessions

### List Sessions

```
GET /api/v1/agent_runners/{agent_runner_id}/sessions
```

List all sessions for an agent runner.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Query Parameters:**

| Parameter           | Type    | Required | Description                                 |
| ------------------- | ------- | -------- | ------------------------------------------- |
| `page`              | integer | No       | Page of results (default: 1)                |
| `per_page`          | integer | No       | Results per page (default/max: 100)         |
| `state`             | enum    | No       | Filter by state: `live`, `error`            |
| `from`              | integer | No       | Unix timestamp - created since              |
| `to`                | integer | No       | Unix timestamp - created before             |
| `order_by`          | enum    | No       | Sort order: `asc`, `desc`                   |
| `include_discarded` | boolean | No       | Include discarded sessions (default: false) |

**Response:** `200 OK` - Array of `AgentRunnerSession` objects

---

### Get Session

```
GET /api/v1/agent_runners/{agent_runner_id}/sessions/{agent_runner_session_id}
```

Get a specific session by ID.

**Path Parameters:**

| Parameter                 | Type   | Required | Description                |
| ------------------------- | ------ | -------- | -------------------------- |
| `agent_runner_id`         | string | Yes      | The ID of the agent runner |
| `agent_runner_session_id` | string | Yes      | The ID of the session      |

**Response:** `200 OK` - `AgentRunnerSession` object

---

### Create Session

```
POST /api/v1/agent_runners/{agent_runner_id}/sessions
```

Create a new session (follow-up prompt) for an existing agent runner.

**Path Parameters:**

| Parameter         | Type   | Required | Description                |
| ----------------- | ------ | -------- | -------------------------- |
| `agent_runner_id` | string | Yes      | The ID of the agent runner |

**Request Body (JSON):**

| Field              | Type            | Required | Description                         |
| ------------------ | --------------- | -------- | ----------------------------------- |
| `prompt`           | string          | Yes      | The task prompt for this session    |
| `agent`            | string          | No       | Agent type identifier               |
| `model`            | string          | No       | LLM model to use                    |
| `dev_server_image` | string          | No       | Custom dev server image             |
| `file_keys`        | array\<string\> | No       | S3 keys of uploaded files to attach |

**Response:**

- `200 OK` - `AgentRunnerSession` object
- `400 Bad Request` - No prompt provided
- `404 Not Found`
- `422 Unprocessable Entity` - Deploy zip no longer exists

---

### Update Session

```
PATCH /api/v1/agent_runners/{agent_runner_id}/sessions/{agent_runner_session_id}
```

Update session properties.

**Path Parameters:**

| Parameter                 | Type   | Required | Description                |
| ------------------------- | ------ | -------- | -------------------------- |
| `agent_runner_id`         | string | Yes      | The ID of the agent runner |
| `agent_runner_session_id` | string | Yes      | The ID of the session      |

**Request Body (JSON):**

| Field                    | Type    | Required | Description                       |
| ------------------------ | ------- | -------- | --------------------------------- |
| `title`                  | string  | No       | Session title                     |
| `steps`                  | array   | No       | Array of step objects             |
| `result`                 | string  | No       | Session result text               |
| `result_branch`          | string  | No       | Result branch name                |
| `result_diff`            | string  | No       | Result diff content               |
| `result_diff_binary`     | boolean | No       | Whether result diff is binary     |
| `result_diff_s3_key`     | string  | No       | S3 key for result diff            |
| `cumulative_diff`        | string  | No       | Cumulative diff content           |
| `cumulative_diff_binary` | boolean | No       | Whether cumulative diff is binary |
| `cumulative_diff_s3_key` | string  | No       | S3 key for cumulative diff        |
| `duration`               | number  | No       | Session duration in seconds       |
| `result_zip_file_name`   | string  | No       | Result zip filename               |
| `deploy_id`              | string  | No       | Associated deploy ID              |
| `state`                  | string  | No       | Session state                     |
| `is_published`           | boolean | No       | Whether session is published      |
| `has_netlify_form`       | boolean | No       | Whether session has Netlify form  |
| `diff_produced`          | boolean | No       | Whether diff was produced         |

**Response:** `200 OK` - `AgentRunnerSession` object

---

### Stop Session

```
DELETE /api/v1/agent_runners/{agent_runner_id}/sessions/{agent_runner_session_id}
```

Stop a running session.

**Path Parameters:**

| Parameter                 | Type   | Required | Description                |
| ------------------------- | ------ | -------- | -------------------------- |
| `agent_runner_id`         | string | Yes      | The ID of the agent runner |
| `agent_runner_session_id` | string | Yes      | The ID of the session      |

**Response:** `202 Accepted`

---

## Session Diffs

### Get Result Diff

```
GET /api/v1/agent_runners/{agent_runner_id}/sessions/{agent_runner_session_id}/diff/result
```

Get the result diff content for a specific session.

**Path Parameters:**

| Parameter                 | Type   | Required | Description                |
| ------------------------- | ------ | -------- | -------------------------- |
| `agent_runner_id`         | string | Yes      | The ID of the agent runner |
| `agent_runner_session_id` | string | Yes      | The ID of the session      |

**Response:**

- `200 OK` - Plain text diff content (`text/plain`)
- `404 Not Found` - No diff available

---

### Get Cumulative Diff

```
GET /api/v1/agent_runners/{agent_runner_id}/sessions/{agent_runner_session_id}/diff/cumulative
```

Get the cumulative diff content (all changes from all sessions up to this one).

**Path Parameters:**

| Parameter                 | Type   | Required | Description                |
| ------------------------- | ------ | -------- | -------------------------- |
| `agent_runner_id`         | string | Yes      | The ID of the agent runner |
| `agent_runner_session_id` | string | Yes      | The ID of the session      |

**Response:**

- `200 OK` - Plain text diff content (`text/plain`)
- `404 Not Found` - No diff available

---

### Create Diff Upload URLs

```
POST /api/v1/agent_runners/{agent_runner_id}/sessions/{agent_runner_session_id}/diff/upload_urls
```

Generate presigned S3 URLs for uploading session diffs.

**Path Parameters:**

| Parameter                 | Type   | Required | Description                |
| ------------------------- | ------ | -------- | -------------------------- |
| `agent_runner_id`         | string | Yes      | The ID of the agent runner |
| `agent_runner_session_id` | string | Yes      | The ID of the session      |

**Response:**

- `200 OK`:
  ```json
  {
    "result": {
      "upload_url": "https://s3...",
      "s3_key": "agent-runner-sessions-diffs/{runner_id}/{session_id}/result.patch"
    },
    "cumulative": {
      "upload_url": "https://s3...",
      "s3_key": "agent-runner-sessions-diffs/{runner_id}/{session_id}/cumulative.patch"
    }
  }
  ```
- `500 Internal Server Error` - Failed to generate URLs

---

## Data Models

### AgentRunner

```json
{
  "id": "string",
  "site_id": "string",
  "parent_agent_runner_id": "string | null",
  "state": "NEW | RUNNING | ERROR | DONE | ARCHIVED",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "done_at": "ISO 8601 timestamp | null",
  "title": "string",
  "branch": "string",
  "result_branch": "string | null",
  "pr_url": "string | null",
  "pr_branch": "string | null",
  "pr_state": "OPEN | CLOSED | MERGED | DRAFT | null",
  "pr_number": "integer | null",
  "pr_is_being_created": "boolean",
  "pr_error": "string | null",
  "current_task": "string | null",
  "sha": "string | null",
  "merge_commit_sha": "string | null",
  "merge_commit_error": "string | null",
  "merge_commit_is_being_created": "boolean",
  "base_deploy_id": "string | null",
  "last_session_created_at": "ISO 8601 timestamp | null",
  "has_result_diff": "boolean",
  "user": "AgentRunnerUser | null",
  "contributors": "array<AgentRunnerUser>",
  "active_session_created_at": "ISO 8601 timestamp | null",
  "attached_file_keys": "array<string>",
  "latest_session_deploy_id": "string | null",
  "latest_session_deploy_url": "string | null",
  "latest_session_state": "string | null"
}
```

### AgentRunnerSession

```json
{
  "id": "string",
  "agent_runner_id": "string",
  "dev_server_id": "string | null",
  "state": "NEW | RUNNING | ERROR | DONE | CANCELLED",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "done_at": "ISO 8601 timestamp | null",
  "title": "string",
  "prompt": "string",
  "agent_config": {
    "agent": "string | null",
    "model": "string | null"
  },
  "result": "string | null",
  "duration": "number | null",
  "steps": [
    {
      "title": "string",
      "message": "string"
    }
  ],
  "commit_sha": "string | null",
  "deploy_id": "string | null",
  "deploy_url": "string | null",
  "result_zip_file_name": "string | null",
  "attached_file_keys": "array<string>",
  "is_published": "boolean",
  "is_discarded": "boolean",
  "has_result_diff": "boolean",
  "has_cumulative_diff": "boolean",
  "user": "AgentRunnerUser | null"
}
```

### AgentRunnerUser

```json
{
  "id": "string",
  "full_name": "string",
  "email": "string",
  "avatar_url": "string | null"
}
```

---

## Error Responses

All endpoints may return these error responses:

| Status                      | Description                                                         |
| --------------------------- | ------------------------------------------------------------------- |
| `400 Bad Request`           | Invalid request parameters                                          |
| `401 Unauthorized`          | Missing or invalid authentication                                   |
| `403 Forbidden`             | Account cannot use agent runners (plan restriction or credit limit) |
| `404 Not Found`             | Resource not found or feature not enabled                           |
| `422 Unprocessable Entity`  | Validation error (e.g., deploy zip doesn't exist)                   |
| `500 Internal Server Error` | Server error                                                        |

Error response body format:

```json
{
  "error": "Error message description"
}
```

---

## Usage Examples

### Complete Workflow

```bash
# Set your token and site ID
export NETLIFY_TOKEN="your_access_token"
export SITE_ID="your_site_id"
export BASE_URL="https://api.netlify.com/api/v1"
```

**1. Create an agent runner** with initial prompt:

```bash
curl -X POST "$BASE_URL/agent_runners?site_id=$SITE_ID" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add a contact form to the homepage"}'

# Response includes the runner ID and initial state
# {
#   "id": "abc123",
#   "site_id": "your_site_id",
#   "state": "RUNNING",
#   "title": "Add contact form to homepage",
#   ...
# }
```

**2. Poll for completion** by checking the agent runner state:

```bash
curl "$BASE_URL/agent_runners/RUNNER_ID" \
  -H "Authorization: Bearer $NETLIFY_TOKEN"

# Check the "state" field:
# - "NEW" - Just created
# - "RUNNING" - Agent is working
# - "DONE" - Completed successfully
# - "ERROR" - Failed
```

**3. List sessions** to see work history:

```bash
curl "$BASE_URL/agent_runners/RUNNER_ID/sessions" \
  -H "Authorization: Bearer $NETLIFY_TOKEN"
```

**4. Add a follow-up prompt** (creates new session):

```bash
curl -X POST "$BASE_URL/agent_runners/RUNNER_ID/sessions" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add form validation"}'
```

**5. Get the diff** to review changes:

```bash
curl "$BASE_URL/agent_runners/RUNNER_ID/diff" \
  -H "Authorization: Bearer $NETLIFY_TOKEN"

# Returns plain text unified diff
```

**6. Create a pull request**:

```bash
curl -X POST "$BASE_URL/agent_runners/RUNNER_ID/pull_request" \
  -H "Authorization: Bearer $NETLIFY_TOKEN"

# Response includes pr_url, pr_branch, pr_number
```

**Or commit directly to a branch:**

```bash
curl -X POST "$BASE_URL/agent_runners/RUNNER_ID/commit" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_branch": "feature/agent-changes"}'
```

### Uploading Files to Attach

```bash
# 1. Get a presigned upload URL
curl -X POST "$BASE_URL/agent_runners/upload_url" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "YOUR_ACCOUNT_ID",
    "filename": "requirements.pdf",
    "content_type": "application/pdf"
  }'

# Response:
# {
#   "upload_url": "https://s3...",
#   "file_key": "user-uploaded-content/account123/uuid/requirements.pdf"
# }

# 2. Upload the file to S3
curl -X PUT "UPLOAD_URL_FROM_RESPONSE" \
  -H "Content-Type: application/pdf" \
  --data-binary @requirements.pdf

# 3. Create agent runner with the file attached
curl -X POST "$BASE_URL/agent_runners?site_id=$SITE_ID" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Implement the features described in the attached document",
    "file_keys": ["user-uploaded-content/account123/uuid/requirements.pdf"]
  }'
```

### Starting from a Specific Deploy

```bash
# Start from a specific deploy instead of HEAD of main branch
curl -X POST "$BASE_URL/agent_runners?site_id=$SITE_ID" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Fix the bug in this version",
    "deploy_id": "deploy123"
  }'
```

### Reverting to a Previous Session

```bash
# Get list of sessions first
curl "$BASE_URL/agent_runners/RUNNER_ID/sessions" \
  -H "Authorization: Bearer $NETLIFY_TOKEN"

# Revert to a specific session (discards all sessions after it)
curl -X POST "$BASE_URL/agent_runners/RUNNER_ID/revert" \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "session456"}'
```
