# Shared contact channels

LumbreCode uses shared mailboxes instead of app-specific addresses:

| Purpose          | Address                  |
| ---------------- | ------------------------ |
| General contact  | `contact@lumbrecode.de`  |
| Support          | `support@lumbrecode.de`  |
| Product feedback | `feedback@lumbrecode.de` |
| Bug reports      | `bugs@lumbrecode.de`     |
| Privacy          | `privacy@lumbrecode.de`  |
| Security         | `security@lumbrecode.de` |

`legal@lumbrecode.de` may be introduced later or forwarded to the general contact mailbox. Do not
create app-specific mailboxes by default. App context belongs in an English subject:

- `[LumbreCodeToDo] Support request`
- `[LumbreCodeToDo] Bug report`
- `[LumbreCodeToDo] Feature request`
- `[LumbreCodeToDo] Privacy question`

Browser code reconstructs an address from reversible configuration only after a contact link is
used. This is a fast anti-scraping transformation, not encryption; mailbox-side spam protection is
still required.
