<!-- Generiert aus docs/public-site/. Nicht direkt bearbeiten. -->

# Drucken und Maße

## Meine Falzmarke sitzt nicht an der richtigen Stelle. Woran liegt das?

Fast immer an der Skalierung im Druckdialog. Foldmark gibt die Seite in echten Millimetern
aus; stellt der Druckdialog auf "An Seite anpassen", verschiebt sich alles um einige
Prozent. Stelle die Skalierung auf 100 % und drucke erneut.

Stimmt es danach immer noch nicht, liegt es am Randversatz des Druckers. Drucke eine Seite
mit eingeschalteten Marken und miss den Abstand von der oberen Papierkante bis zur ersten
Falzmarke: bei Form B sollen es 105 mm sein.

## Ändert der Zoom in der Vorschau etwas am Druck?

Nein, und das ist keine Zusicherung auf Vertrauensbasis. Die Vorschau zeichnet das Blatt in
CSS-Millimetern, und der Zoom ist eine reine Darstellungstransformation auf einem
übergeordneten Element. Eine solche Transformation verändert das Layout nicht — die
Koordinaten bleiben dieselben. Genau das prüfen die Tests der Anwendung.

## Erzeugt Foldmark PDF-Dateien?

Nicht selbst. "Als PDF speichern" ist ein Ziel im Druckdialog deines Browsers, und genau
dorthin führt Foldmark dich. Der Vorteil: die PDF entsteht mit derselben Engine, die auch
druckt. Foldmark verspricht keine eigene PDF-Wiedergabe, die es nicht kontrolliert.

## Sind die DIN-Profile normkonform?

Nein — und Foldmark behauptet es auch nicht. Die Profile "DIN A4 Brief – Form A/B"
verwenden gebräuchliche Arbeitswerte: Form B faltet bei 105 mm und 210 mm, Form A bei 87 mm
und 192 mm, gelocht wird jeweils bei 148,5 mm.

Diese Werte wurden **nicht** gegen eine lizenzierte Ausgabe der aktuellen Norm geprüft. Die
Anwendung sagt das im Profil und bei jedem Druck. Wenn du Normkonformität brauchst, prüfe
die Maße gegen die Normquelle, bevor du den Umschlag zuklebst.

## Wie drucke ich eine Postkarte beidseitig?

Das Postkartenprofil erzeugt genau zwei Seiten: Seite 1 ist die Vorderseite, Seite 2 die
Rückseite. Drucke beidseitig und wende über die **kurze** Kante — bei einer Querformatkarte
steht die Rückseite sonst auf dem Kopf. Der Ausgabebereich nennt die Wendekante zu jedem
Duplexprofil.

# Deine Daten

## Wo werden meine Daten gespeichert?

In diesem Browser: IndexedDB für Dokumente, Adressen, Absender, eigene Profile und Bilder,
Local Storage für die Einstellungen. Es gibt kein Konto, keinen Server und keinen Upload im
Hintergrund. Foldmark stellt überhaupt keine Anfrage nach außen.

## Funktioniert die Anwendung offline?

Ja. Nach dem Laden arbeitet Foldmark vollständig lokal. Die Anleitung und diese Fragen sind
in der Anwendung enthalten.

## Was passiert, wenn ich meine Daten lösche?

Es gibt zwei getrennte Aktionen, weil sie Unterschiedliches tun:

- **Meine lokalen Daten löschen** entfernt Dokumente, Adressen, Absender, eigene Profile
  und Bilder. Die Einstellungen bleiben.
- **Einstellungen zurücksetzen** entfernt Sprache, Theme und Voreinstellungen. Die Inhalte
  bleiben.

Beide sind endgültig. Exportiere vorher eine Sicherung.

## Wie sichere ich alles?

Unter "Datenschutz & Daten" → **Alle Daten exportieren**. Du bekommst eine JSON-Datei mit
allem: Dokumenten, Adressen, Absendern, eigenen Druckprofilen, Bildern und Einstellungen.
Dieselbe Datei lässt sich dort wieder einspielen.

Einzelne Dokumente kannst du zusätzlich als Markdown exportieren — lesbar auch ohne
Foldmark.

## Ist eine hinterlegte Unterschrift rechtsgültig?

Nein. Ein Unterschriftsbild ist ein Bild einer Unterschrift. Es ist keine qualifizierte
elektronische Signatur und hat keine kryptografische Bedeutung.

# Dokumente und Formate

## In welchem Format speichert Foldmark ein Dokument?

Markdown mit YAML-Kopf. Das heißt: deine Briefe bleiben lesbar und bearbeitbar, auch ohne
Foldmark und auch in zehn Jahren. Inhalt, Empfänger, Betreff, Datum und Exporteinstellungen
gehen beim Export und erneuten Import verlustfrei durch.

## Meine Datei lässt sich nicht importieren. Ist mein Text weg?

Nein. Wenn Foldmark eine Datei nicht versteht, zeigt es den Grund samt Zeilennummer **und**
gibt dir den unveränderten Originaltext zurück. Es wird nichts stillschweigend verworfen
und nichts halb übernommen.

Foldmark liest bewusst nur eine kleine YAML-Teilmenge. Anker, Aliase, Tags und
Fluss-Sammlungen werden abgelehnt statt interpretiert.

## Warum fehlen platzierte Bilder in der exportierten Markdown-Datei?

Weil sie auf Bilddaten verweisen, die nur in diesem Browser liegen. Eine Markdown-Datei auf
einem anderen Rechner würde Bilder beschreiben, die dort nicht existieren. Für eine
vollständige Kopie nimm die Sicherung unter "Datenschutz & Daten".

# E-Mail

## Verschickt Foldmark meine E-Mail?

Nein. Foldmark bereitet die Nachricht vor und übergibt sie an dein E-Mail-Programm — als
mailto-Link, als Text zum Kopieren oder als EML-Datei. Es gibt keinen Mailserver und keine
gespeicherten Zugangsdaten. Ob die Nachricht rausgeht, entscheidest du in deinem
E-Mail-Programm.

## Warum ist der Button "E-Mail-Programm öffnen" manchmal nicht da?

Weil die Nachricht für einen mailto-Link zu lang ist. Browser und E-Mail-Programme kürzen
zu lange Links unterschiedlich — und ein stillschweigend abgeschnittener Brief ist
schlimmer als ein Kopieren-Button. Foldmark sagt es dir stattdessen.

## Warum hat die PDF für den E-Mail-Anhang keine Falzmarken?

Weil niemand einen Anhang faltet. Die Voreinstellung blendet Falz-, Loch- und Schnittmarken
für E-Mail-PDFs aus; im Ausgabebereich kannst du sie pro Dokument wieder einschalten.
