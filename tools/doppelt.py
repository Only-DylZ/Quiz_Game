"""Sucht ähnliche (fast doppelte) Fragen über ALLE Pakete.

validate.py findet nur wörtlich gleiche Fragen in einem Paket. Dieses Werkzeug
vergleicht ausgewählte Fragen (meist: die neuen) mit allen anderen und meldet:
- ähnlichen Fragetext: seltene Wörter („Landsteiner“) zählen viel, häufige
  („welches“, „Mensch“) wenig; Musterfragen wie „Wie dicht ist Gold?“ /
  „… Platin?“ gelten nicht als ähnlich,
- gleiche Lösung + etwas ähnlicher Text (z. B. Lichtgeschwindigkeit in Physik
  und Raumfahrt, verschieden formuliert),
- Reihenfolge-Fragen mit mindestens 2 gleichen Elementen,
- Kartenfragen, deren Lösungen weniger als 5 km auseinanderliegen.

Benutzung (im Projektordner):
    python tools/doppelt.py --neu       → nur neue (noch nicht committete) Fragen prüfen
    python tools/doppelt.py wwm-        → nur Fragen mit diesem id-Präfix prüfen
    python tools/doppelt.py             → alle gegen alle (dauert etwas)
    python tools/doppelt.py --neu --merken
                                        → angezeigte Paare als „kein Duplikat“ in
                                          tools/doppelt_ok.txt eintragen (erst bewerten!)

Achtung: Hinweis-Werkzeug. Jeder Treffer wird von Hand bewertet. Nur Standardbibliothek.
"""

import math
import re
import sys
from collections import Counter
from pathlib import Path

from neue_ids import alle_fragen, auswahl_aus_argumenten, auswahl_passt

MERKLISTE = Path(__file__).resolve().parent / "doppelt_ok.txt"
MAX_PRO_FRAGE = 3  # höchstens so viele Kandidaten pro geprüfter Frage zeigen
KARTE_KM = 5       # Kartenfragen näher als das gelten als derselbe Ort


def normal(text):
    """Kleinbuchstaben, ohne Satzzeichen, einfache Leerzeichen."""
    return " ".join(re.findall(r"\w+", str(text).lower()))


def loesung_text(f):
    """Lösung als vergleichbarer Text (None bei Karte/Reihenfolge)."""
    if f["modus"] == "auswahl":
        return normal(f["optionen"][f["loesung"]])
    if isinstance(f.get("loesung"), (int, float)):
        return str(float(f["loesung"]))
    return None


def km(a, b):
    """Entfernung zweier Orte {lat, lng} in km (Haversine)."""
    r = 6371
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp, dl = p2 - p1, math.radians(b["lng"] - a["lng"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def ist_karte(f):
    return f["modus"] == "grafik" and f.get("art") == "karte"


def worte(text):
    """Wortstämme (erste 6 Zeichen) aller Wörter – auch kurze wie „Gold“ oder „Pb“."""
    return {w[:6] for w in re.findall(r"\w{2,}", str(text).lower())}


def aehnlichkeit(worte_a, worte_b, gewicht):
    """Gewichtete Übereinstimmung 0..1: seltene Wörter („Landsteiner“) zählen viel,
    häufige („welches“, „Mensch“, „Symbol“) wenig."""
    gesamt = sum(gewicht[w] for w in worte_a | worte_b)
    if gesamt == 0:
        return 0
    return sum(gewicht[w] for w in worte_a & worte_b) / gesamt


def vergleiche(a, b, info_a, info_b, gewicht):
    """Gibt (wert 0..1, grund) zurück oder None, wenn nicht ähnlich."""
    # Bildfragen mit gleichem Text (Flaggen …) sind gewollt – nur Bild zählt
    if isinstance(a.get("bild"), dict) and isinstance(b.get("bild"), dict):
        return None

    if ist_karte(a) and ist_karte(b):
        abstand = km(a["loesung"], b["loesung"])
        if abstand < KARTE_KM:
            return 1 - abstand / 100, f"Karte: Lösungen {abstand:.0f} km auseinander"

    # Reihenfolge: Texte sind oft gleich („Ordne … nach Größe!“) – Elemente vergleichen
    if a["modus"] == "reihenfolge" and b["modus"] == "reihenfolge":
        gleich = {normal(t) for t in a["loesung"]} & {normal(t) for t in b["loesung"]}
        if len(gleich) >= 2:
            return 0.5 + 0.1 * len(gleich), f"Reihenfolge: {len(gleich)} gleiche Elemente"
        return None

    # Musterfragen („Wie dicht ist Gold?“ / „… Platin?“): Ist das seltenste Wort
    # jeder Frage in der anderen nicht enthalten, geht es um verschiedene Dinge.
    # Bei Gleichstand zählen alle gleich seltenen Wörter (sonst Zufallsergebnis)
    def seltenste(worte):
        hoechstes = max((gewicht[w] for w in worte), default=0)
        return {w for w in worte if gewicht[w] == hoechstes}
    if not (seltenste(info_a["worte"]) & info_b["worte"]) and not (seltenste(info_b["worte"]) & info_a["worte"]):
        return None

    wert = aehnlichkeit(info_a["worte"], info_b["worte"], gewicht)
    if wert >= 0.5:
        return wert, f"ähnlicher Text ({wert:.0%})"
    if info_a["loesung"] and info_a["loesung"] == info_b["loesung"] and wert >= 0.25:
        return wert + 0.25, f"gleiche Lösung + ähnlicher Text ({wert:.0%})"
    return None


def merkliste_laden():
    if not MERKLISTE.exists():
        return set()
    paare = set()
    for zeile in MERKLISTE.read_text(encoding="utf-8").splitlines():
        teile = zeile.split("  #", 1)[0].split()
        if len(teile) == 2 and not zeile.startswith("#"):
            paare.add(frozenset(teile))
    return paare


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    argumente = sys.argv[1:]
    auswahl = auswahl_aus_argumenten(argumente)
    merken = "--merken" in argumente

    alle = [f for _, f in alle_fragen()]
    info = {}
    for f in alle:
        # Lösungstext gehört zum Inhalt (bei Auswahl oft das eigentliche Thema)
        loesung = loesung_text(f)
        info[f["id"]] = {
            "worte": worte(f["frage"]) | (worte(loesung) if f["modus"] == "auswahl" else set()),
            "loesung": loesung,
        }
    # Gewicht = wie selten ein Wort ist (in wie vielen Fragen es vorkommt)
    haeufigkeit = Counter(w for i in info.values() for w in i["worte"])
    gewicht = {w: math.log(len(alle) / n) for w, n in haeufigkeit.items()}
    bekannt = merkliste_laden()

    gepruefte = [f for f in alle if auswahl_passt(f["id"], auswahl)]
    gesehen = set()
    treffer = []
    for a in gepruefte:
        kandidaten = []
        for b in alle:
            paar = frozenset((a["id"], b["id"]))
            if b is a or paar in gesehen or paar in bekannt:
                continue
            ergebnis = vergleiche(a, b, info[a["id"]], info[b["id"]], gewicht)
            if ergebnis:
                kandidaten.append((ergebnis[0], ergebnis[1], b))
        kandidaten.sort(key=lambda k: -k[0])
        for wert, grund, b in kandidaten[:MAX_PRO_FRAGE]:
            gesehen.add(frozenset((a["id"], b["id"])))
            treffer.append((a, b, grund))

    for a, b, grund in treffer:
        print(f"{a['id']:10} {a['frage'][:70]}")
        print(f"{b['id']:10} {b['frage'][:70]}")
        print(f"{'':10} → {grund}\n")
    print(f"{len(treffer)} mögliche Duplikate bei {len(gepruefte)} geprüften Fragen"
          + (" – bitte von Hand bewerten." if treffer else "."))

    if merken and treffer:
        with MERKLISTE.open("a", encoding="utf-8") as datei:
            for a, b, _ in treffer:
                datei.write(f"{a['id']} {b['id']}\n")
        print(f"{len(treffer)} Paare in {MERKLISTE.name} eingetragen.")


if __name__ == "__main__":
    main()
