# Kurzbriefing für den Coding-Agent

Ziel: Die Foldmark-Oberfläche soll stärker icon-basiert werden, ohne Zugänglichkeit,
Kontrast oder Datenschutz-Freundlichkeit zu verlieren.

## Prioritäten

1. **Header modernisieren**
   - App-Marke sauber einbauen (`foldmark-mark`)
   - Lambro/Lumbre-Code-Marke bei externen Referenzen einbauen (`lambrocode-mark`)
   - rechts oben `language` + `theme-cycle`

2. **Workspace-Bar entkoppeln**
   - `print` und `export` trennen
   - `validation` als eigener Action-Button
   - `save`, `history`, `close` mit Icons ergänzen

3. **Editor-Toolbar aufräumen**
   - überall konsistente Icons einsetzen
   - Tooltips / `title` / `aria-label` ergänzen
   - Icon-only auf Desktop, Icon+Text in Overflow- oder Mobile-Menüs zulassen

4. **Address Book und Settings verbessern**
   - Suchfeld, Add, Edit, Duplicate, Primary, Home, Favorite, Sender, Recipient, Delete
   - in den Einstellungen explizit `delete-all-data`

## Technische Leitplanken

- keine externen Icon-CDNs
- kein Icon-Font nötig; SVG bevorzugen
- nach Möglichkeit `currentColor` nutzen
- Icon-only Buttons immer mit zugänglichem Namen versehen
- globale Switcher im Header, nicht tief in den Einstellungen verstecken

## Prüfpunkte nach Integration

- Kontrast in `paper`, `lambro-light`, `lambro-dark`, `dark`, `high-contrast`
- Tastaturnavigation und Screenreader-Namen
- Mobile-Toolbar / Overflow-Verhalten
- Print-Ansicht bleibt icon-frei, wo Icons funktional keinen Mehrwert haben
