---
title: "Foldmark - V1.0 Korrekturen, konsolidierte Anforderungen und Premium-Roadmap"
author: "Lambro Code / Foldmark Projekt"
date: "16.09.2026"
lang: de-DE
---

# Dokumentstatus

**Revision:** 2 - 16.09.2026  
**Basis:** getestete Foldmark V1.0 plus bisheriges Post-Release-Feedback  
**Zielgruppe:** Coding-Agent, Architektur-/UX-Review, spätere OpenSpec-Pflege  

Dieses Dokument ist die konsolidierte Weitergabe nach dem erneuten V1.0-Test. **Teil A** enthält die aktuell neu festgestellten Fehler und Korrekturen und hat bei Konflikten Vorrang. **Teil B** enthält die bereits zuvor konsolidierte V1-Post-Release-Spezifikation. **Teil C** enthält neue Future-/Premium-Anforderungen sowie die dazu recherchierten technischen Optionen.

---

# Teil A - Verbindliche V1.0-Korrekturen nach erneutem Praxistest

Dieser Teil hat für die nächste Coding-Agent-Runde höchste Priorität. Wo er älteren Formulierungen in Teil B widerspricht, gilt **Teil A**. Die folgenden Punkte sind ausdrücklich als Korrekturen der bereits gebauten V1.0 zu behandeln, nicht als langfristige Ideen.

## A1. Druckausgabe: App-Menüs und Editor-Chrome dürfen niemals mitgedruckt werden

### Fehlerbild
Beim Drucken bzw. beim Erzeugen eines PDFs über den Browser erscheinen derzeit Teile der App-Oberfläche im Druckergebnis. Betroffen ist insbesondere das klassische Menü bzw. die Formatierungs-/Editor-Navigation. Der Fehler tritt sowohl in Firefox als auch in Chrome auf.

### Soll-Verhalten
Im Druckmodus darf ausschließlich der dedizierte Dokument-Print-Tree sichtbar sein. Nicht gedruckt werden dürfen insbesondere:

- Topbar und App-Navigation
- klassisches Datei-/Bearbeiten-/Format-/Ansicht-/Hilfe-Menü
- Rich-Text-Toolbar
- Visuell/Markdown-Umschalter
- Pane-Handles, Resize-Griffe und Collapse-Pfeile
- Buttons für Speichern, Verlauf, Prüfen, Drucken, Exportieren und E-Mail
- Modals und native `<dialog>`-Elemente
- Popover, Tooltips und Toasts
- Statusanzeigen und Badges
- Footer der Anwendung
- Kontakt-/Adressbuch-Buttons
- Preview-Zoom- und Seitennavigation

### Architekturregel
Nicht dauerhaft eine wachsende Blacklist einzelner UI-Klassen pflegen. Stattdessen Print-Isolation einführen:

```text
App UI                    -> screen only
Dedicated print root      -> print only
```

Alle App-Chrome-Komponenten sollen zusätzlich eine einheitliche Semantik wie `.no-print` erhalten. Im Print-CSS muss der dedizierte Print-Tree explizit sichtbar werden.

### Akzeptanzkriterien

- Chrome druckt keine App-Menüs oder Toolbars.
- Firefox druckt keine App-Menüs oder Toolbars.
- PDF via Browser-Print enthält nur Dokumentseiten.
- Ein geöffneter Dialog oder ein offenes Popover darf nicht in den Ausdruck gelangen.
- Regressionstest mit geöffnetem Format-Menü.
- Regressionstest mit geöffnetem Druckdialog.

**Priorität: P0**

---

## A2. Unerwartete zweite/leere Druckseite entfernen

### Fehlerbild
Beim Drucken entsteht derzeit teilweise eine zusätzliche zweite Seite, obwohl sie in der Vorschau nicht als inhaltlich relevante Seite erkennbar ist.

### Soll-Verhalten
Foldmark darf keine automatisch erzeugten leeren Schlussseiten drucken oder als PDF ausgeben.

### Normalisierungsregel
Unmittelbar vor Preview-/Print-/PDF-Finalisierung:

```text
RenderPlan
  -> normalizePages()
  -> remove trailing pages without renderable content
  -> preserve intentional non-empty pages
```

Eine Seite gilt nicht allein deshalb als inhaltlich relevant, weil ein technischer Seitencontainer existiert.

Nicht als Inhalt zählen beispielsweise:

- leerer Absatz, der nur durch Pagination entstanden ist
- technischer Endmarker
- abschließender Page-Break ohne nachfolgenden Inhalt
- unsichtbarer Layout-Placeholder
- reine Editor-Metadaten

### Manueller Seitenumbruch

```text
Text
--- Seitenumbruch ---
Text
```

muss zwei Seiten erzeugen.

```text
Text
--- Seitenumbruch ---
<Ende des Dokuments>
```

soll **keine zusätzliche leere Abschlussseite** erzeugen.

Falls später absichtlich leere Seiten benötigt werden, ist dafür eine explizite Funktion `Leere Seite einfügen` vorzusehen. Ein abschließender Seitenumbruch darf nicht als Ersatz dafür dienen.

### Akzeptanzkriterien

- Ein einseitiger Brief erzeugt exakt eine Druckseite.
- Ein abschließender Page-Break erzeugt keine leere Abschlussseite.
- Ein Page-Break zwischen zwei Textteilen erzeugt exakt zwei Seiten.
- Preview, Print und PDF verwenden dieselbe normalisierte Seitenliste.

**Priorität: P0**

---

## A3. Semantische Dokumentfarben aus dem linken Dokumentpane entfernen

Die bisher sichtbaren Einstellungen wie Alert Color, Warning Color und vergleichbare semantische Farben sollen aus den normalen Dokumenteinstellungen verschwinden.

### Neue Zuordnung

```text
Einstellungen
  -> Dokumentdarstellung / Farben
     -> Primary
     -> Warning
     -> Alert/Error
     -> Info
     -> Success
     -> Highlight Defaults
```

Sie können als globale Defaults bzw. Theme-Einstellungen bestehen bleiben. Nur wenn später ein Dokument einen expliziten Override benötigt, wird dieser über einen erweiterten Theme-Bereich angeboten.

**Priorität: P1**

---

## A4. Grundschriftgröße aus Metadatenpane herauslösen

Die allgemeine Text-/Grundschriftgröße soll nicht zwischen Betreff, Adressen und Brief-Metadaten stehen.

### Ziel

- globaler Default: Einstellungen
- dokumentweiter Override: Editor/Format bzw. Dokument-Schriftthema
- lokale Textgröße: nur wenn das Rich-Text-Modell dieses Feature bewusst unterstützt

**Priorität: P1**

---

## A5. Klassisches Format-Menü tatsächlich mit dem aktiven Bearbeitungskontext verbinden

### Fehlerbild
Text wird im Editor markiert. Anschließend wird beispielsweise `Format -> Fett` gewählt. Der Menüpunkt verändert die markierte Auswahl derzeit nicht zuverlässig.

### Soll-Verhalten
Menü, Toolbar und Tastenkombinationen verwenden **dieselben Commands**. Keine getrennten Implementierungen.

Empfohlene Architektur:

```ts
interface FormatCommandContext {
  target: 'rich-editor' | 'markdown-editor' | 'subject' | 'field' | 'none'
  selection?: unknown
}

interface EditorCommandDispatcher {
  canExecute(command: EditorCommandId): boolean
  execute(command: EditorCommandId): void
}
```

Beispiel:

```text
Format -> Fett
        |
        +-- Rich Editor aktiv -> aktuellen ProseMirror-Mark anwenden
        +-- Betreff aktiv     -> gesamten Betreffblock fett formatieren
        +-- kein Ziel         -> Menüeintrag disabled
```

### Betreff
Der Betreff ist ein strukturiertes Dokumentelement. Wird bei aktivem Betreff `Fett` angewandt, wird der gesamte Betreffblock fett dargestellt. Es soll nicht versucht werden, innerhalb eines normalen einzeiligen `<input>` Teilbereiche als Rich Text zu verwalten.

**Priorität: P0/P1**

---

## A6. Formatierung entfernen

Es fehlt ein klarer Command:

```text
Formatierung entfernen
```

Icon beispielsweise Radierer bzw. `Tx` mit Entfernen-Symbol.

### Erste Stufe
Bei markierter Auswahl entfernen:

- Fett
- Kursiv
- Unterstrichen
- Durchgestrichen
- Inline-Code, sofern sinnvoll
- Textfarbe
- Hintergrund/Highlight
- weitere reine Zeichen-Marks

### Zweite Stufe / optional
Später zusätzlich:

```text
Absatzformat zurücksetzen
```

für Überschrift, Ausrichtung, Einzug usw.

### Shortcuts
Als Kandidat:

- Windows/Linux: `Ctrl+\`
- macOS: `Cmd+\`

Nur verwenden, wenn kein Konflikt mit dem aktiven Editor/Browser entsteht.

**Priorität: P1**

---

## A7. Visuell/Markdown als echter beschrifteter Switch

Der aktuelle Umschalter soll als echter Toggle/Switch erscheinen.

Beispiel:

```text
Visuell   [ O---- ]   Markdown
```

oder je nach Design:

```text
[ Visuell | Markdown ]
```

aber als eindeutig ein Zustand steuerndes Control und nicht als zwei unverbundene Buttons.

### Anforderungen

- klare Labels links/rechts
- aktiver Zustand sofort erkennbar
- zusätzliche erklärende Dauertexte neben dem Toggle entfallen
- Moduswechsel darf den Editorinhalt nicht verlieren
- bei nicht roundtrip-fähigem Inhalt muss gewarnt werden, nicht stillschweigend löschen

Undo/Redo können in derselben oberen Command-Zeile angeordnet werden.

**Priorität: P1**

---

## A8. Toolbar-Icons vergrößern und Bedienflächen vereinheitlichen

Die aktuellen Icons wirken zu klein.

### Zielwerte als Designrichtlinie

- Icon optisch etwa 18-20 px
- Click-/Tap-Fläche etwa 36-40 px
- konsistente Abstände
- Tooltip für Icon-only Controls
- `aria-label` für Screenreader
- aktive Toggle-Commands sichtbar hervorheben

Die tatsächlichen Werte dürfen im Designsystem angepasst werden; entscheidend ist eine klar größere, ruhige Toolbar.

**Priorität: P1**

---

## A9. Text-Hintergrund / Highlight reparieren

### Fehlerbild
Text-Hintergrund bzw. Highlight funktioniert trotz vorhandener UI derzeit nicht zuverlässig.

### Debuggingpfad
Nicht nur CSS prüfen. Die aktuelle Darstellung besitzt bereits Highlight-Stile; deshalb muss die gesamte Kette getestet werden:

```text
Command
-> Editor Mark
-> Editor DOM
-> Markdown/Directive Serialization
-> Markdown Parsing
-> Rich-Editor Reload
-> Preview Renderer
-> Print Renderer
```

### Akzeptanztest

1. Wort markieren.
2. Highlightfarbe wählen.
3. Markierung ist sofort sichtbar.
4. In Markdown-Modus wechseln.
5. Zurück in Visuell wechseln.
6. Markierung bleibt vorhanden.
7. Dokument speichern/schließen/öffnen.
8. Markierung bleibt vorhanden.
9. Preview zeigt Markierung.
10. Print/PDF zeigt Markierung, sofern Dokumenttheme dies vorsieht.
11. `Farbe zurücksetzen` entfernt sie wieder.

**Priorität: P0/P1**

---

# A10. Zentrale Shortcut Registry

Tastenkombinationen sollen nicht verteilt in Komponenten hardcodiert werden. Eine zentrale Registry steuert:

- Event Handling
- Menütexte
- Toolbar-Tooltips
- Hilfeseite `Tastenkürzel`
- Plattformdarstellung für Windows/Linux/macOS

Beispiel:

```ts
interface ShortcutDefinition {
  id: string
  command: EditorCommandId | AppCommandId
  windowsLinux?: string[]
  mac?: string[]
  scope: 'global' | 'workspace' | 'editor'
  preventBrowserDefault: boolean
  descriptionKey: string
}
```

## Empfohlenes Basisset

| Funktion | Windows / Linux | macOS | Scope |
|---|---|---|---|
| Speichern | Ctrl+S | Cmd+S | Workspace |
| Drucken | Ctrl+P | Cmd+P | Workspace |
| Rückgängig | Ctrl+Z | Cmd+Z | Editor |
| Wiederherstellen | Ctrl+Y und optional Ctrl+Shift+Z | Cmd+Shift+Z | Editor |
| Fett | Ctrl+B | Cmd+B | Editor |
| Kursiv | Ctrl+I | Cmd+I | Editor |
| Unterstrichen | Ctrl+U | Cmd+U | Editor |
| Link | Ctrl+K | Cmd+K | Editor |
| Suchen | Ctrl+F | Cmd+F | Editor/Workspace |
| Alles auswählen | Ctrl+A | Cmd+A | Editor |
| Seitenumbruch | Ctrl+Enter | Cmd+Enter | Editor |
| Formatierung entfernen | Ctrl+\ | Cmd+\ | Editor |
| H1-H6 | Ctrl+Alt+1...6 | Cmd+Option+1...6 | Editor |

### Vorsicht bei Browser-Shortcuts
`Ctrl/Cmd+N`, `Ctrl/Cmd+O`, `Ctrl/Cmd+W` und ähnliche Browser-/Fenster-Shortcuts nicht global aggressiv hijacken. Für PWA/Desktop später separat prüfen.

`Ctrl+U` ist in Browsern oft `View Source`; nur im aktiven Rich-Text-Editor abfangen.

### Dokumentation
Eine eigene Hilfeseite bzw. Dialog:

```text
Hilfe -> Tastenkürzel
```

muss aus derselben Registry generiert werden.

**Priorität: P1**

---

# A11. Sichtbarkeit optionaler Dokumentfelder

Nicht jedes Feld benötigt zwingend eine zusätzliche Checkbox.

## Kategorie 1 - leere optionale Felder
Ist das Feld leer, wird es nicht gerendert. Keine Checkbox nötig.

Beispiele:

- Aktenzeichen
- Zeichen
- optionale Telefonnummer

## Kategorie 2 - gefülltes Feld, das bewusst versteckt werden können soll
Checkbox sinnvoll:

```text
[x] Im Dokument anzeigen
```

Beispiele:

- Betreff
- Dokumentdatum
- ggf. Absender-E-Mail

## Kategorie 3 - strukturelle Bereiche
Absender/Empfänger werden nicht durch Einklappen unsichtbar. Das Accordion verändert nur die **Bearbeitungsoberfläche**, nicht den Dokumentinhalt.

**Priorität: P1**

---

# A12. Absender/Empfänger eingeklappt: kompakte Zusammenfassung statt vollständigem Verschwinden

Eingeklappt:

```text
> Empfänger
  Dr. Erika Beispiel                         [Kontakte]
```

Ausgeklappt:

```text
v Empfänger
  Kontakt: Dr. Erika Beispiel                [Kontakte]

  Straße        Beispielstraße 12
  Hausnummer    12
  PLZ           12345
  Ort           Berlin
  Land          Deutschland

  [ Aus Kontakt zurücksetzen ]
```

### Snapshot-Regel
Wird ein Kontakt aus dem Kontaktverzeichnis gewählt, speichert das Dokument weiterhin einen Snapshot. Der Nutzer darf den Snapshot im Dokument ändern, ohne den globalen Kontakt zu verändern.

### Reset
`Aus Kontakt zurücksetzen` verwirft lokale Snapshot-Änderungen und übernimmt die aktuellen Kontaktdaten erneut.

Optional kann ein kleiner Status erscheinen:

```text
Geändert gegenüber Kontaktverzeichnis
```

**Priorität: P1**

---

# A13. Kontaktimport: vCard/VCF und CSV

Das Kontaktverzeichnis soll externe Kontakte importieren können.

## Erste Zielformate

1. vCard / `.vcf`
2. Google-kompatibles CSV
3. später weitere CSV-Mappings, z. B. Outlook

### Importwege

```text
[ Kontakte importieren ]
```

und Drag-and-drop auf die Kontaktansicht.

### Importvorschau

```text
37 Kontakte erkannt

24 neu
8 wahrscheinlich vorhanden
5 benötigen Prüfung
```

Keine automatische ungeprüfte Zusammenführung.

### Duplikaterkennung
Priorisierte Signale:

1. stabile externe ID bzw. vCard UID
2. identische normalisierte E-Mail-Adresse
3. identische normalisierte Telefonnummer
4. Name + Adresse/PLZ
5. Fuzzy Match nur als Vorschlag

### Konfliktdialog

```text
Vorhanden              Import
--------------------------------
max@example.de         max@example.de
Musterstraße 1         Musterstr. 1

[ Überspringen ] [ Zusammenführen ] [ Als neu importieren ]
```

### Sicherheitsregel
Importdateien sind untrusted input. Größenlimit, Parsing-Limits, Schema-Validierung und keine HTML-Ausführung.

**Priorität: P1/P2**

---

# A14. Drag-and-drop-Import im Arbeitsbereich

Markdown-Dokumente sollen neben dem Import-Button auch per Drag-and-drop importiert werden können.

Drop-State:

```text
+--------------------------------------------+
|                                            |
|       Markdown-Dokument hier ablegen       |
|                                            |
+--------------------------------------------+
```

Vor Persistenz prüfen:

- Markdown parsebar
- YAML Front Matter
- Foldmark-Schema-Version
- Dokumenttyp
- unbekannte Felder
- referenzierte Assets
- Größenlimit
- gefährliches HTML / Direktiven

Danach Importvorschau bzw. klare Fehlermeldung.

**Priorität: P1**

---


# Teil B - Bisherige konsolidierte V1-Post-Release-Spezifikation (Stand 13.09.2026)

# Foldmark – V1 Post-Release-Korrekturen, UX-Redesign und Coding-Agent-Spezifikation
**Stand:** 13.09.2026  
**Status:** verbindlicher Arbeits-Draft für die nächste Korrektur-/Verbesserungsrunde nach V1.0  
**Zweck:** Dieses Dokument bündelt das komplette nach V1.0 diktierte Feedback für die unmittelbare Weiterentwicklung von Foldmark. Es ist als Input für einen Coding-Agenten gedacht und beschreibt UX-Absichten, Funktionsregeln, Fehlerbilder, Prioritäten und Akzeptanzkriterien.

---

# 0. Arbeitsauftrag an den Coding-Agenten

Die bestehende Foldmark-V1.0 soll **nicht neu geschrieben**, sondern gezielt verbessert werden.

Wichtig:

1. Bestehende, bereits funktionierende Features erhalten.
2. Keine Architekturvereinfachung auf Kosten bereits implementierter Funktionen.
3. UI/UX darf deutlich überarbeitet werden.
4. Bestehende Datenmodelle nur migrieren, wenn nötig.
5. Lokale Daten müssen bei Migrationen erhalten bleiben.
6. Markdown bleibt vorerst das kanonische Dokumentformat.
7. Vorschau, Druck und Export dürfen nicht auseinanderlaufen.
8. Privacy-by-default und Offline-Fähigkeit bleiben wichtig.
9. Funktionen, die erst für spätere Versionen vorgesehen sind, nur vorbereiten.
10. Die aktuelle V1.0 ist die funktionale Basis; diese Spezifikation ist eine Korrektur- und Verfeinerungsrunde.

---

# 1. Prioritätsklassen

## P0 – V1.0.x Bugfix / Regression
Muss vor oder unabhängig vom größeren Redesign behoben werden.

## P1 – unmittelbare V1-Korrektur
Soll in die nächste reguläre V1-Iteration.

## P2 – V1.x Ausbau
Kann nach dem Kern-Redesign folgen.

## P3 – spätere Version / vorbereiten
Nicht jetzt vollständig implementieren, aber Architektur nicht verbauen.

---

# 2. Navigation und Arbeitsbereich

## 2.1 Hauptnavigation „Arbeitsbereich“

Die Start-/Arbeitsbereichsansicht soll stärker wie ein klassischer Datei- bzw. Dokumentmanager funktionieren.

Statt mehrerer eng beieinanderliegender Buttons:

```text
[ + Neu ▾ ]    [ Importieren ]    [ Export / Backup ]    [ Archiv ]
```

### „+ Neu“-Menü

Mindestens:

```text
+ Neu
├── Brief
├── Postkarte
├── Karte
├── Foto
├── Freies Dokument
└── Ordner / Projekt
```

Später erweiterbar um:

```text
├── Rezept-/Arztzettel
├── DIN-A5-Dokument
├── Lernkarte
├── Terminblatt
├── Terminschreiben
└── weitere Dokumenttypen
```

**Priorität:** P1

---

## 2.2 Dokumentliste

Die Übersicht soll stärker wie eine Dateiablage aussehen.

Empfohlene Spalten:

```text
Name
Typ / Format
Projekt / Ordner
Geändert
Größe
Status
```

Optional später:

```text
Eigentümer
Tags
Quelle
```

Aktionen pro Dokument:

```text
Öffnen
Umbenennen
Duplizieren
Verschieben
Archivieren
Exportieren
Löschen
```

Sortierung mindestens nach:

```text
Name
Zuletzt geändert
Zuletzt geöffnet
Dokumenttyp
```

**Priorität:** P1

---

# 3. Projekte / Ordnerstruktur

Dokumente sollen in einer Ordner-/Projektstruktur abgelegt werden können.

Beispiel:

```text
Dokumente
├── Privat
│   ├── Versicherungen
│   │   └── Rentenversicherung
│   └── Gesundheit
├── Arbeit
└── Archiv
```

Anforderungen:

- Ordner erstellen
- umbenennen
- verschieben
- Dokumente verschieben
- Ordner verschachteln
- Breadcrumb-Navigation
- ganze Ordner archivieren
- archivierte Ordner wieder einblenden

**Priorität:** P1/P2

## 3.1 Projektdefaults – später

Ab Version 2.x sollen Projekte Defaultwerte hinterlegen können.

Beispiel:

```text
Projekt: Deutsche Rentenversicherung

Default-Empfänger:
Deutsche Rentenversicherung ...

Default-Dokumentprofil:
DIN A4 Brief

Default-Sprache:
Deutsch
```

Neue Dokumente im Projekt übernehmen diese Werte.

**Priorität:** P3 / Version 2.x

---

# 4. Archiv

Dokumente und komplette Ordner sollen archiviert werden können, ohne gelöscht zu werden.

Archivieren bedeutet:

- aus Standardlisten ausblenden
- Daten behalten
- über Archivansicht auffindbar
- Wiederherstellen möglich

Mögliche UI:

```text
[ ] Archivierte anzeigen
```

oder separate Ansicht:

```text
Archiv
```

**Priorität:** P1

---

# 5. Vollständiger App-Export / Backup

Spätere Ausbaustufe:

```text
[ Alles exportieren ]
```

Erzeugt ein ZIP-Archiv:

```text
foldmark-backup/
├── manifest.json
├── documents/
│   └── *.md
├── contacts/
│   └── contacts.json
├── projects/
│   └── projects.json
├── profiles/
│   └── print-profiles.json
├── settings/
│   └── settings.json
└── assets/
```

Anforderungen:

- Dokumente primär als Markdown
- IDs erhalten
- Beziehungen wiederherstellbar
- später kompletter Restore
- ZIP lokal erzeugen
- keine Cloud erforderlich

In der Diktation als sehr spätes Feature genannt („Version 7“).

**Priorität:** P3

---

# 6. Kontaktverzeichnis statt reinem Adressbuch

„Adressbuch“ kann optional in **Kontaktverzeichnis** umbenannt werden.

Begründung: Ein Kontakt kann mehrere Adressen und mehrere Kontaktdaten besitzen.

Das Datenmodell ist wichtiger als die genaue Benennung.

**Priorität:** P2

---

# 7. Kontaktmodell

Ein Kontakt kann enthalten:

```text
Person / Organisation
mehrere postalische Adressen
mehrere E-Mail-Adressen
mehrere Telefonnummern
mehrere Websites
Tags
Favorit
Primärkontakt
Bild/Avatar optional
Notizen optional
```

Mindestens:

```text
Vorname
Nachname
```

Internationalisierung berücksichtigen; kein ausschließlich deutsches Namensmodell.

Optional später:

```text
Weitere Vornamen
Namenspräfix
Namenssuffix
Anzeigename
Organisation
Abteilung
```

**Priorität:** P1/P2

---

# 8. Mehrere postalische Adressen pro Kontakt

Beispiel:

```text
Max Mustermann
├── Privatadresse
├── Postfach
└── Geschäftsadresse
```

Jede Adresse besitzt:

```text
Bezeichnung
Land
Straße / Hausnummer bzw. länderspezifische Felder
PLZ
Ort
Region / Bundesland / State
Postfach optional
Primärstatus
Favoritenstatus
```

**Priorität:** P2

---

# 9. Länderwahl und Adresseingabe

Die aktuelle UI mit getrenntem „Land“ und „Land suchen“ soll durch eine einzelne durchsuchbare Combobox ersetzt werden.

```text
Land
[ Deutschland                         ▾ ]
```

Beim Tippen:

```text
"nie"

Niederlande
Nigeria
Niger
```

Anforderungen:

- lokale Länderliste
- keine externe API für Länderwahl
- Tastaturbedienung
- Fuzzy-Suche
- Ländername in UI-Sprache
- ISO-Code intern

Beim neuen Kontakt:

1. Land
2. länderspezifische Felder

Aktuell fehlende Translation-Keys wie „Region“ vollständig prüfen.

**Priorität:** P0/P1

---

# 10. Kontaktinformationen

Mehrere E-Mail-Adressen:

```text
E-Mail
[ privat@example.de        ] [ Primär ]
[ arbeit@example.de        ] [        ]
[ + E-Mail ]
```

Mehrere Telefonnummern und Websites analog.

„Primär“ ist die zentrale Eigenschaft. Ob eine Information im gedruckten Dokument sichtbar wird, ist eine separate Layoutentscheidung.

**Priorität:** P1/P2

---

# 11. Kontaktverzeichnis – Listenansicht

Kontakte alphabetisch sortieren, optional nach Anfangsbuchstaben gruppieren.

Fuzzy-Suche über:

- Name
- Organisation
- Stadt
- Straße
- E-Mail
- Tags
- ggf. Notizen

Beispiel:

```text
Suche: Berlin
```

liefert alle Kontakte mit Berlin-Bezug.

Kontaktliste soll paginierbar sein:

```text
‹ 1 2 3 4 ›
```

Suche arbeitet über den vollständigen Datenbestand und paginiert danach.

**Priorität:** P1

---

# 12. Dev-/Beispieldaten

Unter Einstellungen im Development-Modus:

```text
Entwickler / Beispieldaten

[ Beispieldaten einfügen ]
[ Beispieldaten entfernen ]
```

Mindestens:

- 20 Kontakte
- unterschiedliche Länder
- verschiedene Orte
- Primärkontakt
- Heimatadresse
- Favoriten
- mehrere E-Mails
- mehrere Telefonnummern
- mehrere Websites
- Postfach
- Organisation
- Tags

Zusätzlich:

- mehrere Briefe
- Postkarten
- freie Dokumente
- Mehrseiten-Dokument
- Dokument mit Bild
- Dokument mit Tabelle
- Dokument mit Seitenumbruch
- archiviertes Dokument
- Dokumente in Projekten

Alle Testdaten mit stabilem Marker, z. B.:

```ts
source: 'foldmark-demo'
```

oder:

```ts
demoData: true
```

Optional deterministische IDs:

```text
demo-contact-001
demo-document-001
```

Automatisierte E2E-/Screenshot-Tests müssen diese Daten explizit über Einstellungen aktivieren.

**Priorität:** P1

---

# 13. Kontakt hinzufügen / bearbeiten

Bevorzugt als zentrierter Modal-/Dialog statt Seitenwechsel.

Anforderungen:

- klare Überschrift
- X/Schließen-Icon
- Escape
- Backdrop-Klick bei nicht-destruktiven Zuständen
- Warnung bei ungespeicherten Änderungen
- Speichern
- Speichern als Entwurf
- Abbrechen
- Löschen bei bestehenden Kontakten

Löschen mit Confirmation-Dialog.

**Priorität:** P1

---

# 14. Druckprofile

Bezeichnungen klarer machen:

```text
DIN A4 Brief – Form A
DIN A4 Brief – Form B
```

Das Wort „(Entwurf)“ entfernen, sofern es nur ein Entwicklungslabel ist.

Profile sinnvoll gruppieren/sortieren:

```text
Briefe
├── DIN A4 Brief – Form B
├── DIN A4 Brief – Form A
├── A4 frei
└── US Letter

Karten
├── A6 Postkarte
├── A5 Karte
└── ...

Fotos
├── 10 × 15 cm
├── 13 × 18 cm
├── 15 × 20 cm
└── ...

Weitere
├── Lernkarte
├── Briefumschlag
└── Benutzerdefiniert
```

Weitere Formate evaluieren:

- mehrere verbreitete Fotoformate
- Lernkarten
- Briefumschläge
- weitere Papiergrößen
- DIN A5
- freie Dokumente

Systemprofile:
- nicht löschbar

Custom-Profile:
- anlegen
- bearbeiten
- löschen
- duplizieren

**Priorität:** P1/P2

---

# 15. Asset-/Bildbibliothek

Assettypen künftig:

```text
Bild
Signatur
Logo
QR-Code
Hintergrund
```

Später ggf. weitere grafische Elemente.

Bildmetadaten:

```text
Titel
Beschreibung
Dateiname
MIME-Type
Abmessungen
Dateigröße
Erstellt/Importiert
```

Titel unabhängig vom Dateinamen änderbar.

Später:
- Projektzuordnung
- Ortsbezug
- Tags

**Priorität:** P1/P2/P3

---

# 16. Bildimport und Bildbearbeitung

Aktuelles Limit von ungefähr 8 MB kann vorerst bestehen bleiben.

Optional automatische browserseitige Optimierung:

- Maximalauflösung
- JPEG/WebP-Kompression
- Original optional behalten
- Qualitätsänderung transparent machen

Später clientseitiger Minimaleditor:

- Zuschneiden
- Drehen
- Spiegeln optional
- Skalieren
- Zielformat
- Canvas/Hintergrund erweitern
- als Kopie speichern
- Original nicht destruktiv überschreiben

Beispiel: Foto auf Postkartenformat anpassen.

**Priorität:** P2

---

# 17. QR-Code

Spätere Funktion:

```text
QR-Code einfügen
```

Mögliche Inhalte:

- URL
- Text
- E-Mail
- vCard
- Termin
- benutzerdefinierter Text

Lokal generieren.

**Priorität:** P3 / Version 2.x / optional Premium

---

# 18. Einstellungen – Redesign

Kategorien:

```text
Allgemein
Dokumente
Darstellung
Schriften
Farben
Datum & Sprache
Speicher & Verlauf
Datenschutz
Daten & Backup
Entwicklung
Über Foldmark
```

Globale Dokumentdefaults:

```text
Standardsprache
Standard-Datumsformat
Standard-Dokumentprofil
Standard-Schriftfamilie
Standard-Schriftgröße
Standard-Zeilenabstand
Standard-Absatzabstand
Standard-Seitenzahlen
```

Sprache und Datumsformat konfigurierbar.

Semantische Farben wie Primary/Warning eher hier bzw. in erweiterten Theme-Einstellungen, nicht prominent im Dokumentpane.

Datenverwaltung:

```text
Dokumente löschen
Kontakte löschen
Assets löschen
Verlauf löschen
Alle lokalen Daten löschen
```

Destruktive Aktionen immer bestätigen.

**Priorität:** P1/P2

---

# 19. Open-Source- und Datenschutzseiten

Open-Source-Seite besser strukturieren:

- Bibliothek
- Version
- Lizenz
- Projektlink
- Lizenztext/Notice
- ggf. Runtime/Development gruppieren

Generated Markdown sauber rendern.

Datenschutz-/Rechtslinks können im Dev-Modus zunächst placeholder bleiben; produktiv später auf Lambro-Code-Seiten.

**Priorität:** P1/P2

---

# 20. Dokumenteditor – Gesamtaufbau

Die bisherige mittige Umschaltung „Dokumente – Schreiben – Vorschau“ in der aktuellen Form entfernen bzw. neu gestalten.

Die drei Bereiche klar benennen:

```text
Dokumenteinstellungen
Schreibbereich
Vorschau
```

**Priorität:** P0/P1

---

# 21. Workspace Layout

Layout-Dropdown nicht nur numerisch:

```text
Layout
[ Automatisch ▾ ]
```

Optionen verständlich:

```text
Automatisch
Dokumenteinstellungen
Schreibbereich
Vorschau
Dokumenteinstellungen + Schreibbereich
Schreibbereich + Vorschau
Dokumenteinstellungen + Vorschau
Alle drei Bereiche
```

In typischer Laptop-Landscape-Ansicht grundsätzlich alle drei Bereiche, sofern Platz reicht.

Auf Mobile Bereiche untereinander bzw. fokussiert/kollabierbar.

**Priorität:** P1

---

# 22. Resizable Panes

Desktop:

```text
Dokumenteinstellungen │ Schreibbereich │ Vorschau
                      ↔               ↔
```

Regeln:

- kein Pane auf 0
- sinnvolle Mindestbreiten
- Preview bleibt nutzbar
- Zustand optional lokal speichern
- Doppelklick auf Splitter kann Defaultbreite wiederherstellen

**Priorität:** P1/P2

---

# 23. Bereiche ein-/ausblenden

Desktop kleine Collapse-Handles:

```text
[Dokumenteinstellungen] ◀ │ Schreibbereich │ ▶ [Vorschau]
```

Mobile vertikale Pfeile.

Nicht so aus DOM entfernen, dass Editorzustand verloren geht.

**Priorität:** P1

---

# 24. Maximieren / Fokusmodus

Für Schreibbereich und Vorschau:

```text
[ Maximieren ]
```

Ergebnis:

- gewählter Bereich nimmt fast die ganze Arbeitsfläche ein
- andere Panels temporär eingeklappt
- Exit klar sichtbar

**Priorität:** P1/P2

---

# 25. Klassisches Anwendungsmenü

Oben im Editor:

```text
Datei
Bearbeiten
Einfügen
Format
Ansicht
Hilfe
```

Beispielinhalte:

## Datei
Neu, Öffnen, Speichern, Duplizieren, Importieren, Exportieren, Drucken, Schließen

## Bearbeiten
Undo, Redo, Ausschneiden, Kopieren, Einfügen, Suchen

## Einfügen
Datum, Link, Tabelle, Bild, QR-Code später, Seitenumbruch

## Format
Absatz, Überschrift, Fett, Kursiv, Unterstrichen, Durchgestrichen, Textfarbe, Markieren, Ausrichtung

## Ansicht
Pane-Sichtbarkeit, Fokusmodus, Layout, Hilfslinien, Zoom

## Hilfe
Hilfe, Tastenkürzel, Über Foldmark, Open-Source-Lizenzen

**Priorität:** P1/P2

---

# 26. Foldmark-Logo und Schließen

Klick auf Foldmark-Logo/Mark-Icon bringt zurück in den Arbeitsbereich, analog zur Schließen-Aktion.

Schließen-Button mit eindeutigem Icon und Tooltip.

Bei ungespeicherten Daten Autosave abwarten bzw. sauber absichern.

**Priorität:** P1

---

# 27. Speichern und Versionshistorie

Autosave funktioniert grundsätzlich gut und bleibt.

Manueller Speichern-Button bleibt.

Manuelle und wiederhergestellte Versionen im Verlauf deutlich hervorheben.

Verlauf als zentrierter Modal:

- X
- Backdrop
- Escape
- Version auswählen
- Vorschau
- Wiederherstellen
- als Kopie öffnen

Automatische Checkpoints nach Aufbewahrungsregel bereinigen.

Einstellung z. B.:

```text
Automatische Versionen behalten:
[ 20 ▾ ]
```

oder zeitbasiert.

Manuelle Versionen nicht ohne explizite Regel automatisch löschen.

**Priorität:** P1/P2

---

# 28. Dokumenteinstellungen – Accordions

Alle Gruppen einklappbar.

Standardmäßig geöffnet:

- Dokument
- Absender
- Empfänger
- Briefangaben

Optional geschlossen:

- Seitenzahlen & Druck
- Dokumenttheme / Schrift
- Erweiterte Optionen

**Priorität:** P1

---

# 29. Dokument – Grunddaten

Ganz oben:

```text
Dokumentprofil
[ DIN A4 Brief ▾ ]
```

Beispiele:

```text
DIN A4 Brief
Freies Schreiben
Postkarte
Karte
Foto
```

Dokumentname/Speichertitel ist der interne Name im Arbeitsbereich.

Einmalige Titel-/Betreff-Synchronisierung:

- wenn Dokumentname leer und Betreff erstmals gefüllt: Dokumentname = Betreff
- wenn Betreff leer und Dokumentname erstmals gefüllt: Betreff = Dokumentname
- danach keine permanente Kopplung

**Priorität:** P1

---

# 30. Betreff

Betreff gehört zu Briefangaben.

Option:

```text
[x] Betreff im Dokument anzeigen
```

Default bei Brief: aktiviert.

Defaultdarstellung: fett.

**Priorität:** P1

---

# 31. Absender und Empfänger

Als Accordions.

Eingeklappt kompakte Zusammenfassung mit Kontaktverzeichnis-Icon.

Ausgeklappt:

- Kontakt-/Adressauswahl
- vollständiger editierbarer Adress-Snapshot
- relevante Kontaktdaten

Button-/Tooltiptext:

```text
Kontaktverzeichnis
```

statt „Aus Adressbuch übernehmen“.

**Priorität:** P1

---

# 32. Briefangaben

Accordion:

```text
Briefangaben
```

Enthält mindestens:

```text
Betreff
Datum
Zeichen
Aktenzeichen
Anrede
Grußformel
```

Datum kann vorbefüllt und ein-/ausblendbar sein.

Zeichen/Aktenzeichen optional.

Anrede und Grußformel aus der Editor-Toolbar herausziehen und strukturiert hier verwalten.

**Priorität:** P1

---

# 33. Anrede und Grußformel – technische Verankerung

Keine fragile Textsuche nach „Sehr geehrte …“.

Besser strukturierte Marker im Dokumentmodell.

Beispiel:

```markdown
:::foldmark-salutation
Sehr geehrte Frau Beispiel,
:::

...

:::foldmark-closing
Mit freundlichen Grüßen
:::
```

Anforderungen:

- WYSIWYG zeigt normalen Text
- Source-Modus zeigt stabile Foldmark-Markierung
- Renderer kennt semantische Bedeutung
- Dropdown in Dokumenteinstellungen kann Inhalt ersetzen
- Plain Text enthält nur sichtbaren Text
- fremde Markdown-Editoren bleiben möglichst verständlich

Keine schwer nachvollziehbaren unsichtbaren Unicode-Steuerzeichen verwenden.

**Priorität:** P1

---

# 34. E-Mail-Kontaktdaten

Kein separater Mail-Kontaktblock nötig.

E-Mail bevorzugt aus Absender-/Empfängerkontakt.

Fehlt Empfänger-Mailadresse beim Handoff:

- Warnung
- kein harter Blocker
- Mailclient darf ohne vorausgefüllten Empfänger öffnen

**Priorität:** P1

---

# 35. Seitenzahlen

Eigene einklappbare Gruppe.

Format-Dropdown mindestens:

```text
Keine
1
Seite 1
Seite 1 von 4
1 / 4
1 von 4
```

Position:

```text
oben links
oben Mitte
oben rechts
unten links
unten Mitte
unten rechts
```

„Erste Seite ausblenden“ beibehalten.

**Priorität:** P1

---

# 36. Dokumenttheme / Schrift

Eher Dokument-Schriftthema.

Mindestens:

```text
Schriftfamilie
Grundschriftgröße
Zeilenabstand
Absatzabstand
```

Weitere Open-Source-Schriften später ergänzen.

Globale Defaults in Einstellungen; pro Dokument nur Overrides.

Aktuelle Feldlayouts optisch sauberer machen:

- gleiche Höhen
- responsive Grid
- konsistente Labels
- keine gequetschten Controls

Semantische Farben aus diesem Pane herausnehmen.

**Priorität:** P1/P2

---

# 37. Editor – Modusschalter

Umschalter:

```text
[ Visuell ] [ Markdown ]
```

ganz oben im Schreibbereich, oberhalb der Formatierungscontrols.

Gemeinsame Toolbar soweit möglich.

Je nach Modus:

- Commands anders routen
- nicht verfügbare Funktionen deaktivieren
- Buttons sichtbar ausgegraut

**Priorität:** P1

---

# 38. Editor-Toolbar

Mindestens:

```text
Undo
Redo
Absatz / Überschrift
Fett
Kursiv
Unterstrichen
Durchgestrichen
Code
Textfarbe
Markieren
Ausrichtung
Listen
Zitat
Link
Tabelle
Bild
Seitenumbruch
```

Überschriften mindestens H1–H6.

Toolbar kontextsensitiv:
Wenn eine Aktion im aktuellen Node nicht sinnvoll/zulässig ist, deaktivieren.

**Priorität:** P1

---

# 39. Farben / Highlight

Textfarbe / Markieren als sauberer Popup/Popover.

Wenn Text markiert:
Farbe auf Auswahl anwenden.

Wenn kein Text markiert und Textfarbe aktiv:
neue Eingabe in gewählter Farbe fortsetzen, soweit sinnvoll.

Pflicht:

```text
Farbe zurücksetzen
```

bzw.:

```text
Keine Farbe
Standard
```

Highlight mit aktivem Zustand und Farbauswahl.

**Priorität:** P1/P2

---

# 40. Tabellen

Aktuell feste 3×3-Tabelle als guter Default.

Erweitern um Popover:

```text
Tabelle einfügen

□ □ □ □ □
□ □ □ □ □
□ □ □ □ □
□ □ □ □ □
```

Hover zeigt z. B. „3 × 3“.

Alternativ/zusätzlich Felder für Zeilen/Spalten.

Später Tabellenoperationen:
Zeilen/Spalten hinzufügen/löschen, Kopfzeile, Ausrichtung, Tabelle löschen.

**Priorität:** P1/P2

---

# 41. Link einfügen

Popup:

```text
Link einfügen

Text / Titel:
[ OpenAI ]

URL:
[ https://... ]

[Abbrechen] [Einfügen]
```

Bei markiertem Text Titel vorausfüllen.

**Priorität:** P1

---

# 42. Bild einfügen – Bug

Aktuell:

- Auswahl aus Bibliothek ohne sichtbares Ergebnis
- manuelles Einfügen ohne sichtbares Ergebnis
- Editor und Vorschau zeigen Bild nicht zuverlässig

**Priorität:** P0

Bilddialog:

```text
Aus Bibliothek
Datei importieren
```

Mit Bildvorschau.

Akzeptanz:
Bild muss sichtbar sein in

- visuellem Editor
- Markdown-Repräsentation
- Vorschau
- Druck
- PDF
- nach erneutem Öffnen

**Priorität:** P0/P1

---

# 43. Seitenumbruch

Editor-Seitenumbruch funktioniert grundsätzlich.

Vorschau muss ihn zuverlässig in zusätzliche Seiten umsetzen.

Akzeptanz:

```text
Absatz
Seitenumbruch
Absatz
```

ergibt mindestens zwei Preview- und zwei Druckseiten.

**Priorität:** P0/P1

---

# 44. Mehrseitige Vorschau

Mehrseitigkeit existiert, Scrollen wirkt teilweise hakelig:

- Sprünge
- beim Hochscrollen Hängen an Seitenrändern

Ziel:

- keine unerwarteten Sprünge
- Scroll anchoring prüfen
- Resize-/Zoom-Neuberechnung nicht während normalem Scrollen erzwingen
- keine Selektion, die Scrollposition zurücksetzt
- konsistente Seitenabstände

**Priorität:** P0/P1

---

# 45. Seitennavigation Vorschau

Bis 3 Seiten:

```text
1  2  3
```

Bei mehr als 3 Seiten:

```text
Seite [ 4 ▾ ] von 12
```

Optional:

```text
‹  Seite 4 von 12  ›
```

**Priorität:** P1

---

# 46. Preview-Maximierung und Quick Print

Vorschau erhält:

```text
[ Maximieren ]
[ Drucken ]
```

Quick-Print öffnet direkt den Druckdialog.

**Priorität:** P1/P2

---

# 47. Chrome-Druckfehler

Beobachtung:

- Firefox: Druckmodus funktioniert
- Chrome: teilweise wird der Druck-/Output-Dialog selbst gedruckt

Prüfhypothese:
Ein geöffnetes natives `<dialog>` liegt in der Top Layer. Wird währenddessen `window.print()` ausgelöst und der Dialog nicht vorher geschlossen/ausgeblendet, kann Chrome ihn anders behandeln als Firefox.

Korrektur prüfen:

1. Dialog vor `window.print()` schließen bzw. aus Top Layer entfernen.
2. Print-Root vorbereiten.
3. Layoutflush / nächsten Frame abwarten.
4. `window.print()`.
5. optional Dialogzustand danach wiederherstellen.

Zusätzlich prüfen:

```css
@media print {
  dialog,
  .output-dialog,
  .history-dialog,
  .modal,
  .popover {
    display: none !important;
  }

  .print-root {
    display: block !important;
  }
}
```

Browser-Testmatrix:

- Chrome
- Edge
- Firefox
- Safari später

**Priorität:** P0

---

# 48. Chrome Preview-Breite

Zeitweise beobachtet:
Seite geht in Chrome auf volle Breite bzw. Preview-Seitengröße stimmt nicht.

Noch nicht stabil reproduzierbar.

Regressionstest für:

- 100 % Zoom
- 80 %
- 60 %
- Browser Resize
- 1/2/3 Pane
- Preview maximiert
- A4
- Postkarte
- mehrere Seiten

Papiergeometrie bleibt in mm stabil; nur äußerer Preview-Zoom skaliert.

**Priorität:** P0/P1

---

# 49. Dokumentprüfung aus Druckdialog herauslösen

Eigene Funktion:

```text
Dokument prüfen
```

Mit Badge:

```text
✓ 0   ⚠ 2   ⓘ 3
```

oder kompakter.

Klick zeigt:

```text
Fehler
Warnungen
Hinweise
```

Wichtig:
Warnungen blockieren Drucken nicht.

Ein leeres Dokument muss druckbar sein.

Ein Dokument ohne Empfänger muss druckbar sein.

Harte Fehler nur, wenn Ausgabe technisch unmöglich ist.

**Priorität:** P1

---

# 50. Drei getrennte Ausgabeaktionen

Top-Level im Editor:

```text
[ Drucken ] [ Exportieren ] [ E-Mail ]
```

jeweils mit Icon.

Jede Aktion öffnet eigenen Dialog.

**Priorität:** P1

---

# 51. Dialog-UX allgemein

Alle wichtigen Dialoge:

- zentriert
- sichtbares X
- ESC
- Backdrop
- Klick außerhalb schließt bei nicht-destruktiven Dialogen
- Fokusfalle
- Fokus nach Schließen zurück zum Trigger
- mobil ggf. Sheet/Fullscreen

Gilt für:

- Drucken
- Exportieren
- E-Mail
- Verlauf
- Kontakt
- Löschen
- Bild
- Link
- Tabelle
- Farben

**Priorität:** P1

---

# 52. Drucken

Druckdialog enthält nur druckbezogene Optionen:

```text
Drucken

Druckprofil
Seiten
Marker / Hilfslinien
Seitenzahlen

[Abbrechen] [Drucken]
```

Kein harter Adress-Check.

**Priorität:** P1

---

# 53. Exportieren

Eigener Dialog.

Mindestens:

```text
PDF
Markdown
```

Später:

```text
ODT
Backup
```

PDF hier explizit auswählbar.

**Priorität:** P1

---

# 54. E-Mail

Eigener Dialog.

Optionen:

```text
PDF-Anhang
HTML-Mail
Plain-Text-Mail
```

**Priorität:** P1

---

# 55. Plain-Text-Mail – Bug

Aktuell gelangt Markdown-Syntax in Plain Text.

Ziel:
Markdown vollständig in sichtbaren Plain Text umwandeln.

Beispiel:

Markdown:

```markdown
**Sehr geehrte Frau Beispiel,**

bitte beachten Sie [diesen Link](https://example.org).

- Punkt 1
- Punkt 2
```

Plain Text:

```text
Sehr geehrte Frau Beispiel,

bitte beachten Sie diesen Link (https://example.org).

- Punkt 1
- Punkt 2
```

Keine Markdown- oder Foldmark-Direktivsyntax im Ergebnis.

**Priorität:** P0

---

# 56. HTML-Mail

Markdown nach sicherem HTML rendern.

Anforderungen:

- sanitizen
- kein Script
- keine unsicheren externen Inhalte
- keine Tracking-Pixel
- einfache Formatierung
- Tabellen/Links/Fett/Kursiv sinnvoll übertragen

**Priorität:** P1

---

# 57. Preview-/Print-Hilfslinien

Bekannter Bug:
Ein-/Ausblenden der Hilfslinien in der Vorschau muss unabhängig vom Druck funktionieren.

Zielmodell:

```ts
visibility: {
  preview: boolean
  print: boolean
  pdf: boolean
}
```

**Priorität:** P0

---

# 58. Footer

Der allgemeine Footer nimmt aktuell zu viel visuelle Fläche ein.

Ziel:

- kompakter
- weniger Höhe
- im Editor ggf. stark reduziert oder nicht dauerhaft im Viewport
- Workspace nicht verdrängen

**Priorität:** P1

---

# 59. About / Über

Keine Template-Reste.

Anzeigen:

```text
Foldmark
Version
Lambro Code
Lizenz
Datenschutz
Open-Source Libraries
Repository optional
Build optional
```

**Priorität:** P0/P1

---

# 60. Theme- und App-Design

Ziel:

- mehr Abstand zwischen primären Aktionen
- Icons konsistent
- klare visuelle Hierarchie
- weniger dicht
- Buttons nicht alle gleich gewichtet
- wiederkehrende Dialogsprache
- modernere Kontakt-/Dateilisten
- Panels sauberer getrennt
- weniger Entwickler-UI-Anmutung
- sachlich, nicht verspielt

**Priorität:** P1

---

# 61. Icons

Ergänzen für:

```text
Neu
Brief
Postkarte
Karte
Foto
Import
Export
Archiv
Ordner
Kontaktverzeichnis
Drucken
E-Mail
PDF
Schließen
Verlauf
Prüfen
Maximieren
Einklappen
Ausklappen
Bild
QR-Code
Tabelle
Link
Speichern
```

Icons lokal, konsistent, `currentColor`, mit Tooltips/ARIA.

**Priorität:** P1

---

# 62. Fotos und weitere Dokumenttypen

Erweiterbares Modell:

```text
letter
postcard
card
photo
free-document
custom
```

Später:

```text
appointment-sheet
appointment-letter
prescription-note
study-card
envelope
```

**Priorität:** P1/P2

---

# 63. Was-There-Something-App Integration – später

Zukünftige Import-/Share-Integration.

Gewünschte Formate:

```text
DIN A4 Terminzettel
DIN A4 Terminschreiben
```

Terminzettel:
einfache Tabelle mit Termin, Datum, Uhrzeit, Ort, Notiz.

Terminschreiben:
Briefvorlage mit strukturiertem Termininhalt.

Deep-Link / Share-Target / Importpayload später untersuchen.

**Priorität:** P3

---

# 64. Bildvorschau

Bei Bildauswahl anzeigen:

- Thumbnail
- Titel
- Abmessungen
- Dateigröße
- Beschreibung optional

**Priorität:** P1

---

# 65. QR-Code / Diagramme / Cloud

QR-Code später, optional Premium.

Cloud-/Diagramm-Features Version 2+.

Nicht Teil der aktuellen Kernkorrektur.

---

# 66. Current-State-Hinweise

Die aktuelle Codebasis enthält bereits wichtige Grundlagen, die weiterverwendet werden sollen:

- 1/2/3-Pane-Workspace
- Workspace-Bar
- Save-Status
- Output-Dialog
- Accordions für Metadaten
- Rich-Editor auf ProseMirror-Basis
- History-Dialog
- Address-Combobox
- alphabetische Address-Gruppen
- Print-Profile
- Assets
- Preview/Print-Trennung
- CSS-mm-basierte Papierdarstellung
- Theme-Tokens

Der Coding-Agent soll vorhandene Komponenten verbessern, nicht parallel ersetzen.

---

# 67. Spezifische technische Regression – Chrome Print und Dialog

In der aktuellen Print-Struktur wird `.print-root` im Print-Medium sichtbar, während Workspace/Topbar ausgeblendet werden.

Prüfen:

```text
- Ist der Dialog beim window.print() noch open?
- Liegt er im Browser-Top-Layer?
- Wird er in Chrome deshalb mitgedruckt?
- Wird vor print() dialog.close() aufgerufen?
- Gibt es @media print Regeln für dialog/.output-dialog?
```

Diese Hypothese zuerst testen.

---

# 68. Preview-Layout – technische Stabilität

Die bestehende Papierdarstellung verwendet CSS-Millimeter und einen separaten äußeren Zoom. Dieses Prinzip beibehalten.

Nicht zulässig:

- `width: 100%` direkt auf `.paper`, wenn reale Seitengröße verloren geht
- Pixelumrechnung an mehreren Stellen
- Zoom, der Markerpositionen verändert
- unterschiedliche Geometriequellen für Preview und Print

**Priorität:** P0

---

# 69. Akzeptanzkriterien – Arbeitsbereich

## AC-WORK-001
„+ Neu“ öffnet mindestens Brief, Postkarte, Karte, Foto und freies Dokument.

## AC-WORK-002
Dokumente erscheinen in sortierbarer Listenansicht.

## AC-WORK-003
Dokumente können archiviert und wieder eingeblendet werden.

## AC-WORK-004
Mindestens ein Ordner/Projekt kann angelegt und ein Dokument hineingeschoben werden.

## AC-WORK-005
Zusätzliche Dokumenttypen benötigen später keinen neuen Hauptbutton.

---

# 70. Akzeptanzkriterien – Kontakte

## AC-CONTACT-001
20 Dev-Kontakte können über Einstellungen erzeugt werden.

## AC-CONTACT-002
Alle Dev-Kontakte können zuverlässig wieder entfernt werden.

## AC-CONTACT-003
Kontakte sind alphabetisch sortiert und paginiert.

## AC-CONTACT-004
Suche nach „Berlin“ findet Kontakte mit Berliner Adresse.

## AC-CONTACT-005
Landwahl ist eine einzige durchsuchbare Combobox.

## AC-CONTACT-006
Ein Kontakt kann mehrere E-Mails besitzen und eine als primär markieren.

## AC-CONTACT-007
Kontakt hinzufügen öffnet zentrierten Dialog mit Schließen-X.

## AC-CONTACT-008
Löschen besitzt Confirmation-Dialog.

---

# 71. Akzeptanzkriterien – Workspace

## AC-WS-001
Automatisch zeigt auf breitem Laptop alle drei Bereiche.

## AC-WS-002
Benutzer kann sinnvolle Bereichskombination explizit wählen.

## AC-WS-003
Pane-Breiten veränderbar, ohne Pane auf 0 zu setzen.

## AC-WS-004
Dokumenteinstellungen und Vorschau können zugunsten des Schreibbereichs eingeklappt werden.

## AC-WS-005
Schreibbereich und Vorschau besitzen Fokusmodus.

## AC-WS-006
Foldmark-Logo bringt zurück zum Arbeitsbereich.

---

# 72. Akzeptanzkriterien – Dokumenteinstellungen

## AC-DOC-001
Alle Hauptgruppen sind Accordions.

## AC-DOC-002
Dokumentprofil steht ganz oben.

## AC-DOC-003
Dokumentname und Betreff synchronisieren sich bei initialer Erfassung genau einmal.

## AC-DOC-004
Betreff kann im Dokument ein-/ausgeblendet werden.

## AC-DOC-005
Absender/Empfänger zeigen eingeklappt kompakte Zusammenfassung.

## AC-DOC-006
Anrede/Grußformel werden strukturiert außerhalb des freien Editors verwaltet.

## AC-DOC-007
Seitenzahlformat enthält mindestens „Seite X von Y“ und „X / Y“.

---

# 73. Akzeptanzkriterien – Editor

## AC-EDIT-001
Visuell/Markdown-Schalter steht ganz oben.

## AC-EDIT-002
Toolbar wird möglichst gemeinsam in beiden Modi verwendet.

## AC-EDIT-003
H1 bis H6 verfügbar.

## AC-EDIT-004
Textfarbe besitzt „zurücksetzen“.

## AC-EDIT-005
Highlight besitzt aktiven Zustand und Farbauswahl.

## AC-EDIT-006
Tabelleneinfügen erlaubt Größenwahl.

## AC-EDIT-007
Linkdialog erlaubt Linktext und URL.

## AC-EDIT-008
Bild aus Bibliothek erscheint im Editor und Preview.

## AC-EDIT-009
Seitenumbruch erzeugt zusätzliche Preview-Seite.

## AC-EDIT-010
Kontextuell unzulässige Aktionen sind deaktiviert.

---

# 74. Akzeptanzkriterien – Verlauf und Speichern

## AC-HIST-001
Autosave speichert Working Copy zuverlässig.

## AC-HIST-002
Manuelles Speichern erzeugt persistenten Checkpoint.

## AC-HIST-003
History erscheint zentriert als Modal.

## AC-HIST-004
Automatische Versionen werden nach Aufbewahrungsregel bereinigt.

## AC-HIST-005
Manuelle Versionen werden nicht ohne explizite Regel automatisch entfernt.

---

# 75. Akzeptanzkriterien – Preview

## AC-PREV-001
Mehrseitige Vorschau scrollt ohne Sprünge.

## AC-PREV-002
Bei >3 Seiten kompakter Seitennavigator verfügbar.

## AC-PREV-003
Quick-Print-Button direkt in Preview.

## AC-PREV-004
Preview-Maximize funktioniert.

## AC-PREV-005
Chrome hält A4-Vorschaugeometrie bei Resize/Zoom stabil.

---

# 76. Akzeptanzkriterien – Drucken

## AC-PRINT-001
Chrome druckt nur das Dokument, nicht den Druckdialog.

## AC-PRINT-002
Firefox funktioniert weiterhin.

## AC-PRINT-003
Leeres Dokument kann gedruckt werden.

## AC-PRINT-004
Brief ohne Empfänger kann gedruckt werden.

## AC-PRINT-005
Warnungen blockieren Drucken nicht.

## AC-PRINT-006
Hilfslinien getrennt für Preview und Print steuerbar.

---

# 77. Akzeptanzkriterien – Export und E-Mail

## AC-OUT-001
Drucken, Exportieren und E-Mail sind drei getrennte Aktionen.

## AC-OUT-002
Exportieren bietet PDF und Markdown.

## AC-OUT-003
Plain-Text-E-Mail enthält keine Markdown-Syntax.

## AC-OUT-004
HTML-Mail enthält korrekt gerendertes und sanitiztes HTML.

## AC-OUT-005
Fehlende E-Mail-Adresse erzeugt Warnung, aber keinen harten Blocker.

---

# 78. Akzeptanzkriterien – Assets

## AC-ASSET-001
Bildtitel kann geändert werden.

## AC-ASSET-002
Beschreibung kann gespeichert werden.

## AC-ASSET-003
Bildauswahl zeigt Thumbnail.

## AC-ASSET-004
Bild aus Bibliothek lässt sich zuverlässig ins Dokument einfügen.

## AC-ASSET-005
Importlimit und Fehlermeldung sind verständlich.

---

# 79. Tests

## Unit

Mindestens:

- initiale Titel/Betreff-Synchronisierung
- Plain-Text-Mail-Renderer
- Kontakt-Fuzzy-Suche
- Demo-Daten-Marker
- Versionsbereinigung
- Seitennummerformatierung
- Dokumentprüfung Severity
- Archivfilter

## Component

- ContactCombobox
- ContactDialog
- HistoryDialog
- PrintDialog
- ExportDialog
- EmailDialog
- TablePopover
- LinkDialog
- ColorPopover
- ImageDialog
- PaneResizer
- PaneCollapse

## E2E

Chrome und Firefox:

- Drucken
- Bild
- Mehrseitigkeit
- Workspace Resize
- Dialog close/backdrop
- Preview zoom

Tests starten aus sauberer DB und aktivieren Demo-Daten explizit.

---

# 80. Datenmigration

Änderungen an Kontakten, Projekten, History oder Assets benötigen Dexie-/IndexedDB-Migrationen.

Anforderungen:

- bestehende V1.0-Daten erhalten
- Migration idempotent
- Recovery bei Schemafehler
- Tests mit alter DB-Fixture

---

# 81. Accessibility

Pflichtpunkte:

- Dialog Focus Trap
- ESC
- Fokus zurück zum Trigger
- Combobox ARIA
- Icon-only Buttons mit `aria-label`
- Collapse-Buttons mit `aria-expanded`
- Splitter möglichst per Tastatur bedienbar
- Status nicht nur über Farbe
- Modusschalter klarer aktiver Zustand
- deaktivierte Toolbaraktionen korrekt `disabled`

---

# 82. Performance

Prüfen:

- 100+ Kontakte
- 100+ Dokumente
- 20+ Seiten Preview
- große Bilder
- ResizeObserver-Loops
- Scroll-Jank
- wiederholtes Pagination-Reflow
- Autosave bei schneller Eingabe

---

# 83. Nicht jetzt implementieren

Nur architektonisch berücksichtigen:

- vollständiger Cloud-Sync
- GitHub Connector
- OneDrive/Dropbox
- QR-Code Premium
- Diagrammeditor
- fortgeschrittene Bildbearbeitung
- Projekte mit Default-Empfänger
- kompletter ZIP-Restore
- Appointment-App Deep Link
- kollaboratives Bearbeiten
- zertifikatsbasierte Signatur

---

# 84. Vorgeschlagene OpenSpec-Changes

```text
openspec/changes/
├── fix-chrome-print-dialog/
├── fix-preview-marker-toggle/
├── fix-image-insertion/
├── fix-plain-text-email-rendering/
├── fix-preview-pagination-scroll/
├── fix-missing-i18n-keys/
├── redesign-workspace-file-manager/
├── add-project-folders/
├── add-document-archive/
├── redesign-contact-directory/
├── add-contact-pagination/
├── add-contact-fuzzy-search/
├── add-demo-data-manager/
├── add-contact-modal-editor/
├── extend-print-profile-catalog/
├── extend-asset-library/
├── redesign-settings/
├── redesign-editor-workspace-layout/
├── add-resizable-panes/
├── add-collapsible-panes/
├── add-focus-mode/
├── add-classic-editor-menu/
├── restructure-document-settings/
├── add-structured-salutation-closing/
├── redesign-page-numbering/
├── redesign-editor-mode-switch/
├── improve-rich-editor-toolbar/
├── add-table-insert-popover/
├── add-link-dialog/
├── add-color-reset/
├── redesign-history-dialog/
├── add-document-check-panel/
├── split-output-actions/
├── redesign-print-dialog/
├── redesign-export-dialog/
└── redesign-email-dialog/
```

---

# 85. Empfohlene Implementierungsreihenfolge

## Phase A – P0-Regressions

1. Chrome Print
2. Bild einfügen
3. Plain-Text-Mail
4. Hilfslinien
5. Translation-Key
6. Seitenumbruch/Preview
7. Preview Scroll/Jank
8. Template-Reste / About

## Phase B – Workspace und Dialoge

1. drei getrennte Outputaktionen
2. Dialogstandard
3. Workspace-Benennung
4. Pane-Kombinationen
5. Collapsing
6. Resizing
7. Fokusmodus
8. klassisches Menü

## Phase C – Dokumenteinstellungen

1. Accordion-Struktur
2. Profil
3. Dokumentname/Betreff
4. Absender
5. Empfänger
6. Briefangaben
7. strukturierte Anrede/Grußformel
8. Seitenzahlen
9. Schriftthema

## Phase D – Editor

1. Visuell/Markdown oben
2. gemeinsame Toolbar
3. H1–H6
4. Farbe/Highlight
5. Tabelle
6. Link
7. Bild
8. kontextsensitive Commands

## Phase E – Arbeitsbereich

1. Dateiartige Dokumentliste
2. + Neu
3. Archiv
4. Ordner/Projekte
5. Dokumentaktionen

## Phase F – Kontakte

1. Contact Directory
2. Modal Editor
3. Country Combobox
4. Mehrfach-Kontaktdaten
5. Fuzzy-Suche
6. Pagination
7. Dev-Testdaten

## Phase G – Assets / Einstellungen

1. Asset-Metadaten
2. Bildvorschau
3. Settings-Struktur
4. Open-Source-Darstellung
5. Datenlöschen
6. History Retention

---

# 86. Definition of Done für diese V1-Korrekturrunde

Die Runde gilt erst als abgeschlossen, wenn:

- alle P0-Bugs behoben sind
- Chrome und Firefox E2E grün sind
- keine V1.0-Daten verloren gehen
- Hauptarbeitsbereich übersichtlich ist
- Kontakte mit 20 Dev-Datensätzen sinnvoll benutzbar sind
- Mehrseiten-Preview stabil ist
- Bild von Bibliothek bis Print sichtbar ist
- Drucken ohne Empfänger möglich ist
- Plain-Text-E-Mail kein Markdown enthält
- Outputaktionen getrennt sind
- Dialoge konsistent sind
- Editor-Toolbar kontextsensitiv ist
- Dokumenteinstellungen sauber strukturiert sind
- keine sichtbaren Template-Reste vorhanden sind
- Accessibility-Baseline eingehalten wird
- keine neuen externen Requests im Default-Modus entstehen

---

# 87. Zielbild

```text
Arbeitsbereich
├── Dokumente und Projekte verwalten
├── Kontakte verwalten
├── Assets verwalten
└── Einstellungen

Dokumenteditor
├── Dokumenteinstellungen
├── Schreibbereich
└── Vorschau

Ausgabe
├── Drucken
├── Exportieren
└── E-Mail
```

Foldmark soll sich nach dieser Runde wie eine eigenständige lokale Dokumentanwendung und nicht wie eine technische Template-Demo anfühlen.

---

# 88. Kernaussage

> **Foldmark trennt Dateiverwaltung, Dokumentmetadaten, Schreiben, Vorschau und Ausgabe klar voneinander, lässt diese Bereiche aber eng genug zusammenarbeiten, dass ein Dokument ohne technische Reibung vom ersten Entwurf bis zum Druck oder E-Mail-Handoff bearbeitet werden kann.**


# Teil C - Neue Future Features: komprimierter Export, sicheres Teilen und Premium

Dieser Teil beschreibt bewusst **zukünftige** Features. Er darf die P0/P1-Korrekturen aus Teil A nicht verzögern. Die Architektur soll diese Features jedoch nicht verbauen.

# C1. Foldmark-Paketformat für komprimierte Dokumente

## Ziel
Neben Markdown und PDF soll Foldmark ein kompaktes, selbstbeschreibendes Dokumentpaket exportieren können.

Empfohlener Produktname / Dateityp:

```text
*.foldmark
```

Das Format soll technisch auf einem ZIP-kompatiblen Container basieren, damit mehrere Dateien, Assets und Metadaten sauber zusammengefasst werden können.

## Empfohlene Containerstruktur

```text
document.foldmark
├── manifest.json
├── document.md
├── assets/
│   ├── asset-001.png
│   └── signature-001.png
└── metadata/
    └── optional.json
```

### `manifest.json`

Beispiel:

```json
{
  "format": "foldmark-package",
  "formatVersion": 1,
  "foldmarkSchemaVersion": 2,
  "documentId": "...",
  "documentKind": "letter",
  "createdAt": "2026-09-16T00:00:00Z",
  "createdWith": "Foldmark 1.x",
  "contentFile": "document.md",
  "assets": [],
  "compression": "deflate",
  "integrity": {
    "algorithm": "SHA-256"
  }
}
```

### Privacy
`createdBy`, `sharedBy`, E-Mail-Adresse oder ähnliche personenbezogene Angaben **nicht standardmäßig** in das Paket schreiben. Diese Metadaten dürfen nur bei expliziter Aktivierung aufgenommen werden.

## Technische Empfehlung
Für echte ZIP-Container ist `zip.js` ein starker Kandidat. Das Projekt unterstützt Browser/Web Streams, parallele Kompression, große ZIP/Zip64-Dateien und Datenverschlüsselung einschließlich AES. Vor Integration müssen Lizenz, Bundlegröße und Interoperabilität geprüft werden.

Native `CompressionStream` ist zusätzlich interessant für einzelne Payloads und URL-Sharing. Die API ist browserübergreifend etabliert und unterstützt Streaming-Kompression; gzip/deflate sind die konservativen Baseline-Formate. Neuere Browser unterstützen teils zusätzlich Brotli/Zstandard, darauf sollte das Kernformat aber nicht ohne Fallback angewiesen sein.

**Priorität: Future / 1.x-2.x**

---

# C2. Komprimierter Export mit Fortschrittsanzeige

Beim Export größerer Pakete:

```text
Foldmark-Paket wird erstellt ...
[############------] 64 %
Komprimiere Assets ...
```

### Anforderungen

- UI darf nicht einfrieren
- möglichst Web Worker verwenden
- Abbrechen unterstützen
- Fortschritt in Bytes/Entries, wenn Bibliothek dies ermöglicht
- Fehler pro Asset sauber melden
- bei normal kleinen Markdown-Dokumenten darf die UI trotzdem schnell und unaufdringlich bleiben

**Priorität: Future**

---

# C3. Passwort-/Passphrase-geschützter Export

## Ziel
Ein Foldmark-Dokument kann optional geschützt exportiert werden, um es beispielsweise per E-Mail oder Messenger weiterzugeben.

### UX

```text
[x] Dokument schützen

Passphrase:     [....................]
Wiederholen:    [....................]

[ ] kurze PIN verwenden (weniger sicher)
```

### Sicherheitsentscheidung
Eine Passphrase ist gegenüber einer kurzen PIN klar zu bevorzugen. Eine 4-6-stellige PIN besitzt nur geringe Entropie und kann bei einem offline verfügbaren verschlüsselten Dokument prinzipiell durchprobiert werden. Falls Foldmark PINs anbietet, muss die UI dies ausdrücklich als schwächeren Schutz kennzeichnen.

### Variante A - ZIP-AES
`zip.js` unterstützt passwortgeschützte AES-Verschlüsselung von ZIP-Einträgen. Das ist als Interoperabilitäts-Spike zu prüfen.

### Variante B - Foldmark Encrypted Envelope
Für maximale Kontrolle:

```text
1. Foldmark-ZIP erzeugen
2. kompletten Blob verschlüsseln
3. eigenen kleinen unverschlüsselten Header voranstellen
4. Ergebnis z. B. als *.foldmarkx speichern
```

Empfohlene Primitive:

- AES-GCM für authentifizierte Verschlüsselung
- PBKDF2 für passwortbasierte Key-Derivation, wenn ausschließlich native Web Crypto verwendet wird
- zufälliger Salt
- zufälliger 96-Bit-IV pro Verschlüsselung
- Parameter im Header versionieren

Keine selbst entwickelte Kryptographie.

### Beispiel-Envelope

```json
{
  "format": "foldmark-encrypted",
  "version": 1,
  "kdf": "PBKDF2-SHA-256",
  "iterations": 600000,
  "cipher": "AES-256-GCM",
  "salt": "base64url...",
  "iv": "base64url..."
}
```

Die konkrete Iterationszahl ist zum Implementierungszeitpunkt anhand aktueller Performance-/Security-Empfehlungen zu benchmarken und nicht dauerhaft aus diesem Draft zu übernehmen.

### Wichtig
Web Crypto ist eine Low-Level-API. Vor einer Aussage wie „sicher verschlüsselt“ ist ein Security Review des genauen Containerdesigns erforderlich.

**Priorität: Future / Security Spike**

---

# C4. Pseudo-Teilen ohne Backend über URL-Fragment

## Ziel
Kleine textbasierte Foldmark-Dokumente sollen als selbstenthaltener Link geteilt werden können, ohne dass das Dokument auf einen Server hochgeladen wird.

### Kein Query-Parameter für den Payload
Bevorzugt URL-Fragment:

```text
https://app.example/#share=<payload>
```

statt:

```text
https://app.example/?content=<payload>
```

Grund: Der URI-Fragmentteil nach `#` wird vom Browser nicht an den Webserver gesendet. Dadurch bleibt der Payload clientseitig, solange keine Drittanbieter-Skripte ihn aktiv auslesen.

### Pipeline

```text
Document snapshot
-> canonical compact JSON / package payload
-> compress
-> optional encrypt
-> Base64URL
-> URL fragment
```

### Base64URL
Base64URL statt normalem Base64 verwenden, damit `+`, `/` und Padding-Probleme reduziert werden.

### Share-Link-Beispiel

```text
#share=v1.gzip.<base64url>
```

verschlüsselt beispielsweise:

```text
#share=e1.<salt>.<iv>.<ciphertext>
```

Das genaue Wire-Format muss versioniert und mit Fixtures getestet werden.

---

# C5. URL-Längen und Fallback

Browser können technisch sehr große URLs akzeptieren; Chromium definiert aktuell beispielsweise eine Größenordnung von 2 MiB als maximale URL-Länge zwischen Prozessen. Das ist **kein geeigneter Produktgrenzwert** für ein Share-Feature: Messenger, Mailprogramme, Zwischenablagen, mobile Betriebssysteme und andere Browser können deutlich früher Probleme verursachen.

Daher eigene konservative Foldmark-Grenzen definieren.

Empfohlene Startstrategie:

```text
<= 8 KiB Link     -> normal, ohne Warnung
8-32 KiB          -> zulassen, Hinweis „großer Freigabelink“
> 32 KiB          -> kein URL-Share; Datei-Fallback
```

Diese Werte sind Produktdefaults und müssen in einer Browser-/Messenger-Testmatrix validiert werden. Sie sind nicht aus einem universellen Webstandard abgeleitet.

### Fallback
Ist der Payload zu groß:

```text
Dieses Dokument ist zu groß für einen zuverlässigen Freigabelink.

[ Foldmark-Datei herunterladen ]
[ Über System teilen ]
[ Google Drive / OneDrive später ]
```

Bilder führen sehr schnell zum Datei-Fallback. JPEG/PNG/WebP sind bereits komprimiert und gewinnen durch ZIP/Deflate oft wenig; Base64URL vergrößert Binärdaten zusätzlich.

**Priorität: Future**

---

# C6. Share Disclosure: Es wird eine Kopie geteilt

Beim Erzeugen eines Share-Links bzw. Share-Pakets muss klar sein:

> Die Freigabe erstellt eine Kopie des aktuellen Dokumentstands. Änderungen am Original werden nicht automatisch synchronisiert.

Der Empfänger öffnet zunächst eine Import-/Vorschauansicht:

```text
Geteiltes Foldmark-Dokument

Absender der Freigabe: optional
Erstellt mit: Foldmark ...

[ Vorschau ]
[ Als Kopie in meine Bibliothek übernehmen ]
[ Verwerfen ]
```

Kein automatisches Persistieren beim bloßen Linkaufruf.

Bei verschlüsseltem Share-Link: Passphrase **nicht im selben Link** mitliefern, sonst verliert die Verschlüsselung ihren eigentlichen Nutzen. Passphrase separat teilen.

**Priorität: Future**

---

# C7. Reusable Engineering Capability für das Web-App-Template

Wenn das Foldmark-Paketformat technisch stabil ist, soll die generische Funktionalität abstrahiert werden:

```text
PackageWriter
PackageReader
CompressionProvider
EncryptionProvider
SharePayloadCodec
ProgressReporter
```

Diese generischen Bausteine können später in das Lambro-Code-Web-App-Template übernommen werden. Foldmark-spezifische Dokumentsemantik bleibt außerhalb des generischen Layers.

**Priorität: Future / Template Backport**

---

# C8. Tooltips und kontextuelle Info-Hinweise

Viele Icons benötigen Tooltips.

Regeln:

- Icon-only Button -> immer Tooltip + `aria-label`
- Textbutton -> Tooltip nur bei zusätzlichem Erklärwert
- komplexe oder irreversible Funktion -> optional Info-Icon
- keine Tooltip-Flut auf jedem Label
- Touch-Geräte berücksichtigen: kritische Information darf nicht ausschließlich Hover benötigen

Besonders erklärungsbedürftig:

- Archivieren vs. Löschen
- Share-Link als Kopie
- verschlüsselter Export
- automatische Versionen
- Dokumentprüfung
- Premium-/Testphase

**Priorität: P1/P2**

---

# C9. Onboarding für eigene Kontaktdaten

Wenn noch keine eigene/primäre Absenderidentität existiert, darf Foldmark beim Start oder beim ersten Brief dezent anbieten:

```text
Möchtest du deine Absenderdaten hinterlegen?

[ Jetzt einrichten ] [ Später ]
```

Nicht zwingend E-Mail verlangen. Postalische Absenderdaten, Name und optionale E-Mail getrennt behandeln.

Nutzer darf dauerhaft überspringen; kein Blocker für leere/freie Dokumente.

**Priorität: Future / P2**

---

# C10. Premium-Grundmodell

Premium ist zunächst ein **Feature-Gating-Modell**, noch kein fertiges Bezahlsystem.

In der Testphase können Premiumfunktionen technisch freigeschaltet bleiben, müssen aber sichtbar gekennzeichnet werden:

```text
Premium
Derzeit während der Testphase kostenlos verfügbar.
```

Kein irreführender Kaufbutton, solange noch kein echter Kaufprozess existiert.

---

# C11. Feature IDs und Quoten

Premiumfunktionen nicht über zufällige UI-Checks implementieren, sondern über stabile Feature IDs.

Beispiel:

```ts
type PremiumFeatureId =
  | 'template.custom.save'
  | 'template.custom.multiple'
  | 'template.pack.health'
  | 'qr.generate'
  | 'qr.style'
  | 'export.docx'
  | 'export.odt'
  | 'theme.custom'
  | 'letterhead.advanced'
  | 'package.encryption';
```

Entitlement API:

```ts
interface EntitlementService {
  getState(feature: PremiumFeatureId): Promise<FeatureEntitlement>;
  canUse(feature: PremiumFeatureId): Promise<boolean>;
  consume(feature: PremiumFeatureId, amount?: number): Promise<void>;
}
```

Beispielstate:

```ts
interface FeatureEntitlement {
  mode: 'free' | 'beta-free' | 'quota' | 'licensed' | 'locked';
  used?: number;
  limit?: number;
  resetAt?: string;
}
```

### Counters
Counter erst nach erfolgreicher Aktion erhöhen, nicht beim Öffnen eines Dialogs.

Beispiele:

- erfolgreich generierter QR-Code
- erfolgreich gespeichertes zusätzliches Template
- erfolgreich erzeugter DOCX-Export

**Priorität: Future Architecture**

---

# C12. Premium-Prüfung gehört in die Anwendungslogik, nicht nur in die UI

Ein deaktivierter HTML-Button ist kein Schutz.

Die eigentliche Operation muss nochmals prüfen:

```text
UI -> Use Case -> EntitlementService -> erlaubt? -> Aktion
```

Manipuliert jemand per DevTools `disabled=false`, darf die Aktion trotzdem nicht automatisch durchlaufen.

### Lokale Speicherung bleibt manipulierbar
Da die Anwendung local-first im Browser läuft, kann ein technisch versierter Benutzer IndexedDB und JavaScript verändern. Ein Hash, Salt oder eine „Mini-Verschlüsselung“ macht lokale Premiumzähler **nicht kryptografisch vertrauenswürdig**.

Leichte Obfuskation kann höchstens zufällige Manipulation erschweren, darf aber nicht als Security bezeichnet werden.

**Priorität: Future Architecture**

---

# C13. Offline-fähige Premium-Lizenz über signiertes Entitlement

Falls Foldmark später ernsthaft Premium erzwingt, ohne für jede Nutzung online sein zu müssen, ist ein signierter Lizenz-/Entitlement-Token wesentlich sinnvoller als ein lokaler Boolean.

Beispielpayload:

```json
{
  "licenseId": "lic_...",
  "subject": "optional-account-id",
  "plan": "premium",
  "features": {
    "template.custom.multiple": true,
    "export.docx": true,
    "qr.generate": { "limit": 50 }
  },
  "issuedAt": "...",
  "expiresAt": null
}
```

Der Token wird von einem vertrauenswürdigen System signiert. Die Web-App enthält nur den **öffentlichen** Verifikationsschlüssel und kann den Token offline prüfen.

Der private Signaturschlüssel darf niemals in der Web-App liegen.

### Vorteil

- Offline-Prüfung
- Nutzer kann Lizenzdatei/Key importieren
- einfacher als permanente Accountpflicht
- Manipulation des Payloads bricht Signatur

### Grenze
Ein Benutzer kann weiterhin den ausgelieferten Open-Source-/Clientcode verändern und die Gate-Logik entfernen. Eine rein statische Client-App kann keinen absolut manipulationssicheren DRM-Schutz liefern.

**Priorität: Version 2 Research**

---

# C14. Stripe und minimaler Backend-/Worker-Anteil

Stripe Payment Links kann Zahlungen ohne eigenen Checkout-Code entgegennehmen. Für **automatische** Erteilung einer Foldmark-Lizenz reicht ein reiner statischer Client jedoch nicht aus.

Stripe-Secret-Keys dürfen nicht in Clientcode eingebettet werden.

Empfohlene spätere Architektur:

```text
Stripe Payment Link / Checkout
        |
        v
Stripe Webhook
        |
        v
kleiner License Worker / Function
        |
        +-> Zahlung verifizieren
        +-> signiertes Entitlement erzeugen
        +-> License Key / Download / Account-Zuordnung
```

Ein kleiner Cloudflare Worker oder vergleichbare Serverless Function wäre mit dem bestehenden Lambro-Code-Ansatz vereinbar, ohne die eigentliche Foldmark-App zu einer Backend-Anwendung zu machen.

### Alpha/Beta Alternative
Vor Automatisierung kann die Lizenz manuell erzeugt/ausgegeben werden.

**Priorität: Version 2 Research**

---

# C15. SSO ist Identität, kein Speicherort für Foldmark-Permissions

Google Sign-In / OpenID Connect und Sign in with Apple können später eine stabile Nutzeridentität liefern. Sie sind jedoch nicht als frei beschreibbare Foldmark-Datenbank gedacht, in der die App eigene gekaufte Features in den Google-/Apple-Account „hineinschreibt“.

Bei Google ist insbesondere die OIDC-`sub`-Claim als stabile Konto-ID relevant. Entitlements müssten aber weiterhin Foldmark-seitig gespeichert bzw. in einem Foldmark-signierten Token ausgedrückt werden.

Mögliche Architektur:

```text
OIDC provider -> user identity (`sub`)
Foldmark service -> entitlement mapping
signed license token -> offline app
```

SSO ist daher optional und keine Voraussetzung für V1.

**Priorität: Future**

---

# C16. Backup und Premium-Lizenz

Der Nutzer wünscht, dass ein vollständiger Foldmark-Backup/Restore auch Premiumzustände berücksichtigen kann.

Das muss mit dem späteren Lizenzmodell abgestimmt werden.

Mögliche Regeln:

### Übertragbare Lizenz
Signierter License Token darf im Backup enthalten sein und auf einem anderen Gerät wieder importiert werden.

### Accountgebundene Lizenz
Backup enthält nur License-ID/Receipt; nach Restore erfolgt Reaktivierung über Account/Server.

Diese Entscheidung ist Business-/Lizenzpolitik und darf noch offen bleiben.

---

# C17. Premium: eigene Dokumenttemplates und Briefkopfdesigner

## Kernfeature
Nutzer kann ein Dokument als eigenes Template speichern.

Template kann enthalten:

- Dokumenttyp
- Papier-/Printprofil
- Sender-/Absenderdefaults
- Briefkopf
- Logo
- Position des Logos: links, Mitte, rechts bzw. frei innerhalb definierter Headerzone
- Footertext/-bild
- Schrift-/Dokumenttheme
- Farben
- Adressblockposition
- Betreffstil
- Anrede-/Grußdefaults
- statische Textbausteine
- Platzhalter
- optional Rechnungs-/Geschäftsstruktur später

Beispiele:

```text
Privater Brief
Geschäftsbrief Muster GmbH
Rechnung
Vereinsbrief
Praxisbrief
```

### Freemium-Vorschlag

- Free: 1 eigenes Template
- Premium: mehrere bzw. konfigurierbares Limit

Die genaue Anzahl darf per Feature-Konfiguration geändert werden und nicht hart im UI verdrahtet sein.

**Priorität: Premium Future**

---

# C18. Template Packs / kuratierte Vorlagenbibliotheken

Version 2/3 kann umfangreiche Inhalts-Pakete erhalten.

Beispiele:

- Krankenkassenkommunikation
- Versicherungen
- Behörden
- Rentenversicherung
- Kündigungen
- allgemeine Provider-/Service-Schreiben
- Gesundheit / Arzt / Unterlagenanforderung
- Arbeitgeber

Ein Pack kann enthalten:

```text
Template
+ Textvorschlag
+ strukturierte Felder
+ ggf. Organisation/Adresse
+ Quelle/Stand
+ Sprache
+ Region
+ Versionsdatum
```

### Hoher Research-/Maintenance-Aufwand
Adress- und Verfahrensdaten können sich ändern. Provider-spezifische Vorlagen benötigen daher:

- Quellenangabe
- „Stand“-Datum
- Updateprozess
- klare Trennung zwischen Beispieltext und Rechtsberatung
- keine Zusage, dass ein Schreiben rechtlich immer genügt
- Marken-/Namensnutzung prüfen

Premium kann hier sowohl Funktionalität als auch redaktionell gepflegte Inhalte finanzieren.

**Priorität: Version 2/3**

---

# C19. Premium: QR-Codes

## Basis
QR-Codes lokal im Browser erzeugen.

Mögliche Typen:

- URL
- Text
- E-Mail
- Telefon
- vCard
- Termin
- Wi-Fi nur wenn sinnvoll
- freie Nutzdaten

## Libraries
Für Basis-QR ist `qrcode` ein einfacher MIT-lizenzierter Browser-Kandidat.

Für spätere Gestaltung ist `qr-code-styling` interessant. Es unterstützt unter anderem:

- Dot Styles wie rounded / dots / square
- Corner Styles
- Farben und Gradients
- Hintergrund
- eingebettete Bilder/Logos
- SVG/Canvas-Ausgabe

Vor produktivem Einsatz Security, Wartung und bekannte aktuelle Issues prüfen; Ausgabe besser über Raw-Blob/SVG-Pfade testen statt sich blind auf eine Download-Hilfsfunktion zu verlassen.

## Freemium
Beispielmodell:

```text
Free: einige QR-Code-Generierungen
Premium: höhere/unbegrenzte Quote
Premium Styling: Farben, runde Ecken, Logo, Brand Presets
```

Der Nutzer hatte als Größenordnung 3-5 freie Generierungen genannt; die konkrete Zahl bleibt konfigurierbar.

### Druckqualität
QR-Code vor Export validieren:

- ausreichender Kontrast
- Quiet Zone
- Mindestgröße
- Error Correction bei Logo
- Testscan im Preview/Export-E2E soweit automatisierbar

**Priorität: Premium Future**

---

# C20. Premium: DOCX-Export

DOCX ist ein plausibles Premium-Exportziel.

Technischer Kandidat `docx`:

- JavaScript/TypeScript
- läuft in Browser und Node
- MIT
- unterstützt u. a. Absätze, Tabellen, Bilder, Margins, Header/Footer

Aktueller Stand muss beim Implementierungs-Spike erneut verifiziert werden.

### Scope
Foldmark garantiert zunächst nur den Export eigener unterstützter Dokumentfeatures, nicht perfekten Roundtrip beliebiger Word-Dokumente.

### Feature Gate

```text
export.docx
```

Mögliche Monetarisierung:

- einzelne freie Testexporte
- Premium-Lizenz
- Export-Credit-Pack später

**Priorität: Version 2 Candidate**

---

# C21. Premium: ODT-Export / OpenDocument

ODT bleibt fachlich besonders passend, weil Foldmark Open Formats bevorzugt.

Aktueller Research-Kandidat `odf-kit` kann laut aktueller Projektdokumentation ODT browserseitig erzeugen, lesen und Markdown bzw. ProseMirror/TipTap-Strukturen konvertieren. Das Projekt ist noch vergleichsweise jung und muss deshalb vor Übernahme intensiv auf Roundtrip, Layout, Metadaten, Bilder und LibreOffice-Interoperabilität getestet werden.

Feature ID:

```text
export.odt
```

Businessentscheidung offen, ob ODT langfristig Premium oder wegen Open-Format-Philosophie teilweise frei bleiben soll. Der Nutzer hat es aktuell als möglichen bezahlten Export genannt.

**Priorität: Version 2 Research**

---

# C22. Excel/Spreadsheet-Export

Für ein Brief-/Dokumentprodukt ist XLSX kein primäres Dokumentexportformat.

Sinnvoller möglicher Scope später:

- Kontakte als XLSX/ODS
- Projektlisten
- Dokumentindex
- Rechnungs-/Tabellendaten

Nicht als V1-Ziel behandeln.

**Priorität: Optional Future**

---

# C23. Premium: erweiterte Dokumentthemes und Footer

Mögliche spätere Premiumfunktionen:

- eigene Farbschemata
- eigenes Dokumenttheme
- zusätzliche Footer-Bilder
- erweiterter Briefkopf
- mehrere Brand Sets
- Logo-/Letterhead-Varianten

Nicht für V1 priorisieren.

---

# C24. Commerce-/Rechts-Check vor echtem Verkauf

Bevor Premium real verkauft wird, ist eine separate rechtliche und steuerliche Prüfung erforderlich, insbesondere für den jeweiligen Verkaufsraum.

Zu klären sind beispielsweise:

- Anbieterkennzeichnung / Vertragsinformationen
- AGB bzw. Lizenzbedingungen
- Verbraucherrechte bei digitalen Leistungen
- Widerruf bzw. sofortige Ausführung digitaler Inhalte
- Preisangaben
- Umsatzsteuer/VAT und Rechnungen
- Datenschutz bei Zahlungs-/Accountdaten
- Rückerstattungen
- Umgang mit dauerhaften vs. zeitlich begrenzten Lizenzen
- mögliche Store-Regeln, wenn später Microsoft Store o. Ä. genutzt wird

Stripe löst die Zahlungsabwicklung, ersetzt aber nicht diese Produkt-/Rechtspflichten.

Dieser Abschnitt ist eine Engineering-/Produkt-Checkliste und keine Rechtsberatung.

---

# C25. Empfohlene Premium-Architektur

```text
Presentation
   |
   +-- Premium badge / quota display
   |
Application
   |
   +-- EntitlementService
   |      +-- canUse(feature)
   |      +-- consume(feature)
   |      +-- getUsage(feature)
   |
Infrastructure
   |
   +-- LocalBetaEntitlementProvider
   +-- SignedLicenseProvider (future)
   +-- AccountEntitlementProvider (future)
```

In der Testphase:

```text
LocalBetaEntitlementProvider
-> alle gekennzeichneten Premiumfeatures freigeschaltet
-> UI zeigt "während Testphase kostenlos"
-> Usage Counter kann bereits gesammelt/getestet werden
```

Später Provider austauschen, ohne Featurecode umzubauen.

---

# C26. Neue OpenSpec-Changes aus dieser Revision

Zusätzlich zu Teil B mindestens:

```text
openspec/changes/
├── fix-print-ui-leak/
├── fix-trailing-empty-print-pages/
├── move-semantic-colors-to-settings/
├── move-base-font-size-to-formatting/
├── wire-classic-menu-editor-commands/
├── add-clear-formatting-command/
├── redesign-editor-mode-toggle/
├── enlarge-editor-toolbar-controls/
├── fix-text-highlight-roundtrip/
├── add-shortcut-registry/
├── refine-field-visibility-controls/
├── improve-address-collapse-summary/
├── add-address-snapshot-reset/
├── add-contact-import-vcard-csv/
├── add-contact-import-duplicate-review/
├── add-workspace-drag-drop-import/
├── research-foldmark-package-format/
├── add-compressed-foldmark-export/
├── research-encrypted-foldmark-export/
├── research-url-fragment-share/
├── add-share-copy-disclosure/
├── add-premium-feature-registry/
├── add-entitlement-service/
├── add-beta-free-premium-mode/
├── research-signed-license-token/
├── research-stripe-license-fulfillment/
├── research-optional-sso-entitlements/
├── add-custom-template-designer/
├── research-template-packs/
├── add-qr-code-generation/
├── research-qr-code-styling/
├── research-docx-export/
├── research-odt-export/
└── add-commerce-readiness-checklist/
```

---

# C27. Empfohlene Reihenfolge nach V1.0-Fix

## Phase 1 - sofort

1. Print UI Leak
2. leere Druckseite
3. Format-Menü Command Binding
4. Highlight/Background Bug
5. Formatierung entfernen
6. Editor-Toggle und Icon-Größe
7. Shortcut Registry
8. Kontakt-Accordion/Reset
9. Drag-and-drop Markdown

## Phase 2 - Datenimport

1. VCF Parser/Importer
2. CSV Import
3. Duplikatprüfung
4. Import Preview
5. Contact Merge UX

## Phase 3 - Paketformat

1. `.foldmark` Manifest spezifizieren
2. ZIP/zip.js Spike
3. Progress/Worker
4. Import/Export Roundtrip
5. Checksums/Integrity

## Phase 4 - Security Share Spike

1. CompressionStream Codec
2. Base64URL Codec
3. Fragment Share
4. Größenmessung/Testmatrix
5. File Fallback
6. AES-GCM/PBKDF2 Prototype
7. Security Review

## Phase 5 - Premium Architektur, noch ohne Kauf

1. Feature ID Registry
2. EntitlementService
3. Beta-free Provider
4. Quota UI
5. Premium Info Badges
6. Usage Tests

## Phase 6 - Premium Features

1. Custom Templates / Letterhead
2. QR Basis
3. DOCX Spike
4. ODT Spike
5. Theme/Letterhead Advanced

## Phase 7 - Commerce

1. Businessmodell finalisieren
2. juristisch/steuerlich prüfen
3. Stripe Payment Link/Checkout
4. License Worker
5. signierte Entitlements
6. optional SSO

---

# C28. Research-Ergebnisse und technische Quellen, Stand 16.09.2026

## Kompression im Browser

- MDN Compression Streams API: native Streaming-Kompression/Decompression; browserübergreifend seit 2023 gut verfügbar.
- `zip.js`: Browser-ZIP-Library mit Web Streams, Zip64, paralleler Kompression und Datenverschlüsselung/AES.

## Verschlüsselung

- Web Crypto `SubtleCrypto` unterstützt AES-GCM und PBKDF2.
- MDN empfiehlt für Verschlüsselung authentifizierte Modi; AES-GCM liefert Authentizität und Vertraulichkeit.
- IV bei AES-GCM darf mit demselben Key nicht wiederverwendet werden.

## URL Sharing

- URI-Fragmente (`#...`) werden nicht an den Server gesendet.
- Chromium definiert intern derzeit maximal ca. 2 MiB URL-Zeichen, aber Foldmark soll aus Portabilitätsgründen deutlich konservativere eigene Grenzen verwenden.

## DOCX

- `docx` ist MIT-lizenziert, TypeScript/JavaScript und unterstützt Browserbetrieb; aktueller Repository-Stand zeigt Browser-/Vue-Beispiele und laufende Releases.

## ODT

- `odf-kit` ist Apache-2.0, browserfähig und bietet aktuell Markdown->ODT sowie ProseMirror/TipTap->ODT und ODT->Markdown. Wegen der jungen Bibliothek ist ein eigener Interoperabilitäts-Spike Pflicht.

## QR

- `qrcode` ist ein etablierter MIT-Kandidat für Basisgenerierung im Browser.
- `qr-code-styling` bietet zusätzliche Designoptionen wie Farben, Gradients, runde Dot-/Corner-Stile und Logos; konkrete Version und offene Issues vor Einsatz prüfen.

## Stripe

- Stripe Payment Links ermöglichen Zahlungen über Stripe-gehostete Seiten ohne eigenen Checkout-Code.
- Stripe Secret Keys gehören ausschließlich in Serverumgebungen und dürfen nicht im Browser eingebettet werden.
- Für automatisierte Lizenz-Fulfillment-Prozesse sind Webhooks bzw. ein vertrauenswürdiger Server-/Worker-Schritt einzuplanen.

## SSO

- Google OIDC liefert standardisierte Identitätsclaims wie `sub`, `email` und `name`; `sub` ist der stabile Identifier.
- App-eigene Premiumrechte sind nicht einfach frei in Google-/Apple-SSO-Tokens speicherbar. Dafür ist ein eigener Entitlement-Layer erforderlich.

### Quellen

1. MDN Compression Streams API - https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
2. MDN CompressionStream - https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream
3. zip.js - https://github.com/gildas-lormeau/zip.js
4. zip.js password/AES options - https://github.com/gildas-lormeau/zip.js/blob/master/docs/interfaces/ZipWriterConstructorOptions.md
5. MDN Web Crypto API - https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API
6. MDN SubtleCrypto encrypt / AES-GCM - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
7. MDN PBKDF2 / deriveKey - https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey
8. MDN URI Fragment - https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment
9. Chromium URL constants - https://chromium.googlesource.com/chromium/src/+/HEAD/url/url_constants.h
10. docx - https://github.com/dolanmiu/docx
11. odf-kit - https://www.npmjs.com/package/odf-kit
12. qrcode - https://github.com/soldair/node-qrcode
13. qr-code-styling - https://github.com/kozakdenys/qr-code-styling
14. Stripe Payment Links - https://docs.stripe.com/payment-links
15. Stripe key best practices - https://docs.stripe.com/keys-best-practices
16. Stripe Webhooks - https://docs.stripe.com/webhooks
17. Google OpenID Connect reference - https://developers.google.com/identity/openid-connect/reference
18. Sign in with Apple - https://developer.apple.com/documentation/signinwithapple/authenticating-users-with-sign-in-with-apple

---

# C29. Gesamtdefinition der nächsten Weitergabe

Für den Coding-Agenten gilt:

1. **Teil A zuerst**: reale Fehler der V1.0 beheben.
2. **Teil B**: bereits gesammelte Post-Release-V1-Anforderungen weiter umsetzen.
3. **Teil C**: Future/Premium als OpenSpec erfassen und nur dort implementieren, wo ausdrücklich priorisiert.
4. Premium in der Testphase darf als `beta-free` markiert werden, ohne Schein-Kaufprozess.
5. Kein Stripe-Secret, kein Signaturschlüssel und kein anderer Server-Secret darf in die statische Web-App gelangen.
6. Verschlüsselung erst nach definiertem Containerformat und Security Review als „sicher“ vermarkten.
7. Sharing per URL ist eine Kopie, keine Synchronisierung/Kollaboration.
8. Foldmark bleibt ohne Premium, Login oder Cloud vollständig als lokale Kernanwendung nutzbar.
