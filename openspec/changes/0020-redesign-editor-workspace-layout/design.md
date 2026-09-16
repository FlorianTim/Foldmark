# Design: Workspace layout

| Decision                                                 | Alternative rejected        | Why                                                                                                |
| -------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| Pane set as data (`WorkspaceLayoutId → readonly Pane[]`) | Keep the 1/2/3 count        | Every combination the feedback names is a set; a count cannot say "settings + preview".            |
| `v-show` for collapsed panes                             | `v-if`                      | ProseMirror state and scroll position must survive a collapse.                                     |
| Widths as fractions of the grid, clamped to px minimums  | Absolute pixel widths       | The window resizes; fractions keep the proportion, the clamp keeps the minimum.                    |
| ARIA menubar built by hand                               | daisyUI dropdowns           | Keyboard (arrows, Home/End, Escape) and `aria-haspopup` semantics are the point of a classic menu. |
| Sprite `<svg><use href>` from `public/icons/`            | Inline SVG through `v-html` | `v-html` is forbidden (ADR 0011 / security rules); `<use>` needs no markup injection.              |

## Layout state

```ts
interface WorkspaceViewState {
  layout: WorkspaceLayoutId; // stored setting
  collapsed: { document: boolean; preview: boolean }; // stored
  focus: 'write' | 'preview' | null; // session only
  fractions: [number, number, number]; // stored; sums to 1 over the visible panes
}
```

`visiblePanes(state, widthPx)` returns the panes to render and whether each is collapsed; the grid
columns are computed from fractions of the visible, non-collapsed panes with `minmax(min, fr)`.
