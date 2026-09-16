# Auftrag: Editor-Ausbau 1.2 — remark-Parser, Direktiven, Farben, Dokumentthema, Bilder, Pandoc-Front-Matter

Du arbeitest im Repository `C:\Workspace\FlorianTim\Foldmark` (Foldmark, local-first Brief-Editor,
Vue 3 + TypeScript, Milkdown-Editor, OpenSpec/arc42/ADRs). Lies zuerst `openspec/project.md`,
ADR 0010, 0011 und 0016, `openspec/specs/document-model.md`, `openspec/specs/render-and-print.md`,
`docs/product/requirements_roadmap.md` (Abschnitt 1.2) und `docs/template-feedback/README.md`.
Arbeite spec-first: erst OpenSpec-Changes und Roadmap anpassen, dann implementieren, dann Specs auf
den Ist-Stand bringen. Kein Commit — die Arbeit bleibt uncommitted auf `main`. Am Ende müssen
`npm run verify`, `npx playwright test --project=chromium` und `npm run screenshots:capture` grün
sein. Berichte am Ende, was gebaut, was bewusst gelassen und was für das Engineering-Repository
vorgeschlagen wurde.

## Nicht verhandelbar

- Markdown + YAML Front Matter bleibt das kanonische Format (ADR 0016). Alles, was der Editor kann,
  steht als Text in der Datei und bleibt ohne Foldmark lesbar.
- Kein generiertes HTML aus Dokumenttext (ADR 0011). Parser liefern Syntaxbäume; gerendert wird
  über typisierte Templates und feste Tag-Sets.
- **Unbekanntes bricht nie ab.** Eine unbekannte Direktive (z. B. `:gold[Wort]`, `:::fancy`) wird
  in der Datei unverändert bewahrt und **normal dargestellt**: der Inhalt erscheint ohne
  Formatierung, die Direktiven-Syntax selbst ist nicht sichtbar, es gibt keine Fehlermeldung und
  keinen Abbruch. Im Editor bleibt sie als „unbekannte Direktive" erhalten (Roundtrip-Pflicht) und
  wird dezent markiert. Unbekannte Attribute werden ignoriert, nicht verworfen.
- Keine Remote-Fonts, keine Requests; CSP `style-src 'self'` bleibt. Erlaubte URL-Schemata im
  Dokument: `http:`, `https:`, `mailto:`, `asset:`.
- Jede neue Syntax braucht drei Stellen und drei Tests: Editor-Node/Mark (Milkdown), Parser
  (Fixture in `tests/editor/roundtrip.test.ts` **und** `tests/markdown.test.ts`), Renderer (Vorschau,
  Druck, beide E-Mail-Renderer). Dazu ein Sicherheits-Fixture in `tests/security/`.
- Neue Abhängigkeiten nur exakt gepinnt, Lizenz gegen `compliance/license-policy.json` geprüft,
  in `docs/dependencies/REVIEW_2026-08-04.md` und den Third-Party Notices nachgezogen.

## Change 0016 — `replace-markdown-parser-with-remark`

Ziel: Editor und Renderer parsen denselben Dialekt.

- `src/domain/markdown/parseMarkdown.ts` wird zum Adapter `mdast → MarkdownBlock`. Parsen mit
  `remark-parse` 11 + `remark-gfm` 4 + `unified` 11 (bereits transitiv über `@milkdown/kit`; als
  direkte Dependencies aufnehmen). Das bestehende Block-/Inline-Modell bleibt die Schnittstelle zu
  `SafeMarkdown.vue`, `SafeInline.ts`, `DefaultEmailRenderer.ts` und `textMetrics.ts`; verschachtelte
  Listen dürfen echt verschachtelt werden, wenn der Renderer mitzieht.
- Der Adapter ist als eigenständiges, framework-freies Modul zu schneiden (Eingang mdast, Ausgang
  Blöcke, Konfiguration = erlaubte Direktiven und Palette), damit er später als Baseline-Modul in
  `lumbrecode-engineering` auslagerbar ist (siehe Teil f).
- Sicherheit: `html`-Knoten → Text; Links nur erlaubte Schemata; Bilder vorerst → Text (bis 0017 e).
  `tests/security/untrustedInput.test.ts` um Parser-Fälle erweitern.
- `tests/markdown.test.ts` bleibt Kontrakt; Abweichungen des remark-Verhaltens im Test
  dokumentieren, nicht wegoptimieren. Pagination (`splitParagraphs`/`startsBlock`) muss mit der
  neuen Blockerkennung übereinstimmen — Test, der die Blockzahl beider Wege vergleicht.
- Bundle-Größe vorher/nachher in `tasks.md`. Specs: `document-model.md`, ADR 0011 um einen Absatz
  ergänzen (AST-Library ist vereinbar, weil kein HTML erzeugt wird), arc42 §5.

## Change 0017 — `add-directives-colors-theme-and-images`

### a) Direktiven-Syntax — eine Entscheidung mit Pandoc im Blick

Zwei Syntaxfamilien konkurrieren; recherchiere kurz und entscheide mit Begründung in ADR 0019:

| Ebene  | remark-directive (CommonMark-Proposal)     | Pandoc (fenced_divs / bracketed_spans)      |
| ------ | ------------------------------------------ | ------------------------------------------- |
| Block  | `:::indent` … `:::`, `:::align{to=right}`  | `::: indent` … `:::`, `::: {.align-right}`  |
| Leaf   | `::page-break`                             | (kein Äquivalent; `::: {.page-break}`)      |
| Inline | `:red[Wort]`, `:color[Wort]{name=red}`     | `[Wort]{.red}`                              |

Kriterien: Blöcke sind in beiden Welten praktisch gleich (`::: name` mit Leerzeichen parsen beide —
diese Form wird geschrieben). Inline unterscheidet sich. Prüfe, ob es eine gepflegte
micromark/remark-Erweiterung für Pandoc-Bracketed-Spans gibt. Gibt es sie und ist sie tragbar, ist
**Pandoc-Syntax kanonisch** (Foldmark-Dateien laufen dann ohne Filter durch `pandoc`). Gibt es sie
nicht, bleibt `remark-directive`-Inline kanonisch, und Teil f liefert ein Pandoc-Lua-Filter-Beispiel
im Konventionsdokument. In jedem Fall **liest** der Parser beide Inline-Formen, schreibt aber nur
die kanonische.

Namensregeln: englisch, kleingeschrieben, Bindestrich (`light-green`, `page-break`), Parameter nur in
Attributen `{key=value}`, nie im Inhalt — `[…]` ist immer der formatierte Text.

### b) Direktiven-Katalog

Bewusst klein, aber so geschnitten, dass er wächst, ohne den Parser anzufassen (Registry aus Name →
Renderer). Block:

| Name         | Form                                          | Wirkung                                                                  |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| `indent`     | `::: indent{level=1..3}`                      | Einzug, Standard 1, schachtelbar                                         |
| `align`      | `::: align{to=left\|center\|right\|justify}`  | Absatzausrichtung                                                        |
| `page-break` | `::: page-break` (leer)                       | harter Seitenumbruch; `paginateBody` respektiert ihn                     |
| `small`      | `::: small`                                   | Kleingedrucktes (Thema-Größe „small")                                    |
| `note`       | `::: note{type=info\|warning}`                | umrandeter Hinweiskasten; Pandoc-übliche Klassen, druckbar in Graustufen |
| `signature`  | `::: signature{lines=3}`                      | Freiraum + Namenszeile für die Unterschrift                              |

Inline:

| Name          | Form                           | Wirkung                                                                                                                                    |
| ------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Farbe         | `:red[Wort]` / `[Wort]{.red}`  | siehe Palette (c)                                                                                                                          |
| `highlight`   | `:highlight[Wort]`             | Hintergrundmarkierung, Thema-Farbe                                                                                                         |
| `u`           | `:u[Wort]`                     | Unterstreichung (fehlt Markdown; im Brief üblich)                                                                                          |
| `small`       | `:small[Wort]`                 | kleiner                                                                                                                                    |
| `sup` / `sub` | `:sup[2]`, `:sub[2]`           | Hoch-/Tiefstellung (Pandoc `^2^`, `~2~` zusätzlich lesen)                                                                                  |
| `date`        | `:date[2026-09-11]`            | **ersetzt** das heutige `{{date:…}}`-Token; gleiche Semantik, lokalisiert gerendert. Alte Tokens werden beim Laden migriert |

Nicht aufnehmen: Spalten, Tabellen-Styling, Schriftart pro Textstelle, freie Größen. Die Registry
darf erweitert werden, jede Aufnahme braucht die drei Stellen und drei Tests.

### c) Farbpalette

Orientierung an den Namen, die Entwickler ohnehin kennen — recherchiere und dokumentiere kurz:
Tailwind (red/orange/amber/yellow/lime/green/emerald/teal/cyan/sky/blue/indigo/violet/purple/
fuchsia/pink/rose + gray-Familie, Stufen 50–950), Bootstrap (11 Farben + semantisch primary/
success/warning/danger/info), Material, CSS Named Colors, LaTeX `xcolor` (was Pandoc-PDF ohne
Zusatz kennt: red, green, blue, cyan, magenta, yellow, gray, brown, lime, olive, orange, pink,
purple, teal, violet). Leite daraus ab:

- **Grundtöne** (einzelne Wörter, Tailwind-Namen als Referenz): `red`, `orange`, `amber`, `yellow`,
  `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`,
  `fuchsia`, `pink`, `rose`, `gray`, `brown`.
- **Modifikatoren** als Präfix für jeden Grundton: `light-` und `dark-` (`light-green`,
  `dark-blue`). Der Parser akzeptiert das Muster `(light-|dark-)?<grundton>`; jede Kombination hat
  definierte Werte für Bildschirm und Druck.
- **Semantische Aliase**, die auf Grundtöne zeigen: `success`, `warning`, `danger`, `info`,
  `muted`, `highlight`. Aliase sind im Thema umlegbar.
- Alle Werte liegen im **Dokumentthema** (d), getrennt für Bildschirm und Druck; Druckwerte mit
  Mindestkontrast 4.5:1 auf Weiß (helle Töne bekommen dunklere Druckwerte). Keine freien
  `{rgb=…}`-Werte — die Syntax ließe es zu, ADR 0019 begründet den Verzicht (Themabindung,
  Kontrast, „kein Word").
- Unbekannter Farbname (`:gold[…]`) → normal dargestellt, in der Datei bewahrt (siehe „Nicht
  verhandelbar").
- Milkdown-Mark mit Toolbar-Dropdown „Farbe" (Swatch + Name, gruppiert nach Grundton), Renderer als
  `<span class="md-color-light-green">`, E-Mail-HTML mit inline `style` aus derselben Palette.

### d) Dokumentthema (Roadmap R11-019)

- `DocumentTheme` auf dem Dokument (`printOptions.theme`): Schriftfamilie aus einer lokalen Liste
  (Systemstapel serif/sans/mono; mitgelieferte Schriften nur, wenn die Bundle-Größe je Schnitt in
  `tasks.md` begründet ist), Grundgröße in pt, Zeilenabstand, Absatzabstand, Größe „small", die
  Palette aus (c) mit Bildschirm-/Druckwerten. Standardwerte = heutiges Verhalten.
- `TEXT_METRICS` bezieht Größe/Zeilenabstand aus dem Thema, sonst stimmt die Pagination nicht
  (Test: Seitenzahl ändert sich mit der Schriftgröße).
- Codec: `theme:` Map im Front Matter (nur Abweichungen vom Standard schreiben).
- UI: Abschnitt „Dokumentthema" im Dokument-Modus, getrennt vom App-Theme; Vorschau und Druck nutzen
  es, die Oberfläche nicht.

### e) Bilder (Roadmap R12-002, Teil 1)

- `![Alt](asset:<id>){width=60mm}` — nur `asset:`, keine URLs; Bytes bleiben in der lokalen
  Asset-Bibliothek, die Datei referenziert die ID. Breite als Attribut in mm (Pandoc versteht
  `{width=…}` ebenfalls).
- Milkdown-Image-Node mit Auswahl aus der Asset-Bibliothek; Renderer löst über `useAssetUrls`;
  fehlendes Asset → Hinweis wie `render.assetMissing`; Bildhöhe in `markdownHeightMm`.

### f) Konvention für alle LumbreCode-Apps

`docs/template-feedback/2026-09-xx-markdown-directive-convention.md` nach dem dortigen Muster
(Template-Version, App-Version, Anlass, Vorschlag, Sicherheits-/Privacy-Implikationen, Nachweis),
Ziel: PR gegen `lumbrecode-engineering`. Inhalt: Syntaxentscheidung aus (a) mit Begründung,
Namensregeln, Direktiven-Katalog und Registry-Prinzip, Palette (Grundtöne, Modifikatoren, Aliase,
Bildschirm-/Druckwerte), Regel „unbekannt → bewahren und normal darstellen", erlaubte URL-Schemata,
Roundtrip-Pflicht, Pandoc-Kompatibilität (g) und — falls Inline nicht Pandoc-nativ ist — ein
Pandoc-Lua-Filter-Beispiel, das `:red[…]` in `[…]{.red}` übersetzt. Foldmark ist die
Referenzimplementierung; der Adapter aus 0016 ist das auslagerbare Modul.

### g) Pandoc-kompatibles Front Matter

Foldmarks YAML-Kopf soll für `pandoc datei.md -o datei.pdf` brauchbar sein, ohne dass Foldmark
seine Semantik aufgibt. Recherchiere Pandocs Metadaten-Variablen (Pandoc User's Guide, Abschnitt
„Variables") und die verbreitete Eisvogel-Vorlage (`titlepage`, `footer-left`, `lot`, `lof`, …);
unterscheide **Pandoc-Kern** von **Template-spezifisch**. Umsetzung:

1. **Gleiche Bedeutung, gleicher Name.** Wo Foldmark und Pandoc dasselbe meinen, wird der
   Pandoc-Name kanonisch und der alte Name beim Lesen als Alias akzeptiert:
   `title` (schon gleich), `date` (ISO ist Pandoc-konform), `lang` statt `locale`, `keywords`
   statt `tags`, `subject` (Pandoc-PDF-Metadatum), `author` = Anzeigename des Absenders (aus dem
   Snapshot abgeleitet, beim Lesen ignoriert, weil der Snapshot die Quelle ist).
2. **Foldmark-eigene Schlüssel bleiben** (`foldmarkVersion`, `kind`, `printProfile`, `sender`,
   `senderFooter`, `recipient`, `pageNumbers`, `surfaces`, `export`, `salutation`, `closing`,
   `reference`, `signerName`, `signatureId`, `emailTo`) — Pandoc ignoriert Unbekanntes. Prüfe, ob
   ein Präfix-Namespace nötig ist; vermutlich nicht.
3. **Abgeleitete Pandoc-Schlüssel beim Schreiben**: `papersize` (`a4`, `a6`, …) und `geometry`
   (`margin=…mm` bzw. vier Ränder) aus dem Druckprofil, damit Pandocs PDF dieselbe Seite hat. Beim
   Lesen werden sie **nicht** übernommen — das Profil ist die Quelle — sondern bewahrt.
4. **Bewahren erweitern** (ADR 0010 bleibt): zusätzlich zu Top-Level-Skalaren auch **Listen von
   Skalaren** und **einstufige Mappings von Skalaren** unbekannter Schlüssel bewahren (Beispiel
   `geometry` als Blockliste, `footer-left`), bounded wie bisher. Flow-Syntax (`[a, b]`, `{…}`)
   bleibt abgelehnt — dokumentieren, dass Pandoc-Dateien mit Flow-Listen beim Import den betroffenen
   Schlüssel verlieren und das gemeldet wird.
5. Nicht abbilden, nur bewahren: `titlepage`, `toc`, `lot`, `lof`, `subparagraph`,
   `links-as-notes`, `header-*`/`footer-*` (Eisvogel). Ein Brief hat keine Titelseite; Foldmarks
   Seitenzahlen/Fußzeilen bleiben Foldmark-Konzepte.
6. Nachweis: Fixture `tests/fixtures/pandoc-example.md` mit genau diesem Kopf:

   ```yaml
   ---
   title: Automatic Activation
   subtitle: Architecture Documentation
   author: "Author: Team Que"
   titlepage: true
   papersize: a4
   geometry:
     - margin=20mm
   lot: true
   lof: true
   subparagraph: true
   links-as-notes: true
   lang: en-US
   footer-left: "© Team Que"
   footer-center: "Daimler Fleetboard GmbH"
   ---
   ```

   Import verliert nichts Bewahrbares, Export schreibt es zurück, `lang: en-US` wird zur
   Dokumentsprache, `subtitle` bleibt bewahrt (kein Foldmark-Feld). Spezifiziere in
   `document-model.md`, was übernommen, was abgeleitet und was bewahrt wird.

## Reihenfolge und Abnahme

1. 0016 vollständig (Specs → Code → Tests → Specs), `verify` grün.
2. 0017 in der Reihenfolge a (Entscheidung) → b → c → d → e → g; nach jedem Teil `verify` und e2e
   grün, `tasks.md` gepflegt. f am Ende, mit dem Wissen aus allen Teilen.
3. ADR 0019 „Formatierung über Direktiven und Dokumentthema": Syntaxentscheidung, Katalog,
   Palette, Verzicht auf freie Werte und Schriftarten pro Textstelle, Umgang mit Unbekanntem.
4. `CHANGELOG.md` unter `[Unreleased]`; Roadmap (R11-019 done, R12-002 Teil 1 done, neue IDs für
   Direktiven, Palette, Pandoc-Kopf); `drafts/notes/processed.md`; arc42 §5 und §8.
5. Screenshots neu; der Workspace-Screenshot zeigt den visuellen Editor mit einer Farbe und einem
   Hinweiskasten.

## Was du nicht tun sollst

- Keine Schriftarten oder freien Farbwerte pro Textstelle, kein Wechsel des kanonischen Formats.
- Keine Fonts, Bilder oder Daten von außen laden.
- Keine Direktive außerhalb des Katalogs „mal eben" hinzufügen — Katalogänderungen sind
  Spec-Änderungen.
- Kein Commit.
