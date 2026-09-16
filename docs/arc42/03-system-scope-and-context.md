# System Scope And Context

## Business context

```
        writes, prints, exports
User  ───────────────────────────►  Foldmark (browser)
      ◄───────────────────────────
        sheets, files, prepared messages
```

Foldmark has **no** server-side context. It talks to the browser and, through it, to the user's own
machine and applications.

| Neighbour                                    | Direction | What crosses                            | Trust                                                      |
| -------------------------------------------- | --------- | --------------------------------------- | ---------------------------------------------------------- |
| The person using it                          | both      | Documents, addresses, images, backups   | The owner of the data                                      |
| Browser storage (IndexedDB, localStorage)    | both      | Every stored record                     | Untrusted on read — any script on this origin can write it |
| The print subsystem                          | out       | A rendered sheet, an `@page` size       | Out of Foldmark's control below the dialog                 |
| The file system, via download and file input | both      | `.md`, `.json` backups, images          | Untrusted on input                                         |
| The mail client                              | out       | `mailto:` URL, `.eml` file, copied text | Foldmark hands over; it never sends                        |
| The static host                              | in        | The application bundle                  | Same-origin; no runtime API                                |

## Explicitly outside the system

No account service, no synchronisation, no SMTP, no analytics, no CDN, no address-lookup API. The
capability model exists so any of these could be added later as a consented, lazy-loaded adapter —
and none is shipped.

## Technical context

| Interface         | Technology                                   | Notes                                           |
| ----------------- | -------------------------------------------- | ----------------------------------------------- |
| Persistence       | IndexedDB via Dexie                          | Namespaced by application slug                  |
| Preferences       | localStorage via the settings registry       | Namespaced, enumerable, resettable              |
| Printing          | `window.print()` plus a runtime `@page` rule | Rule written through a constructable stylesheet |
| File input/output | `<input type="file">`, object URLs           | No File System Access API in this version       |
| Mail hand-off     | `mailto:`, `.eml` download, clipboard        | Length-guarded; falls back to copy              |
