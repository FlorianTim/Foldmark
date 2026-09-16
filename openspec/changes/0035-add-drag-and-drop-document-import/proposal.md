# Proposal: Drag-and-drop Markdown import in the file manager

Status: Implemented (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A14.
Roadmap R14-014. Priority P1.

## Scope

- **Drop zone.** Dragging a file over the file manager shows a full-panel overlay "Drop Markdown
  document here"; dropping one or more `.md`/`.markdown`/`.txt` files runs the existing import path
  per file. Other types are refused with a message; nothing is read from them.
- **Checks before storing** — the codec already refuses what does not parse; this change makes the
  checks visible as a preview: parseable Markdown, front matter present and bounded, Foldmark schema
  version known, document kind known, size ≤ 2 MB, unknown front-matter keys (listed, preserved),
  referenced assets (listed; missing ones warned), dangerous content (raw HTML is inert text;
  noted). The preview shows title, kind, profile, page count estimate and the findings, then
  "Import" or "Cancel".
- **Same path for the button.** The Import button goes through the same preview, so the two entry
  points cannot drift.

## Acceptance

- Drop a valid letter: preview shows its title and kind; Import stores it and opens it.
- Drop a `.png`: "Only Markdown documents can be dropped here."; nothing stored.
- Drop a file with an unknown key `x-foo`: the preview lists it as preserved; the stored document
  round-trips it.
- Drop two files: two previews in sequence, or one list with a row per file — both import.
