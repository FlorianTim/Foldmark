# Baseline markdown can never satisfy a consumer that reflows markdown

- **Date:** 2026-08-27
- **Area:** Engineering baseline
- **Severity:** `friction`
- **Baseline version:** engineering PR #4 (pre-v1.3.0)
- **Status:** resolved here by ignoring the baseline-owned directories

## Observed

Adopting the baseline replaced the local `capture-template-feedback` fork with the central skill and
added five more. `npm run format:prettier-check` then failed on markdown nobody in this repository
wrote.

Verified against this repository's own `.prettierrc` with LF line endings, so it is not the Windows
line-ending noise that makes the check fail locally anyway:

```text
probe_skill.md   (capture-template-feedback)  warn
probe_other.md   (roadmap-curator)            warn
probe_agent.yaml (openai.yaml)                clean
```

## Root cause

Not a formatting mistake on either side — a collision between two defensible choices. The central
skills are hand-wrapped at roughly 76 characters. This repository sets `proseWrap: "always"` at
`printWidth: 100`, so prettier reflows every markdown paragraph it is allowed to touch.

Any prose the baseline delivers into a prettier-checked directory therefore fails, forever.
Reformatting it here would fix the check and break the next sync: the file would no longer match
upstream, and `apply_baseline.py` would report it as a local modification and refuse to update it.

`.lumbrecode/` was already ignored for exactly this reason, with the reasoning written into
`.prettierignore`. `.github/agents/` and `.github/skills/` were not, although the baseline profile
copies both directories in whole.

## Change made

`.prettierignore` now covers `.github/agents/` and `.github/skills/`, carrying the same reasoning as
the `.lumbrecode/` entry.

## What this costs

The seven skills this repository owns live in the same directory and lose their formatting check
with it. They are prose; the trade is worth it. The alternative — a per-file ignore list — would
need editing on every baseline release, which is the kind of maintenance that quietly stops
happening.

## For the baseline

Worth deciding centrally rather than per consumer: either the baseline states that its prose is
delivered as-is and consumers must not format it, or it adopts a wrap width that survives the common
consumer configurations. The first is what every consumer is doing anyway.
