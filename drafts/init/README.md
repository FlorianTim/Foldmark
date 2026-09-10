# `drafts/init/` — the input for a new application

Everything the concrete app is built **from** goes here: its description,
notes, mockups, icons and any other raw material.

This folder is the one exception to the drafts rule in two directions:

| | Rest of `drafts/` | `drafts/init/` |
|---|---|---|
| Read by the Template Initializer? | no — template-internal scratch | **yes — it is the input** |
| Deleted when a concrete app is generated? | yes | **no, until processed** |
| Normative? | no | no — the OpenSpec specs derived from it are |

## What goes where

| Folder | Content |
|---|---|
| `spec/` | The app description in whatever form it arrived: a requirements document, a mail, a transcript, a one-pager |
| `notes/` | Loose thoughts, decisions taken in conversation, things to remember |
| `mockups/` | Screen designs, wireframes, screenshots of comparable products |
| `icons/` | Favicon and app artwork, brand assets |
| `resources/` | Everything else: colour palettes, fonts, example data, API documentation of a service the app talks to |

Formats are free. Markdown, PDF, PNG, ZIP — whatever the material came as.

## How it is used

1. You drop the material in here.
2. The Template Initializer reads it and runs phases 1–2 of
   `docs/prompts/INITIALIZE_NEW_APP.md`: OpenSpec current-state specs, the
   first change under `openspec/changes/`, the versioned requirements
   roadmap, and the arc42/ADR updates.
3. Those specs are reviewed and become normative. **The material here never
   does** — if a detail matters, it has to end up in a spec.
4. Icons and mockups are moved to where the build expects them:
   `public/`, `src/assets/`, `docs/architecture/`.

## When it can be deleted

**Only when everything in it has been processed** — every requirement is in
a spec, every asset is in its final place, and nothing here is the only copy
of anything.

Deleting it is the last step of initialization, not the first. Until then it
survives every cleanup, including the one that empties the rest of `drafts/`.

Track progress in `processed.md` next to this file, so a half-finished
initialization can be picked up later.
