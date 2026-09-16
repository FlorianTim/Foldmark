# Proposal: Clear formatting, a real mode switch, larger toolbar controls

Status: Implemented (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A6, A7, A8
and C8. Roadmap R14-005, R14-006, R14-007, R15-005. Priority P1.

## Scope

- **Clear formatting** (`editor:clearFormatting`): removes every character mark from the selection —
  bold, italic, underline, strikethrough, inline code, colour, highlight, small, superscript,
  subscript, and unknown inline directives. Toolbar button (eraser / `Tx` icon), Format menu entry,
  shortcut `Ctrl+\` (registry, change 0032). In the Markdown view the same command strips the mark
  syntax from the selected text. Paragraph reset (heading, alignment, indent) is a later command;
  the id is reserved.
- **Mode switch.** Visual / Markdown becomes one control with `role="switch"`, labels on both sides,
  the thumb on the active side, keyboard-operable (Space/Enter toggle, Left/Right choose). The
  permanent hint text goes; the hint becomes the switch's tooltip. Undo and redo move into the same
  row, right of the switch. Switching to Markdown carries the editor's Markdown; switching back
  reloads; a document whose Markdown the visual editor would change on load (round-trip loss) shows
  a warning line instead of silently rewriting.
- **Toolbar sizing.** Icons render at 20 px (`AppIcon size="md"`), buttons are 38 × 38 px with a 4
  px gap and 12 px between groups; every icon-only control has `title` and `aria-label`; active
  toggles use `aria-pressed` and a filled background, not colour alone. The same tokens apply to the
  workspace bar and the preview controls so the app has one control size.
- **Tooltips (C8).** Every icon-only control in the shell gains `title`; text buttons keep none
  unless the tooltip explains a consequence (archive vs. delete, automatic versions, share is a
  copy).

## Acceptance

- Select bold, coloured, highlighted text → Clear formatting → plain text; Markdown shows no marks.
- The switch reads "Visuell ○— Markdown" / "Visual —● Markdown"; Tab reaches it, Space toggles.
- A 10-word document round-trips through both views byte-identical (fixture).
- Playwright: toolbar buttons are ≥ 36 px tall; every `button` without text has an accessible name.
