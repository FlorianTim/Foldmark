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
