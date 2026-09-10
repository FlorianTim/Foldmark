# Processing log for `drafts/init/`

One row per piece of input material, so a half-finished initialization can be
picked up later — and so "is this folder safe to delete?" has an answer that
is not a guess.

`drafts/init/` may be deleted when every row says **done** or **dropped**.

| Material | Kind | Processed into | Status |
|---|---|---|---|
| _(nothing yet — the template ships this folder empty)_ | | | |

## Status values

| Status | Meaning |
|---|---|
| `open` | Not looked at yet |
| `in spec` | Turned into an OpenSpec capability or change, not accepted yet |
| `done` | Accepted spec exists, or the asset is in its final place |
| `dropped` | Deliberately not used — with a reason in the row |

## Example

| Material | Kind | Processed into | Status |
|---|---|---|---|
| `spec/requirements-v2.pdf` | requirements | `openspec/specs/`, `openspec/changes/0001-mvp/` | done |
| `mockups/dashboard.png` | design | `docs/arc42/` diagram + UI notes in `design.md` | done |
| `icons/favicon-512.png` | artwork | `public/` + `index.html` metadata | done |
| `notes/call-2026-09-02.md` | notes | nothing — superseded by the requirements document | dropped |
