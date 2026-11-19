---
title: "GitHub App"
description: "Pit Wall works as a GitHub App."
---

Pit Wall works as a GitHub App. The App receives events by webhook and, with an installation token, reads the PR and publishes the review.

## Permissions

| Permission | Access | What the code uses it for |
|---|---|---|
| Pull requests | Write | Publish the review (`pulls.createReview`) and read previous comments and reviews for the markers. |
| Contents | Read | Read `.pitwall/pack.yaml` from the base, compare commits and `git fetch` the head. |
| Metadata | Read | Repo metadata and the permission lookup for the commenting user. Every App has it. |
| Issues | Read | Read the PR labels (for example `pitwall:deep`) and receive `issue_comment`. |

Pit Wall never approves or requests changes: it always uses the `COMMENT` event. It does not ask for contents write access.

## Events

| Event | Actions it handles | Effect |
|---|---|---|
| `pull_request` | `opened`, `reopened`, `synchronize`, `ready_for_review` | Enqueues a review of the head. |
| `issue_comment` | `created`, only on open PRs | If the first line is `/pitwall review`, enqueues a manual review. |
| `installation` | `created`, `unsuspend`, `new_permissions_accepted` (activation); `deleted`, `suspend` (deactivation) | Updates `installations`; a deactivation sets `deleted_at` and that installation's reviews are discarded. |

Any other event or action responds `202` with `ignored`.

## Webhook

- **URL:** `https://<web-service-domain>/webhooks/github`.
- **Content type:** `application/json`. The server only registers that type; the `x-www-form-urlencoded` format does not work.
- **Secret:** the same value as `GITHUB_WEBHOOK_SECRET`.
- **Signature:** `web` computes HMAC-SHA256 of the raw body and compares it in constant time with `X-Hub-Signature-256`, before parsing the JSON.
- **Required headers:** `X-GitHub-Event` and `X-GitHub-Delivery`. Without them, `400`.
- **Responses:** `401` invalid signature; `400` invalid headers or JSON; `202` for everything else, with `status` equal to `queued`, `duplicate`, `ignored` or `installation`.
- **Repeated delivery:** if the `X-GitHub-Delivery` already produced a review, it responds `duplicate`. If it is still queued, the `owner/repo#pr@headSha` key stops it.
- **Health:** `GET /healthz` responds `{"status":"ok"}` if Postgres answers `SELECT 1`, and `503` otherwise.

GitHub does not retry a failed delivery on its own. A failed delivery can be redelivered from "Advanced" in the App settings.

## Installation

1. Create the App on GitHub (personal account or organization) with the permissions and events above.
2. Generate a private key and store it as `GITHUB_APP_PRIVATE_KEY` (on one line, with literal `\n`). It does not go in the repo.
3. Note the `App ID` as `GITHUB_APP_ID` and put the webhook secret in `GITHUB_WEBHOOK_SECRET`.
4. Install the App on the repos you want reviewed. The `installation` event registers the account. If that event did not arrive, the row is created on the first review with the repo owner as `account_login`.
5. For the `PITWALL_INSTALLATION_ID` the `review:dry` script asks for, use the id from the installation URL (`/settings/installations/<id>`).

## `/pitwall review` command

Requests a review of an open PR, including a draft PR or a bot's PR.

- The **first line** of the comment, trimmed, must be exactly `/pitwall review` (case does not matter).
- The author cannot be a `Bot`.
- First filter: `author_association` in `OWNER`, `MEMBER` or `COLLABORATOR`.
- Second filter: `web` queries `GET /repos/{owner}/{repo}/collaborators/{user}/permission` and requires role `admin`, `maintain` or `write`. If the query fails, the command is ignored and a `warn` is logged.
- A command without permission gets no reply on the PR.
- It reviews even if the head was already reviewed; dedupe avoids repeating findings already published.

Details and reasons in [ADR 0010](../decisions/2026-11-19-manual-trigger-pr-comment/).

## Automatic review of draft PRs and bots

A draft PR, or one opened by a user whose login ends in `[bot]`, is skipped. Pit Wall leaves a single notice per PR and reason, explaining how to request the review with the command.

## What could not be verified

GitHub's documentation states that `metadata: read` is enough to query a collaborator's permission. This was not tested live with a real App.
