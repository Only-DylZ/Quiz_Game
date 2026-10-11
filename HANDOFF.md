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

## Phase 4a – fertig (vom Nutzer getestet)

- Lobby-Einstellung „GPs zum Sieg“ (1–10), Runden à 10 Fragen, 1 GP für den
  Rundensieger (`rundenSpitze`), Stechfrage bei Gleichstand (`stechfrageSieger`),
  Rundenende-Bildschirm, Siegertreppchen nach GP.

## Phase 4b – fertig (vom Nutzer getestet)

- `engine/rad.js`: `angeboteErstellen` (3 zufällige, in diesem Spiel noch nicht
  gespielte Themen pro Spieler), `radDrehung`/`feldNachDrehung` (Rad landet
  auf der vorher gezogenen Karte), `radZeichnen` (SVG).
- Handy: 3 Themen-Knöpfe, Kandidat antippen (umentscheiden bis zum Drehen).
- Host: Liste „wer hat gewählt ✓“, Rad wächst mit jedem Kandidaten, Knopf
  „Glücksrad drehen“ (ab 1 Kandidat), 5 s Drehung, dann „Runde starten“.
  Lässt sich das Paket nicht laden: Karte fliegt raus, nochmal drehen.
- Wer während der Themenwahl beitritt, bekommt auch ein Angebot.
- `?paket=<name>`: Runde 1 direkt mit diesem Thema (Testmodus, ohne Rad).
- Dazu (Wunsch des Nutzers): Reihenfolge-Fragen – einsortierte Elemente lassen
  sich am Griff ☰ ziehen und zwischen andere schieben (Pointer-Events, gehen mit
  Finger und Maus; HTML-Drag-and-Drop geht auf Handys nicht). `verschieben()` getestet.

## Phase 4c – fertig (vom Nutzer getestet) → Phase 4 komplett

- Lobby: „Booster pro Spieler und Runde“ (0–3, Standard 1), Hinweis
  „Themenjoker kommt mit Phase 5“.
- Handy: unter den 3 Themen eine Zeile [−] 🚀 1 von 2 [+ Booster] (erst nach
  der Kandidatenwahl aktiv). Jeder Booster = eine weitere Karte des Kandidaten.
- Host prüft: Booster ganze Zahl 0 … erlaubt, sonst wird die Nachricht ignoriert.
  Liste zeigt „Anna ✓ 🚀×2“.

## Nächster Schritt


- Danach Phase 5 (Gemini + Themenjoker). Vorher: Nutzer prüft in Google AI
  Studio die aktuellen Gratis-Grenzen (ohne Billing!). Key nie in den Chat –
  direkt als Supabase-Secret.
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
