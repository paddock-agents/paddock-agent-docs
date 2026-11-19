---
title: "ADR 0010: Manual trigger by `/pitwall review` comment, no CLI in deliverable 1"
description: "Besides the automatic review, there must be a way to request one by hand: for a draft PR, for a PR from a bot, or to repeat it."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

Besides the automatic review, there must be a way to request one by hand: for a draft PR, for a PR from a bot, or to repeat it. Whoever can trigger a review spends model money, so it cannot be just anyone. The webhook's `author_association` field is not enough: a `COLLABORATOR` may have read-only access.

## Decision

The on-demand review is a `/pitwall review` comment on an open PR. There is no CLI in this deliverable.

- **Command format:** the first line of the comment, trimmed, must be exactly `/pitwall review`, with no extra text (case does not matter). Comments from `Bot` users are ignored.
- **Two-step authorization:** first a cheap filter on `author_association` (`OWNER`, `MEMBER` or `COLLABORATOR`). Then the `web` process confirms with `GET /repos/{owner}/{repo}/collaborators/{user}/permission` that the role is `admin`, `maintain` or `write`. Any error from that call counts as "no": it fails closed and the command is silently ignored.
- **Effect:** the review runs with `manual: true`, which also reviews draft PRs and bot PRs. The head is resolved with an API call, because the comment webhook does not include it.
- **No CLI:** the `cli` package does not exist. `core`, `server` and `eval` are the only packages. The `review:dry` script is a development tool and publishes nothing.

## Alternatives considered

- **Trust only `author_association`:** lost because a collaborator with read access could spend reviews.
- **A `pitwall` CLI from day one:** lost on scope; the comment covers the case and reuses the same queue, the same authentication and the same publisher. The CLI moves to the "Local CLI" deliverable.
- **A GitHub button or check:** lost because it requires more permissions and UI, and adds nothing to the first deliverable.

## Consequences

- A command from someone without permission gets no reply: there is no rejection message. Accepted so as to reveal nothing and avoid noise.
- The permission check depends on the GitHub API accepting it with the `metadata: read` permission. According to the documentation that is enough, but it could not be verified live.
- The `reviews.trigger` field stores `webhook` both for the automatic trigger and for the comment; `cli` is reserved.
