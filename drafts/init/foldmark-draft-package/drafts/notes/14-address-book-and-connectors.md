# Address book and optional connectors

## Local address book

- IndexedDB persistence
- search by person, organization, city, postal code and tags
- sender profiles separate from recipient addresses
- CSV/JSON import and export later
- duplicate detection as warning, not destructive merge

## Google Contacts capability

- disabled by default
- dynamically import only after consent
- minimal People API scopes
- user searches and explicitly imports a contact into the local address book
- no background synchronization in MVP
- record source and import timestamp

## Google Drive capability

- open/save Markdown, PDF and backup packages
- user-initiated actions only
- Authorization Code with PKCE
- no client secret
- minimal scopes and transparent data flow
- transient token storage initially

## Other possible adapters

- browser file picker/download fallback
- File System Access API
- WebDAV or open storage later
- address lookup only with separate consent and provider documentation
