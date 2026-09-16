# Design: Fix preview marker visibility

## Where the decision lives

```
buildRenderPlan (screen)   → page.markers  = markers with preview: true
buildRenderPlan (paper)    → page.markers  = markers with print: true
PaperSurface               → draws page.markers, or none when guides are hidden
```

`markersFor(profile, surface, mode)` in the domain already separates the two questions "can a human
see it" and "does ink reach the paper". The defect is a second, contradictory filter in
`PaperSurface.vue`:

```ts
props.page.markers.filter((marker) => props.showGuides || marker.print);
```

The fix removes the contradiction rather than adding a third rule: the screen plan is what may be
seen, the toggle is whether it is seen right now.

## Decisions

| Decision                                         | Alternative rejected                       | Why                                                                                                                                            |
| ------------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| The toggle hides all markers on screen           | Keep printed marks always visible          | Users toggle to see the letter as a letter. The print profile, not the preview, is the authority on what prints, so nothing is lost by hiding. |
| One pure helper `visibleScreenMarkers(page, on)` | Keep the filter inline in the component    | Four combinations deserve four unit tests; there is no component test harness in this repository.                                              |
| No `pdf` flag on `PrintMarker`                   | `MarkerVisibility { preview, print, pdf }` | PDF is "Save as PDF" in the print dialog. The plan cannot tell the two apart and must not pretend to.                                          |
| Preview-only marks keep their distinct colour    | One colour for all guides                  | The distinction between a design aid and a printed line is the product's core teaching and stays visible when guides are on.                   |

## Regression list (manual, per release)

Recorded here because the feedback asked for it and no automated print comparison exists.

- A4 sheet dimensions at 100 % scale, Chrome/Edge and Firefox.
- Margins in millimetres against a ruler on the printed sheet.
- Multi-page letter: first and last page, fold marks on sheet two.
- Guides on / off in the preview: the printed sheet is identical.
- PDF via the print dialog with and without printed marks (email profile vs. letter profile).
