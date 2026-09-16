# The initialization table says "replace" for openspec/specs, but nine of them are required

- **Date:** 2026-09-11
- **Area:** Web app template
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 0.1.0
- **Severity:** `friction`
- **Status:** resolved here by rewriting rather than replacing

## Observed

`docs/development/TEMPLATE_INITIALIZATION.md` says:

| Path                                   | Action      |
| -------------------------------------- | ----------- |
| `openspec/specs/`, `openspec/changes/` | **replace** |

Taken literally — remove the template's specs, write the app's — `npm run openspec:check` fails,
because it requires nine specs by exact filename:

```text
app-shell, local-storage, privacy-by-default, security-baseline, theme-system,
i18n, agentic-initialization, capability-system, maintainability
```

"Replace" and "these nine must exist" are both true, but only one of them is written down in the
place an initializer reads.

## Root cause

The nine specs describe cross-cutting properties every LumbreCode app has, so requiring them is
right. The table's vocabulary — keep, adapt, replace, reset — has no word for "keep the file,
rewrite the content for this product", which is what these actually need.

The same ambiguity exists for `openspec/changes/`: the template's two change folders genuinely
should go, and the check requires that any remaining folder has all three files.

## Resolution here

The nine were rewritten for Foldmark rather than deleted, six new capability specs were added
alongside them, and the template's two change folders were removed and replaced with
`0001-foldmark-mvp`.

## Proposed template change

Split the row:

| Path                        | Action                                 | Why                                                                            |
| --------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `openspec/specs/<the nine>` | **rewrite the content, keep the file** | Cross-cutting properties every app has; `openspec:check` requires them by name |
| `openspec/specs/*` (others) | **add**                                | The app's own capabilities                                                     |
| `openspec/changes/*`        | **replace**                            | The template's changes are not the app's                                       |

The table already uses "rewrite the content, keep the structure" for `docs/public-site/`, so the
vocabulary exists — it is just not applied here.
