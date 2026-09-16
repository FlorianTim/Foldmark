# A Markdown directive convention for every LumbreCode app

- **Date:** 2026-09-13
- **Area:** Engineering baseline (standard), web app template (library)
- **Severity:** `proposal`
- **Template version:** 1.0.0
- **Concrete app:** Foldmark 1.2 (changes 0016, 0017, ADR 0019)
- **Status:** implemented in Foldmark as the reference; proposed for `lumbrecode-engineering` as
  `docs/MARKDOWN_DIRECTIVE_CONVENTION.md` (draft placed there, uncommitted)

## Trigger

Foldmark needed colour, indentation, note boxes, page breaks, dates and local images in Markdown
bodies while keeping Markdown + YAML front matter canonical and generating no HTML from text. Every
LumbreCode app that stores Markdown — notes, tasks, letters — will meet the same questions, and the
answers only pay off if they are the same everywhere: the same file opens in every app, the same
Pandoc filter works for all of them.

## Proposal (the convention)

1. **Syntax: `remark-directive`.** Inline `:name[text]{key=value}`, block `:::name{key=value}` …
   `:::` written without a space after the fence, leaf `::name` (two colons). Readers accept the
   Pandoc spellings — `[text]{.name}`, `^x^`, `~x~`, `::: name`, a closed empty `:::name` — and
   write only the canonical form. Names: lowercase English, hyphen-joined; parameters only as
   attributes, never as content; `[…]` is always the formatted text.

   Why not Pandoc's inline syntax: the only maintained remark extension for bracketed spans is
   AGPL-3.0-only (forbidden by the licence policy) and single-maintainer. `remark-directive` is MIT
   and maintained by the unified collective. Two facts contradict the obvious draft and are worth
   knowing before anyone repeats them: `remark-directive` does not parse `::: name` with a space,
   and an unclosed `:::name` fence swallows the rest of the document — hence the leaf form is
   `::name`.

2. **A registry, not a parser.** The catalogue is data (`name → attribute rules → renderer`). The
   parser does not know the names; it asks the registry. Adding a directive is a registry entry, a
   renderer case per output, and three tests: editor round trip, parser, renderer — plus a security
   fixture.

3. **The catalogue.** Block: `indent{level=1..3}`, `align{to=left|center|right|justify}`,
   `page-break`, `small`, `note{type=info|warning}`, `signature{lines=1..6}`. Inline: colour names,
   `highlight`, `u`, `small`, `sup`, `sub`, `date` (`:date[YYYY-MM-DD]`, rendered per locale). Not
   in it, on purpose: columns, table styling, fonts per span, free sizes.

4. **Unknown never breaks.** An unknown directive is preserved in the file unchanged, rendered as
   its plain content without the syntax showing, marked discreetly in an editor, never an error.
   Unknown attributes are ignored, not removed. An empty text directive that a parser makes of
   ordinary text (`Betreff:Antrag`) renders as that text.

5. **Palette by name.** Nineteen base tones (the Tailwind names: `red`, `orange`, `amber`, `yellow`,
   `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`,
   `fuchsia`, `pink`, `rose`, `gray`, `brown`), the modifiers `light-` and `dark-`, and the aliases
   `success`, `warning`, `danger`, `info`, `muted`, `highlight`. Every name has a **screen** and a
   **print** value; print values reach 4.5:1 on white (derived: the lightest Tailwind step that
   does, then the next two steps). No free values (`{rgb=…}`): a colour in a file can never carry
   CSS, and the printed result is legible by construction.

6. **Document theme.** Font family from local stacks, body size, line height, paragraph spacing,
   small size, palette overrides by shaded name (`light-red: {screen, print}`) and alias targets;
   stored as deviations from the default; separate from the app theme.

7. **Allowed URL schemes** in a body: `http:`, `https:`, `mailto:` for links; `asset:<id>` for
   images (`![alt](asset:id){width=60mm}`, width in mm). Everything else is inert text in every
   renderer and in the editor.

   _Addendum 2026-09-16 (change 0036):_ the image attribute block is a general `{key=value …}` block
   the way Pandoc reads it. Known keys: `width` in millimetres (`60mm`) or as a share of the text
   width (`50%`, `100%`); `align` as `left` (default, never written), `center`, `right`. Order is
   free on read, fixed on write (`width`, then `align`); unknown keys are ignored on read and
   dropped on write. An image is a block on its own line; alignment moves the image, not the
   paragraph.

   _Addendum 2026-09-16 (change 0030):_ where an inline directive name and a semantic colour alias
   coincide (`highlight`), the bare form `:highlight[…]` is the directive; the colour is reachable
   only as `:color[…]{name=highlight}`. Parsers consult the inline catalogue before the palette.

8. **Round-trip duty.** An editor writes back exactly the directives it read, known or not, with the
   documented normalisations only (quoted attribute values, canonical spellings).

9. **Pandoc compatibility.** Front matter: where a Pandoc variable means the same thing use its name
   (`title`, `date`, `lang`, `keywords`, `subject`, `author`), read the app's older name as an
   alias, derive `papersize`/`geometry` from the app's page model on export and never read them
   back, preserve unknown scalars, lists of scalars and one-level mappings with their types, and
   drop a flow collection's key with a report rather than the file. Block directives without
   attributes are Pandoc fenced divs already; inline directives and attributes need the filter
   below.

## Pandoc Lua filter (inline directives → bracketed spans; page break → `\newpage`)

```lua
-- foldmark-directives.lua — run with: pandoc letter.md --lua-filter foldmark-directives.lua -o letter.pdf
local known = { highlight = true, u = true, small = true, sup = true, sub = true, date = true }

local function is_color(name)
  return name:match('^[a-z]+$') or name:match('^light%-[a-z]+$') or name:match('^dark%-[a-z]+$')
end

function Str(el)
  -- `:name[text]` with plain text only; nested formatting is left to a full parser.
  local name, text = el.text:match('^:([a-z][a-z0-9%-]*)%[(.-)%]$')
  if not name then return nil end
  if name == 'date' then return pandoc.Str(text) end
  if name == 'u' then return pandoc.Underline({ pandoc.Str(text) }) end
  if name == 'sup' then return pandoc.Superscript({ pandoc.Str(text) }) end
  if name == 'sub' then return pandoc.Subscript({ pandoc.Str(text) }) end
  if known[name] or is_color(name) then
    return pandoc.Span({ pandoc.Str(text) }, pandoc.Attr('', { name }))
  end
  return pandoc.Str(text) -- unknown: the content, plainly
end

function Para(el)
  if #el.content == 1 and el.content[1].t == 'Str' and el.content[1].text == '::page-break' then
    return pandoc.RawBlock('latex', '\\newpage')
  end
  return nil
end
```

Colour classes map to `\textcolor` through a LaTeX header (`\usepackage{xcolor}` plus one
`\definecolor` per palette name with the **print** value); the convention document in the
engineering repository carries the full table.

## Security and privacy implications

- Positive: a fixed catalogue with validated attributes and named colours removes every path from
  document text to markup or CSS; the strict `style-src 'self'` stays intact (colours are CSS
  variable references set through CSSOM).
- No new network behaviour: images are local assets only, fonts are local stacks only.
- The dropped-flow-collection rule is a deliberate relaxation of "refuse the whole file": the key is
  lost and reported; nothing inside the brackets is interpreted.

## Verification

Foldmark: `tests/markdown.test.ts`, `tests/editor/roundtrip.test.ts`, `tests/email.test.ts`,
`tests/documentTheme.test.ts`, `tests/pandocFrontMatter.test.ts`,
`tests/security/untrustedInput.test.ts`, the e2e journey "formats with directives",
`npm run verify`. The adapter (`src/domain/markdown/mdastAdapter.ts` + `remarkPipeline.ts` +
`directives.ts`) is the module to lift into the baseline (see the companion note for the web app
template).
