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

## Phase 3 – Stand

- ✅ `tools/validate.py` (nur Standardbibliothek): prüft Regeln aus CLAUDE.md
  Abschnitt 4 – **Pool-Format**: `fragen` mind. 4/3/3 pro Modus (Ziel 150),
  `stechfragen` Liste (Ziel 5), `id` Pflicht + eindeutig, doppelte Fragetexte,
  unbekannte Felder, index.json. `--links` ruft alle Quellen-Links auf.
  Läuft als Schritt 3 in `node tools/pruefen.mjs` (auch in GitHub Actions).
- ✅ `docs/engine/runde.js`: zieht pro Runde 10 Fragen (Mix 4/3/3), ungespielte
  zuerst. Host merkt sich gespielte ids in localStorage
  (`quiz-gespielt:<paketdatei>`), Reset wenn Pool aufgebraucht. 20 Tests grün.
- ✅ `tools/prompt.md`: Blöcke à 30 Fragen + 2 Stechfragen, Abschnitt
  „Weiterer Block“ zum Erweitern. ids dreistellig (`kürzel-001`, `kürzel-s01`).
- ✅ Raumfahrt: 10 Fragen + 1 Stechfrage (alte ids `rf-01` zweistellig – ok).
- Entschieden (11.10.2026): **Mischung** – feste Themen als Pools (Ziel 150 pro
  Thema, in Etappen), Live-Gemini nur für den Themenjoker. Host spielt im
  zweiten Fenster mit.
- ✅ Kartenfragen: während der Frage **Karte ohne Namen** (`docs/karten/welt.json`,
  Natural Earth 1:50m, gemeinfrei, ~490 KB gezippt), Zoom 1–8. Auflösung mit OSM.
  (CARTO-Karten ohne Namen brauchen inzwischen API-Key → verworfen.)
- ✅ **Bildfragen** (`bild`-Feld, Bilder in `docs/bilder/<id>.png`, Lizenz-Anzeige).
  Werkstatt-Skript zum Holen von Commons-Bildern mit Lizenzdaten lag im
  Scratchpad (`commons.py`) – bei Bedarf neu schreiben: Commons-API
  `prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640`, PNG-Thumbnail laden.
- ✅ Geographie: 35 Fragen (inkl. 5 Flaggen) + 2 Stechfragen, alle Zahlen geprüft.
  Test-Schalter: `host.html?paket=geographie`.
- **Themenliste des Nutzers (12):** Filme/Serien, Geographie, Videospiele,
  Essen/Trinken, Tierwelt, Biologie, Chemie, Sport, Das ist Deutsch, Zurück in
  die Vergangenheit (Geschichte), Physik, Mathe – gern an beliebten/aktuellen
  Themen orientiert. **„Das ist Deutsch“** = Rechtschreibung schwieriger Wörter
  + Fakten zu Kultur/Traditionen + wichtige deutsche Personen + Gerichte (mit Bild).
  Feedback zu Geographie: Schwierigkeit passt, Fragen passen.
- **Nächster Schritt:** nach Test durch den Nutzer committen, dann die übrigen
  11 Themen in Blöcken à 30 erstellen (jede Zahl/Quelle prüfen, `validate.py --links`).

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
