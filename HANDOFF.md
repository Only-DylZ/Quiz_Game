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
- **Optik-Umbau im Pixel-Stil** ist committet und online (11.10.2026), im ganzen Spiel
  aber noch nicht getestet.
- **In Arbeit: Avatare** – Probe-Seite fertig, noch nicht im Spiel, nicht committet.

---

## Jetzt dran: Avatare (Probe fertig, nicht committet)

Nutzerwunsch: Avatare mit Kopf, Frisur, Ober-/Unterteil, Accessoires; Auswahl beim
Beitreten mit ◀ ▶ wie skribbl.io; Köpfe neben den Punkten im Zwischenstand; ganze
Figuren auf dem Treppchen; im Hauptmenü laufen sie auf den Farmwegen, stehen, springen,
reden (Sprechblasen je nach Situation, Jugend-/Gamersprache, Fakten). Dreht das Rad,
schauen alle hin; der Gewinner jubelt.

**Stand (lokal, nicht committet):** `avatar-probe.html` zeigt Baukasten + 6 Figuren auf der
Farm + Testknöpfe (`#rad` dreht automatisch). Selbst per Screenshot geprüft.
- Grafiken: LPC (Universal LPC Spritesheet Character Generator), nur Teile mit CC0/CC-BY/
  CC-BY-SA/OGA-BY. `tools/avatar_teile.py` lädt sie, packt walk/idle/jump/emote in ein Bild
  pro Teil (576×1024) und schreibt `docs/avatare/teile.json` + `CREDITS.txt`. 74 Bilder, 1,1 MB.
- Farben per Farbtabelle (Haut/Haar/Stoff) im Browser umgefärbt (`farbenTauschen`).
- Übers Netz soll nur der Avatar als Zahlen gehen; `avatarPruefen` prüft streng (Tests).
- Wegenetz der Farm: `PUNKTE`/`WEGE` in `farmleben.js` (Koordinaten im 640×360-Bild).

**Nächste Schritte:**
1. Nutzer testet die Probe (Stil, Größe der Figuren, Sprüche).
2. Einbau ins Spiel: Avatar beim Beitreten (play.html, Baukasten über dem Namen), Avatar
   in Presence/`beitreten` mitschicken, Host prüft mit `avatarPruefen`. Host: `farmleben`
   in Lobby und Themenwahl, `zumRadSchauen` beim Drehen, `jubeln` für den Spieler, dessen
   Karte gewonnen hat. Zwischenstand: `kopfZeichnen` neben den Namen. Treppchen: Figuren
   (jubelnd für Platz 1). Sprechblasen nach Punkten (Situationen in `sprueche.js`).
   CLAUDE.md-Nachrichtentabelle ergänzen.
3. Credits-Seite (Link von Startseite) mit Inhalt von `avatare/CREDITS.txt` – Pflicht, sobald online.
4. Danach Optik-Test im echten Spiel (Optik-Umbau ist online, aber noch nicht im
   ganzen Spiel getestet: Rad, Karte, Stechfrage, Treppchen).

### Optik-Umbau (committet + online am 11.10.2026)
Pixel-Stil, Hintergrund je Thema, UI-Farben aus dem Bild (`uifarben.js`), A–D-Antworten,
Jahrmarkt-Rad, Tafel links/Rad rechts, Handy schmale Spalte. Probe-Dateien (`probe.*`,
`szenen.js`) vorerst behalten.

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
