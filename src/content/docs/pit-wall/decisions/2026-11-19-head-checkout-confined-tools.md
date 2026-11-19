---
title: "ADR 0006: Checkout of the PR head and confined tools that never execute code"
description: "To judge a change, the model needs to read files outside the diff."
---

- **Date:** 2026-11-19
- **Status:** accepted
- **Decided by:** Gastón (Gate 1c approval, deliverable 1)

## Context

To judge a change, the model needs to read files outside the diff. The PR content is controlled by its author, who may be a third party: a file, a symlink or a hook may try to execute something or escape the directory. The App token must not leak into logs or process arguments.

## Decision

The worker does a shallow checkout of the PR **head** into a temporary directory and gives the model three read-only tools confined to that directory. It never installs, builds or runs anything from the repo.

Checkout (`packages/core/src/checkout/`):

- `git fetch --depth 1 --filter=blob:limit=1m` of `refs/pull/<n>/head`. It also works for forks. If the fetched sha is not the job's, it throws `HeadMovedError`.
- The token goes in an HTTP header (`http.<url>.extraheader`) passed through the git process's environment variables, scoped to the remote URL. It never goes in the URL, in argv or in logs; error messages mask it.
- Every `git` call runs without a shell and with `core.hooksPath=/dev/null`, empty LFS filters, no credential helper, no submodules, and global and system config turned off.
- Blobs larger than 1 MiB are not fetched and are excluded with sparse checkout. The directory is deleted at the end, even on failure.

Tools (`packages/core/src/tools/`): `read_file`, `grep` and `find_callers`. They resolve every path with `realpath` and reject absolute paths, `..` and symlinks that leave the root. Limits: files up to 1 MiB, 64 KiB per read, 100 matches, 10 s. Search is `git grep` over tracked files, excluding binaries. Each tool's output is redacted before going back to the model.

## Alternatives considered

- **Read everything through the GitHub contents API:** lost because of the number of calls and rate limits for `grep` and `find_callers`.
- **Full clone:** lost on time and size; the shallow head is enough.
- **Give the model a shell or run the repo's tests:** lost on risk. Running code from someone else's PR is the worst security case, and the product does not need it.
- **Checkout of the base plus the diff only:** lost because the model would see the old code, not the code about to be merged.

## Consequences

- A single `git grep -E` with a pathological expression can use up the 10 s timeout; it is bounded, not prevented.
- The model cannot verify behavior by running anything. A verifier (deliverable 2) would cover that, with a separate security decision.
- Large files stay out of the checkout. If their diff does not arrive either (GitHub does not deliver it), the file shows as "not reviewed" in the coverage.
