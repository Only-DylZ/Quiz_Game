# Übergabe – hier geht's weiter

> Für Claude: Diese Datei zu Beginn jeder Sitzung lesen (nach CLAUDE.md),
> am Ende jeder Sitzung aktualisieren. Sie beschreibt nur den **aktuellen Stand**
> und die **nächsten Schritte** – alles Dauerhafte steht in CLAUDE.md.

**Letzte Sitzung:** 11.10.2026

---

## ⚠️ Erinnerung an den Nutzer

Am 11.10.2026 wurde eine Windows-Firewall-Regel angelegt, damit das Handy im
WLAN Live Server erreicht (WLAN-Profil ist „Privat“, VS Code hatte nur Regeln
für „Öffentlich“). Der Nutzer möchte daran erinnert werden, sie wieder zu
entfernen, wenn das lokale Testen vorbei ist – in einer **Admin-PowerShell**:

```powershell
Remove-NetFirewallRule -DisplayName "Quiz Live Server (nur WLAN privat)"
```

Diesen Abschnitt löschen, sobald der Nutzer das erledigt hat.

---

## Stand

- **Phase 1** fertig, **online** unter https://only-dylz.github.io/Quiz_Game/
  (GitHub Actions, `.github/workflows/pages.yml`). Erstes Online-Probespiel hat geklappt.
- **Phase 2a** fertig und vom Nutzer getestet (PC + Handy):
  `engine/grafik.js` mit den Arten `balken` (Zahlenfeld wie Schätzen) und
  `zeitleiste` (Schieberegler + −1/+1). Grafiken als SVG über `svgNeu()` in
  `hilfen.js`, auf dem Handy klein über der Eingabe. Punkteregel
  `punkteZeitleiste` in `punkte.js`. Raumfahrt-Paket hat eine neue
  Zeitleisten-Frage (rf-07, Mondlandung). 14 Tests grün.
- `karte`: `pruefeFrage` gibt noch `false` zurück → die Frage wird übersprungen.
  In den Tests wird `art === "karte"` bis 2b übersprungen.

## Nächster Schritt: Phase 2b – Karte

1. **Vorher klären und dem Nutzer sagen:** Leaflet (Open Source, per CDN mit
   fester Version + SRI-Hash) und OpenStreetMap-Kacheln – Nutzungsrichtlinie
   (Tile Usage Policy) prüfen: Namensnennung nötig, kein Massenabruf. Für ein
   paar Spieler ok, kostenlos, kein Schlüssel.
2. `karte` in `grafik.js`: Host zeigt Karte (`daten.mitte`, `daten.zoom`),
   Handy tippt einen Punkt an (Marker) + Senden. Antwort `{ lat, lng }`,
   prüfen: Zahlen, lat −90…90, lng −180…180.
3. `punkteKarte` in `punkte.js` (Haversine, 2000-km-Grenze), Tests ergänzen,
   Ausnahmen für `karte` in den Tests entfernen.
4. Auflösung: Lösung + Tipps der Spieler als Marker auf der Host-Karte.

## Danach

- Phase 3 (Python-Validator), Phase 4 (Themenauswahl, Highscores).
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
