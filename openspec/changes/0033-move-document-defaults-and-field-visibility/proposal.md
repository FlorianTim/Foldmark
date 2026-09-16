# Proposal: Colours and font size out of the document pane; field visibility; contact snapshots

Status: Implemented (2026-09-16). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A3, A4,
A11, A12. Roadmap R14-009…R14-012. Priority P1.

## Scope

- **Semantic colours → Settings (A3).** The alias selects (success, warning, danger, info, muted,
  highlight) leave the document pane's Advanced group. Settings → Colours (a category that exists in
  R13-032 as a note) holds them as global document defaults; a new document copies them into its
  theme deviations only when they differ from the built-in palette. A document that already carries
  aliases keeps them; nothing rewrites stored documents.
- **Font size (A4).** Already outside the letter metadata since change 0021 (Document font theme
  group). This change adds Format → "Document font…" which opens that group and focuses the size
  field, and confirms in the spec that no size control sits among subject, addresses or letter
  details. The `:small[…]` mark stays the only local size.
- **Field visibility (A11).** Confirmed as built for category 1 (reference, phone: empty → not
  rendered, no switch) and category 2 (subject, date: switches). Category 3 is made explicit: the
  sender/recipient accordions are editing surfaces; folding them never changes the plan. A unit test
  guards it (the plan of a folded and an unfolded document is identical).
- **Contact snapshots (A12).** The recipient records `recipientContactId` (the address it was picked
  from), as the sender does. Unfolded, both groups show "Changed against the contact directory" when
  the snapshot differs from the source, and a "Reset from contact" action that copies the source
  again and discards local edits. Folded, both show the one-line summary and the contact-directory
  button. The sender's existing "refresh" becomes this action.

## Acceptance

- The document pane has no colour selects; Settings → Colours has six; a new document created after
  changing "warning" to orange prints `:warning[…]` orange; an old document with its own aliases
  prints as before.
- Format → Document font… opens the theme group with the size field focused.
- Folding Sender or Recipient changes nothing in the preview.
- Pick a contact, edit the street, see "changed"; Reset restores the street; the directory entry is
  untouched.
