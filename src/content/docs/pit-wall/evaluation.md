---
title: "Evaluation"
description: "Both are fixed: they do not change unless the manifest or the list changes."
---

`packages/eval` runs the real pipeline over PRs with known answers and measures precision, recall and F1, plus cost and latency. It runs on the developer's machine and is not deployed. Reasons and limits: [ADR 0011](../decisions/2026-11-19-evaluation-harness/). The package's short command guide is in [`packages/eval/README.md`](https://github.com/gvareika1997/pit-wall/blob/main/packages/eval/README.md).

## Sets

| Set | What it is | Size |
|---|---|---|
| `aacr` | TypeScript and JavaScript subset of AACR-Bench v2 (`dataset/v2/positive_samples.json`) | 28 PRs, 213 comments |
| `own` | Own set: PRs from the maintainer's repos with known answers | 15 PRs (13 in one repo and 2 in another) |

Both are fixed: they do not change unless the manifest or the list changes.

## Requirements

- `npm run build` done.
- `ANTHROPIC_API_KEY` in the environment.
- `gh` logged in (`gh auth login`). It is used to download diffs and metadata, and as the checkout credential. The token is requested from `gh` on each run; it is not stored, not logged and never goes in a URL.
- Optional: `DATABASE_URL` to store the run in `eval_runs` and `eval_rows`; `EVAL_PRICE_INPUT_PER_MTOK` and `EVAL_PRICE_OUTPUT_PER_MTOK` for the cost column; the finders' `PITWALL_*` variables ([configuration.md](../configuration/)).

## Step by step

### 1. Download AACR-Bench (`fetch`)

```
npm run fetch -w @pitwall/eval
```

Downloads the dataset file into the `packages/eval/.cache/` cache (ignored by git), **verifying its `sha256`** against `benchmarks/aacr-manifest.json`. The manifest pins the upstream commit, the file path, its `sha256` and the list of the 28 PRs. If the checksum does not match, the command fails. Every later load recomputes the cache's hash.

The manifest does not include diffs. `eval aacr` gets them from the GitHub compare API (`base...head`) and checks out the head. In the dataset, `source_commit` is the PR base and `target_commit` is its head.

Mapping of upstream categories to Pit Wall's: Code Defect to `correctness`, Security Vulnerability to `security`, Performance to `performance`, Maintainability and Readability to `maintainability`.

### 2. Freeze the own set (`freeze`)

```
npm run freeze -w @pitwall/eval
```

For each PR in `own-set.json` it uses `gh` to query the PR, its review threads and its commits, and writes `frozen/own/*.json` (ignored by git). Rules:

- **What counts as ground truth:** a review thread opened by CodeRabbit or by the PR author that **ended up fixed**. It ended up fixed if a later commit removed or replaced a commented line, or if the thread was resolved after a later commit changed that file. A thread resolved without later changes does not count.
- **Which commit is frozen:** the one of the earliest qualifying thread, that is, the code as it was when the reviewer spoke. Replaying the final head would only show the already fixed code. Threads opened on another commit are discarded because their line numbering differs.
- **PR with no ground truth:** if no thread of the PR ended up fixed, there is nothing to measure against. The PR is skipped, listed with its reason in `frozen/own/_skipped.json`, and the summary says how many were frozen and how many were skipped. Skipping it deletes its case from an earlier freeze. `eval own` runs with the frozen cases and does not count the skipped ones as missing. If none is frozen, the command exits with code 1.
- `own-set.json` must be at `status: "confirmed"` and each repo must list exactly `expected` distinct PRs. Otherwise the command refuses to run.

### 3. Run (`eval`)

```
npm run eval -- own          # the own set
npm run eval -- aacr         # the whole AACR subset
npm run eval -- aacr 5       # only the first 5 cases
```

The argument is positional on purpose: npm would swallow a `--flag` as its own. For each case a shallow checkout of the head is made, `reviewPullRequest` runs (the same code the worker uses, without database or GitHub) and the result is compared with the ground truth.

If a case fails (for example, an infrastructure error), it is listed as failed and **is not included in the metrics**: counting it as "all missed" would blame the model for an unrelated error.

### 4. Read the report

It is written to `packages/eval/results/<date>-<suite>/` (ignored by git):

- `report.md`: in English. Overall and per-category metrics, cost and latency, one row per case and the list of failed cases.
- `report.json`: the same data, for comparing runs.

If `DATABASE_URL` is set, the run is also stored in `eval_runs` and `eval_rows` (one row per `tp`, `fp` or `fn`). If storing fails, the local report is still written and the process exits with code 1.

## Metrics

- **Hit:** a finding hits a ground truth in the same file if its line falls within **±5 lines** of the ground truth's range. For AACR the range goes from `from_line` to `to_line`; in the own set it is a single line. A multi-line finding is widened from its starting line.
- **Precision** = findings that hit / total findings. It counts findings: one that covers two ground truths is a single hit.
- **Recall** = ground truths covered / total ground truths. It counts ground truths.
- **F1** = harmonic mean of the two. With no findings or no ground truths, the ratio is 0, not NaN.
- A finding **without a line** (not anchored) is a false positive.
- Each finding is attributed to its own category and each ground truth to its declared one.
- **Cost:** `tokens × price` per case, only if both prices were given. Without them it stays empty.
- **Latency:** median per case, in milliseconds.

## Attribution

The AACR subset derives from Alibaba's [AACR-Bench](https://github.com/alibaba/aacr-bench), under the Apache 2.0 license (`alibaba/aacr-bench`). The data is downloaded at runtime into a git-ignored cache and **is not redistributed** in this repo.

## When to measure again

Metrics are only comparable with those of another run that uses the same manifest, the same list and the same ±5-line tolerance. A change to the prompt, model, filter or `PITWALL_FINDERS` is measured by running `own` before and after.
