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

1. Projekt in ein GitHub-Repository hochladen.
2. Im Repository: **Settings → Pages**.
3. Bei *Source* „Deploy from a branch“ wählen, Branch `main`, Ordner **`/docs`**.
4. Speichern. Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://<dein-name>.github.io/<repo-name>/`.

Hinweis: `docs/config.js` ist in `.gitignore` und wird deshalb nicht hochgeladen.
Siehe „Offener Punkt“ in [CLAUDE.md](CLAUDE.md).

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
