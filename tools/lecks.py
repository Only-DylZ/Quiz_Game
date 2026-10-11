"""Sucht "Lecks" über alle Fragenpakete: Steht die Antwort einer Frage irgendwo
sichtbar in einer ANDEREN Frage? Fragen verschiedener Themen kommen im selben
Spiel vor, und die Auflösung ist für alle sichtbar – deshalb über alle Pakete.

Geprüft wird alles, was Spieler sehen: Fragetext, Optionen, Balken, Ereignisse
der Zeitleiste, Reihenfolge-Elemente und -Werte, Erklärung und Quellentitel.

Benutzung (im Projektordner):
    python tools/lecks.py           → alle Treffer
    python tools/lecks.py geo-      → nur Treffer, an denen geo-… beteiligt ist

Achtung: Das ist ein Hinweis-Werkzeug, kein Urteil. Viele Treffer sind harmlos
(eine Antwort taucht nur als falsche Option auf, eine Jahreszahl ist Zufall).
Echte Lecks sind z. B. „Mauerfall 1989“ als Ereignis auf einer Zeitleiste,
wenn eine andere Frage nach dem Jahr des Mauerfalls fragt. Nur Standardbibliothek.
"""

import json
import re
import sys
from pathlib import Path

PACKS = Path(__file__).resolve().parent.parent / "docs" / "packs"


def zahl_texte(z):
    """Mögliche Schreibweisen einer Zahl: 1989, 1.233, 3,5"""
    if isinstance(z, float) and not z.is_integer():
        return {str(z).replace(".", ",")}
    z = int(z)
    return {str(z), f"{z:,}".replace(",", ".")}


def antworten(f):
    """Was wäre ein Leck für diese Frage? (zu kurze Antworten wie „4“ werden übergangen)"""
    if f["modus"] == "auswahl":
        t = f["optionen"][f["loesung"]]
        return {t} if len(t) >= 4 and not t.isdigit() else set()
    if f["modus"] == "schaetzen" or (f["modus"] == "grafik" and f.get("art") in ("balken", "zeitleiste")):
        z = f["loesung"]
        if abs(z) >= 100 or (isinstance(z, float) and not z.is_integer()):
            return zahl_texte(z)
    return set()


def sichtbar(f):
    """Alles, was Spieler von dieser Frage sehen (auch nach der Auflösung)."""
    teile = [f["frage"], f.get("erklaerung", ""), f.get("quelle", {}).get("titel", "")]
    teile += f.get("optionen", [])
    teile += f.get("werte", [])
    if f["modus"] == "reihenfolge":
        teile += f["loesung"]
    d = f.get("daten") or {}
    for b in d.get("balken", []):
        teile.append(b["name"])
        if b["wert"] is not None:
            teile += zahl_texte(b["wert"])
    for e in d.get("ereignisse", []):
        teile += [e["name"], str(e["jahr"])]
    return " | ".join(str(t) for t in teile)


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    filter_ = sys.argv[1] if len(sys.argv) > 1 else ""

    alle = []
    for datei in sorted(PACKS.glob("*.json")):
        if datei.name == "index.json":
            continue
        p = json.loads(datei.read_text(encoding="utf-8"))
        alle += p.get("fragen", []) + p.get("stechfragen", [])

    treffer = 0
    for q in alle:
        for token in antworten(q):
            muster = re.compile(r"(?<![\w.,])" + re.escape(token) + r"(?![\w]|[.,]\d)", re.I)
            for p in alle:
                if p is q:
                    continue
                if filter_ and not (q["id"].startswith(filter_) or p["id"].startswith(filter_)):
                    continue
                if muster.search(sichtbar(p)):
                    treffer += 1
                    print(f"{p['id']:10} zeigt {token!r} – Antwort von {q['id']}: {q['frage'][:60]}")
    print(f"\n{treffer} Treffer – bitte von Hand prüfen, welche echte Lecks sind.")


if __name__ == "__main__":
    main()
