# Proposal: Own document templates

Status: Implemented (2026-09-17). Source:
`drafts/notes/versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil C, C17 (core
feature) and C10–C12 (feature gating in beta-free mode); owner decision 2026-09-16 ("Eigene
Dokumentvorlagen" as the next feature). Roadmap R15-009, R15-007 (first use). Priority P1.

## Scope

- **A template is a document snapshot without the parts that belong to one letter.** Saved from an
  open document through File → "Save as template…": name, description, and what to take along — the
  sender (default on), the body text (on), the subject (off). Always taken: kind, print profile,
  document language, print options (theme, colours, page numbers, date format, subject weight),
  export preferences, salutation, closing, signer, signature, e-mail hand-off address, tags,
  letterhead placements. Never taken: recipient, date, folder, archive state, history.
- **New from a template.** The file manager's "+ New" menu lists the templates after the kinds (up
  to eight, then "Manage templates…"); a new document gets today's date for a letter, the kind's
  usual starting title, and lands in the current folder. A "Templates" dialog lists every template
  with kind, profile and date, and offers use, rename/describe and delete.
- **Storage.** Own Dexie table `templates` (database version 5); part of the backup (`templates`,
  absent in older backups), of the inventory and of Data & backup (own deletion "templates";
  "everything" includes them). Bound: 200 templates.
- **Premium in beta-free mode (C10–C12).** Feature ids `template.custom.save` (free) and
  `template.custom.multiple` (free up to one template; beyond that premium). During the test phase
  the state is `beta-free`: saving a second template works and the dialog says "Premium — free
  during the test phase". The check sits in `TemplateService.saveFromDocument`, not only in the UI;
  a `locked` state would refuse there. No purchase button, no counter manipulation claims.
- **Not in scope:** placeholders/mail-merge fields, a letterhead designer, template packs (R15-010),
  per-folder defaults (R13-033). A template's body is ordinary Markdown.

## Acceptance

- Save "Geschäftsbrief" from a letter with sender, body and theme; "+ New → Geschäftsbrief" opens a
  letter with that sender, body, theme and profile, no recipient, today's date.
- Rename and delete a template in the dialog; the backup carries templates and restores them.
- Saving a second template shows the beta-free note; both templates work.
- A template made from a letter whose profile was deleted since falls back to the kind's default
  profile on use.
