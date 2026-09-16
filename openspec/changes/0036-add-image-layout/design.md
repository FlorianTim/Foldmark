# Design: Image layout

| Decision                                                                 | Alternative rejected                        | Why                                                                                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Attributes on the image (`{width=… align=…}`)                            | Wrapping the image in `:::align{to=center}` | The block directive centres the whole paragraph; an image's alignment is the image's, and one attribute block is what Pandoc reads.   |
| `%` next to `mm`                                                         | Only mm and a "fit" flag                    | "Half the width" is what people say; the percentage is resolved against the text box at render time, so it survives a profile change. |
| A floating image toolbar in the editor (ProseMirror node view + popover) | A right-click menu                          | Discoverable, touch-friendly, and the same widget serves the dialog.                                                                  |
| Alignment in the renderer is `margin-inline: auto` on a block image      | `text-align` on the paragraph               | Would move the surrounding text too; a block image with auto margins moves only the image.                                            |

## Domain

`directives.ts`: `parseImageAttributes(raw) → { widthMm?, widthPercent?, align? }`;
`IMAGE_ALIGNMENTS = ['left', 'center', 'right']`. `remarkPipeline.ts` extends `IMAGE_ATTRIBUTES` to
a general `{key=value …}` reader (quoted or bare values). `mdastAdapter.ts` puts `widthPercent` and
`align` on the `image` inline token; `serializeImageAttributes` writes them back in a fixed order
(`width`, then `align`).

## Rendering

`SafeInline.ts`: `<img class="md-image md-image-align-center" style="width: 50%">` (mm stays
`60mm`). `print.css`: `.md-image { display: block; max-width: 100% }`,
`-align-center { margin-inline: auto }`, `-align-right { margin-left: auto }`. `textMetrics.ts`:
width = `widthPercent ? box * pct / 100 : min(widthMm, box)`.

## Editor

`imageNode` attrs gain `widthPercent: number` (0 = none) and `align: string`. `toDOM` writes
`data-align` and the class; `toMarkdown` writes the attribute block. `ImageToolbar.vue` mounts in
`RichTextEditor.vue` when `selectionState().image` is set (new field: the selected image's
attributes) and dispatches `setImageLayoutCommand`. `ImageDialog.vue` adds the alignment radio and
the width mode.
