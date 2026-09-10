# Prompt: Repository-Feedback und Engineering-Alignment

Du analysierst das aktuell geöffnete LumbreCode-Repository und beschreibst,
wie es künftig mit der gemeinsamen Engineering-Basis
`FlorianTim/lumbrecode-engineering` zusammenarbeiten soll.

Der Prompt hat zwei Aufgaben:

1. das Repository belegbar erfassen und die Baseline dagegen prüfen,
2. genau ein Dokument schreiben: `.lumbrecode/ENGINEERING_ALIGNMENT.md`.

## Grundhaltung

Das geöffnete Repository ist in der Regel bereits weit entwickelt. Seine
bestehende Architektur, seine Workflows und seine Konventionen haben Vorrang
vor den Annahmen der Baseline.

`lumbrecode-engineering` liefert gemeinsame Standards, wiederverwendbare
Workflows, Skills, Agenten, Schemas und Qualitätsregeln. Es beschreibt die
Intention und die gemeinsamen Schnittstellen — nicht die innere Architektur
aller Repositories.

Eine funktionierende repositoryspezifische Lösung wird nicht umgebaut, damit
sie der zentralen Baseline optisch entspricht. Ist die Baseline zu unflexibel,
ist das ein Befund über die Baseline, nicht über das Repository.

## Wichtige Einschränkungen

- Schreibe genau ein Dokument: `.lumbrecode/ENGINEERING_ALIGNMENT.md`.
  Kollidiert dieser Pfad mit einer bestehenden Repository-Konvention,
  verwende den passenden bestehenden Dokumentationsort und begründe die
  Abweichung im Dokument selbst.
- Implementiere nichts. Keine Workflows, keine kopierten Skills oder Agenten,
  kein `docs/public-site/`, keine Release-Automatisierung, kein
  Produktionscode.
- Erstelle keine Commits und keine Pull Requests.
- Führe keine destruktiven Befehle aus.
- Zeige keine Geheimnisse oder Secret-Werte.
- Nutze ausschließlich belegbare Informationen aus dem Repository.
- Kennzeichne Annahmen ausdrücklich.
- Datenschutz- oder Rechtstexte dürfen nicht als rechtlich freigegeben
  bewertet werden.
- Prüfe auch lokale Nutzbarkeit durch Coding-Agenten ohne dauerhaften Zugriff
  auf das private Engineering-Repository.

## Zu untersuchende Bereiche

### 1. Repository-Identität

- Name und Zweck
- Repository-Typ:
  `flutter`, `webapp`, `astro`, `library`, `automation` oder `other`
- Hauptsprachen und Frameworks
- Monorepo oder Einzelprojekt
- primäre Plattformen
- lokale und CI-Buildumgebung

Lies zuerst die vorhandenen Architektur-, Entwicklungs-, Release- und
Planungsdokumente, bevor du irgendeine Empfehlung formulierst. Insbesondere:

```text
README
AGENTS.md
CLAUDE.md
.github/
docs/
scripts/
pubspec.yaml
melos.yaml
package.json
Makefile
bestehende Architektur- und Planungsdokumentation
```

### 2. Qualitätskommandos

Ermittle die tatsächlich vorhandenen Befehle für:

- Formatierung
- statische Analyse
- Unit-Tests
- Widget-/Komponententests
- Integrations- oder End-to-End-Tests
- Codegenerierung
- Produktionsbuild
- Lizenzprüfung
- Sicherheitsprüfung
- Accessibility-Prüfung

Nenne die Quelldatei, aus der jeder Befehl abgeleitet wurde. Ein bestehendes,
funktionierendes Kommando darf nicht durch eine schlechtere generische
Variante ersetzt werden.

### 3. Bestehende Automatisierung

Untersuche insbesondere:

```text
.github/workflows/
.github/actions/
scripts/
Makefile
package.json
melos.yaml
pubspec.yaml
```

Berichte:

- vorhandene Workflows,
- Trigger,
- Secrets und Variablen nur namentlich,
- wiederverwendbare Teile,
- Überschneidungen mit einer zentralen Baseline,
- veraltete oder riskante Action-Verwendungen,
- deployment- und release-spezifische Besonderheiten.

### 4. Agenten und Anweisungen

Suche nach:

```text
AGENTS.md
CLAUDE.md
GEMINI.md
.github/copilot-instructions.md
.github/instructions/
.github/agents/
.github/skills/
.claude/skills/
.agents/skills/
```

Bewerte:

- welche Regeln allgemein wiederverwendbar sind,
- welche Regeln zwingend im Repository bleiben müssen,
- Konflikte oder Dopplungen,
- fehlende Pfadregeln,
- lokale Agent-Kompatibilität.

Die gewünschte Architektur ist:

```text
lumbrecode-engineering
        ↓
Baseline wird als Release synchronisiert
        ↓
Consumer Repository enthält lokale Regeln, Skills und Tooling
        ↓
Coding Agent arbeitet ausschließlich lokal
```

Nicht:

```text
Coding Agent
        ↓
muss bei jeder Aufgabe GitHub öffnen
        ↓
privates lumbrecode-engineering laden
```

Prüfe deshalb ausdrücklich, ob nach einer Synchronisation alles lokal
vorliegt, was ein Coding-Agent für die normale Arbeit braucht.

### 5. Öffentliche Website-Inhalte

Prüfe, ob `docs/public-site/` bereits existiert oder aus welchen bestehenden
Spezifikationen sich folgende Inhalte ableiten lassen:

- Manifest
- FAQ Deutsch/Englisch
- Datenschutz Deutsch/Englisch
- Anleitungen
- Roadmap
- Changelog
- öffentliche Assets

Die verbindliche Zielstruktur liegt als Vorlage unter
`.lumbrecode/templates/public-site/` und als Schema unter
`.lumbrecode/schemas/public-site/`. Sie darf an das bestehende Repository
angepasst werden, wenn es dafür einen belegbaren Grund gibt.

Die Anwendung bleibt die fachliche Source of Truth für Funktionen,
Anleitungen, FAQ, Datenschutzinformationen, Changelog, öffentliche Roadmap und
app-spezifische Supportinformationen. Das Website-Repository
`FlorianTim/lumbrecode_webseite` übernimmt diese Inhalte nur zur Darstellung
und wird dadurch nicht selbst zur fachlichen Quelle.

Berichte außerdem:

- authoritative Quellen,
- Lücken,
- veraltete oder widersprüchliche Dokumente,
- Inhalte, die nicht öffentlich werden dürfen,
- notwendige menschliche Freigaben.

### 6. Release- und Branchmodell

Ermittle:

- Default-Branch
- Release-Branches
- Tags und Versionierung
- Beta-/Stable-Kanäle
- Artifact-Erzeugung
- Store- oder Hosting-Deployment
- geeigneten Zeitpunkt für die Public-Site-Synchronisation

### 7. Sicherheit, Datenschutz und Secrets

Berichte nur Namen und Verwendungszweck, niemals Werte:

- Repository Secrets
- Environment Secrets
- Variablen
- Deploy Keys
- GitHub App-Nutzung
- externe Dienste
- Netzwerkzugriffe
- Analytics/Telemetry
- personenbezogene Daten in Tests oder Logs

Privacy-Informationen werden eng an der jeweiligen Anwendung gepflegt, weil
Apps unterschiedliche Datenflüsse, Berechtigungen und Plattformen haben.

Erlaubt ist: technische Privacy-Auswirkungen erkennen, Privacy-Dokumentation
aktualisieren, Widersprüche melden, neue Permissions dokumentieren, neue
externe Dienste melden.

Nicht erlaubt ist: rechtliche Freigaben erteilen, DSGVO-Konformität
garantieren, einen Privacy-Entwurf als menschlich geprüft markieren.

### 8. Roadmap

Eine öffentliche Roadmap gehört nach `docs/public-site/roadmap.yaml` oder in
eine funktional gleichwertige bestehende Struktur. Die erlaubten Zustände
stehen im Schema `.lumbrecode/schemas/public-site/v1/roadmap.schema.json`:

```text
considering
planned
in_progress
testing
released
postponed
```

Die öffentliche Roadmap darf keine Sicherheitslücken, internen
Infrastrukturdetails, vertraulichen Informationen und keine erfundenen
Veröffentlichungstermine enthalten.

### 9. Baseline-Empfehlung

Wähle eines:

```text
common
flutter
webapp
astro
custom
```

Definiere anschließend:

- benötigte zentrale Workflows,
- benötigte Skills,
- benötigte Custom Agents,
- zu synchronisierende Dateien,
- repositoryspezifische Ausnahmen,
- notwendige Workflow-Inputs,
- notwendige Secrets nur nach Namen,
- Migrationsreihenfolge.

## Was zentral werden soll

Prüfe, ob diese Bestandteile sinnvoll aus `lumbrecode-engineering` übernommen
werden können:

- allgemeine Agent Instructions
- gemeinsame Skills
- Privacy-Impact-Review
- Release-Dokumentations-Skill
- Public-Site-Maintainer
- Roadmap-Maintainer
- gemeinsame Schemas
- Public-Site-Validator
- generische Quality-Workflows
- generische Release-Workflows
- Lizenz- und Security-Prüfungen
- gemeinsame Brand-Standards

## Was repositoryspezifisch bleibt

Diese Bestandteile werden normalerweise nicht zentral erzwungen:

- konkrete Produktarchitektur
- konkrete Verzeichnisstruktur der Anwendung
- bestehendes State Management
- Datenbankarchitektur
- bestehende Buildlogik
- konkrete Releaseprozesse
- konkrete Plattformberechtigungen
- app-spezifische Privacy-Fakten
- konkrete Dependency-Entscheidungen
- bestehende funktionierende Testarchitektur
- projektspezifische Agent-Regeln
- projektspezifische Quality Commands

## Wiederverwendbare Workflows

Die Zielidee ist:

```text
Consumer Repository
      ↓
kleiner lokaler Workflow
      ↓
FlorianTim/lumbrecode-engineering/.github/workflows/...@v1
```

Das gilt nur dort, wo der bestehende Workflow tatsächlich sinnvoll
abstrahiert werden kann. Besitzt das Repository einen etablierten Quality
Command, etwa `melos run ci`, soll der zentrale Workflow diesen Command als
Input ausführen, statt die interne CI-Struktur des Repositories neu zu
erfinden.

## Abweichungen melden statt still korrigieren

Weicht das Repository von der Zielstruktur ab, ist das kein Fehler des
Repositories. Prüfe zuerst:

1. Ist die Abweichung absichtlich?
2. Ist die bestehende Lösung besser oder bereits stärker ausgebaut?
3. Würde eine Anpassung einen unnötigen Refactor verursachen?
4. Ist die zentrale Baseline zu unflexibel?
5. Sollte stattdessen `lumbrecode-engineering` angepasst werden?
6. Ist eine repositoryspezifische Ausnahme sinnvoll?

Dokumentiere jede relevante Abweichung in dieser Form:

```text
EXPECTED STRUCTURE
ACTUAL STRUCTURE
DIFFERENCE
WHY THE CURRENT REPOSITORY MAY BE DIFFERENT
RECOMMENDATION
```

und schließe sie mit genau einem Urteil ab:

```text
KEEP_REPOSITORY_AS_IS
ADAPT_ENGINEERING_BASELINE
ADD_REPOSITORY_EXCEPTION
SAFE_TO_ALIGN
NEEDS_DECISION
```

## Entscheidung je Integrationsbereich

Ordne jeden geprüften Bereich in genau eine Kategorie ein:

```text
USE_SHARED_BASELINE
KEEP_LOCAL
SHARED_WITH_CONFIGURATION
REPOSITORY_EXCEPTION
CHANGE_ENGINEERING_BASELINE
NEEDS_DECISION
```

Fasse das Ergebnis in einer kompakten Tabelle zusammen:

```text
Area | LumbreCode Intention | Current Repository | Difference | Decision
```

## Abgrenzung zur Ausnahmeliste

Die beiden Dokumente haben unterschiedliche Lebensdauer und ersetzen einander
nicht:

- `.lumbrecode/ENGINEERING_ALIGNMENT.md` ist die Analyse zu einem Zeitpunkt:
  Bestandsaufnahme, Bewertung, Migrationsplan. Sie wird bei einer erneuten
  Prüfung ersetzt.
- `.lumbrecode/EXCEPTIONS.md` ist die dauerhaft gepflegte Liste bewusst
  gebrochener Baseline-Regeln, wie in `REPOSITORY_INTEGRATION.md` des
  Engineering-Repositories beschrieben.

Mehr Regeln zu haben als die Baseline ist keine Ausnahme und gehört nicht in
die Ausnahmeliste. Dorthin gehört nur, was du mit `ADD_REPOSITORY_EXCEPTION`
bewertet hast — und erst nach menschlicher Entscheidung, nicht im Rahmen
dieser Analyse.

## Sonderregel für `FlorianTim/WasThereSomething`

Ist das geöffnete Repository `FlorianTim/WasThereSomething`, gilt zusätzlich:
Die Integration wird jetzt nicht umgesetzt, sondern ausschließlich in die
bestehende Planung für Version 1.4 aufgenommen.

Vorgehen:

1. aktuellen Repository-Stand untersuchen,
2. mit dieser Zielarchitektur vergleichen,
3. Abweichungen dokumentieren,
4. die bestehende Planung für Version 1.4 finden,
5. die notwendigen Arbeiten dort strukturiert einordnen.

Erstelle keine parallele neue Roadmap, wenn eine verbindliche 1.4-Planung
bereits existiert. Passe die bestehende Planung an.

Der 1.4-Plan soll mindestens diese Themen berücksichtigen, soweit sie nach
Prüfung des realen Repositories sinnvoll sind:

```text
LumbreCode Engineering Integration

- Engineering-Baseline bewerten
- benötigte gemeinsame Skills übernehmen
- benötigte gemeinsame Agents übernehmen
- lokale Agent-Kompatibilität sicherstellen
- Public-Site-Verzeichnis einführen
- bestehende Dokumentation als Quellen identifizieren
- FAQ DE/EN vorbereiten
- Guides DE/EN vorbereiten
- App-Privacy DE/EN vorbereiten
- Changelog-Struktur vorbereiten
- öffentliche Roadmap vorbereiten
- Public-Site-Validator integrieren
- Release-Integration vorbereiten
- Website-Content-Paket erzeugen
- späteren Sync mit lumbrecode_webseite vorbereiten
```

Besitzt das Repository bereits bessere oder weiter entwickelte Lösungen,
dokumentiere das und passe den 1.4-Plan entsprechend an.

Erlaubt sind hier: analysieren, dokumentieren, den Version-1.4-Plan ergänzen,
Tasks präzisieren, Abhängigkeiten identifizieren.

Nicht erlaubt sind hier: neue Workflows implementieren, `docs/public-site/`
anlegen, Skills oder Agents kopieren, Schemas integrieren, Produktionscode
ändern, Release-Automatisierung bauen.

Bestätige am Ende ausdrücklich:

```text
No engineering integration was implemented.
All implementation work was added to the Version 1.4 plan.
```

## Ausgabeformat

Schreibe `.lumbrecode/ENGINEERING_ALIGNMENT.md` mit diesen Überschriften:

```markdown
# Engineering Alignment: <Repository>

## Executive Summary
## Repository Profile
## Evidence and Authoritative Sources
## Existing Architecture
## Existing Quality Commands
## Existing Workflows and Automation
## Existing Agent Instructions and Skills
## Public-Site Readiness
## Release and Branch Model
## Security and Privacy Observations
## Alignment with lumbrecode-engineering
## Conflicts with the Proposed Baseline
## Intentional Deviations
## Recommended Shared Components
## Components That Must Remain Local
## Required Engineering Baseline Changes
## Repository-Specific Exceptions
## Migration Plan
## Open Decisions
## Next Step
```

Schließe das Dokument mit einem maschinenlesbaren JSON-Block ab. Er wird gegen
`.lumbrecode/schemas/repository-feedback/v1/report.schema.json` validiert:

```json
{
  "repository": "OWNER/REPOSITORY",
  "repositoryType": "flutter",
  "qualityCommands": [],
  "existingAutomation": [],
  "publicSite": {
    "exists": false,
    "authoritativeSources": [],
    "missingContent": []
  },
  "recommendedProfile": "flutter",
  "conflicts": [],
  "recommendations": [],
  "requiredWorkflowInputs": {},
  "requiredSecretNames": [],
  "localAgentReady": true,
  "alignmentLevel": "MEDIUM",
  "decisions": [],
  "deviations": [],
  "componentsToKeepLocal": [],
  "engineeringBaselineChanges": [],
  "implementationPerformed": false,
  "confidence": "high"
}
```

`alignmentLevel` ist `HIGH`, `MEDIUM` oder `LOW`. Jeder Eintrag in
`decisions` nennt den Bereich und genau eine Entscheidungskategorie, jeder
Eintrag in `deviations` genau ein Urteil.

## Abschluss im Chat

Antworte am Ende kompakt mit:

1. erkanntes Repository,
2. Grad der Übereinstimmung (`HIGH`, `MEDIUM`, `LOW`),
3. wichtigste Abweichungen,
4. ob `lumbrecode-engineering` angepasst werden sollte,
5. ob das Consumer-Repository angepasst werden sollte,
6. nächster Schritt,
7. Pfad des erzeugten Alignment-Dokuments,
8. bei `WasThereSomething` zusätzlich der Pfad des aktualisierten 1.4-Plans.

## Qualitätsmaßstab

Ein guter Bericht unterscheidet klar zwischen:

- direkt im Repository belegten Fakten,
- daraus abgeleiteten Empfehlungen,
- offenen Fragen,
- nicht überprüfbaren Annahmen.

Der Bericht nennt konkrete Dateipfade und Kommandos und liefert keine
allgemeinen Best-Practice-Floskeln anstelle einer Repository-Analyse. Eine
Empfehlung, eine bestehende und funktionierende Lösung zu ersetzen, braucht
eine Begründung, die über Einheitlichkeit hinausgeht.
