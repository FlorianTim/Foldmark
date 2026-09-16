# Design: Command dispatcher and highlight parsing

| Decision                                                                          | Alternative rejected                             | Why                                                                                                                                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A dispatcher object owned by `WorkspacePanel`, handed the editor and the document | Each consumer keeps calling the editor component | Three consumers (menu, toolbar, keys) and three targets (rich, source, subject) is nine paths; one table of `id → { canExecute, execute }` is one.        |
| The target is the last focused editing surface                                    | `document.activeElement` at execution time       | Clicking a menu moves focus to the menu; the command must still know which surface the writer was in.                                                     |
| Subject bold is a document flag, not a mark                                       | Rich text in the subject input                   | A1/A5 say so explicitly: the subject is a structured element; one flag prints, mails and exports the same way.                                            |
| The colour parser consults the inline-directive catalogue                         | Rename the `highlight` alias                     | The alias is in shipped documents (`:color[x]{name=highlight}`); the catalogue is the registry that already decides what is known (directive convention). |
| Function refs for editor and preview                                              | Move the panes out of the `v-for`                | The slot loop is what makes folding and focus work; a function ref costs one line and the array never appears.                                            |

## Dispatcher

```ts
export type CommandTarget = 'rich-editor' | 'markdown-editor' | 'subject' | 'none';

export interface EditorCommandDispatcher {
  readonly target: Ref<CommandTarget>;
  canExecute(id: string): boolean;
  execute(id: string): void | Promise<void>;
}
```

`src/presentation/editor/commandDispatcher.ts` builds it from what the workspace already has: the
`RichTextEditor` component instance (visual or source), the `PaperPreview` instance, the store.
Command ids are the menu ids of change 0020 (`editor:bold`, `editor:align:center`, `zoom:fit-page`,
…) plus `editor:clearFormatting` (change 0031). `canExecute`:

- `editor:*` inline and block commands — `rich-editor` or `markdown-editor` (text transforms), or
  `subject` for `bold` only; `none` → false.
- `editor:undo/redo` — `rich-editor` only, and only when the history says so.
- `zoom:*`, `guides`, `pane:*`, `focus:*`, `layout:*` — always.

The `RichTextEditor` reports its target through an event (`focus-target`) when its host or textarea
receives focus; `MetadataForm` reports `subject` from the subject input. The workspace keeps the
last non-`none` value.

## Subject bold

`printOptions.subjectBold?: boolean` (schema: optional boolean; absent = bold). `RenderBlock` of
kind `lines` for the subject carries `style: 'subject'` already; `PaperSurface` adds
`data-weight="regular"` when the flag is false and the CSS reads it. The codec writes the key only
when it is `false` (the default is not spelled out, as with `showSubject`).

## Highlight

`foldmarkSyntax.ts` → `colorOf(node)`:
`return node.name && !KNOWN_INLINE.has(node.name) && isColorName(node.name) ? node.name : null;`.
The renderer side already does the equivalent in `mdastAdapter.ts`. A parser test loads
`:highlight[x]` into the editor and expects the highlight mark, not the colour mark; the round-trip
test (`tests/editor/roundtrip.test.ts`) gets the reload case.
