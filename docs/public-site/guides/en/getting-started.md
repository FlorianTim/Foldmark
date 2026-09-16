---
id: getting-started
locale: en
title: Guide
order: 10
---

# Guide

Foldmark is a local editor for letters, postcards and cards. You write the content once and render
it onto the sheet it is actually going on. Everything stays in this browser.

## Orientation

- **Documents** — your letters, cards and free documents, in folders and with an archive. Start
  here.
- **Contact directory** — people and organisations with all their addresses and contact details;
  recipients and senders come from here.
- **Print profiles** — the paper geometry: size, margins, regions and helper marks.
- **Images** — logos, photographs, letterheads and signature images.
- **Settings** — in categories: language, document defaults, appearance, fonts, storage, privacy,
  data & backup.

## Writing your first letter

1. **Documents → New letter.**
2. Fill in recipient, subject and date on the left.
3. Write the body in Markdown below them.
4. The middle pane shows the sheet to scale — with its fold and punch marks.
5. The right pane, under **Checks**, lists what is still missing.
6. **Save**, then **Output → Print**.

{{screenshot:04-workspace}}

### Formatting beyond Markdown

The toolbar offers what a letter needs and Markdown lacks: a **colour** by name (every colour has a
print value that stays legible on paper), highlight, underline, small print, super- and subscript,
an indent, an alignment, a note box, a signature line and a **page break**. A picture comes from the
image library; click it and a small strip appears: align left, centre or right, 25/50/75 % of the
text width or the full width, smaller and larger, original size. In the file all of it is plain text
— `:red[word]`, `:::note{type="warning"}`, `::page-break`,
`![Logo](asset:…){width=50% align=center}` — so the document stays readable anywhere; a spelling
Foldmark does not know is kept as it is and shown as its text. **Clear formatting** (`Tx`, `Ctrl+\`)
takes every character format off a selection again.

Menu, toolbar and keyboard shortcuts do the same thing. Whatever has no place right now — bold with
no text field active, say — is greyed out in the menu; with the cursor in the subject, **Format →
Bold** makes the whole subject line bold or regular.

### Templates

A letter you write like this often? **File → Save as template …** remembers print profile, language,
font and colours, page numbers, salutation, closing and signer — the sender, the body and the
subject if you like. Recipient and date stay with the letter. Your templates are under **Documents
→ + New**; a new document from one is independent of the template afterwards. **Manage templates …**
renames and deletes. The first template is free; further ones are premium and free during the test
phase — the app says so right there, nothing more.

### Keyboard shortcuts

**Help → Keyboard shortcuts** lists them for your system. The main ones: `Ctrl+S` save, `Ctrl+P`
print, `Ctrl+B` / `Ctrl+I` / `Ctrl+U` bold, italic, underline, `Ctrl+K` link, `Ctrl+Enter` page
break, `Ctrl+\` clear formatting, `Ctrl+Alt+1` to `6` headings, `Ctrl+Alt+0` paragraph. On a Mac ⌘
stands for Ctrl. The browser's own keys — new tab, close window, find — stay the browser's.

Under **Document → Document theme** you choose the paper's typeface, size and spacing. That theme
travels with the document and is independent of the app's own appearance.

### The three levels of check

- **Error** — this output cannot be produced.
- **Warning** — it can, and will probably be wrong on paper.
- **Note** — worth knowing, nothing to do.

Checks depend on the **target**. A letter with no postal address is an error when printing and
perfectly fine as a Markdown export.

## Scale: the thing that matters most

The preview is to scale in millimetres. **Zooming does not change the output** — zoom is display
size and nothing else.

What does change the output is the print dialog:

> Set scaling to **100 %**, not "fit to page". Enable background graphics so images are printed.

Foldmark says this on every print, because it is the one step the application cannot do for you.

## Print profiles

A print profile describes the paper, not the content. That is why the same letter can go onto a DIN
A4 letter profile, onto A4 blank or onto US Letter without being rewritten.

Fourteen profiles ship with the app, in four groups — Letters (DIN A4 letter Form B and Form A, A4
blank, A4 with letterhead, A5 letter, US Letter), Cards (A6 landscape postcard, A5 card, A6 card),
Photos (10 × 15, 13 × 18 and 15 × 20 cm) and Other (DL envelope, A7 index card). Under **Print
profiles** every marker is listed with its coordinate in millimetres; that is the number you can
check with a ruler.

{{screenshot:05-profiles}}

Built-in profiles are immutable and cannot be deleted. **Create a copy** gives you one of your own,
which you can rename, whose margins you can set in millimetres, and which you can delete again.

### About the DIN profiles

The DIN A4 letter profiles use commonly cited working values that have **not** been checked against
a licensed copy of the current standard; the profile says so itself. If you need conformance, verify
the measurements first.

## Postcards

A postcard has two sides, and so does the editor: **Front** with an image and a caption, **Back**
with the message, the address and the stamp area. The export produces exactly two pages. When
printing double-sided, flip on the **short** edge.

## Email

Foldmark **prepares and hands over** — nothing is sent. Four ways: text, restricted HTML, a PDF
attachment (through the print dialog) and an .eml file.

Fold, punch and cut marks are off by default for email PDFs. Nobody folds an attachment.

## Your data

Everything lives in this browser. Under **Settings → Privacy and data** you can see what is stored —
counted, not estimated — and export all of it, import it back, or delete it.

{{screenshot:03-privacy}}

The two deletions are deliberately separate: **Delete my local data** clears content and keeps
preferences; **Reset settings** does the opposite.

### Importing contacts

The contact directory reads **vCard files** (`.vcf`, from a phone or Outlook, say) and **CSV
exports** from Google Contacts — through **Import contacts** or by dropping the file on the
directory. Before anything is stored you see what was recognised: new, probably existing (same
e-mail, phone number or identifier, same name with postal code) and needs review (only the name
matches). Per row you decide: skip, merge or import as new. Merging only adds what is missing —
addresses, e-mails, phone numbers — and never overwrites.

## File format

Markdown with YAML front matter — readable without Foldmark. Export a document through **Output →
Markdown**; import one under **Documents → Import Markdown** or by dropping the file on the document
list; before anything is stored Foldmark shows what it will become — title, kind, print profile,
unknown fields, missing images. The header uses Pandoc's names where they mean the same thing and
carries the page size, so `pandoc letter.md -o letter.pdf` lays out the same sheet; a header written
for Pandoc opens in Foldmark without losing its keys.

If a file cannot be read you get the reason with its line number and your original text back.
Nothing is lost.
