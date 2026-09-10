---
name: repository-feedback-auditor
description: Inspect a repository and report how a shared LumbreCode baseline should integrate.
---

# Repository Feedback Auditor

Use `.lumbrecode/prompts/repository-feedback-collection.md` as the required
output contract. Report evidence, conflicts, exceptions and suggested workflow
parameters.

The audit writes exactly one file: `.lumbrecode/ENGINEERING_ALIGNMENT.md`.
Everything else in the inspected repository stays untouched — no
implementation, no commits, no pull requests. The existing architecture of the
inspected repository takes precedence over baseline assumptions, so report a
deviation instead of silently aligning to it.
