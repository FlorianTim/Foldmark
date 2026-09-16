# Proposal: Workspace layout — named areas, pane combinations, resizing, collapsing, focus mode, application menu, icons

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §20–§26, §58,
§60–§61, Phase B 3–8 and the icon pack in `drafts/notes/versions/1.0/foldmark-icon-redesign-pack/`.
Roadmap R13-013…R13-016.

## Motivation

The 1.0 workspace used "Dokument – Schreiben – Vorschau" tabs in the middle of the bar and a numeric
layout selector (one/two/three panes). Testing asked for named areas, a layout selector in words,
resizable and collapsible panes, a focus mode for writing and preview, a classic application menu,
the logo as a way home, a compact footer and consistent icons.

## Scope

- **Naming**: Document settings, Writing area, Preview (`workspace.mode.*` reworded).
- **Layout selector**: Automatic, Document settings, Writing area, Preview, Document settings +
  Writing area, Writing area + Preview, Document settings + Preview, All three. `workspaceLayout.ts`
  maps a layout id to a pane set; Automatic keeps the width rule (three panes from 1380 px) but
  lowers the three-pane threshold to 1180 px so a laptop landscape window shows all three.
- **Resizing**: `PaneResizer` splitters between panes (pointer + keyboard: arrows move 16 px,
  Home/End reset), minimum widths 240 / 320 / 320 px, widths stored in a setting, double-click
  restores defaults. Implemented as `grid-template-columns` from stored fractions.
- **Collapsing**: chevron handles on the Document settings and Preview panes; collapsed panes stay
  mounted (`v-show`) so editor state survives; a collapsed pane is a thin rail with an expand
  button.
- **Focus mode**: Maximize on Writing area and Preview; the other panes collapse temporarily; Escape
  or the exit button restores the previous state.
- **Application menu**: File, Edit, Insert, Format, View, Help as a menubar above the workspace,
  each a native `<details>`-free ARIA menu (`AppMenu.vue`) routing to existing commands.
- **Logo and Close**: the brand mark and Close both flush the working copy and return to the
  document list.
- **Footer**: one line, small, not shown inside the editor.
- **Icons**: `AppIcon.vue` over a sprite generated from the icon pack (plus a few icons the pack
  lacks: letter, postcard, card, photo, folder, archive, import, pdf, maximize, collapse, expand,
  qr-code, contacts, check). Icon-only buttons carry `aria-label` and `title`.

## Acceptance

AC-WS-001…006 from the source. Unit tests for `workspaceLayout.ts` (combinations, thresholds, pane
widths clamp); component test for `PaneResizer`; e2e: three panes at 1440 px, collapse and expand
keep editor text, focus mode.
