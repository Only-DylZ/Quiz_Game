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
- **In Arbeit: Optik-Umbau im Pixel-Stil** (Stardew-Valley-artig). Probe-Seite und
  alle Hintergrundbilder sind fertig, **noch nicht committet**. Nächster Schritt:
  echte Seiten (host/play) umbauen.

---

## Jetzt dran: Optik-Umbau (Pixel-Stil)

### Was schon da ist (lokal, nicht committet – `git status` zeigt es)

| Datei | Inhalt |
|---|---|
| `docs/probe.html/.js/.css` | Optik-Probe: Hauptmenü (Farm + Jahrmarkt-Rad) und Fragebildschirm, oben „Frage aus: …“ für alle 13 Themen + Joker (echte Fragen aus den Paketen). Ansehen: Live Server → `docs/probe.html`, oder `probe.html#sport` |
| `docs/bilder/szenen/*.png` | 15 Hintergründe (640×360, 64 Farben, je 52–109 KB): `farm` (Hauptmenü), 13 Themen (Name = Paketdatei ohne `.json`), `joker` (für eigene Themen) |
| `docs/engine/jahrmarkt.js` | Glücksrad als Jahrmarkt-Rad im Pixel-Stil: wird bei jeder Drehung neu in groben Pixeln (passend zur Pixelgröße des Hintergrunds) auf `<canvas>` gezeichnet, Holzgestell, blinkende Birnen, scharfe Beschriftung auf zweiter Leinwand. API: `jahrmarktErstellen(behaelter)` → `kartenSetzen(karten)`, `drehen(gewinner)` (Promise). Für den echten Host gedacht. |
| `docs/engine/rad.js` (geändert) | `FARBEN` jetzt erdige Töne; `radZeichnen(karten, mitText)`; Strichfarben direkt im SVG (CSS gilt in SVG-als-Bild nicht) |
| `docs/engine/szenen.js` | Ältere, per Code gezeichnete Szenen (Farm, Raumfahrt, Dschungel, Joker). Wird nur noch als Ersatz genutzt, falls ein Bild fehlt – kann evtl. entfallen. |
| `docs/schrift/Jersey15.ttf` + `OFL-Jersey15.txt` | Schrift „Jersey 15“ (SIL OFL), im Repo statt Google Fonts (keine Daten an Dritte). Nur eine Strichstärke → nie `bold` (`font-synthesis: none`). |
| `tools/pixel_bild.py` | KI-Bild → 640×360, 16:9-Zuschnitt, begrenzte Palette: `python tools/pixel_bild.py ki-bilder/<datei> <name> --farben 64` (Pillow) |
| `tools/bild_prompts.md` | Prompts (Grundteil ≤ 283 Zeichen + Szene, passt unter Fireflys 750-Zeichen-Grenze) |
| `ki-bilder/` | Rohbilder der Bild-KI, steht in `.gitignore` (kommt nie ins Repo) |

### Vom Nutzer festgelegt
- Holz-/Pergament-Oberfläche, klare Pixel-Schrift (Jersey 15 – Pixelify war zu schwer lesbar).
- Hauptmenü = Jahrmarkt-Rad neben einer Farm; jedes Thema eigener Hintergrund,
  eigene Themen (Joker) → `joker.png` (magisches Labor mit Fragezeichen).
- Antworten **einheitlich** (Pergament-Knopf mit Holzschild A–D), keine vier Farben.
  Das Handy zeigt dann ebenfalls A–D.
- Rad passend zum Hintergrund (grobe Pixel, Holzfarben, Spielerfarben erdig).
- Bei der Auflösung zeigt das Handy **eigene Antwort und richtige Antwort**
  (z. B. „Deine Antwort: B – Giraffe ✗ / Richtig: D – Blauwal“).
- Kleinigkeit: Im Raumfahrt-Bild weht eine Piratenflagge – Nutzer entscheidet, ob neu erzeugen.

### Nächste Schritte (Vorschlag)
1. Nutzer bestätigen lassen, dass die Probe passt (letzter Stand: Schrift, Rad, alle Bilder).
2. **`style.css` auf den neuen Stil umstellen** (Werte/Bausteine aus `probe.css`:
   `.holz`, `.pixel-knopf`, `.pixel-option` + `.buchstabe`, Farben als Variablen,
   `@font-face` Jersey 15, `html { font-size: 20px }`).
3. **Host:** Hintergrund-`<img class="szene">` je Schritt: Lobby/Themenwahl/Rundenende/
   Ende = `farm`, Frage = Thema der Runde (`aktuellesThema.datei` ohne `.json`),
   KI-Thema = `joker`. Glücksrad in der Themenwahl durch `jahrmarktErstellen`
   ersetzen (Karten mit `farbe` aus `spielerFarbe`). Antwort-Kacheln in `auswahl.js`
   auf A–D umstellen (Host und Handy).
4. **Handy:** gleicher Stil, einfarbiger/ruhiger Hintergrund oder das Themenbild
   abgedunkelt; Auflösung mit eigener + richtiger Antwort (Handy merkt sich, was es
   gesendet hat; `loesungText` kommt schon vom Host).
5. Testen (PC + Handy), dann committen: Probe-Dateien entweder löschen oder als
   Vorschau behalten, `szenen.js` ggf. entfernen. CLAUDE.md (Ordnerstruktur,
   Bauphasen „6: Optik“) und diese Datei aktualisieren.
6. Später: Avatare (Vorschlag LPC-Figuren, CC BY-SA → Credits-Seite nötig), die in
   der Lobby herumlaufen; Sprechblasen mit Antworten bei der Auflösung.

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
