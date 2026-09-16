# Design: Editor toolbar

| Decision                                                     | Alternative rejected                | Why                                                                                      |
| ------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------- |
| Source-mode commands are text transforms                     | Disable the whole toolbar in source | The feedback asks for one toolbar; wrapping `**` around a selection is cheap and honest. |
| Context flags reported by the port                           | Toolbar inspects the DOM            | The port is the only place that knows the ProseMirror schema.                            |
| Popovers are `AppPopover` (non-modal, Escape, click outside) | Native `popover` attribute          | Needs `style-src` freedom and anchor positioning that Firefox lacks at the time.         |

`EditorSelectionState` gains `inTable`, `inList`, `heading: 0..6`. `EditorCommand` gains
`heading4…6`, `highlightColor`, `tableSize` (argument `{{ rows, cols }}`), `linkWithText` (argument
`{{ href, text }}`).
