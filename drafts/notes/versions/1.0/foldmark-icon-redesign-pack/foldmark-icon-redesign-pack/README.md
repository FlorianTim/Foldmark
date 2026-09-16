# Foldmark Icon & Theme Draft Pack

Dieses Paket bündelt einen ersten Redesign-Stand für die Foldmark-Oberfläche.
Es ist absichtlich als **Draft-Paket** aufgebaut: Die Dateien sind so zugeschnitten,
dass ein Coding-Agent sie schnell in das bestehende Projekt übernehmen, anpassen und
verfeinern kann.

## Inhalt

- `assets/icons/` – SVG-Icons, nach Bereichen gegliedert
- `assets/sprites/foldmark-icons.svg` – zusammengeführter SVG-Sprite
- `snippets/css/foldmark-icons.css` – Basisklassen für Icon-Größen und Icon-Buttons
- `snippets/css/foldmark-lambro-themes.css` – zwei zusätzliche Foldmark-Themes
- `snippets/vue/` – Beispielkomponenten für Vue 3
- `docs/icon-manifest.json` – maschinenlesbares Mapping aller Icons
- `docs/icon-usage-guide.md` – fachliche Zuordnung der Icons zu UI-Stellen
- `docs/screenshot-audit.md` – konkrete Beobachtungen zu den hochgeladenen Screenshots
- `preview/icon-gallery.html` – lokale HTML-Galerie mit Miniaturen

## Gestaltungsprinzipien

1. **SVG statt Icon-Font**: besser für CSP, Barrierefreiheit, Tree-Shaking und Themeing.
2. **`currentColor`**: fast alle UI-Icons folgen der Textfarbe des umgebenden Buttons.
3. **Brand getrennt von UI**: Foldmark- und Lambro-Code-Marken sind separat abgelegt.
4. **Icon-only nur mit zugänglichem Namen**: `aria-label` oder sichtbarer Text ist Pflicht.
5. **Papier-Theme bleibt Primärtheme**: zusätzliche Lambro-Themes ergänzen nur die Auswahl.

## Schnellintegration

1. Kopiere `assets/sprites/foldmark-icons.svg` nach `public/icons/sprite/`.
2. Binde `snippets/css/foldmark-icons.css` und `snippets/css/foldmark-lambro-themes.css` ein.
3. Verwende `snippets/vue/AppIcon.vue` und `snippets/vue/IconButton.vue` als Vorlage.
4. Ersetze zuerst die Workspace-Actions, dann die Editor-Toolbar, dann Header und Listen.

## Was nicht verifiziert wurde

- Der bereits existierende Foldmark-Icon-Code wurde hier **nicht** aus dem Projektquelltext gelesen,
  sondern nur aus Screenshots und CSS-Strukturen abgeleitet.
- Die exakten Vue-Komponentennamen in der produktiven App können abweichen.
- Die neuen Lambro/Lumbre-Themes sind als Token-Mapping vorbereitet, aber noch nicht
  in einer echten Build-Ausführung gegen das komplette Projekt getestet.

## Empfehlung für den Coding-Agent

- zuerst visuelle Regression im Header und in der Workspace-Bar prüfen
- danach Editor-Toolbar mit Overflow/Mobile-Zuständen sauber machen
- anschließend Address-Book- und Settings-Actions vereinheitlichen
- zuletzt About- und Preview-Ansichten auf Icon-Konsistenz prüfen
