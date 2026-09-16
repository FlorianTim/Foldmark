# Proposal: Document settings — accordions, profile first, title/subject sync, letter details, structured salutation and closing, page numbers, font theme

Status: Implemented (2026-09-15). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §28–§36, Phase C.
Roadmap R13-017…R13-020.

## Scope

- **Accordions** for every group: Document, Sender, Recipient, Letter details (open); Page numbers &
  print, Document font theme, Advanced (closed). Open state per group is a UI setting.
- **Document**: profile select first, then title (internal name). Title ↔ subject synchronise once:
  when the title is empty and the subject is first filled, the title becomes the subject, and the
  other way round; afterwards no coupling. The default title of a new letter counts as empty.
- **Sender / Recipient**: collapsed summary (name, first address line, contact icon); expanded:
  contact combobox, full editable snapshot, contact details; action "Contact directory".
- **Letter details**: subject with "show in document" (default on for letters, printed bold), date
  (prefilled with today, can be hidden), reference, salutation and closing as combobox + phrases.
- **Structured salutation/closing** (`:::salutation` / `:::closing` in the catalogue): the fields
  rewrite the body's block (insert at start / end when absent); the editor shows the block as text;
  renderers draw it as a paragraph (closing with space above); plain text contains only the words;
  the toolbar's salutation/closing selects are removed.
- **Page numbers**: formats none, number, page, page-of, `1 / 4` (`slash`), `1 of 4` (`of`).
- **Font theme**: family, base size, line height, paragraph spacing in a responsive grid; small size
  and semantic colours move to Advanced.
- **Email**: no separate mail block; `emailTo` moves to Advanced as an override.

## Acceptance

AC-DOC-001…007. Unit tests: title/subject sync (`documentSync.ts`), salutation block rewrite
(`letterBlocks.ts`), page-number formats; roundtrip fixtures for the two directives; e2e: fill the
subject, see the title follow once.
