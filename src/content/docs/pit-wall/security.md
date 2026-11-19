---
title: "Security"
description: "Threat model for deliverable 1."
---

Threat model for deliverable 1. What follows describes what the code does today, with its limits. Report a security problem to the repo owner, without real credentials or payloads.

## What is protected

- The credentials: GitHub App key, installation token, webhook secret, Anthropic key, Notion token, `DATABASE_URL`.
- The code and data of the reviewed repos, which pass through Pit Wall, Anthropic and the database.
- That nobody spends reviews (money) without permission.
- That a PR author cannot manipulate the review of their own PR.

## Who controls what

| Input | Who controls it | Trust |
|---|---|---|
| Webhook body | GitHub, signed | Verified before use |
| PR title, description and diff | PR author (sometimes a third party) | **Untrusted** |
| Checkout files | PR author | **Untrusted** |
| `.pitwall/pack.yaml` from the base | Whoever can merge into the base | Trusted, validated |
| Notion rules | Owners of the Notion database | Trusted, validated |
| Model response | Anthropic, influenced by all of the above | **Untrusted** until validated |

## Threats and defenses

### Forged webhook

- `web` computes HMAC-SHA256 of the **raw body** with `GITHUB_WEBHOOK_SECRET` and compares it with `X-Hub-Signature-256` in constant time (`timingSafeEqual`). This happens before parsing the JSON. No signature or a bad signature: `401`, without reading anything else.
- The route only accepts `application/json` and the body is capped at 26 MiB.
- Known limit: there is no rate limiting of its own. The signature prevents a third party from enqueueing work, but a repeated valid delivery is only stopped by the queue key and the `delivery_id` check.

### `/pitwall review` command without permission

- Two steps: `author_association` and then the `admin`, `maintain` or `write` permission lookup against the GitHub API. A lookup error counts as "no permission". `Bot` users are ignored.
- `author_association` is not enough because a `COLLABORATOR` may have read access only. See [ADR 0010](../decisions/2026-11-19-manual-trigger-pr-comment/).
- Draft PRs and bot PRs are only reviewed when requested by someone with permission.

### Token handling

- The App signs a JWT with its private key; octokit exchanges it for an **installation token**, which renews itself and is short-lived. It is not stored in the database or on disk.
- For `git`, the token travels in an HTTP header (`http.<url>.extraheader`) passed through the child process's environment variables, scoped to the remote URL. It does not go in the URL, in `argv` or in the log.
- `git` error messages replace the token and its base64 form with `[REDACTED]`.
- `git` runs with `HOME` pointing to the checkout, global and system configuration disabled, no credential helper and no terminal prompts.
- Configuration fails closed: the error names the missing variable, never its value.
- The image runs as the `node` user, not as `root`.

### Secret redaction

`redactSecrets` (`packages/core/src/redact/secrets.ts`) replaces with `[REDACTED:<type>]`:

- known token shapes (Anthropic, OpenAI, GitHub, GitLab, AWS, Google, Slack, Stripe, npm, SendGrid, JWT) and PEM private key blocks;
- passwords inside `scheme://user:password@host` URLs;
- assignments whose name suggests a secret (`password`, `secret`, `token`, `api_key`, `auth`, etc.), if the value has enough entropy;
- long strings that mix letters and digits and have high entropy. Git SHAs and hexadecimal digests do not reach the threshold.

It is applied to all text that leaves the pipeline:

- the diff, title and description of the PR **before** sending them to the model;
- tool output, before it goes back to the model;
- rule text, before it is sent to the model;
- finding titles, bodies, suggestions and quoted code, and the summary, before publishing or storing;
- every string of every log line, and fields with suspicious names are replaced entirely;
- the failure detail stored in `reviews.status_detail`.

Limit: it is a heuristic. A secret with an unusual shape and low entropy can slip through, and a value that looks like a code identifier is left alone. Do not rely on it to keep secrets in the code: it is there to reduce damage, not to allow them.

### Prompt injection (diff, pack, tool output)

The diff, the PR description and the files the model opens can contain text that looks like an instruction.

- **Per-review nonce.** Each review generates 8 random bytes. Untrusted text goes in tags that carry that nonce (`<pull_request nonce=...>`, `<file_diff nonce=...>`, `<tool_output nonce=...>`). PR text cannot close or imitate a tag because it does not know the nonce.
- **Notice in the system prompt.** It says that everything inside a nonce tag is data and must never be followed, only judged.
- **Rules as data.** They go in `<org_rules_data format="jsonl">`, with `<` escaped, and with their own notice that they are not instructions.
- **Repair without obedience.** The repair model receives the broken response inside `<broken_output>` with the order to treat it as data.
- **No side effects.** The model can only read: it has no write or execution tools. The only thing that comes out is what passes through the parser.
- **Output is validated.** Findings that do not match the schema are discarded; `rule_id` only counts if it exists in the pack; the category is normalized to five values; confidence is clamped to 0 to 1; the comment is anchored only if the quoted code appears exactly once in the diff.

Limits: the nonce reduces the risk, it does not eliminate it. Adversarial text can, for example, convince the model to suppress a finding. The worst outcome of an injection is one finding too many or too few, not an action. A verifier that confirms findings is part of deliverable 2.

### ReDoS (pack and search regexes)

- A pack's `risk.patterns` regexes run in the worker over lines added by the PR author. They are limited to 200 characters, to lines of up to 2000 characters, and those with a repeated group that contains another repetition (`(a+)+`, `(\w+\s?)*`) are rejected.
- It is a **heuristic, not a proof**: it may let some pattern through and may reject a harmless one. The exit plan is to move to a non-backtracking engine (re2) if packs ever come from untrusted authors. Today the authors are those who can merge into the base.
- The model's `grep` tool uses `git grep -E`, with a pattern of up to 500 characters, a 10 s timeout and an output cap.

### Repo code is never executed

- Nothing from the reviewed repo is installed, built or tested.
- The checkout disables hooks, LFS filters, submodules and credential helpers; it does not fetch blobs larger than 1 MiB.
- The tools are `read_file`, `grep` and `find_callers`: read-only, over tracked files, confined to the checkout directory. They reject absolute paths, `..` and symlinks that leave the root, and do not open binaries. `find_callers` only accepts identifiers.
- The temporary directory is deleted at the end, also on failure.
- Details in [ADR 0006](../decisions/2026-11-19-head-checkout-confined-tools/).

### Data sent to third parties

- **Anthropic** receives the diff, parts of files the model opens, the PR title and description and the rules, all already redacted of secrets.
- **Notion** receives only the database id and the token.
- Nothing is sent to other services.
- Review Anthropic's data retention policy before installing the App on third parties' private repos.

### Stored data

PR metadata, findings (title, body, quoted code, already redacted), coverage, risk, token usage and pack versions are stored. Neither the full diff nor file contents are stored.

## Pending (outside deliverable 1)

- Finding verifier and risk tiers for review.
- Rate limiting and a spending cap per organization or per repo.
- Non-backtracking regex engine if packs stop being trusted.
