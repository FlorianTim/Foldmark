# Document Formatting

## Requirement

Formatting that Markdown itself cannot express is written as **directives** in the
`remark-directive` syntax (ADR 0019), so that everything the editor can do is text in the file and
stays readable without Foldmark:

- inline `:name[text]`, e.g. `:red[Wort]`, `:u[Wort]`, `:date[2026-09-11]`;
- block `:::name{key=value}` … `:::`, e.g. `:::note{type="warning"}`;
- leaf `::page-break`.

The parser also **reads** the Pandoc spellings `[text]{.name}`, `^x^`, `~x~`, a fence with a space
(`::: name`) and a closed empty `:::page-break` container, and the long colour spelling
`:color[text]{name=red}`; it writes only the canonical form.

### Catalogue

The catalogue is a registry (`src/domain/markdown/directives.ts`); adding to it is a spec change,
and every entry needs the editor node or mark, the parser case and every renderer, with a test each
plus a security fixture.

| Block        | Form                                        | Effect                                                         |
| ------------ | ------------------------------------------- | -------------------------------------------------------------- |
| `indent`     | `:::indent{level=1..3}`                     | indentation of 8 mm per level, default 1, nestable             |
| `align`      | `:::align{to=left\|center\|right\|justify}` | paragraph alignment                                            |
| `page-break` | `::page-break`                              | hard page break, honoured by the render plan                   |
| `small`      | `:::small`                                  | small print at the theme's small size                          |
| `note`       | `:::note{type=info\|warning}`               | bordered box, printable in greyscale (warning: heavier border) |
| `signature`  | `:::signature{lines=1..6}`                  | free space above a rule, then the name; default 3 lines        |

| Inline       | Form                                       | Effect                                                       |
| ------------ | ------------------------------------------ | ------------------------------------------------------------ |
| colour       | `:red[…]`, `:light-green[…]`, `:danger[…]` | a palette name; see below                                    |
| `highlight`  | `:highlight[…]`                            | background from the theme                                    |
| `u`          | `:u[…]`                                    | underline                                                    |
| `small`      | `:small[…]`                                | small                                                        |
| `sup`, `sub` | `:sup[2]`, `:sub[2]`                       | super-/subscript (Pandoc `^2^`, `~2~` read as well)          |
| `date`       | `:date[YYYY-MM-DD]`                        | the date in the document's language; ISO to any other reader |

Out-of-range attributes fall back to the default; unknown attributes are ignored, not removed.

### Unknown never breaks

An unknown directive (`:gold[Wort]`, `:::fancy`) is kept in the file unchanged, rendered as its
plain content with the syntax invisible, marked discreetly in the editor, and written back as it
came. There is no error and no abort. An empty text directive that remark makes of ordinary text
(`Betreff:Antrag`) is rendered as that text.

### Palette

Colours are **names**: nineteen base tones (`red`, `orange`, `amber`, `yellow`, `lime`, `green`,
`emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`,
`gray`, `brown`), the modifiers `light-` and `dark-`, and the aliases `success`, `warning`,
`danger`, `info`, `muted`, `highlight`, which the theme may point at another tone. Every name has a
screen value and a print value; every print value has a contrast of at least 4.5:1 on white. There
are no free values: an unknown colour name is an unknown directive.

### Document theme

`printOptions.theme` (front matter `theme:`, deviations from the default only) holds the font family
(`serif`, `sans`, `mono` — local stacks, no download), body size in pt, line height, paragraph
spacing in lines, small size, colour overrides by shaded name (`light-red: {screen, print}`) and
alias targets. The defaults equal the 1.1 rendering. The theme is the paper's, not the app's: it
drives pagination and the preview, the print copy and the mail body, and the app's own theme never
reaches the paper. It is edited in the Document mode.

### Images

`![alt](asset:<id>){width=60mm}` places an image from the local asset library; the bytes stay in
this browser, the file references the id. Any other source stays text. A missing asset shows a
labelled placeholder; the estimate counts the image's height from its aspect ratio.

The attribute block carries the image's layout (change 0036): `width` in millimetres (5–400) or as a
share of the text width (`50%`, `100%` for the full width), and `align` — `left` (the default, never
written), `center`, `right`. Order inside the block is free; it is written back in a fixed order
(`width`, then `align`); unknown attributes and unusable values are ignored. An image is a block on
its own line, never wider than the text box; alignment moves the image alone, not the paragraph. The
editor offers the layout on the selected image — alignment, 25/50/75 % and full width,
smaller/larger steps, original size — and in the image dialog; preview, print copy and the editor
draw the same, the height estimate follows.

### Highlight and the colour alias

`:highlight[…]` is the highlight mark. The palette also has a semantic colour alias `highlight`; its
bare spelling would be the same directive, so the bare form is always the mark, and the text colour
of that name is only reachable as `:color[…]{name=highlight}` (change 0030). The editor's parser
consults the inline-directive catalogue before the palette, as the renderer's does.

### Clear formatting

One command removes every character mark from the selection — bold, italic, underline,
strikethrough, inline code, colour, highlight, small, super- and subscript, unknown inline
directives — in the visual editor by removing the marks, in the Markdown view by rewriting the
selected text through the domain parser (links, dates and images survive). Paragraph formats are
untouched; a paragraph reset is a later command (change 0031).

### Security

No directive, attribute, colour name or image source ever becomes markup or CSS: colours reach the
DOM as `var(--md-color-<name>)` references set through CSSOM (the strict `style-src` stays intact),
the mail renderer emits only palette hex values it looked up itself, images carry only object URLs
the app resolved for a local id.

## Verification

- `tests/markdown.test.ts` (parser), `tests/editor/roundtrip.test.ts` (editor round trip and
  commands), `tests/email.test.ts` (both mail renderers), `tests/documentTheme.test.ts` (palette,
  theme, heights), `tests/security/untrustedInput.test.ts` (hostile directives, colours, images).
- `tests/e2e/foldmark.spec.ts`: colour, note box and page break end to end; the print copy uses the
  print value; the theme re-paginates; the highlight chain editor → Markdown → editor → preview →
  print copy; clear formatting; the image toolbar's alignment and size in editor, file and print
  copy.
- `tests/shortcuts.test.ts` covers the source-view clear formatting.
