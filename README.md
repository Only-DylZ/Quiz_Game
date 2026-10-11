# Quiz-Abend

Browser-Quiz im Kahoot-Stil: Ein Host-Bildschirm zeigt die Fragen, die Spieler
antworten mit dem Handy. Läuft kostenlos auf GitHub Pages + Supabase.
Details zum Projekt stehen in [CLAUDE.md](CLAUDE.md).

## Einrichten

1. **Schutz vor Geheimnissen aktivieren** (einmal pro Rechner, im Projektordner):
   ```bash
   git config core.hooksPath .githooks
   ```
   Danach prüft Git vor jedem Commit, ob Schlüssel oder Passwörter dabei sind,
   und bricht dann ab. Nie mit `--no-verify` umgehen!
2. **Private E-Mail schützen:** Auf GitHub unter *Settings → Emails*
   „Keep my email addresses private“ und „Block command line pushes that
   expose my email“ einschalten. Dann die angezeigte noreply-Adresse setzen:
   ```bash
   git config user.email "223725923+Only-DylZ@users.noreply.github.com"
   ```
3. `docs/config.example.js` kopieren und in `docs/config.js` umbenennen.
4. In `docs/config.js` die Supabase-URL und den **anon key** eintragen
   (Supabase → Project Settings → API).

Nach dem Anlegen des GitHub-Repos: unter *Settings → Code security*
**Secret Scanning** und **Push Protection** prüfen bzw. einschalten.

## Lokal testen (VS Code + Live Server)

Die Seiten nutzen ES-Module. Diese funktionieren **nicht**, wenn man die
HTML-Datei einfach doppelklickt (`file://`). Man braucht einen kleinen Webserver:

1. In VS Code die Erweiterung **Live Server** (von Ritwick Dey) installieren.
2. `docs/index.html` öffnen, Rechtsklick → **Open with Live Server**.
3. Der Browser öffnet z. B. `http://127.0.0.1:5500/docs/index.html`.

Mit dem Handy testen: Handy und PC im selben WLAN, dann statt `127.0.0.1`
die IP-Adresse des PCs eingeben (z. B. `http://192.168.0.23:5500/docs/play.html`).

## Online stellen (GitHub Pages)

Die Seite wird automatisch von GitHub Actions veröffentlicht
(`.github/workflows/pages.yml`), bei jedem Push auf `main`.
`docs/config.js` bleibt dabei aus dem Repo heraus – der Workflow erzeugt sie
beim Veröffentlichen aus zwei Secrets.

Einmalig einrichten im Repository auf GitHub:

1. **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_URL` = `https://DEIN-PROJEKT.supabase.co`
   - `SUPABASE_ANON_KEY` = der **anon / publishable** Key
     (niemals `service_role` – der Workflow bricht dann absichtlich ab).
2. **Settings → Pages → Source**: **„GitHub Actions“** wählen.
3. Einen Push auf `main` machen (oder unter *Actions* den Workflow per
   „Run workflow“ starten). Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://<dein-name>.github.io/<repo-name>/`.

Hinweis: Der anon key ist in der veröffentlichten `config.js` für jeden Besucher
sichtbar. Das ist bei Supabase so gedacht – geschützt wird über Row Level Security.

## Code prüfen (Node.js)

Vor jedem Commit im Projektordner ausführen:

```bash
node tools/pruefen.mjs
```

Prüft alle JavaScript-Dateien auf Tippfehler und testet Punkte-Regeln,
Zahlen-Eingabe und dass die Handys nie die Lösung vorab bekommen.
Am Ende muss „Alles in Ordnung ✔“ stehen.

## Python-Werkzeuge

```bash
cd tools
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```
