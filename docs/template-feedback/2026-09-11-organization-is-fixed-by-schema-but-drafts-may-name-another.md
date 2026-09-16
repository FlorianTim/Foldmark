# The config schema fixes the organization, so input material naming another has nowhere to go

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `friction`
- **Status:** resolved by keeping the schema value and recording the conflict

## Observed

The input material for this app consistently names the organization **Lambro Code** with the domain
**lambrocode.de**, including in the configuration file it supplies for the initializer.

`config/template.schema.json` declares those fields as constants:

```json
"name": { "const": "LumbreCode" },
"domain": { "const": "lumbrecode.de" }
```

So `template.config.json` cannot express what the input material asks for, and
`npm run template:validate` refuses any attempt.

## Root cause

Reasonable on its own terms — every generated app belongs to the same organization, and pinning the
value stops a typo becoming a published contact address. But the initializer's documented job is to
derive identity _from the drafts_, and the drafts are written by whoever commissions the app. When
those two disagree there is no place to record the disagreement except a footnote nobody reads.

Here it looks like a naming drift for the same organization rather than a genuinely different one.
An initializer that silently overwrote it would still be guessing.

## Resolution here

The schema value was kept, and the conflict is recorded in
`openspec/changes/0001-foldmark-mvp/design.md` under known deviations and in
`drafts/init/processed.md`. It stays an open question for review.

## Proposed template change

Say so explicitly in `docs/development/TEMPLATE_INITIALIZATION.md`: the organization identity is
fixed by the schema, input material claiming a different one is a review question rather than a
configuration value, and the initializer should record it rather than resolve it. One paragraph.

Optionally, `validate-template.py` could produce a more specific message than a schema violation
when the supplied organization differs — it is the one const in the schema an initializer will
plausibly be asked to change.
