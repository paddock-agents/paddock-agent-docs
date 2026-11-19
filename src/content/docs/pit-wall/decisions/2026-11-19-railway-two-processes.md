---
title: "ADR 0003: Two processes from one build on Railway"
description: "The webhook receiver and the reviewer have different profiles: one replies in milliseconds and the other clones a repo and waits on the model for minutes."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

The webhook receiver and the reviewer have different profiles: one replies in milliseconds and the other clones a repo and waits on the model for minutes. There is a single person operating it. The goal is the lowest possible cost and operational load.

## Decision

A single `Dockerfile` and a single build produce one image that runs as two Railway services: `web` (`railway.json`, `node packages/server/dist/web.js`) and `worker` (`railway.worker.json`, `node packages/server/dist/worker.js`). One Railway Postgres serves both. No AWS-only services are used.

Details the code does not show:

- Migrations run as the `preDeployCommand` (`npm run migrate`) of the `web` service, before it starts. The `worker` does not migrate; it relies on `web` having deployed first.
- The runtime image installs `git` and `ca-certificates`: the worker clones the PR head.
- The worker scales by adding processes; each process takes one job at a time (`batchSize: 1`).

## Alternatives considered

- **AWS (ECS or Lambda, SQS, RDS):** lost on operational cost for a one-person project. Lambda also does not fit a clone plus a long wait on the model.
- **A single service with both roles:** lost because a deploy or restart of the reviewer would also take down the webhook receiver, and GitHub does not retry failed deliveries on its own.
- **Two repos or two builds:** lost because the shared code (`core`) is versioned together; with one build there is no drift between `web` and `worker`.

## Consequences

- Estimated cost on Railway Hobby: about USD 5 to 8 per month (an estimate, not measured). Model spend is billed separately and is the main variable cost.
- Changing platforms is possible because the image is a standard `Dockerfile`; what is tied to Railway is the two `railway*.json` files and the managed Postgres.
- `web` also requires `ANTHROPIC_API_KEY`: both processes call the same `loadConfig()`. Accepted in order to have a single configuration contract.
- Pending: a queue dashboard or alert, and defining what happens if `web` deploys a migration that an old `worker` does not understand.
