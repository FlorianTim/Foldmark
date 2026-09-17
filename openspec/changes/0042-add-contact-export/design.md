# Design: Contact export

| Decision                                                                             | Alternative rejected                   | Why                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Writers in the domain (`src/domain/address/export/contactExport.ts`)                 | A use case with an infrastructure port | Serialising a record into a text format is pure and synchronous; the import's parsers already live in the domain under the same rule; the download is presentation. |
| The stored `Address`, not the snapshot or the projection                             | Export what a letter prints            | The directory is being handed over, and a directory holds every address of a person, not the one a letter used.                                                     |
| The contact id as `UID` under a URN prefix                                           | A fresh UUID, or no UID                | RFC 6350 wants a URI; a stable id lets the import recognise a file that came from this directory (`matchSignal` compares the prefix-stripped id).                   |
| Google Contacts column spelling                                                      | Own column names, or Outlook's         | The import already reads Google's names; a Google-shaped file also imports into Google, Apple and most others without a mapping step.                               |
| As many address / e-mail / phone / website column groups as the widest contact needs | Always one, or always eight            | One would lose data; eight would make a 60-column file for a directory of neighbours. The header is stable for a given directory either way.                        |
| Formula guard by a leading space                                                     | A leading apostrophe                   | The apostrophe survives the round trip as data (`'+49 …`); the space is trimmed by every reader, including Foldmark's.                                              |
| `custom` labels as `LABEL="…"`, home/office as `TYPE`                                | Drop labels that are not home/work     | A label is what the person calls the address; vCard 4.0 has a parameter for it, and the import reads `TYPE` back into `Privat`/`Büro`.                              |

## Domain

`contactExport.ts`: `ContactExportFormat`, `CONTACT_EXPORT_FORMATS`, `CONTACT_EXPORT_FILE`,
`serializeVCard`, `serializeVCards`, `serializeContactCsv`, `serializeContacts`, `contactIdFromUid`.
`contactReview.matchSignal` treats a UID that names an existing entry as the `external-id` signal.

## Presentation

`AddressBookPanel`: an `AppMenu` "Export" with the two formats, `downloadText` with the format's
media type, filename `<addresses.export.filename>-<YYYY-MM-DD>.<ext>`. i18n de/en under
`addresses.export`.
