# Übergabe – hier geht's weiter

> Für Claude: Diese Datei zu Beginn jeder Sitzung lesen (nach CLAUDE.md),
> am Ende jeder Sitzung aktualisieren. Sie beschreibt nur den **aktuellen Stand**
> und die **nächsten Schritte** – alles Dauerhafte steht in CLAUDE.md.

**Letzte Sitzung:** 11.10.2026

---

## Stand

- **Phase 1** fertig, **online** unter https://only-dylz.github.io/Quiz_Game/
  (GitHub Actions, `.github/workflows/pages.yml`). Erstes Online-Probespiel hat geklappt.
- **Phase 2** fertig und vom Nutzer getestet (PC + Handy):
  - 2a: `engine/grafik.js` mit `balken` (Zahlenfeld wie Schätzen) und
    `zeitleiste` (Schieberegler + −1/+1), SVG über `svgNeu()` in `hilfen.js`.
  - 2b: `engine/karte.js` (von grafik.js aufgerufen): Leaflet 1.9.4 per unpkg mit
    SRI-Hash in host.html/play.html, OSM-Kacheln mit Namensnennung. Handy tippt Ort,
    Antwort `{ lat, lng }`. Auflösung: Lösung + Tipps mit Namen (Tooltip als
    DOM-Element, nie als HTML-String!) + Liste „km daneben“.
  - Punkte: `punkteZeitleiste`, `punkteKarte`, `entfernungKm` (Haversine) in `punkte.js`.
  - Raumfahrt-Paket: alle 7 Fragen spielbar. 16 Tests grün.

## Neu festgelegt: Spielregeln mit Themenrunden

Mit dem Nutzer ausführlich besprochen, steht in CLAUDE.md Abschnitt 1
(„Spielregeln“): Themenrunden à 10 Fragen, 1 GP pro Runde, Stechfrage bei
Gleichstand, GP-Ziel einstellbar, Themenwahl per Kandidaten + Glücksrad,
Joker pro Runde (Themenjoker = eigenes Thema via Gemini, Booster = Extra-Karte).
Paketformat: **genau 10 Fragen + `stechfrage` (schaetzen)**. Bauphasen 3–5 in
CLAUDE.md entsprechend angepasst.

## Nächster Schritt: Phase 3 – Werkzeuge

- `tools/validate.py`: prüft Pakete auf das Format aus CLAUDE.md Abschnitt 4
  (inkl. genau 10 Fragen + Stechfrage)
  (dieselben Regeln wie die `pruefeFrage`-Funktionen der Modi), läuft in `.venv`.
- `tools/prompt.md`: Vorlage für NotebookLM/Claude, um neue Pakete zu erzeugen.
- Raumfahrt-Paket auf 10 Fragen + Stechfrage bringen, dann weitere Pakete
  erzeugen (mindestens ~6 für die Themenwahl).
- **Weg für Phase 5 ist entschieden** (siehe CLAUDE.md, Phase 5): Gemini
  Flash-Lite über Supabase Edge Function, Anbieter austauschbar. Phase 3 zuerst,
  weil der Validator später auch die KI-Antworten prüfen soll.

## Danach

- Phase 4 (Themenrunden, Glücksrad, Joker), Phase 5 (Gemini + Themenjoker).
- **Mögliche Verbesserung:** Spieler-Kennung in `sessionStorage` merken, damit
  ein Neuladen nicht alle Punkte kostet (siehe „Bekannte Grenze 2“ in CLAUDE.md).

---


## Umgebung des Nutzers

- Windows 11, VS Code mit Live Server (Port 5500, `.vscode/settings.json`: `useLocalIp: true`,
  nicht im Repo). Handy-Test im WLAN funktioniert.
- Node.js v24 installiert (nur fürs Prüfen, nicht für die Website).
- Git: `core.hooksPath = .githooks` aktiv, `user.email` lokal auf die
  GitHub-noreply-Adresse gesetzt. `docs/config.js` liegt lokal und ist ignoriert.
- Supabase-Projekt existiert (Free Plan, Frankfurt), anon key in `docs/config.js`.

## Arbeitsweise, die gut funktioniert hat

- Kleine Schritte; nach jedem Schritt testet der Nutzer im Browser,
  **erst danach** wird committet und gepusht.
- Vor jedem Commit: `node tools/pruefen.mjs` + pre-commit-Hook.
- Der Nutzer ist Anfänger: Erklärungen kurz und auf Deutsch, Befehle zum Kopieren,
  Sicherheits- und Kostenfragen immer zuerst ansprechen.
