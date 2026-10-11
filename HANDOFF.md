# Übergabe – hier geht's weiter

> Für Claude: Diese Datei zu Beginn jeder Sitzung lesen (nach CLAUDE.md),
> am Ende jeder Sitzung aktualisieren. Sie beschreibt nur den **aktuellen Stand**
> und die **nächsten Schritte** – alles Dauerhafte steht in CLAUDE.md.

**Letzte Sitzung:** 11.10.2026

---

## Kurzfassung

- **Alle 5 Bauphasen sind fertig, getestet und online** (https://only-dylz.github.io/Quiz_Game/):
  Grundspiel, Grafik/Karte, Werkzeuge + 13 Themen, Themenrunden mit GP/Stechfrage/
  Glücksrad/Booster, Themenjoker mit Gemini (Supabase Edge Function).
- **Fragen-Pools:** 13 Themen mit 42–67 Fragen und je 5 Stechfragen (Ziel 150).
- **In Arbeit: Optik-Umbau im Pixel-Stil** (Stardew-Valley-artig). Probe war vom
  Nutzer abgenommen. **Echte Seiten sind umgebaut und committet (11.10.2026), aber noch
  nicht gepusht und noch nicht vom Nutzer im echten Spiel getestet.**

---

## Jetzt dran: Optik-Umbau im echten Spiel testen, dann pushen

### Stand (committet, noch nicht gepusht)

| Was | Wo |
|---|---|
| Neuer Stil (Rahmen/Pergament, Jersey 15, Pixel-Knöpfe, A–D-Kacheln) | `docs/style.css` |
| **UI-Farben passen sich dem Hintergrund an:** häufigster Farbton des Bildes (Canvas, graue/dunkle Pixel zählen nicht) → Palette mit garantiertem Kontrast (Tinte ≥ 7, Knöpfe/Akzent ≥ 4,5). Test über alle Farbtöne in `spiel.test.mjs` | `docs/engine/uifarben.js` (`hintergrundSetzen(name)`, `paletteAus`) |
| Host: Hintergrund farm (Lobby, Themenwahl, Rundenende, Ende) bzw. Thema/joker (Fragen); Jahrmarkt-Rad statt SVG-Rad | `host.html`, `host.js` |
| Handy: gleicher Stil, Themenbild bei Frage/Ergebnis (neues Feld `szene` in der `frage`-Nachricht), Auflösung zeigt „Deine Antwort: B – Giraffe ✗“ + „Richtig: …“ | `play.html`, `play.js`, `antwortAlsText` in auswahl/schaetzen/grafik |
| Startseite mit Farm und Pixel-Knöpfen | `index.html` |
| Layout: Host-Lobby und Themenwahl über volle Breite – Tafel ganz links, Rad ganz rechts, Mitte frei für spätere Avatare. Handy-Seite schmale Spalte (max. 480 px) | `style.css` (`.menue`, `.spieler main`) |
| Bilder, Schrift, Jahrmarkt-Rad, Werkzeuge | `docs/bilder/szenen/`, `docs/schrift/`, `engine/jahrmarkt.js`, `tools/pixel_bild.py`, `tools/bild_prompts.md` |

Selbst geprüft per Screenshot: Startseite, Lobby, Handy-Beitreten, Auswahl-Frage/
-Auflösung, Zeitleiste, Reihenfolge, Schätzen am Handy, Ergebnis am Handy.
**Nicht** per Screenshot geprüft (braucht echte Spieler): Themenwahl mit
Jahrmarkt-Rad im Host, Karte, Stechfrage, Rundenende, Siegertreppchen.

### Nächste Schritte
1. Nutzer testet ein ganzes Spiel (PC + Handy): besonders Themenwahl/Rad,
   Kartenfrage, Treppchen, Lesbarkeit bei allen Themen.
2. Danach pushen (`git push` → GitHub Actions stellt online). Probe-Dateien
   (`probe.*`) und `engine/szenen.js` sind vorerst als Vorschau mit committet –
   später ggf. löschen (nur die Probe nutzt szenen.js).
3. Kleinigkeit: Im Raumfahrt-Bild weht eine Piratenflagge – Nutzer entscheidet, ob neu erzeugen.
4. Später: Avatare (Vorschlag LPC-Figuren, CC BY-SA → Credits-Seite nötig), die in
   der Lobby herumlaufen; Sprechblasen mit Antworten bei der Auflösung.

### Vom Nutzer festgelegt
- Holz-/Pergament-Oberfläche, Schrift Jersey 15 (Pixelify war zu schwer lesbar).
- Jedes Thema eigener Hintergrund, KI-Themen → `joker.png`, Menü → `farm.png`.
- Antworten einheitlich (Pergament-Knopf mit Schild A–D), Handy ebenfalls A–D.
- Rad passend zum Hintergrund (grobe Pixel, Holzfarben, Spielerfarben erdig).
- UI-Farbe = dominierende Farbe des Hintergrunds, Schrift immer gut lesbar.

---

## Fragen-Pools – Stand und Werkzeuge

| Thema | Fragen | | Thema | Fragen |
|---|---|---|---|---|
| Raumfahrt | 42 | | Mathe | 60 |
| Geographie | 67 | | Zurück in die Vergangenheit | 64 |
| Tierwelt | 64 | | Das ist Deutsch | 66 |
| Essen & Trinken | 64 | | Filme & Serien | 60 |
| Biologie | 60 | | Videospiele | 60 |
| Chemie | 62 | | Sport | 63 |
| Physik | 60 | | | |

Alle mit 5 Stechfragen. Weitere Blöcke à 30 (Ziel 150): `tools/prompt.md`
(„Weiterer Block“), dann `python tools/validate.py docs/packs/<datei> --links`
und `python tools/lecks.py <id-präfix>` (Lecks auch über Paketgrenzen und in
Quellentiteln – Treffer von Hand bewerten, viele sind harmlos). Unsichere Zahlen
immer per WebFetch gegen die Quelle prüfen. Keine doppelten Fragen über Pakete hinweg.

---

## Themenjoker (Phase 5) – Betrieb

- Edge Function `themenjoker` (Code: `supabase/functions/themenjoker/index.ts`).
  **Änderungen muss der Nutzer selbst im Supabase-Dashboard deployen**
  (Edge Functions → themenjoker → Code ersetzen → Deploy) – GitHub Actions macht das nicht.
- Modelle: `gemini-3.5-flash-lite` (Gratis 15/min, 500/Tag), Reserve `gemini-3.8-flash`
  (20/Tag). 2.5er-Modelle gibt es für neue Konten nicht mehr.
- Eigene Limits: 10 pro Raum/Tag, 100 insgesamt/Tag (Tabelle `themenjoker_aufrufe`).
- Google-Suche: bei 429 versucht die Function es ohne Suche. Ob Suche im Gratis-Tarif
  geht, steht in den Function-Logs (429 bei `true` = nein).
- Secret `GEMINI_API_KEY` liegt in Supabase. Nie Billing aktivieren („Abrechnung einrichten“).

## Offene Ideen

- Spieler-Kennung in `sessionStorage` merken, damit Neuladen nicht alle Punkte kostet
  („Bekannte Grenze 2“ in CLAUDE.md).

---

## Umgebung des Nutzers

- Windows 11, VS Code mit Live Server (Port 5500, `.vscode/settings.json`: `useLocalIp: true`,
  nicht im Repo). Handy-Test im WLAN funktioniert.
- Node.js v24 (nur fürs Prüfen), Python mit Pillow 12 (für `pixel_bild.py`, `bild_holen.py`).
- Für Screenshots zur Selbstkontrolle: `python -m http.server 8765` in `docs/` +
  Edge headless (`msedge.exe --headless=new --screenshot=… --window-size=1600,900
  "http://127.0.0.1:8765/probe.html#sport"`), danach Server beenden.
- Git: `core.hooksPath = .githooks` aktiv, `user.email` = GitHub-noreply-Adresse.
  `docs/config.js` liegt lokal und ist ignoriert.
- Supabase-Projekt (Free Plan, Frankfurt), anon key in `docs/config.js`.
- Bilder erzeugt der Nutzer mit Gemini-App / Adobe Firefly (kostenlos).

## Arbeitsweise, die gut funktioniert hat

- Kleine Schritte; nach jedem Schritt testet der Nutzer im Browser,
  **erst danach** wird committet und gepusht.
- Vor jedem Commit: `node tools/pruefen.mjs` + pre-commit-Hook.
- Der Nutzer ist Anfänger: Erklärungen kurz und auf Deutsch, Befehle zum Kopieren,
  Sicherheits- und Kostenfragen immer zuerst ansprechen.
- Optik: Eigene Ergebnisse vor dem Zeigen per Screenshot selbst ansehen.
