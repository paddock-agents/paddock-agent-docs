---
title: "Configuration"
description: "All configuration comes from environment variables."
---

All configuration comes from environment variables. The code **does not read `.env` files**: variables are set in Railway or exported in the shell. Values are never stored in the repo (`.env*` is in `.gitignore`).

If a required variable is missing, the process fails at startup with `Missing required environment variable(s): NAME`. The message names the variable and never its value (`packages/core/src/config/index.ts`).

## Required

`web` and `worker` call the same `loadConfig()`: **both processes need all five**, even though `web` does not use the model.

| Variable | Use | Where it is read |
|---|---|---|
| `DATABASE_URL` | Postgres: data and queue. Also used by `npm run migrate`. | `config/index.ts` (`loadConfig`), `db/migrate-cli.ts` |
| `ANTHROPIC_API_KEY` | Anthropic API key. | `config/index.ts`; also `pipeline/dry-run.ts` and `eval/src/run.ts` |
| `GITHUB_APP_ID` | GitHub App id. | `config/index.ts`; also `pipeline/dry-run.ts` |
| `GITHUB_APP_PRIVATE_KEY` | Private key (PEM) of the App. Accepted on a single line with literal `\n`: the code converts them into line breaks. | `config/index.ts`; also `pipeline/dry-run.ts` |
| `GITHUB_WEBHOOK_SECRET` | Secret used to sign the webhook (`X-Hub-Signature-256`). | `config/index.ts`, used by `web` |

`npm run migrate` only needs `DATABASE_URL`.

## Optional

| Variable | Default | Effect | Where it is read |
|---|---|---|---|
| `PORT` | `3000` | Port of the `web` process. Railway injects it. | `server/src/web.ts` |
| `PITWALL_FINDERS` | `generalist` | `generalist` runs one finder per group; `specialized` runs four (security, correctness, performance, maintainability). Any other value: the process does not start. | `finders/config.ts` |
| `PITWALL_FINDER_MODEL` | `claude-sonnet-5-5` | Model for the finders. | `finders/config.ts` |
| `PITWALL_MODEL` | (unset) | Old alias of `PITWALL_FINDER_MODEL`. Only applies if the new one is not set. | `finders/config.ts` |
| `PITWALL_REPAIR_MODEL` | `claude-haiku-5-5` | Model for the single repair call when the response cannot be parsed. | `finders/config.ts` |
| `PITWALL_LANGUAGE` | `en` | Language of finding titles and bodies (free text, passed to the model as is, for example `en`, `es` or `Portuguese`). It also selects the fixed text Pit Wall publishes: the summary, the inline comment labels and the notices (skipped draft or bot PR, incomplete review, review without the organization rules). A value starting with `es`, or `spanish` or `español` (any case), gives Spanish; any other value gives English. | `finders/config.ts`, `i18n.ts` |
| `PITWALL_NOTION_DATABASE_ID` | (unset) | Id of the Notion database with the organization's rules. | `server/src/worker.ts` |
| `NOTION_TOKEN` | (unset) | Notion integration token. Without it, or if Notion fails, the review continues without those rules and the summary says so. If the id is set and the token is missing, the worker warns at startup. | `server/src/worker.ts` |

`PITWALL_FINDERS`, `PITWALL_FINDER_MODEL`, `PITWALL_MODEL`, `PITWALL_REPAIR_MODEL` and `PITWALL_LANGUAGE` are read in the `worker`, in `review:dry` and in the evaluation, through `loadFinderConfig()`.

## Development tools only

| Variable | Use | Where it is read |
|---|---|---|
| `PITWALL_INSTALLATION_ID` | Required for `review:dry`: id of the App installation on the PR's repo. Must be an integer. | `pipeline/dry-run.ts` |
| `DATABASE_URL` (eval) | Optional in the evaluation: if set, the run is stored in `eval_runs` and `eval_rows`. | `eval/src/run.ts` |
| `EVAL_PRICE_INPUT_PER_MTOK` | USD per million input tokens, for the cost column. Must be set together with the output one. | `eval/src/run.ts` |
| `EVAL_PRICE_OUTPUT_PER_MTOK` | USD per million output tokens. | `eval/src/run.ts` |

Without both price variables, the report's cost stays empty: the price table belongs to the operator and is not guessed.

## System variables the code uses

| Variable | Why |
|---|---|
| `PATH` | Passed to the `git` process. The rest of the environment is not inherited. |
| `TMPDIR` | `os.tmpdir()` decides where the checkout's temporary directory goes. |
| `NODE_ENV` | The Docker image sets it to `production`. |

## Values fixed in the code (not variables)

| Value | Constant | Where |
|---|---|---|
| 8 model calls per run | `maxSteps` | `finders/config.ts` |
| 8000 maximum output tokens per call | `maxOutputTokens` | `finders/config.ts` |
| Minimum confidence 0.6 | `confidenceFloor` | `finders/config.ts` |
| 3 finder runs in parallel | `concurrency` | `finders/config.ts` |
| 180 s timeout and 2 retries per model call | `timeoutMs`, `retries` | `finders/anthropic.ts` |
| 10-minute Notion cache | `PACK_MAX_AGE_MS` | `rulepack/store.ts` |
| 3 job retries, 30 s with backoff, 1 hour lifetime | `retryLimit`, `retryDelay`, `expireInSeconds` | `server/src/queue.ts` |

Changing any of them requires a code change.

## Where to set them

- **Railway:** each service's variables (see [deploy-railway.md](../deploy-railway/)).
- **Local:** `export` in the shell (see [local-development.md](../local-development/)).
- **Rule pack:** not a variable; it lives in the repo's `.pitwall/pack.yaml` or in Notion ([rule-packs.md](../rule-packs/)).
