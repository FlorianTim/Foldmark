# Proposal: Three output actions, a document check, and one dialog standard

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §46, §49–§54, §56,
Phase B 1–2. Roadmap R13-009…R13-012.

## Motivation

1.0 bundled print, export and email into one tabbed output dialog whose findings panel blocked the
primary button on any error — so a letter without a recipient could not be printed, and an empty
sheet could not be run through the printer to check the marks. Testing asked for three separate
actions with their own dialogs, a document check that informs but never blocks, and one behaviour
for every dialog in the app.

## Scope

- **Three actions** in the workspace bar: Print, Export, Email, each with an icon and its own dialog
  (`PrintDialog`, `ExportDialog`, `EmailDialog`). `OutputDialog.vue` is replaced.
- **Print dialog**: profile (read-only name), marks on/off, page numbers summary, the 100 % scaling
  reminder, Cancel / Print. No address check. The Chrome fix from 0018 lives here.
- **Export dialog**: PDF (opens the print dialog with the PDF hint, since the browser makes the PDF)
  and Markdown; later ODT and backup are listed as coming.
- **Email dialog**: PDF attachment (instructions + print), HTML mail, plain-text mail; recipient
  from the recipient contact's primary email when present, otherwise the document's `emailTo`; a
  missing address is a warning and the mail client still opens.
- **Document check** (`DocumentCheckDialog` + badge in the bar): errors / warnings / notes; only
  technically impossible output is an error. `validateForTarget` downgrades
  `document.recipientRequired` to a warning for print/PDF.
- **Dialog standard** (`AppDialog.vue`): native `<dialog>`, centred, title, close button, Escape,
  backdrop click closes when `dismissible`, focus returns to the trigger, `role="dialog"` with
  `aria-labelledby`; sheet on phones. Used by print, export, email, check, history, contact, delete,
  image, link, table, colour.
- **Preview**: a quick Print button and a Maximize button (the maximize behaviour is part of 0020).

## Acceptance

AC-OUT-001…005, AC-PRINT-003…005 from the source. Component tests for the four dialogs; e2e: print
without recipient, email without address, backdrop close.
