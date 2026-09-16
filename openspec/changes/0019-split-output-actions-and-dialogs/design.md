# Design: Output actions and dialogs

| Decision                                       | Alternative rejected                | Why                                                                                                |
| ---------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| One `AppDialog` wrapper over native `<dialog>` | A custom overlay component          | The native element owns modality, Escape and focus trapping; the wrapper adds the standard on top. |
| Backdrop click closes only when `dismissible`  | Always close on backdrop            | A delete confirmation dismissed by a stray click is how a user loses track of what happened.       |
| Recipient email from the contact first         | Separate mail block in the document | Testing asked to drop the separate block; `emailTo` stays as the override and the file-format key. |
| Errors only for technically impossible output  | Keep recipient as an error          | An address-less letter prints fine on paper; the profile geometry not rendering does not.          |

## Structure

```
WorkspaceBar
├── [Check ✓0 ⚠2 ⓘ3] → DocumentCheckDialog
├── [Print]  → PrintDialog  (profile, marks, page numbers, scaling note)
├── [Export] → ExportDialog (PDF → print with hint, Markdown download)
└── [Email]  → EmailDialog  (PDF attachment, HTML, plain text; mailto / copy / .eml)
```

`AppDialog` props: `open`, `title`, `dismissible` (default true), `size` (`sm|md|lg`), emits
`close`. It records `document.activeElement` when opened and focuses it back on close.
