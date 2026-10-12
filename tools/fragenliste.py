"""Kurze Übersicht über ein Fragenpaket: eine Zeile pro Frage.

Gedacht für den Platzhalter „[HIER DIE LISTE DER VORHANDENEN FRAGETEXTE EINFÜGEN]“
in tools/prompt.md und als Überblick, welche Unterthemen schon abgedeckt sind –
statt das ganze Paket (viel JSON) zu lesen.

Benutzung (im Projektordner):
    python tools/fragenliste.py docs/packs/sport.json      → id | modus | Frage | Lösung
    python tools/fragenliste.py docs/packs/sport.json --kurz
                                                           → nur die Fragetexte
    python tools/fragenliste.py --alle --kurz              → Fragetexte aller Pakete

Danach die nächste freie Nummer für neue ids. Nur Standardbibliothek.
"""

import json
import re
import sys
from pathlib import Path

from neue_ids import fragen_aus, paket_dateien


def loesung_kurz(f):
    """Lösung als kurzer Text."""
    loesung = f.get("loesung")
    if f["modus"] == "auswahl":
        return f["optionen"][loesung]
    if f["modus"] == "reihenfolge":
        return " > ".join(loesung)
    if isinstance(loesung, dict):
        return f"{loesung.get('lat')}, {loesung.get('lng')}"
    einheit = f.get("einheit") or (f.get("daten") or {}).get("einheit") or ""
    return f"{loesung} {einheit}".strip()


def naechste_nummern(fragen):
    """Nächste freie Nummer für Fragen und Stechfragen, z. B. ('sport-094', 'sport-s08')."""
    zahlen, stech, kuerzel = [], [], None
    breite, stech_breite = 3, 2  # Stellen wie bisher im Paket („rf-42“, „rf-s1“)
    for f in fragen:
        treffer = re.fullmatch(r"(.+)-(s?)(\d+)", str(f.get("id")))
        if not treffer:
            continue
        kuerzel = treffer.group(1)
        if treffer.group(2):
            stech.append(int(treffer.group(3)))
            stech_breite = len(treffer.group(3))
        else:
            zahlen.append(int(treffer.group(3)))
            breite = len(treffer.group(3))
    if kuerzel is None:
        return None
    return (f"{kuerzel}-{max(zahlen, default=0) + 1:0{breite}d}",
            f"{kuerzel}-s{max(stech, default=0) + 1:0{stech_breite}d}")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    argumente = sys.argv[1:]
    kurz = "--kurz" in argumente
    if "--alle" in argumente:
        dateien = paket_dateien()
    else:
        dateien = [Path(a) for a in argumente if not a.startswith("--")]
    if not dateien:
        print(__doc__)
        sys.exit(1)

    for datei in dateien:
        fragen = fragen_aus(json.loads(datei.read_text(encoding="utf-8")))
        if len(dateien) > 1:
            print(f"## {datei.name}")
        for f in fragen:
            if kurz:
                print(f["frage"])
            else:
                print(f"{f['id']} | {f['modus']} | {f['frage']} | {loesung_kurz(f)}")
        if not kurz:
            naechste = naechste_nummern(fragen)
            if naechste:
                print(f"\nNächste freie ids: {naechste[0]} (Fragen), {naechste[1]} (Stechfragen)")


if __name__ == "__main__":
    main()
