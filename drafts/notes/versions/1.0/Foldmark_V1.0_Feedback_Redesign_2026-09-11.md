# Foldmark – V1.0 Feedback, Redesign und technische Recherche
**Stand:** 11.09.2026  
**Ausgangslage:** Version 1.0 ist fertig. Dieses Dokument sammelt die unmittelbar danach genannten Verbesserungen und ordnet sie in Hotfixes, V1.1/V1.2 und spätere Ausbaustufen ein.

## 1. Zielbild

Die V1.0-Hauptansicht wird in drei fachliche Arbeitsbereiche getrennt:

1. **Dokument**
   - Dokumenttyp
   - Absender
   - Empfänger
   - Kontaktdaten
   - Datum
   - Betreff
   - Anrede
   - Grußformel
   - Seiten-/Druckoptionen

2. **Schreiben**
   - visueller Rich-Text-/WYSIWYG-Editor
   - umschaltbare Markdown-Quellansicht
   - Formatierungs-Toolbar
   - Undo/Redo
   - Tabellen und Convenience-Aktionen

3. **Vorschau**
   - paginierte Dokumentvorschau
   - Seitenzahlen
   - Falz-/Loch-/Hilfslinien
   - gleiche Seiteneinteilung wie Druck/PDF

Die Ausgabe-/Exportoptionen verschwinden aus der dauerhaften Hauptansicht und öffnen sich über einen separaten Dialog.

## 2. Responsive Arbeitsfläche

Auf kleinen und mittleren Breiten:

```text
[ Dokument ] [ Schreiben ] [ Vorschau ]
```

Auf großen Desktop-Breiten dürfen zwei oder drei Bereiche gleichzeitig sichtbar werden.

Sehr breite Ansicht:

```text
┌────────────────────┬──────────────────────────┬──────────────────────────┐
│ Dokument           │ Schreiben                │ Vorschau                 │
│ Stammdaten         │ Rich Text / Markdown     │ Papierseiten             │
│ Adressen           │ Toolbar                  │ Hilfslinien              │
│ Optionen           │                          │ Seitenzahlen             │
└────────────────────┴──────────────────────────┴──────────────────────────┘
```

Die drei Bereiche sind fachliche Modi und keine starre Dreispaltenpflicht.

## 3. Dokumentbereich

Absender und Empfänger werden als Accordions dargestellt, standardmäßig geöffnet.

Beispiel:

```text
▼ Absender
  [ Primäradresse                     ▾ ] [Adressbuch]

▼ Empfänger
  [ Stadt Dortmund                    ▾ ] [Adressbuch]
```

Kontaktdaten können gespeichert sein, ohne im Dokument sichtbar zu werden:

```text
E-Mail: max@example.org
[x] Im Dokument anzeigen
```

## 4. Adressbuch-Redesign

Absender und Empfänger verwenden dasselbe AddressRepository.

Mögliche Rollen:

```ts
type AddressRole =
  | 'primary'
  | 'home'
  | 'sender'
  | 'favorite'
  | 'normal'
```

Absender-Priorität:
1. Primäradresse
2. Heimatadresse
3. favorisierte/eigene Adressen
4. zuletzt verwendete
5. übrige alphabetisch

Adressbuch:

```text
Adressbuch                                         [+ Adresse]

[ 🔍 Adressen durchsuchen … ]

A
  Alexander Apotheke
  Anna Beispiel

B
  Beispiel GmbH
  Bernd Mustermann

D
  Dr. Erika Beispiel
```

Aktionen:
- Bearbeiten
- Duplizieren
- Als Primäradresse festlegen
- Als Heimatadresse markieren
- Als Favorit markieren
- Als Absender verwenden
- Als Empfänger verwenden
- Löschen

Beim Erstellen einer Adresse wird zuerst das Land gewählt. Die Länderliste ist lokal und durchsuchbar.

Die Adressauswahl im Dokument ist eine editierbare Combobox:
- ohne Eingabe: primär, Heimatadresse und ungefähr zehn zuletzt relevante Adressen,
- beim Tippen: lokale Suche,
- daneben Adressbuch-Icon,
- Tastaturbedienung nach WAI-ARIA Combobox Pattern.

Empfehlung für Dokumente: Adress-Snapshot plus optionale Quell-ID speichern. So verändern spätere Adressbuchänderungen alte Dokumente nicht ungewollt.

## 5. Autosave, Speichern und Historie

Drei Mechanismen bleiben getrennt:

### 5.1 Undo/Redo
Sitzungsbezogene Editorhistorie.

- Windows/Linux: Ctrl+Z, Ctrl+Y bzw. Ctrl+Shift+Z
- macOS: Cmd+Z, Cmd+Shift+Z
- zusätzlich Toolbar-Icons

### 5.2 Automatische Working Copy
Nach letzter Änderung mit Debounce, etwa 1,5–3 Sekunden.

Die temporäre Working Copy wird überschrieben und erzeugt nicht pro Tastendruck eine Historienversion.

### 5.3 Manueller Speichern-Button
Ein sichtbarer **Speichern**-Button bleibt erhalten.

Manuelles Speichern:
- speichert sofort,
- kann einen dauerhaften Checkpoint erzeugen,
- gibt unmittelbar Rückmeldung.

### 5.4 Dokumenthistorie

```text
Heute
10:41  Manuell gespeichert
10:18  Automatischer Checkpoint

Gestern
21:34  Manuell gespeichert
20:02  Importierte Version
```

Aktionen:
- Vorschau
- Wiederherstellen
- Als Kopie öffnen
- Exportieren

Restore darf die aktuelle Version nicht zerstören.

### 5.5 Speicherstatus

```text
● Neu
● Nicht gespeichert
● Wird gespeichert …
● Gespeichert · 10:41
● Speicherfehler
```

Farben:
- neutral: neu
- gelb/orange: ungespeichert/speichert
- grün: gespeichert
- rot: Fehler

Nie ausschließlich Farbe verwenden; immer Icon/Text ergänzen.

## 6. Editor-Zielbild

Der bisherige einfache Markdown-Editor wird durch einen echten Rich-Text-/Markdown-Editor ersetzt.

Toolbar:

```text
[↶] [↷] [Absatz ▾] [B] [I] [U] [S]
[• Liste] [1. Liste] [Zitat] [Link] [Tabelle] [—]
[Datum] [Textbaustein]                     [Visuell | Markdown]
```

Mindestfunktionen:
- Undo/Redo
- Absatz
- Überschrift 1–3
- Fett
- Kursiv
- Unterstrichen, sofern sauber roundtrip-fähig
- Durchgestrichen
- Aufzählung
- Nummerierung
- Blockzitat
- Link
- horizontale Linie
- Tabellen
- Datum einfügen
- Anrede
- Grußformel
- Tastenkürzel
- visuelle und Markdown-Ansicht

Später:
- Bilder
- Signatur
- Textbausteine
- Vorlagen
- Tabellenkontextmenüs
- Seitenumbruch
- Suche/Ersetzen

## 7. Editor-Technologie

### 7.1 Empfehlung: Milkdown zuerst evaluieren

Milkdown passt am besten, weil:
- Markdown ist Kernformat,
- WYSIWYG-Markdown ist das Produktziel,
- Vue-3-Integration,
- ProseMirror + Remark,
- GFM,
- Tabellen,
- History/Undo/Redo,
- Slash-/Tooltip-/Upload-/Table-Komponenten,
- Markdown direkt auslesbar,
- MIT-Lizenz,
- aktives Projekt.

Empfohlener Technical Spike:
1. Vue integrieren
2. GFM aktivieren
3. Tabelle
4. Undo/Redo
5. eigene Toolbar
6. Markdown lesen/schreiben
7. Source-Mode
8. Roundtrip-Fixtures
9. CSP/Netzwerk prüfen
10. Accessibility und Bundlegröße messen

### 7.2 Tiptap als Alternative

Stärken:
- Vue 3
- sehr flexible Toolbar/Commands
- StarterKit
- Undo/Redo
- Tabellen
- viele Extensions
- MIT-Core

Aber: Die offizielle bidirektionale Markdown-Schicht `@tiptap/markdown` wird weiterhin als Beta/early release dokumentiert. Tiptap empfiehlt intern JSON für Persistenz.

Security: Bei Verwendung müssen aktuelle gepatchte Versionen gewählt werden. Anfang September 2026 gab es u. a. Fixes gegen XSS beim Einfügen präparierten HTMLs und DoS-/Attribute-Probleme.

### 7.3 TOAST UI

Funktional stark: Markdown/WYSIWYG, Toolbar, Tabellen, GFM.

Nicht bevorzugt, weil die Nutzungsstatistik laut Projektdokumentation Hostnamen an Google Analytics senden kann, wenn `usageStatistics` nicht deaktiviert ist. Das ist für Foldmarks Privacy-by-default unnötig riskant.

### 7.4 BlockNote

Nicht geeignet als kanonischer Markdown-Editor, weil das Projekt Markdown-Import/-Export selbst als verlustbehaftet dokumentiert.

### 7.5 AsciiDoc

Asciidoctor.js ist ein guter Browser-Renderer, aber das Ökosystem für eine Office-artige WYSIWYG-/Source-Dualansicht ist deutlich schwächer.

**Entscheidung:** Kein Wechsel von Markdown zu AsciiDoc ohne neue technische Grundlage.

## 8. Editorarchitektur

Kanonisches Format bleibt:

```text
Markdown + YAML Front Matter
```

Während der Bearbeitung darf intern ein ProseMirror-Modell existieren.

Port:

```ts
interface RichTextEditorPort {
  loadMarkdown(markdown: string): Promise<void>;
  getMarkdown(): Promise<string>;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}
```

Source-Editor kann weiterhin CodeMirror verwenden.

Pflicht für Roundtrip-Tests:
- Absätze
- Leerzeilen
- Fett/Kursiv
- Links
- Unicode
- Listen
- verschachtelte Listen
- Tabellen
- Blockquotes
- horizontale Linie
- Linebreaks
- gefährliches HTML
- YAML Front Matter
- unbekannte Metafelder

## 9. Convenience-Aktionen

Toolbar-Kommandos:
- Datum heute
- Datum auswählen
- Anrede
- Grußformel
- Tabelle
- später Seitenumbruch
- später Textbaustein

Datum intern ISO-8601; Darstellung abhängig von Dokumentlocale.

## 10. Vorschau

Die Vorschau bleibt eigener Arbeitsbereich.

### Hilfslinien-Bug
Aktuell funktioniert das Ein-/Ausblenden in der Vorschau nicht, während die Linien beim Drucken vorhanden sind.

Hotfix-Anforderung:

```ts
interface MarkerVisibility {
  preview: boolean;
  print: boolean;
  pdf: boolean;
}
```

Tests:
- Preview an / Print an
- Preview aus / Print an
- Preview an / Print aus
- beide aus

### Seitenzahlen

Optionen:

```text
( ) keine
( ) nur Seitenzahl
( ) Seite X
( ) Seite X von Y
```

Position:
- oben links/mitte/rechts
- unten links/mitte/rechts

Option:
- erste Seite ein-/ausblenden

Später:
- gerade/ungerade Seiten
- Startnummer
- eigene Formate

## 11. Druck-/PDF-Grundlage

Es gibt keine maßgebliche „PDF-RFC“ für Foldmarks Briefränder.

Aktueller PDF-Kernstandard:
**ISO 32000-2:2020 – PDF 2.0**, 2026 erneut bestätigt.

PDF definiert u. a. Seitengrenzen/Page Boxes:
- MediaBox
- CropBox
- BleedBox
- TrimBox
- ArtBox

Die Web-Druckgeometrie sollte sich an CSS Paged Media orientieren:
- `@page`
- Seitengröße
- Orientierung
- Seitenränder
- `:first`
- `:left`
- `:right`
- Margin-Boxes/Counters, soweit Zielbrowser zuverlässig unterstützen

Robuste Architektur:

```text
Document
+ PrintProfile
+ PageNumberOptions
+ MarkerOptions
      ↓
Pagination / RenderPlan
      ↓
Preview / Browser Print / PDF
```

Foldmark soll selbst einen RenderPlan besitzen und nicht blind dem Browserdruck vertrauen.

Regressionstests:
- A4-Maße
- Seitenränder in mm
- 100-%-Maßstab
- Chrome/Edge
- Firefox
- Mehrseitigkeit
- erste/letzte Seite
- Seitenzahlen
- Marker an/aus
- PDF mit/ohne Marker

## 12. Ausgabe-Dialog

Druck-/Exportoptionen verschwinden aus dem normalen Workspace.

Aktion:

```text
[ Drucken / Exportieren ]
```

Dialog:

```text
[ Drucken ] [ Exportieren ] [ E-Mail ]

Drucken:
- Profil
- Marker
- Seitenzahlen
- Systemdruckdialog

Export:
- PDF
- Markdown
- später ODT
- Dateiname

E-Mail:
- PDF-Anhang
- HTML
- Plain Text
```

## 13. About/Über-Seite

Hotfix:
- Foldmark statt Template-Bezeichnungen
- Lambro Code
- korrekte App-Version
- Build-ID optional
- Produktbeschreibung
- Projektlizenz
- Third-Party Notices
- Datenschutz
- Repository-Link

Kein sichtbarer Template-Rest im Produkt.

## 14. Theme/Design

Ziel:
- ruhiger
- hochwertiger
- dokumentorientierter
- weniger Entwicklerwerkzeug

App-Theme und gedrucktes Dokumenttheme sind getrennt.

Mindestens:
- System
- Hell
- Dunkel
- Papier
- Sepia
- hoher Kontrast

## 15. Zukunft: GitHub Connector

Neben Google Drive, OneDrive und Dropbox soll ein GitHub-Connector evaluiert werden.

Mögliche Funktionen:
- Markdown in Repository speichern
- öffnen
- Git-Versionierung
- Templates aus Repository
- optional Pull Request

Nur opt-in, OAuth/PKCE, minimale Scopes, lazy loading.

## 16. Priorisierung

### V1.0.x Hotfixes
1. Hilfslinien-Vorschau
2. About-Texte
3. Speicherstatus
4. sichtbarer Speichern-Button
5. Theme-/Kontrastfehler
6. PDF-/Print-Maße prüfen

### V1.1 UX-/Editor-Release
1. Dokument / Schreiben / Vorschau
2. responsive Tabs/Zwei-/Dreispaltenmodus
3. Absender-/Empfänger-Accordions
4. neue Adress-Combobox
5. Adressbuch-Redesign
6. Autosave Working Copy
7. Undo/Redo
8. Dokumenthistorie
9. Seitenzahlen
10. Rich-Markdown-Editor
11. separater Ausgabe-Dialog
12. Datum-/Anrede-/Grußformel-Kommandos

### V1.2
1. optionale Geo-/Adress-API nach Privacy-Review
2. Editor-Ausbau
3. Bilder erst nach stabilem Editor
4. weitere Formatierung

## 17. Vorgeschlagene OpenSpec-Changes

```text
fix-preview-marker-visibility
fix-product-about-metadata
add-responsive-workspace-redesign
redesign-address-book
add-address-combobox
add-autosave-working-copy
add-document-version-history
add-rich-markdown-editor
add-page-numbering
add-output-dialog
add-editor-convenience-commands
research-address-geo-provider
```

## 18. Definition of Done für den Editor-Spike

Ein Editor-Kandidat wird erst angenommen, wenn geprüft ist:
- Vue 3
- lokale Assets
- keine Telemetrie
- keine externen Requests
- CSP
- kompatible Lizenz
- Undo/Redo
- Tabellen
- Toolbar
- Tastenkürzel
- Markdown lesen/schreiben
- Source-Modus
- Roundtrip-Tests
- XSS-Tests
- sichere Paste-Verarbeitung
- Bundlegröße
- mobile/schmale UX
- Keyboard-/Screenreader-Grundlagen

Erster Kandidat: **Milkdown**  
Vergleichskandidat: **Tiptap**  
Nicht bevorzugt: **TOAST UI, BlockNote**  
Kein AsciiDoc-Wechsel ohne neue Entscheidung.

## 19. Recherchequellen

Milkdown:
- https://milkdown.dev/docs/guide/getting-started
- https://milkdown.dev/docs/recipes/vue
- https://milkdown.dev/docs/guide/using-milkdown-kit
- https://milkdown.dev/docs/api/preset-gfm
- https://github.com/Milkdown/milkdown

Tiptap:
- https://tiptap.dev/docs/editor/getting-started/install/vue3
- https://tiptap.dev/docs/editor/extensions/functionality/starterkit
- https://tiptap.dev/docs/editor/extensions/functionality/table-kit
- https://tiptap.dev/docs/editor/markdown
- https://github.com/ueberdosis/tiptap/releases

TOAST UI:
- https://github.com/nhn/tui.editor

BlockNote:
- https://www.blocknotejs.org/docs/features/import/markdown
- https://www.blocknotejs.org/docs/features/export/markdown

Asciidoctor.js:
- https://docs.asciidoctor.org/asciidoctor.js/latest/

WAI-ARIA Combobox:
- https://www.w3.org/WAI/ARIA/apg/patterns/combobox/

CSS Paged Media:
- https://www.w3.org/TR/css-page-3/
- https://www.w3.org/TR/css-gcpm-3/
- https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40page

PDF:
- https://www.iso.org/standard/75839.html
- https://pdfa.org/resource/pdf-cheat-sheets

## 20. Empfohlene ADR

> Foldmark bleibt Markdown-first. Der visuelle Editor wird durch einen Markdown-fähigen ProseMirror-basierten Editor ersetzt. Quell- und visuelle Bearbeitung sind zwei Ansichten desselben logischen Dokuments. Die Druckvorschau ist ein separater Renderer und nicht der Rich-Text-Editor selbst.

```text
Dokumentdaten
      │
      ├── Rich Editor
      ├── Markdown Source Editor
      └── Document Codec
              │
              ▼
          RenderPlan
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
   Vorschau  Druck    PDF
```
