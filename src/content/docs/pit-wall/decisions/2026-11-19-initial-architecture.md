---
title: "ADR 0001: Initial architecture of Pit Wall"
description: "This ADR is the summary."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1 "Review base")

This ADR is the summary. Each major decision has its own ADR (listed below). How it all fits together is in [`docs/architecture.md`](../../how-it-works/).

## Context

Pit Wall reviews GitHub PRs with Claude: line comments and a summary, with a recorded risk score and an evaluation (`eval`) that measures precision, recall and F1. A review takes minutes, GitHub cuts the webhook off at 10 s, and the volume is tens of PRs per day. The repo starts from scratch and is the sole owner of its data.

## Decision

A single repo (TypeScript monorepo, Node >= 22, ESM) that is built once and ships as two processes: `web` (Fastify webhook, replies 202) and `worker` (queue that clones the head and calls the model). Postgres stores data and queue.

The major decisions, one ADR each:

| Topic | ADR |
|---|---|
| Queue in Postgres with pg-boss | [0002](../../decisions/2026-11-19-queue-in-postgres-pg-boss/) |
| Two processes from one build on Railway | [0003](../../decisions/2026-11-19-railway-two-processes/) |
| Messages API with a short tool loop, no strict output | [0004](../../decisions/2026-11-19-messages-api-no-strict-output/) |
| Model provider: direct Anthropic only | [0005](../../decisions/2026-11-19-llm-provider-anthropic-only/) |
| Head checkout and confined tools | [0006](../../decisions/2026-11-19-head-checkout-confined-tools/) |
| Rule packs as data, from the base | [0007](../../decisions/2026-11-19-rule-packs-as-data/) |
| Dedupe by fingerprint and the persist, publish, mark order | [0008](../../decisions/2026-11-19-dedupe-persist-publish-mark/) |
| Incremental review semantics | [0009](../../decisions/2026-11-19-incremental-review-semantics/) |
| Manual trigger by comment, no CLI | [0010](../../decisions/2026-11-19-manual-trigger-pr-comment/) |
| Evaluation harness | [0011](../../decisions/2026-11-19-evaluation-harness/) |

Minor decisions that stay here, without their own ADR:

1. **Secret redaction** with in-house patterns (gitleaks-style categories plus entropy), applied to all text before publishing, logging or storing. Config fails closed, naming the variable, never its value.
2. **Tooling deviation (this machine has neither Docker nor pnpm):** **npm** workspaces instead of pnpm, and the **`embedded-postgres`** package (devDependency) instead of testcontainers for database tests. Production does not change: Postgres on Railway. The evaluation command is `npm run eval`. It has no ADR because it is reverted with a change to `package.json` and the tests; it does not meet "hard to reverse".
3. **Migrations** with `node-pg-migrate` in versioned `.sql` files (`migrations/`), each with a `-- Down Migration`. They run as the `preDeployCommand` of the `web` service.

## Alternatives considered

- **A single process (webhook and review together):** lost because the clone and the wait for the model would block the webhook and exceed GitHub's 10 s limit.
- **testcontainers and pnpm:** they are the natural choice, but require Docker and pnpm, which are not on the development machine. `embedded-postgres` and npm workspaces cover the same with fewer requirements.

The alternatives for queue, platform, model, provider and trigger are in their ADRs.

## Consequences

- Database tests download a Postgres binary on install (`embedded-postgres`) and do not use the exact same version as Railway; if a version difference shows up, the package version is pinned or the tests go back to testcontainers where Docker is available.
- Correction to the original text of this ADR: there is no `LLM_PROVIDER` variable. The provider is an interface in code with a single implementation (see ADR 0005).
- Pending: `pitwall` CLI, adapters for other providers, verifier, verdict and review tiers (deliverables 2 to 7, see the [README](../../)).
