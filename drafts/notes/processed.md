# Processing log for `drafts/notes/`

One row per note, so it is clear what has been carried into the roadmap, OpenSpec and ADRs and
what still waits. Notes are non-normative input; the specs win.

| Material                                            | Kind     | Processed into                                                                                                                       | Status  |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| `Foldmark_V1.0_Feedback_Redesign_2026-09-11.md` §1–3 | UX       | Roadmap R11-001…R11-004, change 0005                                                                                                 | done |
| … §4                                                | feature  | Roadmap R11-005…R11-009, changes 0006, 0007, ADR 0017                                                                                | done |
| … §5                                                | feature  | Roadmap R10-003/004 (hotfix, change 0004), R11-010…R11-013 (changes 0008, 0009, undo/redo in 0010)                                   | done |
| … §6–9                                              | editor   | Roadmap R11-012, R11-014…R11-016, changes 0010, 0011, ADR 0016                                                                       | done |
| … §10 guides bug                                    | defect   | Roadmap R10-001, change 0002                                                                                                         | done |
| … §10 page numbers                                  | feature  | Roadmap R11-017/018, change 0012                                                                                                     | done |
| … §11                                               | research | Regression list in change 0002 design; render-plan-as-source-of-truth in ADR 0016                                                    | done |
| … §12                                               | UX       | Roadmap R11-002, change 0013                                                                                                         | done |
| … §13                                               | defect   | Roadmap R10-002, change 0003. Version set to 1.0.0; tag follows with the release                                                    | done |
| … §14                                               | design   | Roadmap R11-019, part of change 0005; theme defects R10-005 deferred until the owner asks; the app/document theme split is not yet built | in spec |
| Follow-up question 2026-09-11: PDF metadata and filename | idea | R10-007 implemented (change 0015); R12-005 (own PDF adapter) stays roadmap | done |
| … §15 GitHub connector                              | idea     | Roadmap R12-004                                                                                                                      | in spec |
| … §16–18                                            | plan     | Roadmap sections 1.0.x / 1.1 / 1.2; change numbering 0002–0014; spike DoD in change 0010                                             | done |
| … §19–20                                            | sources  | ADR 0016 (sources are cited there and in change 0010)                                                                                | done |
| `versions/1.2/prompt-editor-ausbau.md` (change 0016)     | plan     | Roadmap R12-006, change 0016, ADR 0011 amended, arc42 §5/§8                                                                          | done    |
| … (change 0017 a–e, g)                              | plan     | Roadmap R11-019 done, R12-002 part 1, R12-007, R12-008; change 0017; ADR 0019; spec `document-formatting.md`; Pandoc header in `document-model.md` | done |
| … (change 0017 f, convention)                       | standard | `docs/template-feedback/2026-09-13-markdown-directive-convention.md`; draft `docs/MARKDOWN_DIRECTIVE_CONVENTION.md` in `lumbrecode-engineering`; `2026-09-13-remark-adapter-as-baseline-module.md` for the web-app template | done |
| `versions/1.0/Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md` §42–44, §47–48, §55, §57, §59, §67–68 (P0) | defect | Roadmap R13-001…R13-008, change 0018 | done |
| … §46, §49–§54, §56 | UX | Roadmap R13-009…R13-012, change 0019 | done |
| … §20–§26, §58, §60–§61 and `versions/1.0/foldmark-icon-redesign-pack/` | UX | Roadmap R13-013…R13-016, change 0020 | done |
| … §28–§36 | UX | Roadmap R13-017…R13-020, change 0021 | done |
| … §37–§41, §64 | editor | Roadmap R13-021, R13-022, change 0022 | done |
| … §27 | feature | Roadmap R13-023, change 0023 | done |
| … §2–§5, §62 | feature | Roadmap R13-024, R13-025, change 0024 | done |
| … §6–§11, §13 | feature | Roadmap R13-026…R13-028, change 0025 | done |
| … §12 | feature | Roadmap R13-029, change 0026 | done |
| … §14–§16 | feature | Roadmap R13-030, R13-031, change 0027 | done |
| … §18–§19 | UX | Roadmap R13-032, change 0028 | done |
| … §3.1, §5, §17, §63, §65, §83 (later) | plan | Roadmap R13-033 (prepared only) | in spec |
| … §79–§82 (tests, migration, accessibility, performance) | quality | Distributed over the changes 0018–0028 (each `tasks.md`); Dexie v4 migration, unit + e2e + screenshot suites green on 2026-09-15 | done |
| `versions/1.0/Foldmark_V1_Korrekturen_Roadmap_Premium_2026-09-16.md` Teil A, A1–A2 (print) | defect | Roadmap R14-001, R14-002, change 0029 | done |
| … Teil A, A5, A9 (menu commands, highlight) | defect | Roadmap R14-003, R14-004, change 0030 | done |
| … Teil A, A6–A8, C8 (clear formatting, switch, control size, tooltips) | editor | Roadmap R14-005…R14-007, R15-005, change 0031 | done |
| … Teil A, A10 (shortcuts) | editor | Roadmap R14-008, change 0032 | done |
| … Teil A, A3, A4, A11, A12 (colours, font size, visibility, snapshots) | UX | Roadmap R14-009…R14-012, change 0033 | done |
| … Teil A, A13 (contact import) | feature | Roadmap R14-013, change 0034 | done |
| … Teil A, A14 (drag-and-drop import) | feature | Roadmap R14-014, change 0035 | done |
| Owner request 2026-09-16: image alignment and size | feature | Roadmap R14-015, change 0036 | done |
| … Teil B | plan | Byte-identical with `Foldmark_V1_Postrelease_Anforderungen_2026-09-13.md`; nothing new | done |
| … Teil C, C1–C7, C28 (package, encryption, share) | research | Roadmap R15-001…R15-004, research change 0037 | in spec |
| … Teil C, C9 (sender onboarding) | idea | Roadmap R15-006 | in spec |
| … Teil C, C10–C16, C24, C25 (premium, licences, commerce) | research | Roadmap R15-007, R15-008, R15-014, research change 0038 | in spec |
| … Teil C, C17–C23 (templates, packs, QR, DOCX/ODT/XLSX, themes) | idea | Roadmap R15-009…R15-013 | in spec |
| … Teil C, C26–C27 (change list, ordering) | plan | Folded into changes 0029–0038 (one folder per topic group, as with 0018–0028); ordering is Phase 1 first | done |
| Owner request 2026-09-16: landscape documents for 1.6 | idea | Roadmap R16-001 (planned only) | in spec |
| `2026-08-24-lumbrecode-engineering-baseline-feedback.md` | feedback | Not reviewed in this pass                                                                                                            | open    |
| `new-feature-ideas.md`                              | inbox    | Contains the template's own 1.1/1.2 ideas, not Foldmark's; kept as the inbox format                                                  | open    |

## Deviations from the feedback, with reasons

| Feedback                                    | Specified                                   | Reason                                                                                                      |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `MarkerVisibility { preview, print, pdf }`  | Existing `preview` / `print` flags          | PDF is a destination of the browser print dialog and shares the print plan; a third flag cannot be enforced. |
| "Lambro Code"                               | LumbreCode                                  | Fixed by the template schema; recorded as the same organization in `drafts/init/processed.md`.             |
| Change names without numbers                | `0002-…` to `0014-…`                        | Matches the existing `0001-foldmark-mvp` convention.                                                        |
| Save status and Save button as hotfixes only | Hotfix change 0004 that 0008/0009 build on | The status vocabulary is shared, so it is fixed once.                                                       |
| `::: page-break` (three colons, with a space) as the leaf form | `::page-break`; the drafted spellings are read | In `remark-directive` an unclosed three-colon fence swallows the rest of the document (verified). |
| Block fences written as `::: name` with a space | `:::name{…}` without a space; `::: name` is read | `remark-directive` parses only the spaceless form; the reader normalises the other.            |
| Pandoc bracketed spans canonical if a maintained extension exists | `remark-directive` inline canonical | The only extension is AGPL-3.0-only and single-maintainer — forbidden by the licence policy (ADR 0019). |
| `visibility: { preview, print, pdf }` (again, §57) | Two switches: preview guides, printed marks | PDF still comes out of the browser print dialog; the print switch covers it (change 0018). |
| `:::foldmark-salutation` / `:::foldmark-closing` | `:::salutation` / `:::closing` | Catalogue names are short shared words without an app prefix (directive convention §1). |
| 36 change folders, one per topic (§84) | 11 changes 0018–0028, one per phase group | One folder per phase keeps proposal, design and tasks coherent; the topics are listed inside. |
| "Lambro Code" in the icon pack | LumbreCode | Same organisation; the pack's `lumbrecode-mark` is used, `lambrocode-*` variants are not copied. |
| Dialog focus trap by hand (§51) | Native `<dialog>` modality | `showModal()` already traps focus and handles Escape; the wrapper adds title, close, backdrop and focus return. |
| "Speichern als Entwurf" in the contact dialog (§13) | Save and cancel only | A contact has no draft state; an unsaved dialog is guarded by the discard confirmation instead. |
| A trailing `::page-break` opens a page (§43, R13-006) | A trailing break opens no page (A2, R14-002) | Teil A of the 2026-09-16 revision wins over Teil B by the owner's rule; a blank sheet gets its own command later. |
| 34 change folders for Teil A and C (C26) | Changes 0029–0038, one per topic group, two of them research | Same reasoning as for 0018–0028; the topics are listed inside each proposal. |
| `Ctrl+F` in the shortcut base set (A10) | Left to the browser | The editor has no find of its own yet (R12-002); hijacking the key would take away the browser's. |
| Demo data in development builds only (§12) | Also in builds made with `VITE_DEMO_DATA=true` | The Playwright build is a production build; the screenshots have to seed the data through the settings, as §12 asks. |
| Settings categories "Farben" and "Datum & Sprache" as their own entries (§18) | Colours as a note under Fonts; date format and document language under Documents | Colours are chosen by name in the editor and printed by the document theme; a category with one sentence would be empty. |
| Per-contact organisation and department at contact level (§7) | On each postal address | The recipient block prints the organisation of the address a letter goes to; a business and a home address of the same person differ exactly there. |
| Custom profile editing of regions and markers (§14) | Name and margins; regions and markers unchanged | A marker editor is the 2.x profile designer; margins are what a copied profile is changed for today. |
| Profile categories "Lernkarte", "Briefumschlag" under "Weitere" (§14) | Category `custom` shown as "Weitere" | The existing category enum stays; the group label is what the reader sees. |
