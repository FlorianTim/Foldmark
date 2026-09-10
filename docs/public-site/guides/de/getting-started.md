---
id: getting-started
locale: de
title: Anleitung
order: 10
---

# Anleitung

Diese Anleitung ist **in der Anwendung enthalten**. Sie funktioniert offline — und sie ist das, was
jemand sieht, ohne die Seite zu verlassen.

> Ersetze diese Datei, wenn du aus dem Template eine App ableitest. Die Konvention bleibt:
> `src/presentation/help/<dokument>.<sprache>.md`.

## Orientierung

- **Aufgaben** — die Demo-Ansicht. Ersetze sie durch dein erstes echtes Feature.
- **Einstellungen** — Sprache, Darstellung, Hilfe, Datenschutz und Daten, Pro-Status.
- **Über** — Anwendungsdaten, Lizenzhinweise und Webseite.

{{screenshot:02-settings}}

## Sprache und Darstellung

Beides wird in den Einstellungen geändert und nur in diesem Browser gespeichert. Nichts wird
übertragen. Die Themes sind lokale CSS-Variablen; es wird keine Schrift und kein Stylesheet von
Dritten geladen.

## Deine Daten

Alles, was die Anwendung speichert, liegt in diesem Browser — IndexedDB für die Inhalte, Local
Storage für die Einstellungen. Es gibt kein Konto und keinen Server.

Zwei getrennte Aktionen nehmen das zurück, und sie tun Unterschiedliches:

- **Lokale Daten löschen** — löscht alle Inhalte, behält deine Einstellungen.
- **Einstellungen zurücksetzen** — setzt Sprache, Darstellung und alle weiteren Einstellungen
  zurück, behält deine Inhalte.

Beide stehen auf der Seite **Datenschutz und Daten**, und beide fragen nach, bevor sie etwas tun.

{{screenshot:03-privacy}}

## Die Einleitung

Die Einleitung vom ersten Besuch lässt sich jederzeit erneut öffnen: **Einstellungen → Einleitung
erneut anzeigen**.

## Hilfe bekommen

- Die häufigen Fragen in dieser Anwendung beantworten das Meiste offline.
- **Einstellungen → Datenschutz und Daten** enthält die Kontaktadressen.
- Wenn du die Browserdaten löschst, ist alles weg, was diese Anwendung gespeichert hat — auch der
  Hinweis, dass du die Einleitung schon gesehen hast.
