---
id: getting-started
locale: de
title: Anleitung
order: 10
---

# Anleitung

Foldmark ist ein lokaler Editor für Briefe, Postkarten und Karten. Du schreibst den Inhalt einmal
und gibst ihn auf dem Blatt aus, auf dem er wirklich landen soll. Alles bleibt in diesem Browser.

## Orientierung

- **Dokumente** — deine Briefe, Karten und freien Dokumente, in Ordnern und mit Archiv. Hier fängst
  du an.
- **Kontaktverzeichnis** — Personen und Organisationen mit allen Adressen und Kontaktdaten;
  Empfänger und Absender kommen von hier.
- **Druckprofile** — die Papiergeometrie: Format, Ränder, Bereiche und Hilfsmarken.
- **Bilder** — Logos, Fotos, Briefköpfe und Unterschriftsbilder; eine Unterschrift kannst du dort
  auch mit Stift, Finger oder Maus zeichnen — sie wird auf den Schriftzug zugeschnitten und mit
  transparentem Hintergrund gespeichert.
- **Einstellungen** — in Kategorien: Sprache, Dokumentvorgaben, Darstellung, Schriften, Speicher,
  Datenschutz, Daten & Backup.

## Den ersten Brief schreiben

Beim ersten Start fragt Foldmark einmal, ob du deine Absenderdaten hinterlegen möchtest. **Jetzt
einrichten** öffnet das Kontaktformular als Absender; der Kontakt wird zum Hauptabsender, mit dem
jeder neue Brief beginnt. **Später** fragt beim nächsten Start noch einmal, **Nicht mehr fragen**
nie wieder. Eine E-Mail-Adresse brauchst du dafür nicht.

1. **Dokumente → Neuer Brief.**
2. Links Empfänger, Betreff und Datum eintragen.
3. Darunter den Brieftext in Markdown schreiben.
4. In der Mitte siehst du das Blatt maßstäblich — mit Falz- und Lochmarken.
5. Rechts steht unter **Prüfung**, was noch fehlt.
6. **Speichern.** Dann **Ausgabe → Drucken**.

{{screenshot:04-workspace}}

### Formatierung über Markdown hinaus

Die Werkzeugleiste bietet, was ein Brief braucht und Markdown nicht kennt: eine **Farbe** nach Namen
(jede Farbe hat einen Druckwert, der auf Papier lesbar bleibt), Markierung, Unterstreichung,
Kleingedrucktes, Hoch- und Tiefstellung, Einzug, Ausrichtung, Hinweiskasten, Unterschriftszeile und
einen **Seitenumbruch**. Ein Bild kommt aus der Bildbibliothek; klickst du es an, erscheint eine
kleine Leiste: links, zentriert oder rechts ausrichten, 25/50/75 % der Textbreite oder volle Breite,
kleiner und größer, Originalgröße. In der Datei ist all das schlichter Text — `:red[Wort]`,
`:::note{type="warning"}`, `::page-break`, `![Logo](asset:…){width=50% align=center}` —, darum
bleibt das Dokument überall lesbar; eine Schreibweise, die Foldmark nicht kennt, bleibt erhalten und
erscheint als ihr Text. **Formatierung entfernen** (`Tx`, `Ctrl+\`) nimmt einer Auswahl alle
Zeichenformate wieder ab. **Bearbeiten → Suchen und ersetzen** (`Ctrl+H` im Schreibbereich) blendet
eine Leiste über dem Text ein: Treffer vor und zurück, Groß-/Kleinschreibung, ganzes Wort, Ersetzen
und Alle ersetzen — in der visuellen Ansicht wie im Markdown.

Menü, Werkzeugleiste und Tastenkürzel tun dasselbe. Was gerade keinen Ort hat — etwa Fett, wenn kein
Textfeld aktiv ist —, ist im Menü ausgegraut; steht der Cursor im Betreff, macht **Format → Fett**
die ganze Betreffzeile fett oder normal.

### Vorlagen

Ein Brief, den du so öfter schreibst? **Datei → Als Vorlage speichern …** merkt sich Druckprofil,
Sprache, Schrift und Farben, Seitenzahlen, Anrede, Gruß und Unterzeichner — auf Wunsch auch
Absender, Brieftext und Betreff. Empfänger und Datum bleiben beim Brief. Unter **Dokumente → + Neu**
stehen deine Vorlagen; ein neues Dokument daraus ist danach unabhängig von der Vorlage. **Vorlagen
verwalten …** benennt um und löscht. Die erste Vorlage ist frei; weitere sind Premium und während
der Testphase kostenlos — die App sagt das an der Stelle, mehr nicht.

### QR-Codes

**Einfügen → QR-Code** (oder das Symbol in der Werkzeugleiste) setzt einen QR-Code in den Text: eine
Webadresse, eine E-Mail-Adresse mit Betreff, eine Telefonnummer oder eine Zeile Text. Du wählst die
Größe in Millimetern — die weiße Ruhezone gehört dazu — und die Ausrichtung; die Vorschau zeigt den
Code, wie er gedruckt wird, und warnt, wenn die Module für einen Drucker zu klein werden. In der
Datei steht nur der Text, etwa `::qr[https://example.org]{size=40mm align=center}`; der Code wird
beim Anzeigen daraus erzeugt und verlässt den Browser nie. Ein Klick auf den Code zeigt Ausrichtung
und **Bearbeiten …**. Fünf Codes sind frei; weitere sind Premium und während der Testphase
kostenlos.

### Tastenkürzel

Unter **Hilfe → Tastenkürzel** steht die Liste für dein System. Die wichtigsten: `Ctrl+S` speichern,
`Ctrl+P` drucken, `Ctrl+B` / `Ctrl+I` / `Ctrl+U` fett, kursiv, unterstrichen, `Ctrl+K` Link,
`Ctrl+Enter` Seitenumbruch, `Ctrl+\` Formatierung entfernen, `Ctrl+Alt+1` bis `6` Überschriften,
`Ctrl+Alt+0` Absatz. Auf dem Mac steht ⌘ für Ctrl. Die Tasten des Browsers — neuer Tab, Fenster
schließen, Suchen — bleiben dem Browser.

Unter **Dokument → Dokumentthema** wählst du Schrift, Größe und Abstände des Papiers. Dieses Thema
reist mit dem Dokument und ist unabhängig vom Erscheinungsbild der App.

### Die drei Stufen der Prüfung

- **Fehler** — so lässt sich diese Ausgabe nicht erzeugen.
- **Warnung** — es geht, wird auf Papier aber wahrscheinlich falsch.
- **Hinweis** — gut zu wissen, nichts zu tun.

Die Prüfung hängt vom **Ziel** ab. Ein Brief ohne Anschrift ist beim Drucken ein Fehler und beim
Markdown-Export völlig in Ordnung.

## Maßstab: der wichtigste Punkt

Die Vorschau ist maßstäblich in Millimetern. **Zoomen ändert die Ausgabe nicht** — der Zoom ist eine
reine Darstellungsgröße.

Was die Ausgabe sehr wohl ändert, ist der Druckdialog:

> Stelle die Skalierung im Druckdialog auf **100 %**, nicht auf "An Seite anpassen". Aktiviere
> Hintergrundgrafiken, damit Bilder mitgedruckt werden.

Foldmark sagt das bei jedem Druck, weil es der einzige Schritt ist, den die Anwendung nicht für dich
übernehmen kann.

## Druckprofile

Ein Druckprofil beschreibt das Papier, nicht den Inhalt. Deshalb kannst du denselben Brief auf ein
DIN-A4-Briefprofil, auf A4 frei oder auf US Letter legen, ohne ihn neu zu schreiben.

Mitgeliefert sind siebzehn Profile in vier Gruppen — Briefe (DIN A4 Brief Form B und Form A, A4
frei, A4 mit Briefkopf, A5 Brief, US Letter, dazu A4, A5 und US Letter quer), Karten (Postkarte A6
quer, A5 Karte, A6 Karte), Fotos (10 × 15, 13 × 18 und 15 × 20 cm) und Weitere (Briefumschlag DL,
Lernkarte A7). Unter **Druckprofile** siehst du jede Marke mit ihrer Koordinate in Millimetern; das
ist die Zahl, die du mit dem Lineal nachmessen kannst.

{{screenshot:05-profiles}}

Mitgelieferte Profile sind unveränderlich und lassen sich nicht löschen. **Kopie anlegen** erzeugt
ein eigenes Profil, das du umbenennen, dessen Ränder du in Millimetern setzen, das du ins Querformat
drehen und das du wieder löschen kannst. Drehen tauscht Breite und Höhe und lässt Ränder und Marken,
wo sie sind; hätte danach eine Marke keinen Platz mehr auf dem Blatt, bleibt die Ausrichtung
gesperrt — drehe dann eine Kopie eines freien Profils.

Die **Hilfsmarken** einer eigenen Kopie bearbeitest du nach Zahlen: Art, Bezeichnung, x und y in
Millimetern, Länge und Richtung (bei Flächen Breite und Höhe), Linie, Strichstärke, gedruckt oder
nur in der Vorschau. **Marke hinzufügen** setzt eine neue an den linken Rand auf halber Höhe, die
Pfeile ordnen, der Papierkorb entfernt. Was die Prüfung an der Liste auszusetzen hat, steht
darunter, während du tippst; **Marken speichern** geht erst, wenn keine Marke außerhalb des Blatts
liegt.

### Kalibrierbogen

Ob eine Falzmarke wirklich bei 105 mm landet, entscheidet dein Drucker. **Kalibrierbogen drucken**
unter dem gewählten Profil druckt bekannte Abstände auf genau dieses Papier: einen Rahmen 10 mm von
jeder Kante, Striche alle 10 mm, ein Kreuz in der Blattmitte und die Marken des Profils dort, wo ein
Brief sie druckt. Drucke mit 100 % (nicht „an Seite anpassen") und miss mit dem Lineal: Der Abstand
von der Papierkante zum Rahmen ist der Versatz deines Druckers, die Größe des Rahmens zeigt einen
Skalierungsfehler. Beides stellst du im Druckertreiber ein.

### Zu den DIN-Profilen

Die DIN-A4-Briefprofile verwenden gebräuchliche Arbeitswerte, die **nicht** gegen eine lizenzierte
Ausgabe der aktuellen Norm geprüft wurden; das Profil sagt das selbst. Wenn du Normkonformität
brauchst, prüfe die Maße vorher.

## Postkarten

Eine Postkarte hat zwei Seiten, und der Editor auch: **Vorderseite** mit Bild und Bildunterschrift,
**Rückseite** mit Nachricht, Anschrift und Briefmarkenfeld. Der Export erzeugt genau zwei Seiten.
Wende beim beidseitigen Druck über die **kurze** Kante.

## E-Mail

Foldmark **bereitet vor und übergibt** — gesendet wird nichts. Vier Wege: Text, eingeschränktes
HTML, PDF als Anhang (über den Druckdialog) und eine EML-Datei.

Für E-Mail-PDFs sind Falz-, Loch- und Schnittmarken standardmäßig aus. Niemand faltet einen Anhang.

## Deine Daten

Alles liegt in diesem Browser. Unter **Einstellungen → Datenschutz und Daten** siehst du, was
gespeichert ist — gezählt, nicht geschätzt —, und kannst alles exportieren, wieder einspielen oder
löschen.

{{screenshot:03-privacy}}

Die beiden Löschaktionen sind bewusst getrennt: **Daten löschen** entfernt Inhalte und behält die
Einstellungen, **Einstellungen zurücksetzen** umgekehrt.

### Kontakte importieren

Das Kontaktverzeichnis liest **vCard-Dateien** (`.vcf`, etwa aus dem Telefon oder aus Outlook) und
**CSV-Exporte** von Google Kontakte — über **Kontakte importieren** oder indem du die Datei auf das
Verzeichnis ziehst. Vor dem Speichern siehst du, was erkannt wurde: neu, wahrscheinlich vorhanden
(gleiche E-Mail, Telefonnummer oder Kennung, gleicher Name mit Postleitzahl) und prüfungsbedürftig
(nur der Name passt). Je Zeile entscheidest du: überspringen, zusammenführen oder als neu
importieren. Zusammenführen ergänzt nur, was fehlt — Adressen, E-Mails, Telefonnummern —, und
überschreibt nie.

### Kontakte exportieren

**Exportieren** im Kontaktverzeichnis schreibt das ganze Verzeichnis als **vCard** (`.vcf`, für
Telefon, Outlook, Apple Kontakte) oder als **CSV** in den Spalten von Google Kontakte. Mitgenommen
wird, wer die Person ist — Namen, Organisation, alle Adressen, E-Mails, Telefonnummern, Webseiten,
Notizen, Tags. Rollen wie „Absender" oder „Favorit" bleiben in Foldmark. Importierst du die Datei
später wieder, erkennt Foldmark jeden Eintrag wieder und legt ihn nicht doppelt an.

## Dateiformat

Markdown mit YAML-Kopf — lesbar auch ohne Foldmark. Ein Dokument exportierst du über **Ausgabe →
Markdown**, importieren kannst du es unter **Dokumente → Markdown importieren** oder indem du die
Datei auf die Dokumentliste ziehst; vor dem Speichern zeigt Foldmark, was daraus wird — Titel, Art,
Druckprofil, unbekannte Felder, fehlende Bilder. Der Kopf verwendet Pandocs Namen, wo sie dasselbe
meinen, und trägt die Seitengröße, sodass `pandoc brief.md -o brief.pdf` dieselbe Seite setzt; ein
für Pandoc geschriebener Kopf öffnet sich in Foldmark, ohne Schlüssel zu verlieren.

Lässt sich eine Datei nicht lesen, bekommst du den Grund mit Zeilennummer und deinen Originaltext
zurück. Es geht nichts verloren.
