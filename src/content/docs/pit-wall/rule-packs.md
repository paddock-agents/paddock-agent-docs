---
title: "Rule packs"
description: "A pack is an organization's set of rules."
---

A pack is an organization's set of rules. It is **data** that guides the review, never an instruction to Pit Wall. Decision and reasons: [ADR 0007](../decisions/2026-11-19-rule-packs-as-data/).

## Where it lives

1. **In the repo:** `.pitwall/pack.yaml`, read from the PR's **base** commit, never from the head.
2. **In Notion:** a Notion database, if the repo has no pack.

## Precedence

1. If the repo has `.pitwall/pack.yaml` in the base, that one is used. It wins over Notion.
2. If the file does not exist (404) and `PITWALL_NOTION_DATABASE_ID` is set together with `NOTION_TOKEN`, Notion is used.
3. If there is neither, the review runs without rules and says nothing.

If a pack exists but cannot be used, the review still runs **without rules** and the summary flags it in one line:

| Situation | Result |
|---|---|
| Repo pack invalid or too large | No rules. Notice in the summary. It is **not** replaced by Notion. |
| GitHub fails to read the pack | No rules. Notice in the summary. |
| `NOTION_TOKEN` missing with a database id configured | No rules. Notice in the summary. |
| Notion fails or returns something invalid | No rules. Notice in the summary. |

The notice names the source and the code (`repo` or `notion`; `invalid`, `not_found`, `fetch_failed`) and never pack values.

## `pack.yaml`

Full example in [`examples/pack/.pitwall/pack.yaml`](https://github.com/gvareika1997/pit-wall/blob/main/examples/pack/.pitwall/pack.yaml). These are generic TypeScript rules, not those of a real organization.

```yaml
version: 1
name: ejemplo-typescript
rules:
  - id: ts-no-any
    category: types
    severity: medium
    applies_to: ["**/*.ts", "**/*.tsx"]
    description: >-
      Avoid `any`: it loses type checking. Use `unknown` and narrow the type.
    examples:
      bad: "function parse(input: any) { return input.value; }"
      good: "function parse(input: unknown) { return isValue(input) ? input.value : undefined; }"
risk:
  paths:
    - glob: "**/auth/**"
      weight: 15
  patterns:
    - regex: "\\beval\\("
      weight: 20
```

### Schema

| Field | Type | Rule |
|---|---|---|
| `version` | number | Must be `1`. |
| `name` | text | 1 to 100 characters. |
| `rules` | list | Up to 500 rules. `id` values cannot repeat. |
| `rules[].id` | text | 1 to 100 characters. It is what the model cites as `rule_id`. |
| `rules[].category` | text | 1 to 100 characters. |
| `rules[].severity` | `high`, `medium` or `low` | Required. |
| `rules[].applies_to` | list of globs | At least one, up to 300 characters each. Defaults to `["**"]`. |
| `rules[].description` | text | 1 to 4000 characters. |
| `rules[].examples.bad` / `good` | text | Optional, up to 4000 characters. |
| `risk.paths[]` | `glob` and `weight` | Adds `weight` (0 to 100) to the score if any PR file matches. |
| `risk.patterns[]` | `regex` and `weight` | Adds `weight` (0 to 100) if any added line matches. Regex of up to 200 characters. |

More validation rules:

- The file cannot be larger than 256 KiB.
- A regex with nested quantifiers (such as `(a+)+`) is rejected, and so is one that does not compile.
- Rules are sorted by `id` before computing the hash, so the order in the file does not change the version.
- If the model cites a `rule_id` that is not in the pack, it is ignored and the finding is not associated with a rule.
- A finding with a valid rule moves to the `rule` category.

The `risk` section only affects the [risk score](../how-it-works/#risk-score); in deliverable 1 the score does not change how the review is done.

## Notion

The Notion database must have these columns, with these exact names:

| Column | Property type | Required | Notes |
|---|---|---|---|
| `id` | title or text | yes | Unique. |
| `category` | select or text | yes | |
| `severity` | select or text | yes | `high`, `medium` or `low`; uppercase is accepted. |
| `applies_to` | text or multi-select | no | Globs separated by comma or line break. Commas inside braces (`src/{a,b}/x`) do not separate. Empty: `**`. |
| `description` | text | yes | |
| `bad` | text | no | Incorrect example. |
| `good` | text | no | Correct example. |

- The title, rich text, select and multi-select property types are read. Any other type is read as empty.
- A Notion pack goes through the same validation as a repo pack. It has no `risk` section.
- The Notion integration must have access to that database.
- It is queried with pagination of 100 rows, up to 20 pages (2000 rows) and a 15 s timeout per page.
- The result is stored in Postgres and reused for **10 minutes**; after that it is queried again when a review starts.

## Versions

Each pack used is stored in `pack_versions` with the SHA-256 hash of its canonical content. The review records that hash in `reviews.pack_version_hash`, so it is known which rules each PR was judged by.

## Security

- **It is read from the base.** Whoever opens the PR cannot change the rules that judge it in that same PR. A change to the pack applies to PRs reviewed after it is merged.
- **It arrives as data.** The rules go in an `<org_rules_data format="jsonl">` block, one rule per JSON line, with `<` escaped, and a notice that they are not instructions.
- **It is redacted.** The text of each rule goes through the secret redactor before being sent to the model. Even so, do not paste credentials into a pack.
- **Bounded regexes.** The `risk.patterns` regexes run over the PR's added lines, cut to 2000 characters. The defense against exponential-backtracking regexes is a heuristic, not a proof. See [security.md](../security/).
