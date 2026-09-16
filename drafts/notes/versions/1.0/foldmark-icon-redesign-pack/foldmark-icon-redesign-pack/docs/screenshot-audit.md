# Screenshot-Audit und konkrete Redesign-Hinweise

## 1. Hauptarbeitsbereich

Beobachtung:
- Die Drei-Pane-Struktur ist schon gut erkennbar.
- Oben rechts sind wichtige Aktionen noch überwiegend textbasiert: Verlauf, Drucken/Exportieren,
  Speichern, Schließen.
- Im Editor sind bereits viele Funktionen vorhanden, aber die Toolbar wirkt noch semantisch uneinheitlich.
- Die Preview-Steuerung verwendet Textlinks bzw. Text-Buttons, wo kleine, eindeutige Symbole helfen würden.

Empfehlung:
- `history`, `print`, `export`, `save`, `validation`, `close` als primäre Workspace-Actions.
- `fit-page`, `fit-width`, `guides-visible`/`guides-hidden` in der Preview.
- `undo`, `redo`, `bold`, `italic`, `small-text`, `heading`, `code`, `list-bulleted`,
  `list-numbered`, `quote`, `link`, `table`, `page-break`, `image`, `date`, `greeting`,
  `signoff` in der Editor-Toolbar.

## 2. Address Book

Beobachtung:
- Addresseinträge sind funktional, die Aktionsleiste rechts wirkt jedoch noch textlastig.
- Es gibt mehrere Statusarten: Primäradresse, Heimatadresse, Favorit, als Absender verwenden,
  als Empfänger verwenden.

Empfehlung:
- `add`, `edit`, `duplicate`, `primary`, `home`, `favorite`, `sender`, `recipient`, `delete`.
- Suchfeld mit `search`-Icon.
- Badge-artige Semantik für Primär/Heimat/Favorit beibehalten.

## 3. Bilder-Seite

Beobachtung:
- Import ist bereits vorhanden, wirkt aber noch generisch.
- Später werden hier unterschiedliche Asset-Arten leben: Bild, Briefkopf, Unterschrift.

Empfehlung:
- `images` als Bereichsicon, `image` für allgemeines Bild,
  `signature` für Unterschriften, `letterhead` für Briefpapier,
  `add` bzw. `image`+`add` für Importaktionen.

## 4. Einstellungen

Beobachtung:
- Viele Menüpunkte sind textuell vorhanden, aber noch ohne visuelle Hierarchie.
- Ein klar sichtbarer Punkt „Alle Daten löschen“ fehlt.

Empfehlung:
- oben rechts globale Switcher: `language` und `theme-cycle`
- innerhalb der Einstellungen: `settings`, `language`, `theme-cycle`, `delete-all-data`,
  `lock`, `about`, `repository`, `validation`, `pro`

## 5. Über-Seite

Beobachtung:
- Gute Metadatenstruktur, aber aktuell etwas nüchtern.
- Verweise auf Lambro/Lumbre Code und die App-Website profitieren vom Brand-Icon.

Empfehlung:
- `foldmark-mark` als App-Marke
- `lambrocode-mark` für Verweise auf das Unternehmen bzw. die Website
- `about`, `repository`, `lock` und ggf. `certificate` für spätere Signatur-/Vertrauensfunktionen
