# Proposal: Editor convenience commands

Status: Implemented (1.1)

## Motivation

Letters repeat the same small acts: today's date, a salutation, a closing. Each should be one click
or one shortcut.

## Scope

- Toolbar commands: date today, pick a date, salutation, closing, table.
- Dates are stored as ISO 8601 in the document and shown in the document locale.
- Salutation and closing come from a small local list per locale and from the document's metadata
  fields.

## Later

Page break, text blocks (1.2).

## Acceptance

- Inserted date renders in the preview in the document locale; the Markdown holds ISO 8601.
