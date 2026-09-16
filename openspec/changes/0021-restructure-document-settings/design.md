# Design: Document settings

| Decision                                                  | Alternative rejected                     | Why                                                                                                        |
| --------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `:::salutation` / `:::closing` container directives       | `:::foldmark-salutation` (draft)         | The catalogue names are short English words shared by every LumbreCode app (convention §1); no app prefix. |
| Body block is the truth, metadata mirrors it              | Metadata only, renderer injects the text | The feedback wants the words visible in the editor as normal text and the marker only in the source.       |
| One-time sync tracked by "was the field ever set by hand" | Compare current values                   | A user who clears the title after editing must not get it refilled; the flag lives in the workspace store. |
| Subject visibility on `printOptions.subject.show`         | A metadata flag                          | Whether a field prints is a print option, like page numbers.                                               |

## Salutation block rewrite

`replaceLetterBlock(body, 'salutation', text)`: parses the body, finds the top-level
`containerDirective` named `salutation`, replaces its source range with the new block (or removes it
when the text is empty); when absent, prepends it (closing: appends). Pure text function in
`src/domain/markdown/letterBlocks.ts`, tested on fixtures.
