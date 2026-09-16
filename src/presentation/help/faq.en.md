<!-- Generated from docs/public-site/. Do not edit directly. -->

# Printing and measurements

## My fold mark is in the wrong place. Why?

Almost always printer scaling. Foldmark lays the page out in real millimetres; if the print
dialog is set to "fit to page", everything shifts by a few per cent. Set scaling to 100 %
and print again.

If it is still wrong, it is your printer's margin offset. Print a page with the marks
enabled and measure from the top edge of the paper to the first fold mark: on Form B it
should be 105 mm.

## Does zooming the preview change what prints?

No — and that is not a promise taken on trust. The preview draws the sheet in CSS
millimetres and zoom is a display transform on a parent element. A transform does not
change layout, so the coordinates stay identical. The application's tests assert exactly
this.

## Does Foldmark generate PDFs?

Not itself. "Save as PDF" is a destination in your browser's print dialog, and that is
where Foldmark takes you. The upside: the PDF is produced by the same engine that prints,
so the two cannot differ. Foldmark does not promise PDF fidelity it does not control.

## Are the DIN profiles standard-conformant?

No — and Foldmark does not claim they are. The "DIN A4 letter – Form A/B" profiles use
commonly cited working values: Form B folds at 105 mm and 210 mm, Form A at 87 mm and
192 mm, both punched at 148.5 mm.

Those values have **not** been checked against a licensed copy of the current standard. The
app says so in the profile view and on every print. If you need conformance, verify the
measurements against the standard before you seal the envelope.

## How do I print a postcard on both sides?

The postcard profile produces exactly two pages: page 1 is the front, page 2 the back.
Print double-sided and flip on the **short** edge — a landscape card flipped on the long
edge comes out upside down. The output panel states the flip edge for every duplex profile.

# Your data

## Where is my data stored?

In this browser: IndexedDB for documents, addresses, senders, your own profiles and images;
local storage for preferences. There is no account, no server and no background upload.
Foldmark makes no external request at all.

## Does the application work offline?

Yes. Once loaded, Foldmark works entirely locally. This guide and these questions are
bundled into the app.

## What happens when I delete my data?

There are two separate actions, because they do different things:

- **Delete my local data** removes documents, addresses, senders, your own profiles and
  images. Preferences stay.
- **Reset settings** removes language, theme and defaults. Content stays.

Both are permanent. Export a backup first.

## How do I back everything up?

Under "Privacy and data" → **Export all data**. You get one JSON file containing everything:
documents, addresses, senders, your own print profiles, images and preferences. The same
file can be imported there again.

Individual documents also export as Markdown, readable without Foldmark.

## Is a stored signature legally binding?

No. A signature image is a picture of a signature. It is not a qualified electronic
signature and carries no cryptographic meaning.

# Documents and formats

## What format does Foldmark store a document in?

Markdown with YAML front matter. Your letters stay readable and editable without Foldmark,
now and in ten years. Content, recipient, subject, date and export preferences survive an
export and re-import without loss.

## My file will not import. Is my text gone?

No. When Foldmark cannot understand a file it shows the reason with the line number **and**
hands you back the original text unchanged. Nothing is silently discarded and nothing is
half-imported.

Foldmark deliberately reads only a small YAML subset. Anchors, aliases, tags and flow
collections are refused rather than interpreted.

## Why are placed images missing from the exported Markdown file?

Because they reference image data that exists only in this browser. On another machine the
file would describe artwork that is not there. For a complete copy, use the backup under
"Privacy and data".

# Email

## Does Foldmark send my email?

No. Foldmark prepares the message and hands it to your mail client — as a mailto link, as
text to copy, or as an .eml file. There is no mail server and no stored credential. Whether
the message goes out is decided in your own mail client.

## Why is the "Open mail client" button sometimes missing?

Because the message is too long for a mailto link. Browsers and mail clients truncate long
links at different points — and a silently truncated letter is worse than a copy button. So
Foldmark tells you instead.

## Why does the PDF for an email attachment have no fold marks?

Because nobody folds an attachment. The default suppresses fold, punch and cut marks for
email PDFs; you can switch them back on per document in the output panel.
