# The LumbreCode engineering baseline

This file is delivered into every consumer repository at
`.lumbrecode/tooling/baseline/README.md`. It answers, for a human and for a
coding agent working in that repository: what is this directory, where does it
come from, and when does it change?

## What it is

`.lumbrecode/` is a **vendored copy** of shared engineering material —
schemas, tooling, templates and prompts — from the private repository
`FlorianTim/lumbrecode-engineering`. It is committed here on purpose: a local
agent finds it without a token, and CI does not depend on a second repository
being reachable.

It is a copy under a lock file, **not a second source of truth.** Do not edit
anything under `.lumbrecode/` here. Change it upstream and re-apply, or the
next update reports your edit as a conflict and refuses to overwrite it —
which is the mechanism working, not failing.

## What it owns, and what this repository owns

The distinction matters, and getting it wrong costs a repository its rules.

**The baseline owns** `.lumbrecode/` in full, plus `.github/skills/` and
`.github/agents/`. These are overwritten on every update.

**This repository owns** `AGENTS.md`, `.github/copilot-instructions.md` and
`.github/instructions/`. The baseline never writes to them. Its shared prose
arrives at `.lumbrecode/baselines/` as *reference*, and this repository's own
files apply on top of it.

The reason is size, not principle. The shared `AGENTS.md` is thirteen lines
that hold everywhere. A consumer's is hundreds, and what it adds is not an
exception to those thirteen lines — it is the substance.

## How releases work

Versions follow the meaning of the change, not the calendar:

| | |
|---|---|
| Major | incompatible workflow, schema or destination change |
| Minor | additive workflow input, schema field, skill or profile |
| Patch | compatible fix or wording correction |

Two things are versioned, and they are consumed differently:

**Reusable workflows** are referenced by tag from a consumer's own workflow:

```yaml
uses: FlorianTim/lumbrecode-engineering/.github/workflows/flutter-quality.yml@v1
```

`@v1` is a **moving** major tag. It advances only after a reviewed compatible
release, so a consumer follows fixes without following surprises. `@main` is
forbidden.

**Baseline files** come from an immutable release asset,
`lumbrecode-baseline-v<x.y.z>.zip`, built and published by the engineering
repository's own release workflow when a version tag is pushed. Nothing is
built by hand, because the step people skip is always the upload.

## Checking for updates

A vendored baseline has no natural reminder. An npm dependency announces
itself on every install; a directory copied in once simply sits there, and the
distance to upstream is invisible until something breaks that was fixed
centrally months ago. So ask on a schedule, the way you would run
`npm outdated` or `flutter pub outdated`:

```bash
python .lumbrecode/tooling/baseline/check_update.py
```

It prints the vendored version, the latest release, and the command to close
the gap. It needs `gh auth login` or `GITHUB_TOKEN` because the engineering
repository is private, and it exits 0 when it cannot reach GitHub — being
offline is not a build failure.

A good rhythm is with the other dependency updates: whenever you run
`npm outdated` or `flutter pub outdated`, run this too.

## Updating

```bash
python scripts/fetch_engineering_release.py \
    --tag v1.4.0 --profile <flutter|webapp|astro> --target .
```

Read the plan before it writes. `CREATE` and `UPDATE` are routine; `CONFLICT`
means a baseline file was changed locally, and it is **not** overwritten. Fix
the cause rather than reaching for `--force`: either the edit belongs upstream,
or it belongs in a file this repository owns.

## For a coding agent working here

1. `.lumbrecode/` is **read-only** to you. Never edit, reformat or "tidy" it —
   your formatter is not its formatter, and the next sync will report the
   difference as a conflict.
2. Its schemas and prompts are **normative** where they apply. Prefer them over
   inventing a shape.
3. When you need to change something in `.lumbrecode/`, say so and stop. The
   change belongs in `lumbrecode-engineering` and reaches here through a
   release.
4. When friction with the baseline costs you time, write it down in this
   repository's `docs/template-feedback/` — including what you worked around.
   That register is the only path back upstream.
5. If asked whether the baseline is current, run the update check above rather
   than guessing from the directory contents.

## The lock file

`.lumbrecode/baseline.lock.json` records the version, when it was applied, the
profile and a hash per file. The hashes ignore line endings, so a Windows
checkout does not read as locally modified.

`"version": null` means the baseline was applied from a local clone rather
than a release. That is fine for development and unanswerable for the update
check — re-apply from a release to make it comparable.
