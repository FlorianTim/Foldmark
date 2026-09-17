# Tasks: Document types

- [ ] `DocumentType.ts` catalogue with descriptors, `visibleDetails`, `hiddenOnSwitch`,
      `stripPerDocument`; unit tests including catalogue integrity.
- [ ] `finance/iban.ts` (normalise, mod-97, format, BIC) with tests.
- [ ] `qr/epcPayload.ts` composer with fixtures against a published GiroCode sample.
- [ ] Document model and schema: `type`, `details`, `detailsHidden`; template model; codec
      read/write with reports; round-trip tests.
- [ ] Contact model: `bankAccounts`, schema, normalisation, contact dialog group; vCard/CSV
      untouched (test proves it); backup and privacy inventory.
- [ ] `::pay` directive in the catalogue, `directives.ts`, editor node view, preview and print
      renderers, quota; `document-formatting.md` entry.
- [ ] Render plan: info-block entries and the no-info-block fallback; e-mail renderer lines.
- [ ] "+ New → Letter as…", Type select with the switch confirmation, `DetailsGroup.vue`, Insert
      menu and toolbar entries, i18n de/en.
- [ ] e2e journey; specs `document-model.md`, `app-shell.md`, `render-and-print.md`; roadmap
      R17-001…R17-006; feature log; changelog; help guide.
