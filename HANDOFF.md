# Übergabe – hier geht's weiter

> Für Claude: Diese Datei zu Beginn jeder Sitzung lesen (nach CLAUDE.md),
> am Ende jeder Sitzung aktualisieren. Sie beschreibt nur den **aktuellen Stand**
> und die **nächsten Schritte** – alles Dauerhafte steht in CLAUDE.md.

**Letzte Sitzung:** 09.10.2026
**Letzter Commit:** `9c7ec20` – Phase 1c (auf GitHub: Only-DylZ/Quiz_Game, Branch `main`)

---

## Stand

**Phase 1 ist fertig und im Browser getestet** (PC + Handy im WLAN):
- 1a Lobby mit Raumcode, 1b Multiple Choice, 1c Schätzen + Punkte + Zwischenstand
  + Siegertreppchen.
- Schätzen: Ohne Senden zählt bei Zeitablauf, was im Feld steht (Nachricht `entwurf`).
- `node tools/pruefen.mjs` → Syntaxprüfung + 11 Tests, alle grün.
- Das Raumfahrt-Paket hat 4 spielbare Fragen (2 Grafik-Fragen warten auf Phase 2).

**Die Seite läuft bisher nur lokal** (Live Server). Online ist sie noch nicht,
weil `docs/config.js` (Supabase-URL + anon key) absichtlich nicht im Repo ist.

---

## Nächster Schritt: Online stellen per GitHub Actions

Ziel: Freunde können von überall mitspielen → erstes echtes Probespiel.
Mit dem Nutzer schon besprochen und als Weg gewählt (Option A):

1. **Claude baut** `.github/workflows/pages.yml`:
   - läuft bei jedem Push auf `main`,
   - erzeugt `docs/config.js` aus zwei **Repository Secrets**
     (`SUPABASE_URL`, `SUPABASE_ANON_KEY`),
   - stellt `docs/` per offizieller Pages-Action online
     (`actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`,
     feste Versionen).
   - Vorher `node tools/pruefen.mjs` im Workflow laufen lassen (Node per `actions/setup-node`).
2. **Der Nutzer macht auf GitHub:**
   - *Settings → Secrets and variables → Actions*: die zwei Secrets anlegen.
   - *Settings → Pages → Source*: **„GitHub Actions“** wählen (nicht „Deploy from a branch“).
   - *Settings → Code security*: Secret Scanning + Push Protection prüfen (noch nicht bestätigt).
3. **Vorher prüfen:** In Supabase sicherstellen, dass nur der anon key verwendet wird
   und keine Tabellen ohne RLS existieren (bisher gibt es gar keine Tabellen).
4. README-Abschnitt „Online stellen“ anpassen (Actions statt Branch `/docs`) und
   den „Offenen Punkt“ in CLAUDE.md schließen.
5. Probespiel mit Freunden über `https://only-dylz.github.io/Quiz_Game/`.

Hinweis an den Nutzer: Der anon key ist im ausgelieferten `config.js` für jeden
Besucher sichtbar – so gedacht, Schutz über RLS + Gratis-Tarif ohne Kreditkarte.
Er steht aber nie im Repo, und der pre-commit-Hook bleibt unverändert.

## Danach

- **Phase 2:** Grafik-Modus (`balken`, `zeitleiste` als SVG, `karte` mit Leaflet).
  Neues Modul `engine/grafik.js` mit derselben Schnittstelle wie `auswahl.js`,
  in `MODI` in host.js **und** play.js eintragen, Tests ergänzen
  (Punkte Zeitleiste/Karte, Lösungsschutz). Leaflet per CDN mit fester Version,
  OSM-Kacheln – vorher prüfen, dass das kostenlos und erlaubt ist.
- **Mögliche Verbesserung:** Spieler-Kennung in `sessionStorage` merken, damit
  ein Neuladen nicht alle Punkte kostet (siehe „Bekannte Grenze 2“ in CLAUDE.md).

---

## Umgebung des Nutzers

- Windows 11, VS Code mit Live Server (`.vscode/settings.json`: `useLocalIp: true`,
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
