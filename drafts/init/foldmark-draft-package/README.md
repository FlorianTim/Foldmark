# Foldmark Draft Package

Dieses Paket ist die nicht-normative Eingabe für das **Lambro Code Web App Template**. Es soll vollständig nach `drafts/` kopiert oder dort entpackt werden, bevor der Template-Initializer-Agent gestartet wird.

## Verwendung

1. Entpacke das Lambro-Code-Template in ein neues Repository.
2. Kopiere den Ordner `drafts/` aus diesem Paket in das Template-Repository.
3. Ersetze dort `template.config.json` durch `template.config.foldmark.json` aus diesem Paket oder übertrage die Werte manuell.
4. Öffne das Repository in VS Code bzw. im Dev Container.
5. Übergib dem Coding Agent den Inhalt aus `INITIALIZE_FOLDMARK_PROMPT.md`.
6. Der Agent soll zunächst Discovery und Spezifikation durchführen und nach Phase 2 stoppen, sofern du keine direkte Implementierung autorisierst.

## Status und Verbindlichkeit

- Alle Inhalte sind **Drafts**, Vorschläge und Arbeitsannahmen.
- Nach Review werden die daraus erzeugten OpenSpec-Dateien normativ.
- Die mitgelieferten Codebeispiele sind Referenzen, keine zwingend zu kopierende Implementierung.
- Die Logos und Icons sind editierbare Entwurfsassets. Marken- und Domainverfügbarkeit von „Foldmark“ wurde nicht verbindlich geprüft.
- Maße zu Normbriefen sind als technische Ausgangswerte gedacht. Vor einem Anspruch auf Normkonformität müssen sie gegen die aktuell lizenzierte Normquelle geprüft werden.

## Struktur

- `drafts/notes/`: Produkt-, Architektur-, UX-, Security- und Testanforderungen
- `drafts/assets/brand/`: Logos, Favicons, Social-/App-Assets
- `drafts/assets/icons/`: originale SVG-Iconentwürfe
- `drafts/assets/mockups/`: visuelle Wireframes als SVG
- `drafts/assets/examples/`: Beispielbriefe, Postkarten, Profile und Testdaten
- `drafts/assets/code-examples/`: TypeScript-, Vue-, CSS- und JSON-Referenzen
- `drafts/assets/diagrams/`: Mermaid- und PlantUML-Entwürfe
- `drafts/assets/design/`: Design-Tokens, Themes und Komponentenhinweise

## Asset-Lizenz

Die eigens für dieses Draft-Paket erzeugten SVG-/PNG-Entwürfe und Codebeispiele dürfen für Foldmark und andere Projekte von Lambro Code verwendet, verändert und ersetzt werden. Für das spätere öffentliche Repository sollte die endgültige Lizenz explizit festgelegt werden, beispielsweise MIT für Code und CC0-1.0 für eigene Platzhalterassets.
