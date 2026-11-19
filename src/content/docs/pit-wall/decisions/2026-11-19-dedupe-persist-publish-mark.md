---
title: "ADR 0008: Dedupe by fingerprint and the persist, publish, mark order"
description: "A PR is reviewed several times (every push, every /pitwall review, every queue retry)."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

A PR is reviewed several times (every push, every `/pitwall review`, every queue retry). A finding that is already published must not be repeated, and a worker that crashes halfway must not duplicate or lose comments. GitHub offers no transaction spanning "save to the database" and "publish the review".

## Decision

Each finding has a stable **fingerprint**, and publishing follows the order **persist, publish, mark**. GitHub is the source of truth for what is already published.

- **Fingerprint:** the first 16 hex characters of `sha256(file | category | ruleId | normalized quoted code)`. No line number and no title; if the finding quotes no code, the title is used.
- **Hidden marker:** every comment, and every summary with unanchored findings, carries `<!-- pitwall:fp=<16 hex> -->`. On start, the worker reads the markers back from the PR's comments and reviews. Only text written by a `Bot` counts, so a human who quotes a marker cannot silence a finding.
- **Order:** (1) findings are saved with `published = false` in one transaction; (2) **one** GitHub review is published, with event `COMMENT`; (3) only the fingerprints actually present in that review are marked `published = true`.
- **Uniqueness:** `UNIQUE (pull_request_id, fingerprint)` on `findings`. An unpublished finding from a crashed attempt is picked up by the next attempt.
- **422:** if a comment falls outside the diff and GitHub rejects the review, the comments move into the summary as long as they fit.

## Alternatives considered

- **Mark before publishing:** lost because a crash in between would leave a "published" finding that nobody saw.
- **Database state only:** lost because after a crash following the publish, the database does not know GitHub already has it. Reading the markers fixes that.
- **Fingerprint including the line:** lost because a push that shifts the code by three lines would make it look new.
- **One comment per finding:** lost because it is not atomic and fires separate notifications; a review is a single event.

## Consequences

- If the quoted text changes, the fingerprint changes and the finding is published again. Accepted: it is different code.
- A finding that did not fit in the summary (more than 30 unanchored, or cut for size) is not marked as published and is retried in the next review.
- If a human deletes or resolves a Pit Wall comment, the database still marks it as published and it does not come back. Pending: learning from those resolutions (costs and learning deliverable).
