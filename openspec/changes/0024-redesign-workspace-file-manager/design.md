# Design: File manager

| Decision                                               | Alternative rejected         | Why                                                                                               |
| ------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `folderId` on the document, folders as their own table | Path strings on the document | Rename and move are one write; a path string would touch every descendant.                        |
| `archived: boolean` on documents and folders           | A separate archive table     | Archiving is a flag the list filters on; moving records between tables is how ids get lost.       |
| Size column = body length in characters (shown as kB)  | Bytes of the stored record   | The record size needs a serialisation per row; the body length is the number a writer relates to. |
