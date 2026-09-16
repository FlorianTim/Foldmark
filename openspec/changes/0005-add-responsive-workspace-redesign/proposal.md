# Proposal: Responsive workspace with Document, Write and Preview modes

Status: Implemented (1.1)

## Motivation

The 1.0 workspace shows input, paper preview and checks/output side by side at all times. On a
laptop the three panes compete for width, the Markdown editor is a narrow column, and the export
controls occupy permanent space that is needed only at the end of the writing process. The feedback
asks for three _modes_ that reflect the work — describing the document, writing it, checking the
paper — rather than three fixed columns.

## Scope

- Three workspace modes: **Document** (type, sender, recipient, contact details, date, subject,
  salutation, closing, page/print options), **Write** (editor), **Preview** (paginated sheets).
- Below the desktop breakpoint the modes are tabs; above it two or three modes may be visible side
  by side. The modes are a semantic split, not a fixed three-column requirement.
- Sender and recipient in Document mode are accordions, open by default, each with an address picker
  (change 0007) and an "Address book" action.
- Contact details (email, phone, …) carry a per-field "show in document" switch.
- Output and export controls leave the workspace and open in a dialog (change 0013).
- The app theme and the printed document theme are declared as separate concerns; the app offers
  system, light, dark, paper, sepia and high contrast, calmer and more document-oriented than a
  developer tool.

## Out of scope

- The rich-text editor itself (change 0010), page numbers (0012), address book (0006).

## Acceptance

- Every 1.0 field and action is reachable in one of the three modes; nothing is lost.
- At 375 px width all three modes are usable as tabs with the preview reachable in one tap.
- At 1440 px and above, Write and Preview can be shown together.
