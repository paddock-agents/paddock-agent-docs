---
title: "Deployment on Railway"
description: "A single repo and a single Dockerfile ship as two Railway services, plus a Postgres."
---

A single repo and a single `Dockerfile` ship as two Railway services, plus a Postgres. The reasoning is in [ADR 0003](../decisions/2026-11-19-railway-two-processes/).

## Pieces

| Service | Start command | Migrations | Health |
|---|---|---|---|
| `web` | `node packages/server/dist/web.js` | pre-deploy: `npm run migrate` | `GET /healthz`, 60 s timeout |
| `worker` | `node packages/server/dist/worker.js` | does not migrate | no port, no health check |
| Postgres | Railway `postgres` template | n/a | n/a |

Both services are built from the root `Dockerfile` and use an `ON_FAILURE` restart policy with up to 5 retries.

`railway.json` and `railway.worker.json` document that configuration, but Railway no longer lets you enable "Config as Code" on new services. So each value in the table is set directly in the service configuration (Railway dashboard, CLI or MCP). If one changes, update both the service and the file.

The `Dockerfile` has two stages. The first runs `npm ci`, `npm run build` and `npm prune --omit=dev`. The final image starts from `node:22-bookworm-slim`, installs `git` and `ca-certificates`, copies `node_modules`, `packages` and `migrations`, runs as the `node` user and exposes port 3000.

## Steps

1. Create a project in Railway and deploy the **PostgreSQL** template.
2. Create two empty services, `web` and `worker`, and set the configuration from the table above: Dockerfile, start command and, on `web` only, the pre-deploy command and the health check.
3. Set the variables in **both** services (next section). `DATABASE_URL` goes in as a reference: `${{Postgres.DATABASE_URL}}`.
4. Generate a public domain for `web` only.
5. Give the Railway GitHub App access to the repo: at <https://github.com/apps/railway-app/installations/new>, choose "Only select repositories" and check `pit-wall`. Without this, connecting the repo fails with `User does not have access to the repo`.
6. Connect both services to the repo's `main` branch. Each push to `main` deploys both. `web` applies the migrations before starting; the `worker` does not migrate and needs the schema to exist.
7. Activate the webhook of the [GitHub App](../github-app/) (next section).

## GitHub App webhook

The GitHub API does not let you activate an App's webhook: `GET /app/hook/config` returns 404 while it is inactive. So the first step is manual:

1. On the App's page, in the Webhook section, check **Active**, set the URL to `https://<domain>/webhooks/github` and any temporary secret. Save.
2. Replace the temporary secret with the real one using `PATCH /app/hook/config`, authenticated with a JWT signed with the App's private key. This way the secret is not copied by hand. The value must be the same as `GITHUB_WEBHOOK_SECRET` in Railway.

To generate the secret: `openssl rand -hex 32`.

## Secrets and variables

Both services need the five required variables, because they share `loadConfig()`:

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Reference to the Postgres plugin's variable. |
| `ANTHROPIC_API_KEY` | Anthropic console. |
| `GITHUB_APP_ID` | GitHub App page. |
| `GITHUB_APP_PRIVATE_KEY` | The App's PEM, on one line with literal `\n`. |
| `GITHUB_WEBHOOK_SECRET` | The secret configured on the webhook. |

Optional: `PITWALL_NOTION_DATABASE_ID` and `NOTION_TOKEN` (only the worker uses them), `PITWALL_FINDERS`, `PITWALL_FINDER_MODEL`, `PITWALL_REPAIR_MODEL`, `PITWALL_LANGUAGE`. Full list in [configuration.md](../configuration/).

Secrets are set as Railway variables, never in the repo or in the image. To avoid pasting them by hand, you can load them from a local `.env` (outside the repo, permissions `600`) with the CLI, without printing them:

```bash
# In a subshell: an exit stops only this block, not the terminal.
(
  # If the link fails, Railway keeps the previous project: stop before writing anything.
  railway link --project <project-id> --environment production || { echo "railway link failed" >&2; exit 1; }
  KEYS="GITHUB_APP_ID GITHUB_APP_PRIVATE_KEY ANTHROPIC_API_KEY GITHUB_WEBHOOK_SECRET"
  # Fail before touching Railway if any key is missing or empty.
  for k in $KEYS; do
    grep -q "^$k=." .env || { echo "$k missing from .env" >&2; exit 1; }
    # Restricted format: KEY=value, no comment on the same line.
    grep -m1 "^$k=" .env | grep -q ' #' && { echo "Remove the comment from the $k line in .env" >&2; exit 1; }
  done
  for svc in web worker; do
    for k in $KEYS; do
      v=$(grep -m1 "^$k=" .env | cut -d= -f2-)
      # dotenv: a single pair of outer quotes delimits the value and is not part of it.
      case $v in
        \"*\") v=${v#\"}; v=${v%\"} ;;
        \'*\') v=${v#\'}; v=${v%\'} ;;
      esac
      # Through stdin: the value does not end up in the process argument list.
      printf '%s' "$v" | railway variable set "$k" --stdin --service "$svc" --skip-deploys >/dev/null || {
        echo "$k failed on $svc. Fix the problem and run the whole block again, so web and worker stay in sync." >&2
        exit 1
      }
    done
  done
)
```

`--skip-deploys` does not change a deployment that is already running. The first time it does not matter, because step 6 deploys with the values already set. When rotating a secret, redeploy `web` and `worker` so they pick up the new value.

Rotating `GITHUB_WEBHOOK_SECRET` touches two sides, because GitHub signs each delivery with that secret:

1. Set the new value in Railway, on both services, and redeploy `web` and `worker`.
2. Change the App's webhook secret with `PATCH /app/hook/config` (previous section), using the same value.
3. From the moment the new `web` starts receiving traffic until step 2 is done, `web` responds `401`, because GitHub keeps signing with the old secret. Under the App's "Advanced", redeliver the deliveries that failed in that window.

If `railway login` fails with `PKCE` in the browser, run it again: the first time it can open a badly escaped URL. Logs go through the secret redactor ([security.md](../security/)).

## Migrations

- `npm run migrate` applies all pending migrations (`up`). It only needs `DATABASE_URL`.
- To revert: `npm run migrate -- down [count]`; by default it reverts one.
- Each migration comes with its `-- Down Migration` block.
- If a migration fails, `npm run migrate` exits with code 1 and the `web` deployment fails before starting.

## Verification after deploying

1. `GET https://<domain>/healthz` returns `{"status":"ok"}`.
2. `worker started` appears in the `worker` logs; `web listening` in the `web` logs.
3. In GitHub, under the App's "Advanced", redeliver a recent delivery and check that it responds `202`.
4. Open a test PR in a repo with the App installed, or comment `/pitwall review`.

Logs are one JSON line per event. Useful messages to search for: `review enqueued`, `review published`, `review failed`, `webhook rejected: bad signature`.

## Scaling and shutdown

- The `worker` takes one job at a time. For more parallelism, add replicas.
- On `SIGTERM`, `web` closes the server and stops pg-boss; the `worker` waits up to 60 s for the current job to finish.

## Costs (estimate)

- **Railway Hobby:** about USD 5 to 8 per month with two small services and a Postgres. This is an estimate, not a measurement.
- **Anthropic:** billed separately and the main variable cost. It scales with PR size and with `PITWALL_FINDERS=specialized`, which runs four finders per group instead of one. Each review stores its token usage in `reviews.usage`. The evaluation computes cost per case if given the prices ([evaluation.md](../evaluation/)).
- The expected volume is tens of PRs per day.
