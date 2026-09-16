# Proposal: Fix preview marker visibility

Status: Accepted (1.0.x hotfix)

## Motivation

The preview offers "Hide guides", but fold and hole marks stay on screen after the toggle. The
component behind the sheet only hides markers that do not print, on the reasoning that a printed
mark must not disappear from the preview. Users read the toggle differently: they want a clean look
at the letter, and they trust the print profile — not the preview — to decide what reaches the
paper. The result reads as "hiding does not work".

## Scope

- The preview guide toggle hides every marker on screen; with guides on, the preview shows every
  marker whose `preview` flag is set, exactly as today.
- The paper-mode plan is untouched: what prints, and therefore what ends up in a PDF, is decided by
  each marker's `print` flag and nothing in the preview.
- The decision moves out of the component into a pure function so the four combinations — preview
  on/off × print on/off — are unit-tested rather than reasoned about in a template.
- The print/PDF regression list from the feedback becomes a documented manual check.

## Out of scope

- A per-marker visibility UI. Markers already carry independent `preview` and `print` flags; the
  numeric profile editor (roadmap 0.2) is where they become editable.
- A separate `pdf` visibility. A PDF is a destination of the browser print dialog and shares the
  print plan; splitting it would claim a distinction Foldmark cannot enforce.

## Acceptance

- Guides off: no `.print-marker` element inside `.preview-sheet`.
- Guides on: the same markers as before the change, at the same millimetre offsets.
- The print copy renders the same markers regardless of the toggle state.
