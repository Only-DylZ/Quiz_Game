# Prompt-Vorlage: Neues Themenpaket erzeugen

So geht's:
1. In NotebookLM (oder Claude) die Quellen zum Thema hochladen
   (Artikel, PDFs, Wikipedia-Seiten …).
2. Den Text unten ab „--- PROMPT ---“ kopieren und `[THEMA]` ersetzen.
   Ein Paket ist ein **Pool** (Ziel: 150 Fragen). Den erzeugt man in **Blöcken
   von ca. 30 Fragen** – längere Antworten werden bei KIs oft schlechter.
   Für jeden weiteren Block den Abschnitt „Weiterer Block“ unten benutzen.
3. Die Antwort als `docs/packs/<thema>.json` speichern (Dateiname klein, ohne
   Umlaute und Leerzeichen, z. B. `antikes-rom.json`).
4. Das Paket in `docs/packs/index.json` eintragen:
   `{ "datei": "<thema>.json", "thema": "<Thema>" }`
5. Prüfen (im Projektordner) – **ein Befehl für alles**:
   `python tools/block_pruefen.py docs/packs/<thema>.json`
   Er prüft nur die **neuen** (noch nicht committeten) Fragen: Format, Links
   (findet erfundene Links), ähnliche Fragen in allen Paketen (`doppelt.py`),
   Lecks (`lecks.py`) und zum Schluss `node tools/pruefen.mjs`.
   Fehler korrigieren – oder die Fehlermeldung an die KI zurückgeben
   („Korrigiere bitte: …“). Treffer von `doppelt.py`/`lecks.py` von Hand
   bewerten; echte Probleme ändern, harmlose Treffer mit
   `python tools/doppelt.py --neu --merken` bzw. `python tools/lecks.py --neu --merken`
   speichern (erscheinen dann nie wieder). Achtung: `--merken` speichert *alles*,
   was gerade angezeigt würde – nach jeder Änderung an Fragen erst ohne
   `--merken` neu prüfen. `lecks.py --kontext` zeigt, wo genau ein Treffer steht.
6. Fakten stichprobenartig selbst nachprüfen – auch KI-Antworten können falsch sein.
7. **Nach jedem fertigen Block committen** – sonst gelten die Fragen beim
   nächsten Block weiter als „neu“ und werden noch einmal geprüft.

**Häufigste Falle:** Die Antwort einer *neuen* Frage steht schon sichtbar in einer alten –
als Balken, als `werte` einer Reihenfolge oder als Hilfsereignis einer Zeitleiste (z. B.
„Erste Tour de France 1903“). Vor dem Schreiben kurz im Paket nach dem Fakt suchen;
`lecks.py --neu --kontext` findet den Rest.

**Sparsam arbeiten (für Claude):** Nicht die ganzen Pakete lesen. Überblick über
ein Paket (Unterthemen, nächste freie ids):
`python tools/fragenliste.py docs/packs/<thema>.json` – eine Zeile pro Frage.
Doppelte Fragen über alle Pakete findet `doppelt.py`, nicht das Durchlesen.

--- PROMPT ---

Erstelle ein Quiz-Fragenpaket zum Thema **[THEMA]** ausschließlich auf Basis
der bereitgestellten Quellen. Erfinde keine Fakten. Jede Frage braucht eine
Quelle, aus der die Lösung eindeutig hervorgeht.

Erzeuge **30 Fragen** im Feld `fragen`:
- 12 Fragen im Modus `auswahl`
- 9 Fragen im Modus `schaetzen`
- 6 Fragen im Modus `grafik` (gemischt: `balken`, `zeitleiste`, `karte`)
- 3 Fragen im Modus `reihenfolge`

Dazu **2 Stechfragen** im Feld `stechfragen`: immer Modus `schaetzen`, mit einer
eindeutigen Zahl als Lösung (keine „ungefähr“-Werte, bei denen Quellen sich
widersprechen). Sie werden nur bei Gleichstand gespielt.

Die Fragen sollen das Thema **breit abdecken** (verschiedene Unterthemen,
leichte und schwere Fragen gemischt) und sich nicht gegenseitig verraten.

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
    },
    {
      "id": "kurz-06",
      "modus": "reihenfolge",
      "frage": "Ordne die Berge nach ihrer Höhe!",
      "loesung": ["Mount Everest", "K2", "Lhotse"],
      "oben": "höchster",
      "unten": "niedrigster",
      "werte": ["8849 m", "8611 m", "8516 m"],
      "quelle": { "titel": "...", "url": "https://..." }
    }
  ],
  "stechfragen": [
    {
      "id": "kurz-s01",
      "modus": "schaetzen",
      "frage": "Wie viele ...?",
      "einheit": "",
      "loesung": 42,
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
- `grafik` / `balken`: 2–8 Balken, Namen kurz (höchstens 16 Zeichen).
- `grafik` / `zeitleiste`: 2–4 Hilfsereignisse; das gesuchte Ereignis nicht in der Liste.
  `von` und `bis` sind ganze Jahre, die Lösung liegt dazwischen.
- `grafik` / `karte`: `loesung` mit Breitengrad `lat` und Längengrad `lng`
  (Dezimalgrad, 2 Nachkommastellen). `mitte` zeigt die Region, aber nicht genau
  auf die Lösung; `zoom` 2–6.
- `reihenfolge`: 3–6 Elemente, `loesung` in richtiger Reihenfolge, `oben`/`unten`
  beschriften die Enden. Nur Dinge mit eindeutigen, belegten Werten (keine
  knappen oder umstrittenen Unterschiede). Die alphabetische Reihenfolge darf
  nicht schon die Lösung sein.
- Jede `id` nur einmal: `<kürzel>-001`, `<kürzel>-002` … (dreistellig, weil der
  Pool bis 150 wächst) und `<kürzel>-s01` … für Stechfragen.
- Antworttexte kurz halten (höchstens ca. 60 Zeichen), Fragetexte unter 200 Zeichen.
- Bilder kann die KI nicht liefern. Bildfragen (z. B. Flaggen, Gerichte) baut man
  danach von Hand: freies Bild von Wikimedia Commons nach `docs/bilder/<id>.png`
  und das Feld `bild` ergänzen (siehe CLAUDE.md, „Bildfragen“).
- Bei Kartenfragen darf der Fragetext den Ort nicht verraten (also nicht
  „Wo liegt Reykjavík, die Hauptstadt Islands?“) – die Karte zeigt keine Namen.
- **Keine Frage darf die Antwort einer anderen verraten** – auch nicht über
  Fragetext, Balken, Zeitleisten-Ereignisse oder `werte` (z. B. nicht „Reinheitsgebot
  von 1516“, wenn eine Stechfrage nach 1516 fragt).
- Nur eindeutig belegte Zahlen; bei umstrittenen oder stark schwankenden Werten
  lieber eine andere Frage.
- Fragen kurz und eindeutig formulieren, auf Deutsch, für Erwachsene ohne Vorwissen
  machbar.
- Keine Frage, deren Antwort sich bald ändern könnte (z. B. „aktuell“, „bisher“),
  außer die Quelle nennt ein Datum.

--- WEITERER BLOCK (zum Erweitern eines vorhandenen Pakets) ---

Erstelle **30 weitere** Fragen und **2 weitere** Stechfragen zum Thema
**[THEMA]** – gleiches Format und gleiche Regeln wie oben, gleiche Aufteilung
auf die Modi. Gib nur die neuen Fragen aus, als JSON mit den Feldern `fragen`
und `stechfragen`.
- ids fortlaufend ab `[KÜRZEL]-[NÄCHSTE NUMMER]` bzw. `[KÜRZEL]-s[NÄCHSTE NUMMER]`.
- **Keine** dieser vorhandenen Fragen wiederholen oder leicht umformulieren:
  [HIER DIE LISTE DER VORHANDENEN FRAGETEXTE EINFÜGEN]

Die Liste für den Platzhalter (und die nächsten freien ids) liefert
`python tools/fragenliste.py docs/packs/<thema>.json --kurz` bzw. ohne `--kurz`.

Danach die neuen Fragen an die Listen `fragen` und `stechfragen` im Paket
anhängen und mit `python tools/block_pruefen.py docs/packs/<thema>.json` prüfen
(findet auch doppelte ids und ähnliche Fragen in anderen Paketen).

--- SONDERPAKET „DIE 500-€-FRAGE“ (jauch.json, Kürzel wwm) ---

Dieses Paket ist anders als die übrigen: **nur Modus `auswahl`** mit genau 4 Optionen,
im Stil der leichten Stufen einer bekannten Quizshow (500-Euro-Frage). Die Runde füllt
die fehlenden Modi automatisch mit Auswahlfragen auf; die Hinweise von `validate.py`
zu fehlenden Modi sind hier also in Ordnung. Stechfragen bleiben `schaetzen`.

Erstelle **30 weitere** Fragen im Modus `auswahl` und **2 Stechfragen** (Modus
`schaetzen`) im Stil der 500-Euro-Frage einer Quizshow. **Jede Frage braucht einen
kleinen Denkschritt** (in 20–30 Sekunden lösbar, kein Spezialwissen). Gemischt aus:
- **Denkfalle:** Die naheliegende Antwort ist falsch, man muss nachrechnen
  („Schläger und Ball kosten zusammen 1,10 € …“).
- **Gemeinsames Wort:** Welches Wort passt vor/hinter alle drei („…ball, …weg,
  …note“)? Jede falsche Option passt zu mindestens einem der drei, aber nicht zu allen.
- **Verwechslungsgefahr:** Bedeutung einer Redewendung, eine falsche Option ist die
  einer ähnlichen Redewendung („Katze im Sack kaufen“ ↔ „Katze aus dem Sack lassen“).
- **Genau lesen:** Die Frage enthält einen Fehler oder Haken („Wie viele Tiere nahm
  Mose mit auf die Arche?“ – es war Noah).
- **Kleine Logik:** Reihenfolgen, Verwandtschaft, Tage, Zählen.

Verboten:
- Reiner Lückentext zu Redewendungen („Da steppt der …?“) – das ist nur Auswendigwissen.
- Scherzfragen, die fast jeder schon kennt (Kilo Federn/Eisen, Handtuch trocknet,
  „Welcher Monat hat 28 Tage?“).

Weitere Regeln:
- Genau 4 Optionen; die falschen sollen verlockend oder lustig sein, aber eindeutig falsch.
- Pro Frage höchstens ein bis zwei Sätze, Antworten kurz (max. ca. 40 Zeichen).
- **Immer eine `erklaerung`**, die den Denkschritt auflöst (Rechenweg, Haken).
- Quelle konkret: bei Redewendungen und Wörtern der Wiktionary-Eintrag, bei
  Rechen-/Logikrätseln ein passender Wikipedia-Artikel (z. B. „Cognitive Reflection
  Test“, „Moses-Illusion“, „Denksportaufgabe“); der Lösungsweg steht in der Erklärung.
- ids fortlaufend ab `wwm-[NÄCHSTE NUMMER]` bzw. `wwm-s[NÄCHSTE NUMMER]`.
- **Keine** dieser vorhandenen Fragen wiederholen oder leicht umformulieren:
  [HIER DIE LISTE DER VORHANDENEN FRAGETEXTE EINFÜGEN]
