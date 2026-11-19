---
title: "ADR 0002: The review queue lives in Postgres (pg-boss)"
description: "The GitHub webhook has to reply quickly and the review takes minutes."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

The GitHub webhook has to reply quickly and the review takes minutes. A queue is needed between `web` and `worker`, with retries and idempotency. The volume is tens of PRs per day. There is already a Postgres for the data.

## Decision

The queue is [pg-boss](https://github.com/timgit/pg-boss) on the same Postgres that stores the data, with no Redis or SQS.

How it is configured (`packages/server/src/queue.ts`):

- `review` queue with the `exclusive` policy and `singletonKey` `owner/repo#pr@headSha`: there is only one queued or active job per head. A new push is a different key.
- Retries: `retryLimit: 3`, `retryDelay: 30` s with backoff; `expireInSeconds: 3600` because a large PR is reviewed in full, in groups.
- The payload carries `v: 1`. A worker that does not know the version throws `UnsupportedJobError` before doing anything, so that a deploy does not process jobs of a different shape.
- `web` opens pg-boss with `supervise: false` and `schedule: false`: it only enqueues. Queue maintenance is done by the worker.

## Alternatives considered

- **Redis with BullMQ:** lost because it adds a service to operate and pay for, for tens of jobs per day.
- **SQS or another AWS queue:** lost for the same reason and because the chosen platform is not AWS (ADR 0003).
- **Processing in the same process as the webhook:** lost because it would exceed GitHub's 10 s limit (ADR 0001).

## Consequences

- A database outage stops the queue and the data at the same time. Accepted given the volume.
- Jobs survive a deploy: the payload format is a contract between versions. An incompatible change requires bumping `v` and handling the transition.
- If the volume grows a lot, the queue competes with the pipeline's queries for the same Postgres. The way out is to move the queue, not the pipeline: `enqueueReview` and `openBoss` are the only two points that touch it.
