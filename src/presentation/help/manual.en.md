<!-- Generated from docs/public-site/. Do not edit directly. -->

# Guide

Foldmark is a local editor for letters, postcards and cards. You write the content once and render
it onto the sheet it is actually going on. Everything stays in this browser.

## Orientation

- **Documents** — your letters, cards and free documents, in folders and with an archive. Start
  here.
- **Contact directory** — people and organisations with all their addresses and contact details;
  recipients and senders come from here.
- **Print profiles** — the paper geometry: size, margins, regions and helper marks.
- **Images** — logos, photographs, letterheads and signature images; a signature can also be drawn
  there with a pen, a finger or the mouse — it is cropped to the ink and stored with a transparent
  background.
- **Settings** — in categories: language, document defaults, appearance, fonts, storage, privacy,
  data & backup.

## Writing your first letter

On first start Foldmark asks once whether you want to store your sender details. **Set up now**
opens the contact form as a sender; the contact becomes the primary sender every new letter starts
with. **Later** asks again on the next start, **Don't ask again** never. No e-mail address is needed
for this.

1. **Documents → New letter.**
2. Fill in recipient, subject and date on the left.
3. Write the body in Markdown below them.
4. The middle pane shows the sheet to scale — with its fold and punch marks.
5. The right pane, under **Checks**, lists what is still missing.
6. **Save**, then **Output → Print**.

The workspace with document settings, writing area and paper preview

### Formatting beyond Markdown

The toolbar offers what a letter needs and Markdown lacks: a **colour** by name (every colour has a
print value that stays legible on paper), highlight, underline, small print, super- and subscript,
an indent, an alignment, a note box, a signature line and a **page break**. A picture comes from the
image library; click it and a small strip appears: align left, centre or right, 25/50/75 % of the
text width or the full width, smaller and larger, original size. In the file all of it is plain text
— `:red[word]`, `:::note{type="warning"}`, `::page-break`,
`![Logo](asset:…){width=50% align=center}` — so the document stays readable anywhere; a spelling
Foldmark does not know is kept as it is and shown as its text. **Clear formatting** (`Tx`, `Ctrl+\`)
takes every character format off a selection again. **Edit → Find and replace** (`Ctrl+H` in the
writing area) shows a bar above the text: previous and next match, match case, whole word, Replace
and Replace all — in the visual view and in the Markdown alike.

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

### QR codes

**Insert → QR code** (or the toolbar icon) puts a QR code into the text: a web address, an e-mail
address with a subject, a phone number or a line of text. You choose the size in millimetres — the
white quiet zone is part of it — and the alignment; the preview shows the code as it prints and
warns when the modules get too small for a printer. The file holds only the text, such as
`::qr[https://example.org]{size=40mm align=center}`; the code is generated from it whenever it is
shown and never leaves the browser. A click on the code shows the alignment and **Edit …**. Five
codes are free; further ones are premium and free during the test phase.

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

Seventeen profiles ship with the app, in four groups — Letters (DIN A4 letter Form B and Form A, A4
blank, A4 with letterhead, A5 letter, US Letter, plus A4, A5 and US Letter landscape), Cards (A6
landscape postcard, A5 card, A6 card), Photos (10 × 15, 13 × 18 and 15 × 20 cm) and Other (DL
envelope, A7 index card). Under **Print profiles** every marker is listed with its coordinate in
millimetres; that is the number you can check with a ruler.

A print profile with every marker coordinate in millimetres

Built-in profiles are immutable and cannot be deleted. **Create a copy** gives you one of your own,
which you can rename, whose margins you can set in millimetres, which you can turn to landscape, and
which you can delete again. Turning swaps width and height and leaves margins and marks where they
are; if a mark would no longer fit the sheet, the orientation stays locked — turn a copy of a blank
profile instead.

The **helper marks** of your own copy are edited by number: kind, label, x and y in millimetres,
length and direction (width and height for an area), line, stroke, printed or preview-only. **Add
mark** starts a new one at the left edge halfway down, the arrows reorder, the bin removes. What the
checks have to say about the list appears below it while you type; **Save marks** waits until no
mark lies outside the sheet.

### Calibration sheet

Whether a fold mark really lands at 105 mm is up to your printer. **Print calibration sheet** under
the selected profile prints known distances on exactly that paper: a frame 10 mm from every edge,
ticks every 10 mm, a cross at the centre of the sheet and the profile's marks where a letter prints
them. Print at 100 % (not "fit to page") and measure with a ruler: the distance from the paper edge
to the frame is your printer's offset, the size of the frame shows a scale error. Both are set in
the printer driver.

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

Privacy and data, showing the inventory, the backup and the danger zone

The two deletions are deliberately separate: **Delete my local data** clears content and keeps
preferences; **Reset settings** does the opposite.

### Importing contacts

The contact directory reads **vCard files** (`.vcf`, from a phone or Outlook, say) and **CSV
exports** from Google Contacts — through **Import contacts** or by dropping the file on the
directory. Before anything is stored you see what was recognised: new, probably existing (same
e-mail, phone number or identifier, same name with postal code) and needs review (only the name
matches). Per row you decide: skip, merge or import as new. Merging only adds what is missing —
addresses, e-mails, phone numbers — and never overwrites.

### Exporting contacts

**Export** in the contact directory writes the whole directory as a **vCard** file (`.vcf`, for a
phone, Outlook or Apple Contacts) or as a **CSV** in Google Contacts columns. What travels is who
the person is — names, organisation, every address, e-mail, phone number, website, notes and tags.
Roles such as "sender" or "favourite" stay in Foldmark. Import the file later and Foldmark
recognises every entry instead of doubling it.

## File format

Markdown with YAML front matter — readable without Foldmark. Export a document through **Output →
Markdown**; import one under **Documents → Import Markdown** or by dropping the file on the document
list; before anything is stored Foldmark shows what it will become — title, kind, print profile,
unknown fields, missing images. The header uses Pandoc's names where they mean the same thing and
carries the page size, so `pandoc letter.md -o letter.pdf` lays out the same sheet; a header written
for Pandoc opens in Foldmark without losing its keys.

If a file cannot be read you get the reason with its line number and your original text back.
Nothing is lost.
