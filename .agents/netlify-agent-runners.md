# Agent Runners API Reference

Base path: `/api/v1/agent_runners`

## Agent Runners

| Method   | Endpoint                          | Description                                                                                    |
| -------- | --------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GET`    | `/agent_runners`                  | List agent runners (filterable by `state`, `title`, `branch`, `user_id`, `created_at_from/to`) |
| `GET`    | `/agent_runners/:id`              | Get a specific agent runner                                                                    |
| `POST`   | `/agent_runners`                  | Create a new agent runner with a prompt                                                        |
| `PATCH`  | `/agent_runners/:id`              | Update agent runner (`result_diff`, `sha`, `base_deploy_id`)                                   |
| `DELETE` | `/agent_runners/:id`              | Stop the current session                                                                       |
| `GET`    | `/agent_runners/:id/diff`         | Get result diff content (supports pagination)                                                  |
| `POST`   | `/agent_runners/:id/archive`      | Archive an agent runner                                                                        |
| `POST`   | `/agent_runners/:id/revert`       | Revert to a specific session                                                                   |
| `POST`   | `/agent_runners/:id/pull_request` | Create a PR from the agent runner diff                                                         |
| `POST`   | `/agent_runners/:id/commit`       | Commit changes directly to a branch                                                            |
| `POST`   | `/agent_runners/upload_url`       | Get presigned S3 URL for file upload                                                           |
| `POST`   | `/agent_runners/delete_url`       | Get presigned S3 URL for file deletion                                                         |

## Agent Runner Sessions

| Method   | Endpoint                                  | Description                                        |
| -------- | ----------------------------------------- | -------------------------------------------------- |
| `GET`    | `/agent_runners/:id/sessions`             | List sessions for a runner                         |
| `GET`    | `/agent_runners/:id/sessions/:session_id` | Get a specific session                             |
| `POST`   | `/agent_runners/:id/sessions`             | Create a new session with a prompt                 |
| `PATCH`  | `/agent_runners/:id/sessions/:session_id` | Update session (title, steps, result, state, etc.) |
| `DELETE` | `/agent_runners/:id/sessions/:session_id` | Stop a session                                     |

## Session Diffs

| Method | Endpoint                                                   | Description                          |
| ------ | ---------------------------------------------------------- | ------------------------------------ |
| `GET`  | `/agent_runners/:id/sessions/:session_id/diff/result`      | Get session result diff (plain text) |
| `GET`  | `/agent_runners/:id/sessions/:session_id/diff/cumulative`  | Get cumulative diff (plain text)     |
| `POST` | `/agent_runners/:id/sessions/:session_id/diff/upload_urls` | Get presigned URLs for diff uploads  |

## States

**AgentRunner states:** `NEW`, `RUNNING`, `ERROR`, `DONE`, `ARCHIVED`

**AgentRunnerSession states:** `NEW`, `RUNNING`, `ERROR`, `DONE`, `CANCELLED`

## Key Files

- Controller: `app/controllers/api/v1/agent_runners_controller.rb`
- Sessions Controller: `app/controllers/api/v1/agent_runner_sessions_controller.rb`
- Model: `app/models/agent_runner.rb`
- Session Model: `app/models/agent_runner_session.rb`
- Serializer: `app/serializers/agent_runner_serializer.rb`
