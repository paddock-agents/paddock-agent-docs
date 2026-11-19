---
title: "ADR 0007: Rule packs as data, read from the PR base"
description: "Each organization has its own rules that should guide the review."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

Each organization has its own rules that should guide the review. The rules are text that reaches the model, and their author may be the same person who opens the PR. If the author rewrites the rules that judge them, the review is worthless. Also, the rules may live in the repo or in a place the organization already uses (Notion).

## Decision

The pack is **data**, never instructions, and it is read from the PR **base**, not the head. If the repo has a pack, it **wins over Notion**.

- **Where:** `.pitwall/pack.yaml` at the PR base commit (`pr.base.sha`), through the contents API. Capped at 256 KiB. If the repo does not have one (404), the Notion database from `PITWALL_NOTION_DATABASE_ID` is used, with a 10-minute cache in Postgres.
- **Precedence:** a repo pack with an error is reported in the summary and is **not** replaced by Notion. Any failure to get rules (invalid pack, Notion down, missing token) lets the review run without rules, and the summary says so. Only a database error stops the job.
- **Validation:** a `zod` schema with a cap of 500 rules, unique ids, and for risk regexes a maximum of 200 characters and a heuristic against nested quantifiers (ReDoS).
- **How it reaches the model:** `<org_rules_data format="jsonl">`, one rule per JSON line, with every `<` escaped to the literal sequence `\u003c` (`rulepack/render.ts`), preceded by a notice that it is data and not instructions. Each rule's text is redacted for secrets before it goes out.
- **Trail:** each version is stored by content hash (`pack_versions`) and the review records `reviews.pack_version_hash`.

## Alternatives considered

- **Read the pack from the head:** lost because the PR author could relax the rules in the same PR.
- **Notion as the only source:** lost because it forces every repo to depend on an external account and does not version the rules alongside the code.
- **Rules inside the system prompt:** lost because it mixes data with instructions and does not allow versioning or auditing which version judged each PR.
- **Repo pack and Notion combined:** lost because of ambiguity (which rule wins) and surface; today there is a single source per review.

## Consequences

- Changing a repo's rules requires merging the change into the base before they apply; a PR that changes the pack is judged with the old pack.
- The ReDoS heuristic is not a proof. If packs ever came from untrusted authors, the regex engine would have to move to one without backtracking (re2). Today the authors can merge into the base, so they are treated as trusted.
- The schema is version 1 (`version: 1`). An incompatible change calls for `version: 2` and supporting both.
