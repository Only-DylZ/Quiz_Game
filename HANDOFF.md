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

## Phase 3 – fertig

- `tools/validate.py` (Pool-Format, Bilder, Reihenfolge, Link-Check `--links`,
  Hinweis bei schlecht gemischten Antwortpositionen). Läuft in `pruefen.mjs`.
- `docs/engine/runde.js`: 10 Fragen pro Runde, Mix 4/3/2/1
  (auswahl/schaetzen/grafik/reihenfolge), ungespielte zuerst (localStorage).
- Karte ohne Namen (`docs/karten/welt.json`, Natural Earth), Bildfragen
  (`docs/bilder/<id>.jpg|png`), Modus `reihenfolge` (Punkte nach Paaren).
- `tools/bild_holen.py`: Commons-Bilder mit Lizenzdaten (Artikel-Hauptbild,
  Datei oder Suche). Bilder danach immer selbst ansehen!
- **13 Themenpakete** (je ~30 Fragen + 2 Stechfragen, viele mit Bildern):
  Raumfahrt (12), Geographie, Tierwelt, Essen & Trinken, Biologie, Chemie,
  Physik, Mathe, Zurück in die Vergangenheit, Das ist Deutsch, Filme & Serien,
  Videospiele, Sport. Jede strittige Zahl per WebFetch gegen die Quelle geprüft.
  Antwortpositionen gleichmäßig verteilt. Test: `host.html?paket=<dateiname>`.
- Werkstatt-Skripte (Baukasten zum Schreiben der Pakete) lagen nur im Scratchpad;
  die Pakete selbst (JSON) sind die Quelle der Wahrheit.

## Nächster Schritt: Phase 4 – Themenrunden

Regeln stehen in CLAUDE.md Abschnitt 1 („Spielregeln“). Vorschlag zur Reihenfolge:
- 4a: Runden (10 Fragen pro Thema), Punkte pro Runde, 1 GP für den Rundensieger,
  Stechfrage bei Gleichstand, GP-Ziel beim Start einstellbar, Siegertreppchen nach GP.
- 4b: Kandidatenwahl auf dem Handy (3 zufällige ungespielte Themen) + Glücksrad.
- 4c: Booster-Joker (Themenjoker erst mit Phase 5).
- Später: Pools in Blöcken à 30 erweitern (Ziel 150), Raumfahrt zuerst (nur 12).

## Danach

- Phase 5 (Gemini + Themenjoker).
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
