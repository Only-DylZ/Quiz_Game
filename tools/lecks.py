"""Sucht "Lecks" über alle Fragenpakete: Steht die Antwort einer Frage irgendwo
sichtbar in einer ANDEREN Frage? Fragen verschiedener Themen kommen im selben
Spiel vor, und die Auflösung ist für alle sichtbar – deshalb über alle Pakete.

Geprüft wird alles, was Spieler sehen: Fragetext, Optionen, Balken, Ereignisse
der Zeitleiste, Reihenfolge-Elemente und -Werte, Erklärung und Quellentitel.

Benutzung (im Projektordner):
    python tools/lecks.py               → alle STARKEN Treffer (schwache nur gezählt)
    python tools/lecks.py --neu         → nur Treffer, an denen eine neue Frage
                                          (noch nicht committet) beteiligt ist
    python tools/lecks.py geo-          → nur Treffer, an denen geo-… beteiligt ist
    python tools/lecks.py --alle        → auch schwache Treffer zeigen
    python tools/lecks.py --kontext     → zu jedem Treffer zeigen, wo er steht
                                          (z. B. „Zeitleiste: Mauerfall 1989“)
    python tools/lecks.py --merken      → die angezeigten Treffer als „harmlos“ in
                                          tools/lecks_ok.txt eintragen (erst bewerten!)

Drei Gruppen, eine Zeile pro Antwort („← ids“ = Fragen, in denen sie steht):
STARK  = die Antwort steht sichtbar (Fragetext, Erklärung, Quellentitel, Balken,
         Zeitleiste, Reihenfolge) in einer Frage mit gleichem Stichwort
         (z. B. „Mauerfall 1989“ ↔ „Wann fiel die Mauer?“) → genau prüfen.
ohne Stichwort = sichtbar, aber kein gemeinsames Wort → meist Zufall
         (gleiche Jahreszahl), kurz überfliegen.
schwach = nur als FALSCHE Option einer Auswahlfrage (verrät meist nichts).

Bereits bewertete, harmlose Treffer stehen in tools/lecks_ok.txt und werden nicht
mehr gezeigt (eine Zeile: „<zeigende-id> <antwort-id> <text>  # Grund“).

Achtung: Das ist ein Hinweis-Werkzeug, kein Urteil. Viele Treffer sind harmlos
(eine Jahreszahl ist Zufall). Echte Lecks sind z. B. „Mauerfall 1989“ als
Ereignis auf einer Zeitleiste, wenn eine andere Frage nach dem Jahr des
Mauerfalls fragt. Nur Standardbibliothek.
"""

import re
import sys
from pathlib import Path

from neue_ids import alle_fragen, auswahl_aus_argumenten, auswahl_passt

MERKLISTE = Path(__file__).resolve().parent / "lecks_ok.txt"


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


def kleine_zahl(f):
    """Lösung als Text, wenn sie eine kleine Zahl ist (die antworten() überspringt)."""
    z = f.get("loesung")
    if f["modus"] == "auswahl":
        z = f["optionen"][z]
        return z if z.isdigit() and len(z) <= 2 else None
    if isinstance(z, (int, float)) and not isinstance(z, bool) and abs(z) < 100:
        return str(int(z)) if float(z).is_integer() else str(z).replace(".", ",")
    return None


def sichtbar_teile(f):
    """Alles, was Spieler von dieser Frage sehen (auch nach der Auflösung),
    aufgeteilt in (stark, text): stark=False nur für falsche Auswahl-Optionen."""
    teile = [f["frage"], f.get("erklaerung", ""), f.get("quelle", {}).get("titel", "")]
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

    stark = " | ".join(str(t) for t in teile)
    schwach = ""
    if f["modus"] == "auswahl":
        richtig = f["optionen"][f["loesung"]]
        stark += " | " + richtig  # dieselbe Antwort zweimal → eher doppelte Frage
        schwach = " | ".join(o for i, o in enumerate(f["optionen"]) if i != f["loesung"])
    return stark, schwach


def fundstelle(f, muster):
    """Wo genau steht der Treffer? Z. B. „Zeitleiste: Mauerfall 1989“ (für --kontext)."""
    stellen = [("Frage", f["frage"]), ("Erklärung", f.get("erklaerung", "")),
               ("Quelle", f.get("quelle", {}).get("titel", ""))]
    if f["modus"] == "auswahl":
        stellen.append(("Lösung", f["optionen"][f["loesung"]]))
        stellen += [("falsche Option", o) for i, o in enumerate(f["optionen"]) if i != f["loesung"]]
    if f["modus"] == "reihenfolge":
        werte = f.get("werte") or [""] * len(f["loesung"])
        stellen += [("Reihenfolge", f"{t} {w}".strip()) for t, w in zip(f["loesung"], werte)]
    d = f.get("daten") or {}
    for b in d.get("balken", []):
        wert = "?" if b["wert"] is None else " / ".join(sorted(zahl_texte(b["wert"])))
        stellen.append(("Balken", f"{b['name']} {wert}"))
    for e in d.get("ereignisse", []):
        stellen.append(("Zeitleiste", f"{e['name']} {e['jahr']}"))
    for art, text in stellen:
        if muster.search(str(text)):
            return f"{art}: {str(text)[:70]}"
    return "?"


# Allerweltswörter, die fast jede Frage enthält – zählen nicht als Stichwort
FUELLWOERTER = {
    "welch", "viele", "vielen", "ordne", "liegt", "heißt", "wurde", "wurden", "erste",
    "ersten", "ihrer", "ihrem", "ihren", "einer", "eines", "einem", "einen", "jahre",
    "jahren", "nennt", "steht", "haben", "nicht", "statt", "dieser", "dieses", "diese",
    "durch", "zwisch", "mindes", "ungefä", "etwa", "heute", "gibt", "richti", "folgen",
    "beste", "meiste", "größte", "kleins", "höchst", "länger", "längst", "insges",
    "quelle", "wiki", "wikipe", "welche", "werden", "worden", "seine", "seiner",
    "seinem", "seinen", "unter", "über", "nach", "wieder", "immer", "schon", "damit",
    # kurze Allerweltswörter (4 Buchstaben)
    "jahr", "viel", "wann", "wird", "sind", "eine", "beim", "auch", "noch", "oder",
    "aber", "wenn", "dann", "denn", "sein", "ihre", "erst", "mehr", "sehr", "groß",
    "hoch", "lang", "alle", "jede", "habe", "gibt", "etwa", "heut", "eins", "zwei",
    "drei", "vier", "fünf", "acht", "neun", "zehn", "ganz", "kein", "nach",
}


def stichworte(text):
    """Wortstämme (erste 5 Buchstaben, also „Mauer“ = „Mauerfall“) der Inhaltswörter."""
    worte = re.findall(r"[a-zäöüß]{4,}", str(text).lower())
    ergebnis = set()
    for w in worte:
        if len(w) == 4:
            if w not in FUELLWOERTER:  # „Mond“, „Gold“ – aber nicht „Jahr“
                ergebnis.add(w)
        elif w[:6] not in FUELLWOERTER and w[:5] not in FUELLWOERTER:
            ergebnis.add(w[:5])
    return ergebnis


def gemeinsam(a, b):
    """Haben zwei Stichwort-Mengen etwas gemeinsam? Auch Wortanfänge zählen:
    „mond“ (Mond) passt zu „mondl“ (Mondlandung)."""
    return any(x.startswith(y) or y.startswith(x) for x in a for y in b)


def merkliste_laden():
    """Schlüssel „zeigende-id antwort-id text“ aus lecks_ok.txt."""
    if not MERKLISTE.exists():
        return set()
    schluessel = set()
    for zeile in MERKLISTE.read_text(encoding="utf-8").splitlines():
        zeile = zeile.split("  #", 1)[0].strip()  # Grund steht nach „  #“
        if zeile and not zeile.startswith("#"):
            schluessel.add(zeile)
    return schluessel


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    argumente = sys.argv[1:]
    auswahl = auswahl_aus_argumenten(argumente)
    alle_zeigen = "--alle" in argumente
    merken = "--merken" in argumente
    kontext = "--kontext" in argumente

    alle = [f for _, f in alle_fragen()]
    teile = {id(p): sichtbar_teile(p) for p in alle}
    bekannt = merkliste_laden()

    # Drei Gruppen; jede sammelt pro (Antwort-Frage, Text) die zeigenden ids
    gruppen = {"stark": {}, "zufall": {}, "schwach": {}}
    uebersprungen = 0
    for q in alle:
        q_worte = stichworte(q["frage"])
        for token in antworten(q):
            muster = re.compile(r"(?<![\w.,])" + re.escape(token) + r"(?![\w]|[.,]\d)", re.I)
            for p in alle:
                if p is q:
                    continue
                if not (auswahl_passt(q["id"], auswahl) or auswahl_passt(p["id"], auswahl)):
                    continue
                stark, schwach = teile[id(p)]
                if muster.search(stark):
                    # Gemeinsames Stichwort (außer der Antwort selbst) → wohl kein Zufall
                    p_worte = stichworte(stark) - stichworte(token)
                    art = "stark" if gemeinsam(q_worte, p_worte) else "zufall"
                elif muster.search(schwach):
                    art = "schwach"
                else:
                    continue
                if f"{p['id']} {q['id']} {token}" in bekannt:
                    uebersprungen += 1
                    continue
                stelle = fundstelle(p, muster) if kontext else ""
                gruppen[art].setdefault((q["id"], token, q["frage"]), []).append((p["id"], stelle))

        # Kleine Zahlen (z. B. 8) sind meist Zufall – außer direkt dahinter steht
        # ein Wort aus der Frage: „8 Ecken“ verrät „Wie viele Ecken hat ein Würfel?“
        zahl = kleine_zahl(q)
        if zahl is None:
            continue
        muster = re.compile(r"(?<![\w.,])" + re.escape(zahl) + r"\s+([A-Za-zÄÖÜäöüß]{5,})")
        for p in alle:
            if p is q or not (auswahl_passt(q["id"], auswahl) or auswahl_passt(p["id"], auswahl)):
                continue
            for treffer in muster.finditer(teile[id(p)][0]):
                wort = treffer.group(1)
                if not gemeinsam(stichworte(wort), q_worte):
                    continue
                token = f"{zahl} {wort}"
                if f"{p['id']} {q['id']} {token}" in bekannt:
                    uebersprungen += 1
                    continue
                stelle = fundstelle(p, re.compile(re.escape(token))) if kontext else ""
                gruppen["stark"].setdefault((q["id"], token, q["frage"]), []).append((p["id"], stelle))

    ueberschriften = {
        "stark": "STARK – Antwort steht in einer Frage mit gleichem Stichwort (genau prüfen):",
        "zufall": "Ohne gemeinsames Stichwort – meist Zufall (kurz überfliegen):",
        "schwach": "schwach – nur als falsche Option:",
    }
    zeigen = ["stark", "zufall"] + (["schwach"] if alle_zeigen else [])
    for art in zeigen:
        if gruppen[art]:
            print(ueberschriften[art])
            for (qid, token, frage), zeigende in gruppen[art].items():
                if kontext:
                    print(f"  {qid:10} {token!r} ({frage[:70]})")
                    for pid, stelle in zeigende:
                        print(f"      ← {pid:10} {stelle}")
                else:
                    print(f"  {qid:10} {token!r} ({frage[:55]}) ← {', '.join(p for p, _ in zeigende)}")

    def anzahl(art):
        return sum(len(v) for v in gruppen[art].values())

    print(f"\n{anzahl('stark')} starke, {anzahl('zufall')} ohne Stichwort, {anzahl('schwach')} schwache Treffer"
          + ("" if alle_zeigen or not gruppen["schwach"] else " (schwache zeigen: --alle)")
          + f"; {uebersprungen} schon als harmlos bewertet (lecks_ok.txt).")
    if any(gruppen[art] for art in zeigen):
        print("Bitte von Hand prüfen, welche echte Lecks sind.")

    if merken:
        neu = [f"{p} {qid} {token}" for art in zeigen
               for (qid, token, _), zeigende in gruppen[art].items() for p, _ in zeigende]
        if neu:
            with MERKLISTE.open("a", encoding="utf-8") as datei:
                datei.write("\n".join(neu) + "\n")
            print(f"{len(neu)} Treffer in {MERKLISTE.name} eingetragen.")


if __name__ == "__main__":
    main()
