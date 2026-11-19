---
title: "ADR 0005: Direct Anthropic only, behind a provider interface"
description: "The product relies on Claude, but in the future it may make sense to route models (for example with OpenRouter) or use others."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

The product relies on Claude, but in the future it may make sense to route models (for example with OpenRouter) or use others. We have to decide how much to pay today for that option.

## Decision

There is an `LlmProvider` interface (`complete(req)`, in `packages/core/src/finders/types.ts`) with **a single real implementation**: `createAnthropicProvider`, which talks directly to `api.anthropic.com`. There is also a `FakeProvider` for tests. OpenRouter stays on the roadmap, with no adapter.

The provider is not chosen by configuration: no environment variable changes it. Changing it is a code change in `worker.ts` (and in `dry-run.ts` and the eval).

## Alternatives considered

- **OpenRouter from day one:** lost on scope. It adds an intermediary with its own tool and error behavior, which would have to be validated with the evaluation before using it.
- **No interface, calling Anthropic from the pipeline:** lost because the tests and the evaluation need a test double, and because a provider change would touch the pipeline.
- **One adapter per provider right away:** lost on cost with no use.

## Consequences

- A provider change touches the interface implementation and the point where it is instantiated, not the pipeline.
- The interface is Anthropic's (`text`, `tool_use`, `tool_result`, `thinking` blocks). A provider with a different tool format requires an adapter that translates, not just another URL.
- Pending: choose and measure a second provider when there is a cost or quality reason.
