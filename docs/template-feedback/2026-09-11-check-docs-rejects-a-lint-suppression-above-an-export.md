# The TSDoc check rejects a lint suppression placed above an exported declaration

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `friction`
- **Status:** worked around here
- **Affects:** `scripts/check-docs.py`

## Observed

`check-docs.py` requires the last non-blank line before an exported declaration to end with `*/`. A
justified ESLint suppression breaks that:

```ts
/** A BCP-47 language tag, restricted to the shapes Foldmark produces. */
// eslint-disable-next-line security/detect-unsafe-regex
export const LocaleTagSchema = z.string().regex(/^[a-z]{2}(?:-[A-Za-z0-9]{2,8}){0,2}$/u);
```

```text
Documentation check failed:
- src/domain/common/Schemas.ts:70: exported declaration requires TSDoc
```

The declaration _is_ documented. The suppression has to sit on the line immediately above the
statement to apply, so the two requirements are mutually exclusive.

This is not a rare combination: `security/detect-unsafe-regex` flags linear patterns fairly often,
and the template's own `src/config/AppConfig.ts` carries one such suppression — on a non-exported
constant, which is why it has not surfaced.

## Workaround used here

Move the regular expression into a non-exported constant carrying the suppression, and let the
exported schema reference it. That is arguably better code, but it is a restructuring forced by a
documentation check.

## Proposed template change

Let the check skip over `//` line comments when looking backwards for the TSDoc block. A few lines
in `check-docs.py`:

```python
previous = index - 1
while previous >= 0 and (
    not lines[previous].strip() or lines[previous].strip().startswith("//")
):
    previous -= 1
```

This keeps the rule ("every export is documented") and stops it from also dictating where a
suppression may live.
