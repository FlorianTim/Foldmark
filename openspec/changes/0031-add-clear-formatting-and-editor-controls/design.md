# Design: Clear formatting, mode switch, control size

| Decision                                                            | Alternative rejected                         | Why                                                                                                                       |
| ------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| One ProseMirror command that removes every mark type in a range     | Toggle each mark off through its own command | Toggling depends on the current state per mark; `tr.removeMark(from, to)` without a type removes all in one transaction.  |
| The source-view variant strips syntax with the inline tokenizer     | Regex over `**`, `*`, `:x[`                  | The domain parser already knows which spans are marks; re-emitting plain text from the tokens cannot mis-strip a literal. |
| `role="switch"` with `aria-checked`, not two `aria-pressed` buttons | A `<select>`                                 | A switch is the control the feedback draws; two states, one control, native keyboard semantics.                           |
| Sizes as CSS custom properties (`--fm-control`, `--fm-icon`)        | Per-button classes                           | The workspace bar, the toolbar and the preview controls share the same tokens; one number changes the app.                |

## Clear formatting in the editor

`clearFormattingCommand` (`foldmarkSyntax.ts`): for a non-empty selection `tr.removeMark(from, to)`
(all marks) plus `tr.setStoredMarks([])`; for an empty selection it clears the stored marks so the
next typed character is plain. The port exposes `run('clearFormatting')`; `EditorCommand` gains the
id.

Source view: `MarkdownEditor.stripMarks()` runs the selected text through `parseInline` (domain) and
writes back `inlineText(tokens)` — links keep their text and address as `text (url)` is _not_ wanted
here, so a link stays a link (a link is not a character mark).

## Mode switch

`EditorModeSwitch.vue`: `<button role="switch" aria-checked="…">` with two `<span>` labels and a
thumb; `aria-label` "Editor view"; `data-testid="view-switch"`. The e2e helpers that clicked
`view-visual` / `view-source` change to the switch.

Round-trip warning: after `loadMarkdown` the adapter's `getMarkdown()` is compared with the
normalised source; a difference sets `roundTripChanged`, shown as a quiet line above the editor
("The visual editor normalised the Markdown; the source view shows the result.").

## Control size

`foldmark.css`: `--fm-control: 2.375rem` (38 px), `--fm-icon: 1.25rem` (20 px), `--fm-gap: 0.25rem`.
`.rich-toolbar .btn-square`, `.workspace-actions .btn`, `.preview-controls .btn` read them;
`AppIcon` gets `size="md"` = `--fm-icon`. Below 640 px the toolbar wraps rather than shrinks.
