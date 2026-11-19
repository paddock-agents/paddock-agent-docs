---
title: "ADR 0009: Incremental review semantics"
description: "On every push, reviewing the whole PR again is not worth it: it costs tokens and repeats noise."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

On every push, reviewing the whole PR again is not worth it: it costs tokens and repeats noise. But a comment can only land on a line of the PR diff (base...head), and a push can be a merge of the base branch, a force-push, or touch hundreds of files. "What changed since last time" has several possible answers, and one has to be fixed.

## Decision

The incremental review reviews **the files in the PR diff that also moved since the head of the last completed review**, using the patches from the PR diff. When in doubt, the whole PR is reviewed.

It runs incrementally only if all of these hold (`processReviewJob`, `lastCompletedHead`, `incrementalFiles`):

1. There is a previous `completed` review whose head is an **ancestor** of the new head (`compare` returns `ahead`). A force-push breaks this and triggers a full review.
2. That review left no files with `review_failed` in the coverage.
3. **No** finding on the PR is unpublished (`published = false`). An incremental review does not regenerate findings for files it does not reread, so everything is reviewed to retry them.
4. The PR file listing was not truncated and the `compare` range has fewer than 300 files (GitHub's cap). Otherwise, full review.

Other rules on the same topic:

- A merge of the base branch adds nothing: its files are not in the PR diff.
- The incremental base comes from the last reviewed head, never from a clock.
- If the head was already reviewed and the trigger is not manual, the job is dropped. A `/pitwall review` on the same head reviews everything, and the dedupe avoids repeats (ADR 0008).
- If the PR head moved while the job was waiting, the job is dropped: another one is already queued.
- If the model provider fails on part of the PR, nothing is published and the queue retries; on the last attempt, whatever exists is published with an incomplete-review note, and that review does not serve as a base.

## Alternatives considered

- **Review only the `compare` range:** lost because its patches do not match the PR diff, and GitHub rejects comments on lines outside that diff.
- **Always review everything and filter by fingerprint:** lost on cost; every push would pay for the whole PR.
- **Base by date of the last review:** lost because a clock does not say which commits it covered.

## Consequences

- A PR with unpublished findings or failed groups is reviewed in full on the next push. It is more expensive and safer.
- The incremental review depends on two extra GitHub API calls (`compare` and the file listing).
- Moved files that the PR diff no longer includes (for example, reverted ones) are not reviewed.
