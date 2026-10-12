# Übergabe – hier geht's weiter

> Für Claude: Diese Datei zu Beginn jeder Sitzung lesen (nach CLAUDE.md),
> am Ende jeder Sitzung aktualisieren. Sie beschreibt nur den **aktuellen Stand**
> und die **nächsten Schritte** – alles Dauerhafte steht in CLAUDE.md.

**Letzte Sitzung:** 12.10.2026

---

## Kurzfassung

- **Alle 5 Bauphasen sind fertig, getestet und online** (https://only-dylz.github.io/Quiz_Game/):
  Grundspiel, Grafik/Karte, Werkzeuge + 13 Themen, Themenrunden mit GP/Stechfrage/
  Glücksrad/Booster, Themenjoker mit Gemini (Supabase Edge Function).
- **Fragen-Pools:** 13 Themen mit 72–97 Fragen und je 7 Stechfragen (Ziel 150).
  Am 12.10.2026 um je 30 Fragen + 2 Stechfragen erweitert (noch nicht committet).
- **Optik-Umbau im Pixel-Stil** ist committet und online (11.10.2026), im ganzen Spiel
  aber noch nicht getestet.
- **Avatare** (LPC-Figuren, Farmleben, Sprüche, Credits-Seite) sind im Spiel und online (12.10.2026).

---

## Avatare im Spiel (committet + online am 12.10.2026, vom Nutzer getestet)

Avatar-Probe `2b09d13`, danach eingebaut:
- Handy: Baukasten im Beitreten-Formular; Avatar geht als Zahlen in die Presence.
- Host: prüft mit `avatarPruefen` (sonst `avatarAusId`), `farmleben` läuft in Lobby,
  Themenwahl, Rundenende, Ende. Beim Drehen schauen alle zum Rad, wessen Karte gewinnt,
  jubelt. Während der Frage ausgeblendet; bei Auflösung/Zwischenstand stehen alle unten in
  einer Reihe und kommentieren ihre Punkte (≥ 700 springen + „richtig“, < 400 „falsch“).
  Ranglisten mit Köpfen, Treppchen mit Figuren (Platz 1 jubelt). Rundenende: Sieger jubelt.
- `credits.html` (verlinkt auf Startseite, Lobby, Beitreten).
- Rundenende: jeder sagt einen Runden-Spruch passend zum Thema (`THEMEN_SPRUECHE` in
  `sprueche.js`, 13 Themen × gut/schlecht, dazu allgemeine; ≥ 50 % der möglichen Punkte =
  gut, < 30 % = schlecht). Sprüche dürfen keine Quiz-Antwort verraten (geprüft, 3 ersetzt).
- Zwischenstand: hinter den Punkten „+620“ = Punkte der letzten Frage.
- Vorher gewünscht und umgesetzt: Figuren 10 % kleiner, Sprechblasen 20 % größer + 5 s,
  Handy schmal nur beim Beitreten, jede Frage +10 s (`ZUSATZ_ZEIT`).

**Nächste Schritte:** offen – Nutzer fragen. Mögliche Ideen: eigener Avatar auf dem Handy-Wartebildschirm, Gesichter (LPC
`head/faces`: happy/sad) bei Gewinn/Verlust.

### Optik-Umbau (committet + online am 11.10.2026)
Pixel-Stil, Hintergrund je Thema, UI-Farben aus dem Bild (`uifarben.js`), A–D-Antworten,
Jahrmarkt-Rad, Tafel links/Rad rechts, Handy schmale Spalte. Probe-Dateien (`probe.*`,
`szenen.js`) vorerst behalten.

---

## Fragen-Pools – Stand und Werkzeuge

| Thema | Fragen | | Thema | Fragen |
|---|---|---|---|---|
| Raumfahrt | 72 | | Mathe | 89 |
| Geographie | 97 | | Zurück in die Vergangenheit | 94 |
| Tierwelt | 94 | | Das ist Deutsch | 95 |
| Essen & Trinken | 93 | | Filme & Serien | 90 |
| Biologie | 90 | | Videospiele | 90 |
| Chemie | 92 | | Sport | 93 |
| Physik | 90 | | | |

Alle mit 7 Stechfragen (Mathe 6).

**Neu (12.10.2026, noch nicht committet): Thema „Die 500-€-Frage“** (`jauch.json`, Kürzel `wwm`,
Hintergrund `bilder/szenen/jauch.png` aus `ki-bilder/Jauch.png`). Nutzer fand die ersten 10
Fragen zu leicht (reine Sprichwort-Lückentexte, bekannte Scherzfragen) → neue Regeln in
`tools/prompt.md` („Sonderpaket“): jede Frage braucht einen Denkschritt (Denkfalle, gemeinsames
Wort, Verwechslungsgefahr bei Redewendungen, genau lesen, kleine Logik), immer mit `erklaerung`.
Behalten: wwm-007, wwm-010, wwm-s01; neu wwm-011 … wwm-040 + wwm-s02/s03 (32 Fragen,
3 Stechfragen, geprüft, noch nicht vom Nutzer getestet). Weiter in 30er-Blöcken. Sprüche: `THEMEN_SPRUECHE.jauch`. Weitere Blöcke à 30 (Ziel 150): `tools/prompt.md`
(„Weiterer Block“).

**Sparsame Prüf-Pipeline (neu 12.10.2026, noch nicht committet):**
- Überblick statt ganze Pakete lesen: `python tools/fragenliste.py docs/packs/<datei>`.
- Prüfen: `python tools/block_pruefen.py docs/packs/<datei>` (nur neue = nicht
  committete Fragen; Format, Links parallel, `doppelt.py`, `lecks.py`, `pruefen.mjs`).
- Harmlose Treffer: `doppelt.py --neu --merken` / `lecks.py --neu --merken` →
  `tools/doppelt_ok.txt` / `tools/lecks_ok.txt`. Nach jedem Block committen.
- Unsichere Zahlen weiter per WebFetch gegen die Quelle prüfen.
- `--merken` speichert alles, was gerade angezeigt würde – nach Änderungen erst ohne
  `--merken` neu prüfen. `lecks.py --kontext` zeigt die Fundstelle.
- **Erweiterung vom 12.10. ist geprüft** (`--neu`: 0 offene Treffer). Behoben:
  Zeitleisten-Hilfsereignisse, die Antworten verrieten (Retortenbaby 1978 in bio-027/
  tier-026 → Mondlandung 1969; Haribo 1920 in essen-026 → Erste Fußball-WM 1930;
  WoW 2004 in game-024 → Erstes iPhone 2007), Mars-Balken aus rf-35 entfernt (verriet
  rf-63), Erklärungen gekürzt (bio-037, essen-006), bio-068/gesch-082/rf-s1 umformuliert
  (gesch-082 Quelle jetzt „Nordatlantikvertrag“, 12 Staaten per WebFetch geprüft).
  Herausgenommen: dd-090 (Euro 2002 steht in 9 Zeitleisten), essen-071 (Capsaicin =
  Quelle von essen-028), mathe-078 (verriet Stechfrage mathe-s04), mathe-s07 (Muster
  aus mathe-051). Grenzfall stehen gelassen: „Ende des Ersten Weltkriegs 1918“ als
  Hilfsereignis ↔ Stechfrage gesch-s07 Frauenwahlrecht 1918.
- **Offen – Altlasten der schon committeten Fragen:** `lecks.py` (ohne `--neu`) noch
  39 starke + 242 „ohne Stichwort“, `doppelt.py` (ohne `--neu`) 23 Kandidaten.
  Einmal bewerten (mit `--kontext`), echte Probleme beheben, Rest mit `--merken`.

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
