# Randnotizen

Eine native Desktop-Notizleiste für Windows, die am Bildschirmrand lebt und sich jederzeit per Tastenkombination ein- oder ausblenden lässt.

Randnotizen verbindet Themen, Checklisten und Fortschrittsanzeigen mit einer verspielten Collage-Optik. Die Anwendung läuft lokal, speichert ihre Daten auf dem Rechner und bleibt über das Symbol im Windows-Infobereich erreichbar.

![Randnotizen Hauptansicht](docs/images/randnotizen-panel.png)

## Funktionen

- Themen mit beliebig vielen eigenen Listen
- Nummerierte Aufgaben mit Checkboxen und Fortschrittsanzeige
- Zusätzliche Aufgabentexte und kleine Schrittlisten
- Rotes Abschluss-X über den Details erledigter Aufgaben
- Vollständige Tastatursteuerung für Listen und Aufgaben
- Positionierung am linken oder rechten Rand eines frei wählbaren Bildschirms
- Direkte Positionsvorschau vor dem Speichern
- Erweiterbare Designauswahl mit Papier- und Nacht-Collage
- Auswahl der App-Schriftart
- Optional dauerhaft sichtbar, auch wenn eine andere App den Fokus erhält
- Deutsche und englische Benutzeroberfläche
- Optionaler automatischer Start mit Windows
- Einstellungs-Popover mit Versionsanzeige
- Windows-Infobereich, globaler Hotkey und eigenes Anwendungsicon
- Transaktionale lokale SQLite-Speicherung ohne Benutzerkonto oder Cloud-Zwang

## Tastatursteuerung

| Tastenkombination | Aktion |
| --- | --- |
| `Strg + Alt + N` | Ein-/ausblenden; bei sichtbarer App ohne Fokus den Fokus zurückholen |
| `Strg + Umschalt + T` | Eingabefeld für ein neues Thema fokussieren |
| `Strg + Umschalt + L` | Eingabefeld für eine neue Liste fokussieren |
| `Alt + 1–9` | Entsprechende Liste auswählen |
| `Strg + 1–9` | Entsprechend nummerierte Aufgabe der ausgewählten Liste markieren |
| `Strg + ↑ / ↓` | Innerhalb der Aufgaben navigieren |
| `Leertaste` | Ausgewählte Aufgabe abhaken oder wieder öffnen |

Die Pfeilnavigation besitzt feste Enden: Am ersten oder letzten Punkt wird nicht zur gegenüberliegenden Seite gesprungen.

## Aufgabendetails und Schritte

Jede Aufgabe kann über **Details** einen zusätzlichen Text und beliebig viele benötigte Schritte erhalten. Die Schritte lassen sich unabhängig voneinander abhaken. Wird die übergeordnete Aufgabe abgeschlossen, bleiben die Informationen erhalten und werden mit einem roten X als erledigt markiert.

Die Datenstruktur ist abwärtskompatibel: Vorhandene Aufgaben erhalten beim ersten Laden automatisch leere Detail- und Schritt-Felder.

## Einstellungen

Über die Schaltfläche **Einstellungen** öffnet sich ein Popover direkt über dem Hauptpanel. Es entsteht dadurch kein zusätzliches Windows-Fenster und kein weiterer Taskleisten-Eintrag.

- Änderungen an Bildschirm und Seite werden sofort als Vorschau gezeigt, aber erst mit **Einstellungen speichern** dauerhaft übernommen.
- Das Design ist als Auswahl aufgebaut, sodass später weitere Designs ergänzt werden können.
- Für den normalen App-Text stehen Segoe UI, Arial, Verdana, Georgia und Courier New bereit.
- **Bei Fokusverlust geöffnet lassen** verhindert das automatische Ausblenden. `Strg + Alt + N` setzt dann den Fokus wieder auf Randnotizen.
- Sprache, Windows-Autostart, Version und Urheberrecht befinden sich ebenfalls an dieser zentralen Stelle.

![Randnotizen Einstellungs-Popover](docs/images/randnotizen-settings.png)

> Wird die portable EXE nach dem Aktivieren des Autostarts verschoben, sollte der Autostart in den Einstellungen einmal aus- und wieder eingeschaltet werden.

## Installation

Randnotizen ist für Windows gebaut. Die portable Version benötigt keine klassische Installation:

1. `Randnotizen <Version>.exe` herunterladen oder selbst bauen.
2. Die EXE an einem dauerhaften Ort ablegen.
3. Anwendung starten.
4. Mit `Strg + Alt + N` ein- und ausblenden.

Nach dem Start bleibt Randnotizen über das Symbol im Windows-Infobereich erreichbar.

## Entwicklung

Voraussetzungen:

- Windows 10 oder 11
- Node.js und npm

Abhängigkeiten installieren und Anwendung starten:

```powershell
npm install
npm start
```

Portable Windows-EXE erstellen:

```powershell
npm run build
```

NSIS-Installer erstellen:

```powershell
npm run dist
```

Die fertigen Dateien werden im Ordner `release/` abgelegt.

## Tests und Coverage

Alle Tests ausführen:

```powershell
npm test
```

Coverage-Bericht inklusive LCOV-Datei für SonarQube erzeugen:

```powershell
npm run test:coverage
```

Aktueller Stand von Version 0.1.23:

| Messwert | Abdeckung |
| --- | ---: |
| Zeilen | 97,88 % |
| Branches | 87,69 % |
| Funktionen | 98,11 % |

Der HTML-/LCOV-Bericht wird unter `coverage/` erzeugt. SonarQube liest `coverage/lcov.info` über die Konfiguration in `sonar-project.properties` ein.
Aktuell decken 18 automatisierte Tests Renderer, Hauptprozess, Hotkeys, Layout, Icons, Übersetzungen und SQLite-Migration ab.

## SonarQube

Das Projekt verwendet den SonarQube-Projektschlüssel `notizen`. Die vorbereitete PowerShell-Datei führt zuerst die Tests und anschließend die Analyse aus:

```powershell
$token = Read-Host "SonarQube Token" -MaskInput
./sonar.ps1 -SonarHostUrl "https://sonarqube.example.com" -Token $token
```

Die Serveradresse und der Token werden bewusst nicht im Repository gespeichert.

## Screenshots aktualisieren

Die README-Bilder werden reproduzierbar mit festen Beispieldaten aus dem aktuellen Electron-Renderer erzeugt. Echte Notizen und Einstellungen werden dabei nicht verändert.

```powershell
npm run screenshots
```

Die Bilder landen anschließend unter `docs/images/`.

## Projektstruktur

```text
src/
├─ main.js                 Electron-Hauptprozess, Tray, Fenster und Autostart
├─ preload.js              Sichere IPC-Schnittstelle für die Renderer
├─ panel-bounds.js         Positionierung auf mehreren Bildschirmen
├─ workspace-store.js      SQLite-Schema, Transaktionen und JSON-Migration
├─ translations.js         Deutsche und englische Übersetzungen
├─ tray-icon.js            Tray- und Windows-Anwendungsicon
├─ assets/
│  └─ icon.ico
└─ renderer/
   ├─ index.html           Hauptpanel
   ├─ renderer.js          Themen-, Listen- und Tastaturlogik
   └─ styles.css           Collage-Design für Hauptpanel und Popover

tests/                     Unit- und UI-Tests
scripts/                   Icon-, Screenshot- und Diagnosewerkzeuge
docs/images/               Bilder für diese README
```

## SQLite und Datenmigration

Der Arbeitsbereich wird in `workspace.sqlite` im Electron-`userData`-Verzeichnis gespeichert. Themen, Listen, Aufgaben und benötigte Schritte liegen in getrennten, über Fremdschlüssel verbundenen Tabellen. Schreibvorgänge laufen in Transaktionen, damit ein unvollständiger Speichervorgang nicht nur einen Teil des Arbeitsbereichs aktualisiert.

Beim ersten Start mit SQLite gilt folgende Migration:

1. Existiert noch kein gespeicherter SQLite-Arbeitsbereich, sucht Randnotizen zuerst nach `workspace.json` und anschließend nach der älteren `notes.json`.
2. Die vorhandenen Daten werden durch die normale Datenmigration auf das aktuelle Schema 3 gebracht.
3. Der migrierte Arbeitsbereich wird transaktional in `workspace.sqlite` gespeichert.
4. Die ursprünglichen JSON-Dateien bleiben unverändert erhalten und können als Rückfallebene gesichert oder später manuell entfernt werden.

Die Einstellungen bleiben bewusst in der kleinen, menschenlesbaren `settings.json`. Randnotizen benötigt weiterhin weder ein Konto noch eine Internetverbindung für den normalen Betrieb. Verwendet wird das in der Electron-Laufzeit enthaltene [`node:sqlite`](https://nodejs.org/api/sqlite.html); dadurch ist keine zusätzliche native SQLite-Abhängigkeit erforderlich.
