---
title: "ADR 0004: Messages API with a short loop of read-only tools, no strict output"
description: "The model needs to look beyond the diff (a caller, a helper, a type) to judge a finding."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

The model needs to look beyond the diff (a caller, a helper, a type) to judge a finding. Its response also has to be read as data. The options available are the Claude Agent SDK, strict tool use (`strict`) and output forced through a tool.

## Decision

Each review calls Anthropic's **Messages API** with its own bounded loop, and the final response is **free-form JSON** read with a tolerant parser. Neither the Agent SDK, nor `strict`, nor a forced-output tool is used.

How it is built (`packages/core/src/finders/`):

- At most 8 model calls per run (`maxSteps`). The last one goes with `tool_choice: none`. Up to 8 tool calls per turn. Tools: `read_file`, `grep`, `find_callers`, all read-only (ADR 0006).
- The response is an object `{"analysis": ..., "findings": [...]}`. The `analysis` field comes first so the model reasons before listing findings.
- The parser accepts bare JSON, fenced JSON or JSON inside prose, and trailing commas. It discards and counts invalid items. Only if it cannot read anything does it make **one** repair call to a small model (`PITWALL_REPAIR_MODEL`, default `claude-haiku-5-5`).
- The client is plain `fetch` with retries (429, 5xx, network) and a 180 s timeout. There is no dependency on the Anthropic SDK.

## Alternatives considered

- **Claude Agent SDK:** lost because it brings a general-purpose agent with more surface (write tools, permissions) and less control over how many steps, which tools and how each output is redacted. Here the goal is a short, fixed and auditable loop.
- **Strict tool use or output forced through a tool:** lost because of an external signal. Kodus published that strict schemas dropped their recall from 0.357 to 0.100. It is third-party data that we did not reproduce; our own evaluation (ADR 0011) exists so it can be revisited.
- **JSON mode without a repair parser:** lost because an unreadable response would throw away the whole file group.

## Consequences

- The cost of free-form output: the parser and the repair step have to be maintained, and some responses fail anyway. Those groups stay as "not reviewed" in the coverage and the job is retried.
- The limits (8 steps, 8000 output tokens, minimum confidence 0.6, 3 runs in parallel) are constants in `loadFinderConfig`, not environment variables.
- If our own measurement showed that strict output does not lose recall, this decision is revisited; the `LlmProvider` interface isolates the change (ADR 0005).
