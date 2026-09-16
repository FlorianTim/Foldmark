# Design: Responsive workspace

## Structure

```
WorkspacePanel
├── WorkspaceModeBar        tabs / segmented control: Document | Write | Preview
├── DocumentMode            MetadataForm split into sections + address accordions
├── WriteMode               editor host (0010) + toolbar
└── PreviewMode             PaperPreview, pagination, guides, page numbers
```

The mode is presentation state (Pinia workspace store, persisted as a UI preference), never part of
the document. Layout above the desktop breakpoint is decided by a CSS container query on the
workspace, with a user preference for "two panes" vs. "three panes".

## Decisions

| Decision                                    | Alternative rejected | Why                                                                                                 |
| ------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| Modes as tabs, columns only on wide screens | Always three columns | Three columns at 1280 px give the editor ~400 px; the feedback names this as the main pain.         |
| Accordions open by default                  | Collapsed by default | Sender and recipient are the first thing a letter needs; hiding them costs a click every time.      |
| Document theme separate from app theme      | One theme for both   | A dark app must not print a dark letter. The printed theme belongs to the print profile family.     |
| Contact visibility per field on the address | Per document         | "Show my phone number" is a property of how the address is used, and it survives into the snapshot. |

## Open questions

- Whether "two panes" should be Document+Write or Write+Preview by default — decided by usability
  testing with the 1.1 preview build.
