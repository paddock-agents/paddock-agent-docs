---
title: "Glossary"
description: "Agentic review agent for GitHub PRs, LLM-agnostic by design, for personal repos and, later on, for any organization that installs it."
---

Agentic review agent for GitHub PRs, LLM-agnostic by design, for personal repos and, later on, for any organization that installs it.

## Language

**Finding**:
A problem or suggestion that Pit Wall finds in a PR and publishes as a comment.
_Avoid_: issue, bug

**Rule pack**:
An organization's set of rules, treated as data that guides the review and never as instructions to Pit Wall.
_Avoid_: prompt, config

**Risk score**:
A value that Pit Wall assigns to each PR and records; in deliverable 1 it does not change how the review is done.
_Avoid_: severity score

**Coverage**:
Which part of the PR was reviewed and which was not, stated in the summary.

**Own set**:
A set of PRs from the maintainer's repos with known correct answers, used in the evaluation.
_Avoid_: dataset
