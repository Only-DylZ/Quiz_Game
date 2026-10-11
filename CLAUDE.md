# Quiz-Abend – Projektbeschreibung

Diese Datei beschreibt das Projekt. Lies sie bei jedem Start komplett.
**Danach `HANDOFF.md` lesen** – dort stehen der aktuelle Stand und der nächste
Schritt. Am Ende jeder Sitzung `HANDOFF.md` aktualisieren.

> **Oberste Regeln – gelten für jede Änderung:**
> 1. **Sicherheit hat höchste Priorität.** Keine Geheimnisse im Repo oder im
>    Browser-Code, keine Lösungen vorab an Spieler, keine ungeprüften Eingaben.
> 2. **Es dürfen niemals Kosten entstehen.** Nur Gratis-Tarife, nirgends eine
>    Zahlungsmethode hinterlegen. Lieber fällt eine Funktion aus, als dass eine
>    Rechnung kommt.
>
> Details in Abschnitt 6. Im Zweifel nachfragen statt raten.

---

## 1. Ziel und Ablauf eines Spielabends

Ein Browser-Quiz im Kahoot-Stil zum Spielen mit Freunden – komplett kostenlos,
ohne eigenen Server.

**Ablauf eines Spielabends:**

1. Der **Host** öffnet `host.html` auf dem Laptop (Bild auf TV oder im Discord-Stream).
2. Er wählt ein Themenpaket aus. Die Seite erzeugt einen **Raumcode** (z. B. `KXQ7`).
3. Die **Spieler** öffnen `play.html` auf dem Handy, geben Raumcode und Namen ein.
4. Der Host startet das Spiel. Pro Frage:
   - Der Host-Bildschirm zeigt die Frage (und bei Multiple Choice die Antworten).
   - Die Handys zeigen die passende Eingabe (Knöpfe, Zahlenfeld, Grafik/Karte).
   - Ein Countdown läuft. Jeder Spieler kann einmal antworten.
   - **Erst nach Ablauf der Zeit** schickt der Host die Lösung an alle.
   - Punkte werden vergeben, der Host zeigt Lösung, Quelle und Rangliste.
5. Nach der letzten Frage zeigt der Host das Siegertreppchen.

**Wichtig – Schummelschutz:** Die Spieler-Seite kennt die Lösungen nie im Voraus.
Nur der Host lädt das komplette Fragenpaket. An die Handys schickt er pro Frage
nur Fragetext, Modus und Antwortmöglichkeiten – die Lösung erst nach Zeitablauf.

### Spielregeln: Themenrunden, Gewinnpunkte, Glücksrad (Ziel ab Phase 4)

Mit dem Nutzer festgelegt am 11.10.2026. Der Ablauf oben (ein Paket von vorne
bis hinten) ist der Stand von Phase 1–3; ab Phase 4 gilt:

**Einstellungen des Hosts vor dem Start**
- **GPs zum Sieg** (Gewinnpunkte), z. B. 3.
- **Joker pro Spieler und Themenrunde** (werden jede Runde neu aufgefüllt):
  Anzahl Themenjoker (0 oder 1 – mehr ist sinnlos) und Anzahl Booster (0 bis n).

**Themenrunde**
- Eine Themenrunde = ein Paket = **genau 10 Fragen**.
- Punkte zählen nur innerhalb der Runde und starten jede Runde bei 0.
- Wer in der Runde die meisten Punkte hat, bekommt **1 GP**.
- **Gleichstand** um Platz 1 → **Stechfrage** (die `stechfrage` aus dem Paket,
  immer Modus `schaetzen`), nur für die Gleichstand-Spieler. Näher dran gewinnt;
  bei exakt gleicher Schätzung gewinnt, wer schneller geantwortet hat.
- Pro Runde bekommt genau **ein** Spieler einen GP. Wer das GP-Ziel erreicht,
  hat sofort gewonnen → Siegertreppchen (nach GPs).

**Themenwahl vor jeder Runde (auch vor der ersten)**
1. Jeder Spieler bekommt auf dem Handy **eigene 3 zufällige Themen** – nur
   solche, die in diesem Spiel noch nicht gespielt wurden.
2. Er wählt eines davon als **seinen Kandidaten**.
3. **Themenjoker:** Statt der 3 Vorschläge schreibt er ein **eigenes Thema**
   (wird mit Gemini erzeugt, siehe Phase 5 – vorher ist der Joker gesperrt).
4. **Booster:** Jeder eingesetzte Booster legt eine **weitere Karte** seines
   Kandidaten aufs Rad (1 Booster = 2 Karten, 2 Booster = 3 Karten).
   Booster und Themenjoker sind kombinierbar.
5. Der Host zeigt das **Glücksrad** mit allen Kandidaten-Karten aller Spieler.
   Es dreht sich und bleibt **zufällig** stehen – dieses Thema wird gespielt.

**Eigene Themen (Themenjoker)**
- Fragen werden **erst erzeugt, wenn das Thema auf dem Rad gewonnen hat**
  (spart Gemini-Aufrufe; ca. 10–30 s Wartezeit mit Anzeige).
- Kein Host-Veto (vorerst). Trotzdem: Thementext ist Spieler-Eingabe →
  kürzen (max. 60 Zeichen), prüfen, nur mit `textContent` anzeigen; das
  erzeugte Paket wird vor dem Spielen gegen das Paketformat geprüft.
- Schlägt die Erzeugung fehl (Limit, Fehler): freundliche Meldung, das Rad
  wird ohne diese Karte noch einmal gedreht.

---

## 2. Architektur

```
 VOR DEM SPIEL                          WÄHREND DES SPIELS
┌──────────────────────┐             ┌───────────────────────────────────┐
│  Fragen-Werkstatt    │             │  Website (GitHub Pages, /docs)    │
│  - NotebookLM/Claude │             │                                   │
│    + tools/prompt.md │  ┌───────┐  │  host.html ──┐                    │
│  - tools/validate.py ├─►│ Paket ├─►│  (lädt Paket)│   Supabase         │
│    (Python)          │  │ .json │  │              ├──► Realtime  ◄──┐  │
└──────────────────────┘  └───────┘  │  play.html ──┘   (Räume)       │  │
                                     │  (Handys) ◄─────────────────────┘  │
                                     └───────────────────────────────────┘
```

- **Fragen-Werkstatt:** Neue Pakete werden mit NotebookLM oder Claude aus echten
  Quellen erzeugt (Vorlage: `tools/prompt.md`) und mit `tools/validate.py` geprüft.
- **Fragenpaket (`docs/packs/*.json`):** Die **einzige Verbindung** zwischen
  Werkstatt und Spiel. Die Website kennt keine Fragen im Code, nur dieses Format.
- **Website:** Reines HTML/CSS/JS mit ES-Modulen, ausgeliefert von GitHub Pages.
- **Supabase:** Echtzeit-Kanäle (Broadcast/Presence) für die Räume, optional
  Tabellen `rooms`, `players`, `answers` (siehe `supabase/schema.sql`).
  Gratis-Tarif reicht.
- **Live-Werkstatt (ab Phase 5):** Der Host gibt während des Spiels ein Thema ein.
  Eine **Supabase Edge Function** fragt die Gemini API und gibt ein fertiges
  Paket im selben JSON-Format an den Host zurück. Der Gemini-Schlüssel liegt nur
  als Secret in Supabase, nie im Browser. Für die Website ist das ein ganz
  normales Paket – das Paketformat bleibt die einzige Schnittstelle.

```
host.html ──Thema──► Edge Function ──► Gemini API
    ▲                    │ (prüft JSON, begrenzt Aufrufe)
    └──── Paket.json ────┘
```

---

## 3. Ordnerstruktur

```
Quiz_Game/
├─ CLAUDE.md               Diese Projektbeschreibung.
├─ README.md               Kurzanleitung: lokal testen und online stellen.
├─ HANDOFF.md              Übergabe zwischen Sitzungen: aktueller Stand, nächste Schritte.
├─ .gitignore              Dateien, die nicht ins Repo gehören (.env, config.js, …).
├─ .githooks/
│  └─ pre-commit           Bricht Commits ab, die Schlüssel oder Geheim-Dateien enthalten.
├─ .github/workflows/
│  └─ pages.yml            Prüft den Code, erzeugt config.js aus Secrets, stellt docs/ online.
├─ docs/                   Die Website – GitHub Pages liefert diesen Ordner aus.
│  ├─ index.html           Startseite mit den Knöpfen „Spiel leiten“ und „Mitspielen“.
│  ├─ host.html            Host-Bildschirm (nur Aufbau der Seite).
│  ├─ host.js              Host-Logik: Raum öffnen, Paket laden, Fragen stellen, auflösen.
│  ├─ play.html            Handy-Seite (nur Aufbau der Seite).
│  ├─ play.js              Handy-Logik: beitreten, Fragen anzeigen, Antwort senden.
│  ├─ style.css            Gemeinsames Aussehen aller Seiten.
│  ├─ config.example.js    Vorlage für Supabase-URL und anon key (kopieren nach config.js).
│  ├─ realtime.js          Verbindung zu Supabase: Raum anlegen/beitreten, Nachrichten senden.
│  ├─ engine/
│  │  ├─ hilfen.js         Kleine Hilfsfunktionen für alle Modi (sicheres Erzeugen von Elementen).
│  │  ├─ auswahl.js        Anzeige und Auswertung von Multiple-Choice-Fragen.
│  │  ├─ schaetzen.js      Anzeige und Auswertung von Schätzfragen.
│  │  ├─ grafik.js         Anzeige und Auswertung von Grafikfragen (Balken, Zeitleiste, Karte).
│  │  ├─ karte.js          Die Art „karte“: Leaflet-Karte anzeigen, Ort antippen, Auflösung.
│  │  └─ punkte.js         Alle Punkteregeln an einer Stelle.
│  └─ packs/
│     ├─ index.json        Liste aller verfügbaren Themenpakete.
│     └─ raumfahrt.json    Beispielpaket mit je 2 Fragen pro Modus.
├─ tools/
│  ├─ pruefen.mjs          Prüft alles mit einem Befehl: Syntax + Tests + Pakete (Node.js).
│  ├─ spiel.test.mjs       Tests: Punkte, Zahlen-Eingabe, Lösungsschutz, Beispielpaket.
│  ├─ prompt.md            Prompt-Vorlage, um mit NotebookLM/Claude neue Pakete zu erzeugen.
│  ├─ validate.py          Prüft Fragenpakete (auch index.json); --links ruft Quellen-Links auf.
│  └─ requirements.txt     Python-Abhängigkeiten (zurzeit keine – nur Standardbibliothek).
└─ supabase/
   ├─ schema.sql           Tabellen rooms, players, answers für Supabase.
   └─ functions/           (ab Phase 5) Edge Function, die mit Gemini Pakete erzeugt.
```

---

## 4. Format der Fragenpakete

Jedes Paket ist eine JSON-Datei in `docs/packs/` (UTF-8). Beispiel: `raumfahrt.json`.

### Paket (oberste Ebene)

| Feld           | Pflicht | Typ    | Bedeutung                                   |
|----------------|:-------:|--------|---------------------------------------------|
| `thema`        | ja      | Text   | Name des Themas, z. B. `"Raumfahrt"`        |
| `version`      | ja      | Zahl   | Formatversion, aktuell `1`                  |
| `beschreibung` | nein    | Text   | Ein Satz zum Paket                          |
| `fragen`       | ja      | Liste  | **Genau 10 Fragen** (siehe unten)           |
| `stechfrage`   | ja      | Objekt | Eine weitere Frage, **immer Modus `schaetzen`** – nur bei Gleichstand gespielt |

### Jede Frage (gemeinsame Felder)

| Feld        | Pflicht | Typ    | Bedeutung                                                    |
|-------------|:-------:|--------|--------------------------------------------------------------|
| `modus`     | ja      | Text   | `"auswahl"`, `"schaetzen"` oder `"grafik"`                   |
| `frage`     | ja      | Text   | Der Fragetext                                                |
| `loesung`   | ja      | je nach Modus | Die richtige Antwort (siehe unten)                    |
| `quelle`    | ja      | Objekt | `{ "titel": "...", "url": "..." }` – `titel` Pflicht, `url` empfohlen |
| `id`        | nein    | Text   | Eindeutige Kennung, z. B. `"rf-01"`                          |
| `zeit`      | nein    | Zahl   | Antwortzeit in Sekunden (Standard: 20)                       |
| `erklaerung`| nein    | Text   | Kurzer Satz, der nach der Auflösung gezeigt wird             |

### Modusabhängige Felder

**`auswahl`** (Multiple Choice)
- `optionen` (Pflicht): Liste mit 2–4 Antworttexten.
- `loesung`: Index der richtigen Option (0 = erste).

**`schaetzen`**
- `einheit` (Pflicht): z. B. `"km"`, `"Jahre"`, `""` für reine Anzahl.
- `loesung`: Zahl.

**`grafik`**
- `art` (Pflicht): `"balken"`, `"zeitleiste"` oder `"karte"`.
- `daten` (Pflicht): Objekt, Inhalt je nach `art`:
  - `balken`: `{ "einheit": "km", "balken": [ { "name": "Erde", "wert": 12756 }, { "name": "Mars", "wert": null } ] }`
    – genau ein Balken hat `"wert": null`, den rät man. `loesung`: Zahl.
  - `zeitleiste`: `{ "von": 1950, "bis": 2000, "ereignisse": [ { "name": "Sputnik 1", "jahr": 1957 } ] }`
    – das gesuchte Ereignis steht in der Frage. `loesung`: Jahr (Zahl).
  - `karte`: `{ "mitte": [lat, lng], "zoom": 3 }` – Startansicht der Karte.
    `loesung`: `{ "lat": 45.96, "lng": 63.31 }`.

Kurzes Beispiel:

```json
{
  "thema": "Raumfahrt",
  "version": 1,
  "fragen": [
    {
      "modus": "auswahl",
      "frage": "Welcher Planet ist der größte im Sonnensystem?",
      "optionen": ["Saturn", "Jupiter", "Neptun", "Erde"],
      "loesung": 1,
      "quelle": { "titel": "NASA Science – Jupiter", "url": "https://science.nasa.gov/jupiter/" }
    }
  ]
}
```

---

## 5. Punkteregeln

Alle Regeln stehen nur in `docs/engine/punkte.js`. Maximal **1000 Punkte** pro Frage.

- **auswahl:** Falsch = 0. Richtig = 500 bis 1000 Punkte, je schneller desto mehr:
  `punkte = 500 + 500 × (restzeit / gesamtzeit)`, gerundet.
- **schaetzen:** Nach prozentualer Abweichung von der Lösung:
  `abweichung = |antwort − loesung| / |loesung|`
  `punkte = 1000 × (1 − abweichung)`, nicht unter 0, gerundet.
  (Exakt = 1000, 10 % daneben = 900, 100 % oder mehr daneben = 0.)
- **grafik:**
  - `balken` und `zeitleiste`: wie `schaetzen`. Bei der Zeitleiste wird die
    Abweichung auf die Spanne `bis − von` bezogen statt auf die Jahreszahl
    (sonst wäre 1969 statt 1959 ja nur 0,5 % daneben).
  - `karte`: nach Entfernung in km (Haversine-Formel):
    `punkte = 1000 × (1 − km / 2000)`, nicht unter 0, gerundet.
    (0 km = 1000, 500 km = 750, ab 2000 km = 0.)

Die genauen Grenzwerte (2000 km usw.) dürfen wir später anpassen –
dann nur in `punkte.js` und hier.

---

## 6. Regeln für den Code

### 6a. Sicherheit (höchste Priorität)

Das Repo ist öffentlich (GitHub Pages gratis nur für öffentliche Repos).
Alles im Repo und alles im Browser-Code ist für jeden lesbar.

- **Keine Geheimnisse im Repo oder im Browser.** Erlaubt im Browser ist nur der
  Supabase-**anon key**. Der `service_role`-Key und der Gemini-Key kommen
  niemals in den Browser-Code, in Commits oder in Chat-Ausgaben.
  Geheimnisse liegen nur in `.env` (lokal, in `.gitignore`) oder als
  Supabase-Secret.
- **Vor jedem Commit und Push sicherstellen, dass keine API-Keys, Tokens,
  Passwörter oder persönlichen Anmeldedaten im Repo landen.** Dafür gibt es
  drei Schutzschichten, die alle aktiv bleiben müssen:
  1. `.gitignore` schließt Geheim-Dateien aus (`.env`, `docs/config.js`, `*.pem` …).
  2. `.githooks/pre-commit` bricht jeden Commit ab, der verbotene Dateien oder
     schlüsselähnliche Zeilen enthält. Aktivieren mit
     `git config core.hooksPath .githooks`. **Niemals `--no-verify` benutzen**
     und den Hook nicht abschwächen, nur gezielt bei Fehlalarm anpassen.
  3. GitHub *Secret Scanning* + *Push Protection* im Repo eingeschaltet lassen.
  Zusätzlich vor jedem Commit selbst `git diff --cached` durchsehen.
  Ist doch ein Schlüssel gepusht worden: **sofort beim Anbieter ungültig
  machen und neu erzeugen** – Löschen aus der Git-Historie reicht nicht.
- **Persönliche Daten:** Commits verwenden die GitHub-noreply-E-Mail-Adresse,
  nicht die private Adresse.
- **Row Level Security (RLS)** ist auf **jeder** Supabase-Tabelle eingeschaltet,
  mit möglichst engen Regeln. Keine Tabelle ohne RLS.
- **Lösungen nie vorab an die Spieler.** Nur der Host lädt das Paket; die
  Lösung wird erst nach Zeitablauf gesendet. Die Spieler-Seite lädt niemals
  Dateien aus `packs/`.
  *Bewusste Entscheidung:* Die Pakete liegen trotzdem öffentlich in
  `docs/packs/` – wer die URL kennt, könnte sie abrufen. Für Spiele unter
  Freunden ist das akzeptiert. Die Spieler-Seite darf aber nie selbst
  Lösungen kennen oder laden.
- **Eingaben nie vertrauen.** Spielernamen, Antworten und KI-Antworten werden
  geprüft (Länge, Typ, erlaubte Werte). Texte immer mit `textContent` einfügen,
  **nie mit `innerHTML`** (sonst kann jemand über seinen Namen Code einschleusen).
- **Edge Function absichern:** nur Aufrufe für offene Räume annehmen,
  Aufrufe pro Raum und pro Tag begrenzen, Themen-Eingabe kürzen und prüfen,
  Gemini-Antwort gegen das Paketformat validieren, bevor sie zurückgeht.
- **Bibliotheken nur von vertrauenswürdigen CDNs** mit fester Versionsnummer.
- Bei jeder Sicherheitsfrage: erst erklären, dann bauen. Lieber eine Funktion
  weglassen als eine Lücke einbauen.

### 6b. Keine Kosten

- **GitHub Pages**, **Supabase Free Plan** und **Gemini API Gratis-Tarif**
  (Google AI Studio) – sonst nichts.
- **Nirgends eine Zahlungsmethode hinterlegen** und kein Billing aktivieren
  (weder bei Supabase noch im Google-Cloud-Projekt des Gemini-Keys). Ohne
  Billing schlägt ein Aufruf über dem Limit fehl, statt etwas zu kosten –
  genau so soll es sein.
- Keine kostenpflichtigen Zusatzfunktionen nutzen (z. B. Grounding mit
  Google Search nur, solange es im Gratis-Tarif ohne Billing möglich ist).
- Limits schonen: Gemini nur auf Knopfdruck des Hosts aufrufen, nie
  automatisch in Schleifen; Aufrufzahl in der Edge Function begrenzen.
- Fällt ein Dienst wegen Limit aus, zeigt die Seite eine freundliche Meldung
  und man kann mit den festen Paketen weiterspielen.
- Bevor ein neuer Dienst oder eine neue Bibliothek dazukommt: prüfen und
  sagen, ob dauerhaft kostenlos.

### 6c. Allgemein

- **Einfach halten.** Der Besitzer ist Anfänger. Lieber etwas länger und
  verständlich als kurz und trickreich. Keine unnötigen Abstraktionen.
- **Deutsch kommentieren.** Kommentare und sichtbare Texte auf Deutsch.
  Variablen- und Funktionsnamen dürfen deutsch sein (`frage`, `punkte`).
- **Kein Build-Schritt, kein Framework.** Reines HTML, CSS, JavaScript mit
  ES-Modulen (`<script type="module">`). Bibliotheken nur per CDN
  (Supabase JS, später Leaflet). Alles muss direkt aus `/docs` auf GitHub Pages laufen.
- **Grafiken** als selbst gezeichnetes SVG, **Karten** mit Leaflet + OpenStreetMap.
- `docs/config.js` und `.env` stehen in `.gitignore`; eingecheckt wird nur
  `config.example.js` (siehe aber „Offener Punkt“ unten).
- **Python-Werkzeuge** liegen nur in `/tools`. Solange sie nur die
  Standardbibliothek nutzen (wie `validate.py`), brauchen sie keine `.venv`;
  kommen Pakete aus `requirements.txt` dazu, dann in einer `.venv`.
- **Prüfregeln doppelt:** `validate.py` und die `pruefeFrage`-Funktionen in
  `docs/engine/*.js` prüfen dieselben Regeln. Ändert sich eine, beide anpassen.
- **Vor jedem Commit `node tools/pruefen.mjs` ausführen** – muss „Alles in
  Ordnung“ melden. Neue Rechenregeln und neue Modi bekommen Tests in
  `tools/spiel.test.mjs`; jeder Modus wird im Test „oeffentlicheDaten enthält
  nie die Lösung“ mitgeprüft. Achtung: `node --check datei.js` findet Fehler
  in ES-Modulen nicht – deshalb immer `pruefen.mjs` benutzen.
  Node.js ist nur ein Werkzeug auf dem PC, die Website braucht es nicht.
- Schritt für Schritt bauen: immer nur die aktuelle Bauphase umsetzen.

---

## 7. Bauphasen

1. **Grundspiel:** Host und Handy verbinden sich über einen Raumcode (Supabase
   Realtime). Modi `auswahl` und `schaetzen` spielbar, Punkte und Rangliste.
2. **Grafik-Modus:** `balken`, `zeitleiste` (SVG) und `karte` (Leaflet).
3. **Werkzeuge:** Python-Validator (`validate.py`, prüft auch „genau 10 Fragen +
   Stechfrage“), `prompt.md` zum Erzeugen von Paketen, Raumfahrt-Paket auf
   10 + Stechfrage bringen, weitere Pakete (mindestens ~6, damit jeder Spieler
   3 Themen zur Wahl hat).
4. **Themenrunden** (Regeln siehe Abschnitt 1, „Spielregeln“):
   4a Runden, GPs, Siegziel, Stechfrage · 4b Kandidatenwahl + Glücksrad
   (Themen aus `packs/index.json`) · 4c Booster-Joker.
   Gespeicherte Highscores: später, falls gewünscht.
5. **Live-Themen mit Gemini:** Ein Spieler gibt per **Themenjoker** ein eigenes
   Thema ein, eine Supabase Edge Function erzeugt mit der Gemini API
   ein Paket im normalen Format (10 Fragen + Stechfrage) – erst, sobald das
   Thema auf dem Glücksrad gewonnen hat (dauert ca. 10–30 s). Strikt nach Abschnitt 6a und 6b:
   Key nur als Supabase-Secret, Aufrufe begrenzt, Antwort validiert, nur
   Gratis-Tarif ohne Billing. KI-Fragen können Fehler enthalten – Quelle
   immer mit anzeigen.

   **Entscheidung (11.10.2026):** Gemini über Supabase Edge Function, wie oben.
   - Standardmodell **Flash-Lite** (höhere Gratis-Grenze), Flash nur optional.
   - **Google-Suche (Grounding)** nutzen, wo sie im Gratis-Tarif ohne Billing
     erlaubt ist – damit Quellen echt sind statt erfunden.
   - **Anbieter austauschbar:** Der Modell-Aufruf steckt an *einer* Stelle in
     der Edge Function. Wird Gemini zu knapp, Wechsel z. B. zu Groq
     (ebenfalls ohne Kreditkarte) – die Website merkt davon nichts.
   - Gratis-Grenzen ändern sich oft: vor dem Bau aktuelle Werte in Google AI
     Studio prüfen (Nutzer). Gratis-Eingaben nutzt Google zum Training –
     für Quiz-Themen unkritisch, aber keine persönlichen Daten schicken.
   - Phase 3 (Pakete vorab mit Claude/NotebookLM + `validate.py`) bleibt der
     immer funktionierende Weg, falls ein Gratis-Tarif wegfällt.

**Phase 1 in Schritten:**
- 1a: Lobby – Host öffnet Raum mit Code, Handys treten bei, Host sieht die Namen.
- 1b: Fragen im Modus `auswahl` mit Countdown und Auflösung.
- 1c: Modus `schaetzen`, Punkte und Rangliste.

**Technik der Räume (Phase 1):** Nur Supabase Realtime *Broadcast* (Nachrichten)
und *Presence* (wer ist im Raum) auf dem Kanal `quiz-<RAUMCODE>` – noch keine
Tabellen. Alle Nachrichten haben die Form `{ typ: "...", daten: {...} }`.
Der Host misst die Antwortzeit selbst und rechnet die Punkte aus; Spieler
schicken nur ihre Antwort.

Nachrichten:
| typ          | von → an       | daten |
|--------------|----------------|-------|
| `frage`      | Host → Handys  | `nummer, gesamt, modus, text, restzeit, daten` (daten = `oeffentlicheDaten()`, **ohne Lösung**) |
| `antwort`    | Handy → Host   | `id, nummer, antwort` (endgültig, mit Zeitmessung) |
| `entwurf`    | Handy → Host   | `id, nummer, antwort` – Zwischenstand beim Tippen (`null` = Feld leer). Zählt bei Zeitablauf, wenn nicht gesendet wurde, dann ohne Tempo-Bonus. Beendet die Frage nicht vorzeitig. |
| `aufloesung` | Host → Handys  | `nummer, loesungText, ergebnisse: [{ id, beantwortet, punkte, gesamt, platz }]` |
| `ende`       | Host → Handys  | `rangliste: [{ id, name, punkte, platz }]` |

Host-Ablauf: Lobby → Frage → Auflösung → Zwischenstand → … → Siegertreppchen.

**Modus-Module** (`engine/*.js`) haben alle dieselben Funktionen:
`pruefeFrage, oeffentlicheDaten, zeigeFrage, zeigeEingabe, antwortGueltig,
bewerte, loesungAlsText, zeigeAufloesung` (Beschreibung oben in `auswahl.js`).
`bewerte()` gibt Punkte zurück und ruft dafür die Regeln aus `punkte.js` auf.
Ein neuer Modus wird in `MODI` in `host.js` **und** `play.js` eingetragen.

**Bekannte Grenze:** Broadcast-Nachrichten haben keinen geprüften Absender.
Ein technisch versierter Spieler könnte über die Browser-Konsole falsche
Nachrichten an andere Handys schicken. Lösungen erfährt er dadurch aber nicht.
Für Spiele unter Freunden akzeptiert; echte Absicherung bräuchte Supabase-Auth.

**Bekannte Grenze 2:** Lädt ein Spieler die Seite neu, bekommt er eine neue
Kennung und startet mit 0 Punkten (der alte Eintrag bleibt in der Rangliste).

**Phase 2 in Schritten:**
- 2a: `balken` und `zeitleiste` als SVG (Handy: Zahlenfeld bzw. Schieberegler).
- 2b: `karte` mit Leaflet + OpenStreetMap.

**Aktueller Stand:** Phase 1 ist fertig und online (siehe „Online-Stellen“ unten).
Phase 2 (2a Balken + Zeitleiste, 2b Karte) ist fertig. Phase 3: `validate.py` und
`prompt.md` sind fertig, Raumfahrt hat 10 Fragen + Stechfrage. Als Nächstes:
weitere Pakete (mindestens ~6), danach Phase 4.

### Online-Stellen (entschieden)
`docs/config.js` bleibt in `.gitignore`. Der Workflow `.github/workflows/pages.yml`
erzeugt sie bei jedem Push auf `main` aus den Repository-Secrets `SUPABASE_URL`
und `SUPABASE_ANON_KEY` und veröffentlicht `docs/` über GitHub Pages
(Source: „GitHub Actions“). Er bricht ab, wenn der Key kein anon key ist.
Der anon key ist online für Besucher sichtbar – so gedacht, Schutz über RLS.
Der pre-commit-Hook bleibt unverändert und blockiert weiter jeden Key im Repo.
