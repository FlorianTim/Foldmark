# Design: Find and replace

| Decision                                                              | Alternative rejected                      | Why                                                                                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| One matcher in the domain (`textSearch.ts`) for both views            | ProseMirror search plugin + textarea code | The same query must find the same things in both views; the domain function is unit-tested once and the two editors only map offsets.                        |
| Per-text-block search with a one-character stand-in for inline leaves | Search `doc.textContent`                  | Text-block offsets map onto positions by adding the block's content start, so a match spanning marks is found and an image is never half-replaced.           |
| Highlight decoration for the current match                            | Rely on the editor's selection            | The selection is not drawn while the find bar has the keyboard focus; a decoration is, and it follows edits through the mapping.                             |
| Replace = replace the selected match, then step; Replace all = one tr | Replace the first match                   | What is replaced is what is marked; one transaction for Replace all is one undo step.                                                                        |
| `Ctrl+H` inside editing surfaces                                      | `Ctrl+F`, or no shortcut                  | The registry keeps browser keys (`Ctrl+F` is the page find); `Ctrl+H` is the replace key of word processors and is caught only in the editor, like `Ctrl+U`. |
| A bar, not a dialog                                                   | A modal dialog                            | Searching is done while looking at the text; a modal hides it and takes the focus away from the match.                                                       |

## Domain

`textSearch.ts`: `TextSearchOptions`, `TextMatch`, `SEARCH_QUERY_MAX_LENGTH`, `findInText`,
`nextMatchIndex`, `selectedMatchIndex`, `replaceMatches`.

## Application

`RichTextEditorPort`: `countMatches`, `selectMatch`, `replaceMatch`, `replaceAllMatches`,
`clearMatchHighlight`.

## Infrastructure

`MilkdownEditorAdapter`: `collectMatches` (per text block), the four port methods with
`TextSelection` and `insertText`, the `findHighlight` `$prose` plugin (`PluginKey`, inline
decoration `.find-match`, mapped through changes, cleared by meta `null`).

## Presentation

`FindReplaceBar.vue` (query, replacement, options, counter, buttons,
`Enter`/`Shift+Enter`/`Escape`); `RichTextEditor` (`openFind`/`closeFind`, `findText`,
`replaceText`, `replaceAllText`, command `find`); `MarkdownEditor` (`findMatch`, `replaceMatch`,
`replaceAllMatches`, `countMatches` on the textarea); the Edit menu entry and the `find` shortcut in
the registry. i18n de/en `editor.find`, `shortcuts.find`; styles `.find-bar*`, `.find-match`.
