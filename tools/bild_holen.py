"""Holt ein freies Bild von Wikimedia Commons für eine Bildfrage.

Das Bild wird nach docs/bilder/<frage-id>.jpg (bzw. .png) gespeichert, und das
fertige "bild"-Objekt (mit Urheber und Lizenz aus der Commons-Datenbank) wird
ausgegeben – zum Einfügen ins Paket. Siehe CLAUDE.md, „Bildfragen“.

Benutzung (im Projektordner):
    python tools/bild_holen.py artikel "Okapi" tier-031
        → Hauptbild des deutschen Wikipedia-Artikels "Okapi"
    python tools/bild_holen.py artikel "Shakshouka" essen-032 en
        → Hauptbild des englischen Artikels (falls der deutsche keins hat)
    python tools/bild_holen.py datei "Flag of Nepal.svg" geo-032
        → eine bestimmte Datei von Commons
    python tools/bild_holen.py suchen "Napoleon Tuileries David"
        → Dateinamen auf Commons suchen

Danach das Bild IMMER selbst ansehen: zeigt es das Richtige? Steht Text darauf,
der die Lösung verrät? Ist die Lizenz frei (gemeinfrei, CC0, CC BY, CC BY-SA)?
GFDL-only besser vermeiden (verlangt den ganzen Lizenztext).

Fotos werden auf 800 px verkleinert, wenn Pillow installiert ist
(pip install pillow) – sonst bleiben sie wie geladen.
"""

import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BILDER = Path(__file__).resolve().parent.parent / "docs" / "bilder"
# Wikimedia verlangt einen aussagekräftigen User-Agent
UA = {"User-Agent": "Quiz-Abend-Werkstatt/1.0 (privates Quiz unter Freunden)"}


def laden(url):
    """Lädt eine Adresse – höflich: Pause vor jeder Anfrage, bei 429 länger warten."""
    for versuch in range(5):
        time.sleep(2 + versuch * 10)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as antwort:
                return antwort.read()
        except urllib.error.HTTPError as fehler:
            if fehler.code != 429:  # 429 = "zu viele Anfragen" → warten und nochmal
                raise
    raise RuntimeError("Wikimedia lehnt weiter ab (429). Später nochmal versuchen.")


def ohne_html(text):
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def hauptbild(artikel, sprache="de"):
    """Dateiname des Hauptbilds eines Wikipedia-Artikels."""
    api = (f"https://{sprache}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages"
           "&piprop=name&titles=" + urllib.parse.quote(artikel))
    seite = next(iter(json.loads(laden(api))["query"]["pages"].values()))
    return seite.get("pageimage")


def suchen(begriff, anzahl=8):
    api = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search"
           "&srnamespace=6&srlimit=" + str(anzahl) + "&srsearch=" + urllib.parse.quote(begriff))
    return [t["title"].removeprefix("File:") for t in json.loads(laden(api))["query"]["search"]]


def verkleinern(pfad, max_seite=800, qualitaet=80):
    try:
        from PIL import Image
    except ImportError:
        print("Hinweis: Pillow fehlt – Bild wird nicht verkleinert.")
        return
    with Image.open(pfad) as bild:
        bild = bild.convert("RGB")
        bild.thumbnail((max_seite, max_seite))
        bild.save(pfad, "JPEG", quality=qualitaet, optimize=True)


def holen(commons_datei, frage_id, breite=640):
    """Lädt File:<commons_datei> nach docs/bilder/<frage_id>.<jpg|png>, gibt das bild-Objekt zurück."""
    if not re.fullmatch(r"[a-z0-9-]{1,40}", frage_id):
        raise ValueError("Frage-id nur aus Kleinbuchstaben, Ziffern und '-' (z. B. geo-031)")
    api = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
           f"&iiprop=url|extmetadata&iiurlwidth={breite}&titles=" + urllib.parse.quote("File:" + commons_datei))
    seite = next(iter(json.loads(laden(api))["query"]["pages"].values()))
    info = seite["imageinfo"][0]
    meta = info["extmetadata"]
    urheber = ohne_html(meta.get("Artist", {}).get("value")) or "unbekannt"
    if len(urheber) > 80:
        urheber = urheber[:77] + "…"

    # Grafiken (SVG/PNG) als PNG, Fotos als JPG
    endung = "png" if commons_datei.lower().endswith((".svg", ".png")) else "jpg"
    ziel = BILDER / f"{frage_id}.{endung}"
    BILDER.mkdir(exist_ok=True)
    ziel.write_bytes(laden(info["thumburl"]))
    if endung == "jpg":
        verkleinern(ziel)

    return {
        "datei": f"bilder/{ziel.name}",
        "urheber": urheber,
        "lizenz": ohne_html(meta.get("LicenseShortName", {}).get("value")),
        "quelle": {"titel": "Wikimedia Commons – " + commons_datei, "url": info["descriptionurl"]},
    }


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    a = sys.argv[1:]
    if len(a) >= 2 and a[0] == "suchen":
        print("\n".join(suchen(a[1])))
    elif len(a) >= 3 and a[0] == "datei":
        print(json.dumps(holen(a[1], a[2]), ensure_ascii=False, indent=2))
    elif len(a) >= 3 and a[0] == "artikel":
        name = hauptbild(a[1], a[3] if len(a) > 3 else "de")
        if not name:
            sys.exit("Der Artikel hat kein Hauptbild – anderen Artikel/Sprache probieren oder 'suchen'.")
        print(json.dumps(holen(name, a[2]), ensure_ascii=False, indent=2))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
