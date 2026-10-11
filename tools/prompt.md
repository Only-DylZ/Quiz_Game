# Prompt-Vorlage: Neues Themenpaket erzeugen

So geht's:
1. In NotebookLM (oder Claude) die Quellen zum Thema hochladen
   (Artikel, PDFs, Wikipedia-Seiten …).
2. Den Text unten ab „--- PROMPT ---“ kopieren und `[THEMA]` ersetzen.
   Die Aufteilung auf die Modi darf man ändern – es müssen aber **genau 10** bleiben.
3. Die Antwort als `docs/packs/<thema>.json` speichern (Dateiname klein, ohne
   Umlaute und Leerzeichen, z. B. `antikes-rom.json`).
4. Prüfen (im Projektordner):
   `python tools/validate.py docs/packs/<thema>.json --links`
   Fehler korrigieren – oder die Fehlermeldung an die KI zurückgeben
   („Korrigiere bitte: …“). `--links` ruft alle Quellen-Links auf und findet
   erfundene Links.
5. Das Paket in `docs/packs/index.json` eintragen:
   `{ "datei": "<thema>.json", "thema": "<Thema>" }`
6. Fakten stichprobenartig selbst nachprüfen – auch KI-Antworten können falsch sein.
7. Zum Schluss `node tools/pruefen.mjs` – muss „Alles in Ordnung“ melden.

--- PROMPT ---

Erstelle ein Quiz-Fragenpaket zum Thema **[THEMA]** ausschließlich auf Basis
der bereitgestellten Quellen. Erfinde keine Fakten. Jede Frage braucht eine
Quelle, aus der die Lösung eindeutig hervorgeht.

Erzeuge **genau 10 Fragen** im Feld `fragen`:
- 4 Fragen im Modus `auswahl`
- 3 Fragen im Modus `schaetzen`
- 3 Fragen im Modus `grafik` (möglichst verschiedene Arten: `balken`, `zeitleiste`, `karte`)

Dazu **eine Stechfrage** im Feld `stechfrage`: immer Modus `schaetzen`, mit einer
eindeutigen Zahl als Lösung (keine „ungefähr“-Werte, bei denen Quellen sich
widersprechen). Sie wird nur bei Gleichstand gespielt.

Gib **nur gültiges JSON** aus, ohne Erklärtext davor oder danach,
in genau diesem Format:

```json
{
  "thema": "[THEMA]",
  "version": 1,
  "beschreibung": "Ein Satz zum Paket.",
  "fragen": [
    {
      "id": "kurz-01",
      "modus": "auswahl",
      "frage": "Fragetext?",
      "optionen": ["A", "B", "C", "D"],
      "loesung": 0,
      "erklaerung": "Optional: ein kurzer Satz zur Auflösung.",
      "quelle": { "titel": "Name der Quelle", "url": "https://..." }
    },
    {
      "id": "kurz-02",
      "modus": "schaetzen",
      "frage": "Wie viele ...?",
      "einheit": "km",
      "loesung": 1234,
      "quelle": { "titel": "...", "url": "https://..." }
    },
    {
      "id": "kurz-03",
      "modus": "grafik",
      "art": "balken",
      "frage": "Wie hoch ist der fehlende Wert?",
      "daten": {
        "einheit": "m",
        "balken": [
          { "name": "X", "wert": 100 },
          { "name": "Y", "wert": null }
        ]
      },
      "loesung": 250,
      "quelle": { "titel": "...", "url": "https://..." }
    },
    {
      "id": "kurz-04",
      "modus": "grafik",
      "art": "zeitleiste",
      "frage": "In welchem Jahr geschah ...?",
      "daten": {
        "von": 1900,
        "bis": 2000,
        "ereignisse": [ { "name": "Bekanntes Ereignis", "jahr": 1950 } ]
      },
      "loesung": 1969,
      "quelle": { "titel": "...", "url": "https://..." }
    },
    {
      "id": "kurz-05",
      "modus": "grafik",
      "art": "karte",
      "frage": "Wo liegt ...?",
      "daten": { "mitte": [50, 10], "zoom": 4 },
      "loesung": { "lat": 48.14, "lng": 11.58 },
      "quelle": { "titel": "...", "url": "https://..." }
    }
  ],
  "stechfrage": {
    "id": "kurz-s1",
    "modus": "schaetzen",
    "frage": "Wie viele ...?",
    "einheit": "",
    "loesung": 42,
    "quelle": { "titel": "...", "url": "https://..." }
  }
}
```

Regeln:
- `auswahl`: 2–4 Optionen, genau eine richtig. `loesung` ist der Index (0 = erste Option).
  Falsche Optionen sollen plausibel, aber eindeutig falsch sein.
- `schaetzen`: `loesung` ist eine Zahl (ohne Tausenderpunkte), `einheit` angeben
  (leerer Text `""` bei reinen Anzahlen).
- `grafik` / `balken`: genau ein Balken hat `"wert": null`; `loesung` ist dessen Wert.
- `grafik` / `balken`: 2–8 Balken, Namen kurz (höchstens 16 Zeichen).
- `grafik` / `zeitleiste`: 2–4 Hilfsereignisse; das gesuchte Ereignis nicht in der Liste.
  `von` und `bis` sind ganze Jahre, die Lösung liegt dazwischen.
- `grafik` / `karte`: `loesung` mit Breitengrad `lat` und Längengrad `lng`
  (Dezimalgrad, 2 Nachkommastellen). `mitte` zeigt die Region, aber nicht genau
  auf die Lösung; `zoom` 2–6.
- Jede `id` nur einmal, z. B. `rom-01` … `rom-10` und `rom-s1` für die Stechfrage.
- Antworttexte kurz halten (höchstens ca. 60 Zeichen), Fragetexte unter 200 Zeichen.
- Fragen kurz und eindeutig formulieren, auf Deutsch, für Erwachsene ohne Vorwissen
  machbar.
- Keine Frage, deren Antwort sich bald ändern könnte (z. B. „aktuell“, „bisher“),
  außer die Quelle nennt ein Datum.
