# Proposal: One command path for menu, toolbar and keys; highlight round trip

Status: Implemented (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A5 and A9.
Roadmap R14-003, R14-004. Priority P0/P1.

## Problem

1. **The Format menu does nothing.** `WorkspacePanel.vue` declares `ref="editor"` and
   `ref="preview"` inside a `<template v-for>`; Vue collects such refs into arrays, so
   `editor.value?.menuCommand(…)` throws `menuCommand is not a function` (reproduced 2026-09-16 in
   the console). Every Edit, Insert, Format and View → zoom entry has been dead since change 0020.
   The menu, the toolbar and the shortcuts also each carry their own routing, so a fix in one place
   does not reach the others.
2. **Highlight turns into a text colour.** `:highlight[word]` is written correctly, but when the
   editor reloads it the colour mark's parser claims the directive first — `highlight` is also one
   of the six semantic colour aliases — so the word comes back as yellow _text_ instead of a yellow
   _background_. The preview renders it right (its adapter tests the inline directive names first);
   the editor does not.

## Scope

- **Command dispatcher.** One `EditorCommandDispatcher` in the presentation layer with
  `canExecute(id)` / `execute(id)` over a `FormatCommandContext { target }` where the target is
  `rich-editor`, `markdown-editor`, `subject` or `none`. The menu bar, the toolbar and the shortcut
  handler call it; the menu computes `disabled` from `canExecute`.
- **Target tracking.** The last focused editing surface is the target: the visual editor, the
  Markdown textarea or the subject field. Moving focus to a menu or toolbar button does not change
  it; no surface yet means `none` and disabled entries.
- **Subject as a block.** Format → Bold with the subject as target toggles
  `printOptions.subjectBold` (default on for letters, as today's paper style); the subject stays a
  single-line input and never becomes rich text. The paper reads the flag instead of the fixed CSS
  weight.
- **Refs fixed.** The editor and preview refs leave the `v-for`.
- **Highlight.** The colour parser refuses every name in the inline-directive catalogue
  (`highlight`, `u`, `small`, `sup`, `sub`, `date`), so `:highlight[…]` is the highlight mark again;
  the long form `:color[x]{name=highlight}` remains the text colour. Round-trip test: type →
  highlight → Markdown → visual → save → reopen → preview → print copy.

## Acceptance

- Select text, Format → Bold: the selection is bold. The same for italic, underline, strikethrough,
  highlight, headings, alignment, lists, insertions and View → zoom / guides.
- Subject focused, Format → Bold: the printed subject toggles between bold and regular.
- No editing surface focused (fresh document, focus on the title): Format entries are disabled.
- The eleven-step highlight test from A9 passes in Playwright.
