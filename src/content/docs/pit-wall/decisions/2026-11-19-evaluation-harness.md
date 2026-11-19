---
title: "ADR 0011: Evaluation harness with pinned data and its own ground truth"
description: "Changing a prompt, a model or a filter can improve or degrade the review without anyone noticing."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

Changing a prompt, a model or a filter can improve or degrade the review without anyone noticing. Deciding with data requires measuring precision, recall and F1 the same way every time. A measurement whose definition changes between runs is useless for comparison.

## Decision

The `packages/eval` package runs the real pipeline over two **pinned** datasets and computes the metrics with a fixed definition of a hit. It runs on the developer's machine and is not deployed.

- **AACR-Bench:** the TypeScript and JavaScript subset of version 2 (`dataset/v2/positive_samples.json`), 28 PRs and 213 comments. The manifest pins the upstream commit and the file's `sha256`. `npm run fetch` verifies the checksum before writing to a git-ignored cache, and every load verifies it again. The data is not redistributed.
- **Own set:** 15 PRs from Gastón's repos (13 plus 2), listed in `own-set.json`; a list whose count does not match is refused. The **ground truth** is the review threads opened by CodeRabbit or by the PR author that **ended up fixed**: a later commit removed or replaced the commented line, or the thread was resolved after a change to the file. It is frozen at the commit where the reviewer spoke, not at the final head.
- **Hit:** a finding hits a truth in the same file if it lies within ±5 lines of its range. Precision counts findings; recall counts truths. An unanchored finding is a false positive. A case whose review fails is reported separately and does not enter the metrics.
- **Trail:** `eval_runs` and `eval_rows` store each run if `DATABASE_URL` is set; the local report is always written.

## Alternatives considered

- **Eyeballing it with ad-hoc PRs:** lost because it is not repeatable.
- **Downloading the dataset without pinning it:** lost because an upstream change would move the metrics without Pit Wall changing.
- **AACR-Bench only:** lost because it measures other kinds of repos and comments; the own set measures what Gastón would actually fix.
- **Counting every reviewer comment as truth:** lost because it includes opinions nobody acted on and would penalize correct findings.

## Consequences

- Today's metrics can only be compared with runs that use the same manifest, the same list and the same ±5-line window. Changing any of them requires measuring the baseline again.
- The own set is small (15 PRs) and from a single author: it is good for detecting regressions, not for promising an absolute figure.
- The "ended up fixed" rule has a known limit: without the thread's resolution time, a thread resolved before an unrelated change to the same file can slip through. The set is confirmed by hand.
- The AACR-Bench license is Apache 2.0 (alibaba/aacr-bench); the source is attributed in [`docs/evaluation.md`](../../evaluation/).
