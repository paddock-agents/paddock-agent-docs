---
title: "Local development"
description: "Requirements: Node >= 22 and git."
---

Requirements: Node >= 22 and `git`. Docker and pnpm are not needed.

## Build and tests

```
npm install
npm run build     # tsc -b, builds the three packages into dist/
npm test          # vitest run, with 120 s timeouts
```

Tests that need a database start their own Postgres with `embedded-postgres` (a binary downloaded at install time) on a free port, apply the migrations and shut it down when done. No external service is needed. CI does the same (`.github/workflows/ci.yml`: `npm ci`, `npm run build`, `npm test`).

Tests do not call Anthropic: they use a `FakeProvider` instead of the model. The checkout tests use a local git repo (`remoteUrl`) instead of github.com.

To run a single file:

```
npx vitest run packages/core/src/risk/risk.test.ts
```

## Review a PR without publishing (dry-run)

Reviews a real PR and prints the result to the screen. It does not write to the database or publish anything on GitHub.

```
npm run build
export ANTHROPIC_API_KEY=...            # your key
export GITHUB_APP_ID=...
export GITHUB_APP_PRIVATE_KEY="$(cat key.pem)"
export PITWALL_INSTALLATION_ID=...
npm run review:dry -w @pitwall/core -- owner/repo#123
```

- Required variables: `ANTHROPIC_API_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `PITWALL_INSTALLATION_ID`. Optional: the finders' `PITWALL_*` variables ([configuration.md](../configuration/)).
- The argument is `<owner>/<repo>#<number>`. With any other format it fails with `expected <owner>/<repo>#<number>`.
- The App must be installed on that repo.
- Logs go to `stderr`; the summary and the JSON result go to `stdout`.
- It uses the repo's pack (`.pitwall/pack.yaml` from the base). It does not query Notion.

The private key is a secret: export it in the shell, never leave it in the repo (`.env*` is ignored).

## Run `web` and `worker` locally

You need your own Postgres: the `embedded-postgres` one is only for tests. It can be one installed on the machine or a development database on Railway.

```
export DATABASE_URL=postgres://...
export ANTHROPIC_API_KEY=... GITHUB_APP_ID=... GITHUB_APP_PRIVATE_KEY=... GITHUB_WEBHOOK_SECRET=...
npm run build
npm run migrate
node packages/server/dist/web.js        # terminal 1, port 3000
node packages/server/dist/worker.js     # terminal 2
```

The code does not read `.env`: variables are exported in each terminal.

## Receive the webhook locally

GitHub has to reach `http://localhost:3000/webhooks/github`. Two options:

- **smee.io:** create a channel at https://smee.io and forward to the local port.

  ```
  npx smee-client --url https://smee.io/<your-channel> --target http://localhost:3000/webhooks/github
  ```

  The channel URL is the webhook URL of the development App. If the signature fails (`401`), try `cloudflared`.

- **cloudflared:** opens a public tunnel to the local port.

  ```
  cloudflared tunnel --url http://localhost:3000
  ```

  Use the URL it prints, with `/webhooks/github` appended, as the webhook URL of the development App.

`gh webhook forward` **does not work** for GitHub App webhooks: it forwards repository or organization webhooks, not an App's.

Use a **separate development App** from the production one, with its own webhook secret, and point its webhook at the tunnel. See [github-app.md](../github-app/).

## Evaluation

See [evaluation.md](../evaluation/): `npm run eval -- own|aacr [N]` from the root, and `npm run fetch -w @pitwall/eval` and `npm run freeze -w @pitwall/eval` to prepare the data.

## Structure

```
packages/core     pipeline, GitHub, checkout, tools, packs, redaction, publishing, database
packages/server   web (webhook) and worker (queue)
packages/eval     local evaluation
migrations/       versioned SQL (node-pg-migrate)
examples/pack/    example rule pack
docs/             this documentation and the ADRs
```
