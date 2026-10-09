# Prompt-Vorlage: Neues Themenpaket erzeugen

So geht's:
1. In NotebookLM (oder Claude) die Quellen zum Thema hochladen
   (Artikel, PDFs, Wikipedia-Seiten …).
2. Den Text unten ab „--- PROMPT ---“ kopieren, `[THEMA]` und die Anzahlen anpassen.
3. Die Antwort als `docs/packs/<thema>.json` speichern (Dateiname klein, ohne Umlaute).
4. Mit `python tools/validate.py docs/packs/<thema>.json` prüfen (ab Phase 3).
5. Das Paket in `docs/packs/index.json` eintragen.
6. Fakten stichprobenartig selbst nachprüfen – auch KI-Antworten können falsch sein.

--- PROMPT ---

Erstelle ein Quiz-Fragenpaket zum Thema **[THEMA]** ausschließlich auf Basis
der bereitgestellten Quellen. Erfinde keine Fakten. Jede Frage braucht eine
Quelle, aus der die Lösung eindeutig hervorgeht.

Erzeuge:
- [4] Fragen im Modus `auswahl`
- [4] Fragen im Modus `schaetzen`
- [2] Fragen im Modus `grafik` (Arten: `balken`, `zeitleiste` oder `karte`)

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
  ]
}
```

Regeln:
- `auswahl`: 2–4 Optionen, genau eine richtig. `loesung` ist der Index (0 = erste Option).
  Falsche Optionen sollen plausibel, aber eindeutig falsch sein.
- `schaetzen`: `loesung` ist eine Zahl (ohne Tausenderpunkte), `einheit` angeben
  (leerer Text `""` bei reinen Anzahlen).
- `grafik` / `balken`: genau ein Balken hat `"wert": null`; `loesung` ist dessen Wert.
- `grafik` / `zeitleiste`: 2–4 Hilfsereignisse; das gesuchte Ereignis nicht in der Liste.
- `grafik` / `karte`: `loesung` mit Breitengrad `lat` und Längengrad `lng`
  (Dezimalgrad, 2 Nachkommastellen).
- Fragen kurz und eindeutig formulieren, auf Deutsch, für Erwachsene ohne Vorwissen
  machbar.
- Keine Frage, deren Antwort sich bald ändern könnte (z. B. „aktuell“, „bisher“),
  außer die Quelle nennt ein Datum.
