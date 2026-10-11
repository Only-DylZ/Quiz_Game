"""Prüft Fragenpakete (docs/packs/*.json) auf das richtige Format.

Die Regeln stehen in CLAUDE.md, Abschnitt 4, und sind dieselben wie in den
pruefeFrage-Funktionen der Website (docs/engine/*.js). Ändert sich dort etwas,
muss es auch hier geändert werden.

Benutzung (im Projektordner):
    python tools/validate.py                         alle Pakete in docs/packs/ prüfen
    python tools/validate.py docs/packs/kunst.json   nur dieses Paket prüfen
    python tools/validate.py --links                 zusätzlich alle Quellen-Links aufrufen

Ergebnis:
    FEHLER  – das Paket ist so nicht spielbar und muss korrigiert werden.
    Hinweis – spielbar, aber besser nachsehen (z. B. fehlender Link).
Gibt es mindestens einen FEHLER, endet das Programm mit Exit-Code 1.

Braucht nur Python 3 – keine zusätzlichen Pakete.
"""

import json
import math
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

# Ordner mit den Paketen (relativ zu dieser Datei, damit es von überall klappt)
PAKET_ORDNER = Path(__file__).resolve().parent.parent / "docs" / "packs"

# Pool: so viele Fragen pro Modus braucht eine Runde mindestens (wie MIX in
# docs/engine/runde.js). Das Ziel pro Thema sind ZIEL_POOL Fragen.
MIX = {"auswahl": 4, "schaetzen": 3, "grafik": 2, "reihenfolge": 1}
FRAGEN_PRO_RUNDE = 10
ZIEL_POOL = 150
ZIEL_STECHFRAGEN = 5
MODI = ("auswahl", "schaetzen", "grafik", "reihenfolge")
GRAFIK_ARTEN = ("balken", "zeitleiste", "karte")
MAX_BALKEN = 8
MAX_EREIGNISSE = 8

# Erlaubte Felder – alles andere ist vermutlich ein Tippfehler (z. B. "loesungen")
PAKET_FELDER = {"thema", "version", "beschreibung", "fragen", "stechfragen"}
FRAGE_FELDER = {
    "id", "modus", "frage", "loesung", "quelle", "zeit", "erklaerung",
    "optionen", "einheit", "art", "daten", "bild", "oben", "unten", "werte",
}

# Bilder: liegen in docs/bilder/ und heißen wie die Frage (z. B. bilder/dd-017.jpg),
# damit der Dateiname die Lösung nicht verrät. Gleiche Regel wie in hilfen.js.
DOCS_ORDNER = PAKET_ORDNER.parent
BILD_MUSTER = re.compile(r"^bilder/[a-z0-9-]{1,40}\.(jpg|png|webp|svg)$")
MAX_BILD_KB = 300

# Grenzen für gut lesbare Texte (nur Hinweise, keine Fehler)
MAX_FRAGETEXT = 200
MAX_OPTIONSTEXT = 60


# ---------------------------------------------------------------------------
# Kleine Hilfen für Typen
# ---------------------------------------------------------------------------
# Achtung Python: True/False zählen als Zahl (True == 1). In JSON sind das aber
# keine Zahlen – deshalb schließen wir bool hier ausdrücklich aus.

def ist_zahl(wert):
    """Echte, endliche Zahl (int oder float, kein bool, kein NaN/unendlich)."""
    return isinstance(wert, (int, float)) and not isinstance(wert, bool) and math.isfinite(wert)


def ist_ganzzahl(wert):
    """Ganze Zahl wie in JavaScript Number.isInteger (auch 3.0 zählt)."""
    return ist_zahl(wert) and float(wert).is_integer()


def ist_text(wert):
    """Nicht-leerer Text."""
    return isinstance(wert, str) and wert.strip() != ""


def ist_ort(wert):
    """Ort { "lat": …, "lng": … } mit gültigen Koordinaten."""
    return (
        isinstance(wert, dict)
        and ist_zahl(wert.get("lat")) and -90 <= wert["lat"] <= 90
        and ist_zahl(wert.get("lng")) and -180 <= wert["lng"] <= 180
    )


# ---------------------------------------------------------------------------
# Prüfbericht: sammelt Fehler und Hinweise
# ---------------------------------------------------------------------------

class Bericht:
    def __init__(self):
        self.fehler = []
        self.hinweise = []

    def fehler_bei(self, ort, text):
        self.fehler.append(f"{ort}: {text}")

    def hinweis_bei(self, ort, text):
        self.hinweise.append(f"{ort}: {text}")


# ---------------------------------------------------------------------------
# Prüfregeln
# ---------------------------------------------------------------------------

def pruefe_paket(paket, bericht):
    """Prüft die oberste Ebene und ruft für jede Frage pruefe_frage auf."""
    if not isinstance(paket, dict):
        bericht.fehler_bei("Paket", "muss ein JSON-Objekt { … } sein")
        return

    if not ist_text(paket.get("thema")):
        bericht.fehler_bei("Paket", '"thema" fehlt oder ist leer')
    if paket.get("version") != 1:
        bericht.fehler_bei("Paket", '"version" muss 1 sein')
    if "beschreibung" in paket and not isinstance(paket["beschreibung"], str):
        bericht.fehler_bei("Paket", '"beschreibung" muss Text sein')
    for feld in sorted(set(paket) - PAKET_FELDER):
        bericht.hinweis_bei("Paket", f'unbekanntes Feld "{feld}" (Tippfehler?)')

    # Fragen-Pool: mindestens eine Runde; fehlt ein Modus, füllt das Spiel mit
    # anderen auf (deshalb dort nur ein Hinweis)
    fragen = paket.get("fragen")
    if not isinstance(fragen, list):
        bericht.fehler_bei("Paket", '"fragen" fehlt oder ist keine Liste')
        fragen = []
    if len(fragen) < FRAGEN_PRO_RUNDE:
        bericht.fehler_bei("Paket", f"braucht mindestens {FRAGEN_PRO_RUNDE} Fragen, hat {len(fragen)}")
    for modus, mindestens in MIX.items():
        anzahl = sum(1 for f in fragen if isinstance(f, dict) and f.get("modus") == modus)
        if anzahl < mindestens:
            bericht.hinweis_bei("Paket", f'nur {anzahl} Fragen im Modus "{modus}" (pro Runde vorgesehen: {mindestens})')
    if 0 < len(fragen) < ZIEL_POOL:
        bericht.hinweis_bei("Paket", f"Pool hat {len(fragen)} Fragen (Ziel: {ZIEL_POOL})")

    for nummer, frage in enumerate(fragen, start=1):
        pruefe_frage(frage, f"Frage {nummer}{id_text(frage)}", bericht)

    # Stechfragen: Liste mit mindestens einer Frage, immer "schaetzen"
    stechfragen = paket.get("stechfragen")
    if not (isinstance(stechfragen, list) and stechfragen):
        bericht.fehler_bei("Paket", '"stechfragen" fehlt oder ist leer (Liste mit Schätzfragen für Gleichstand)')
        stechfragen = []
    elif len(stechfragen) < ZIEL_STECHFRAGEN:
        bericht.hinweis_bei("Paket", f"nur {len(stechfragen)} Stechfragen (Ziel: {ZIEL_STECHFRAGEN})")
    for nummer, stechfrage in enumerate(stechfragen, start=1):
        ort = f"Stechfrage {nummer}{id_text(stechfrage)}"
        if isinstance(stechfrage, dict) and stechfrage.get("modus") != "schaetzen":
            bericht.fehler_bei(ort, 'muss Modus "schaetzen" haben')
        pruefe_frage(stechfrage, ort, bericht)

    # Jede Frage braucht eine eindeutige id (das Spiel merkt sich damit,
    # welche Fragen schon gespielt wurden). Gleiche Fragetexte = Doppelung
    # (außer bei Bildfragen mit verschiedenen Bildern).
    gesehen_ids = set()
    gesehen_texte = {}
    for nummer, frage in enumerate(fragen + stechfragen, start=1):
        if not isinstance(frage, dict):
            continue
        fid = frage.get("id")
        if fid in gesehen_ids:
            bericht.fehler_bei("Paket", f'id "{fid}" kommt mehrfach vor')
        elif isinstance(fid, str):
            gesehen_ids.add(fid)
        text = frage.get("frage")
        if isinstance(text, str):
            schluessel = " ".join(text.lower().split())
            # Bildfragen dürfen denselben Text haben ("Zu welchem Land gehört diese
            # Flagge?") – dort zählt Text + Bild zusammen
            if isinstance(frage.get("bild"), dict):
                schluessel += " | " + str(frage["bild"].get("datei"))
            if schluessel in gesehen_texte:
                bericht.fehler_bei("Paket", f'Frage "{text[:40]}…" kommt doppelt vor ({gesehen_texte[schluessel]} und {fid})')
            else:
                gesehen_texte[schluessel] = fid


def id_text(frage):
    """' (rf-01)' für Meldungen, falls die Frage eine id hat."""
    if isinstance(frage, dict) and isinstance(frage.get("id"), str):
        return f" ({frage['id']})"
    return ""


def pruefe_frage(frage, ort, bericht):
    """Gemeinsame Pflichtfelder + Regeln des jeweiligen Modus."""
    if not isinstance(frage, dict):
        bericht.fehler_bei(ort, "muss ein JSON-Objekt { … } sein")
        return

    # --- Gemeinsame Felder ---
    if not ist_text(frage.get("frage")):
        bericht.fehler_bei(ort, '"frage" (Fragetext) fehlt oder ist leer')
    elif len(frage["frage"]) > MAX_FRAGETEXT:
        bericht.hinweis_bei(ort, f"Fragetext ist sehr lang ({len(frage['frage'])} Zeichen)")

    if not ist_text(frage.get("id")):
        bericht.fehler_bei(ort, '"id" fehlt (Pflicht, z. B. "rf-01")')
    if "zeit" in frage and not (ist_ganzzahl(frage["zeit"]) and 5 <= frage["zeit"] <= 120):
        bericht.fehler_bei(ort, '"zeit" muss eine ganze Zahl von 5 bis 120 (Sekunden) sein')
    if "erklaerung" in frage and not isinstance(frage["erklaerung"], str):
        bericht.fehler_bei(ort, '"erklaerung" muss Text sein')
    for feld in sorted(set(frage) - FRAGE_FELDER):
        bericht.hinweis_bei(ort, f'unbekanntes Feld "{feld}" (Tippfehler?)')

    pruefe_quelle(frage.get("quelle"), ort, bericht)
    if "bild" in frage:
        pruefe_bild(frage, ort, bericht)

    # --- Modus ---
    modus = frage.get("modus")
    if modus not in MODI:
        bericht.fehler_bei(ort, f'"modus" muss einer von {", ".join(MODI)} sein, ist aber {modus!r}')
        return
    if "loesung" not in frage:
        bericht.fehler_bei(ort, '"loesung" fehlt')
        return

    if modus == "auswahl":
        pruefe_auswahl(frage, ort, bericht)
    elif modus == "reihenfolge":
        pruefe_reihenfolge(frage, ort, bericht)
    elif modus == "schaetzen":
        pruefe_schaetzen(frage, ort, bericht)
    else:
        pruefe_grafik(frage, ort, bericht)


def pruefe_quelle(quelle, ort, bericht):
    if not isinstance(quelle, dict) or not ist_text(quelle.get("titel")):
        bericht.fehler_bei(ort, '"quelle" braucht mindestens einen "titel"')
        return
    url = quelle.get("url")
    if url is None:
        bericht.hinweis_bei(ort, "Quelle hat keinen Link (url) – empfohlen")
    elif not isinstance(url, str) or not url.startswith(("https://", "http://")):
        bericht.fehler_bei(ort, 'Quellen-Link muss mit "https://" beginnen')
    elif url.startswith("http://"):
        bericht.hinweis_bei(ort, 'Quellen-Link sollte "https://" statt "http://" nutzen')


def pruefe_bild(frage, ort, bericht):
    """Bild zur Frage: neutraler Dateiname, Datei vorhanden, Lizenzangaben."""
    bild = frage["bild"]
    if not isinstance(bild, dict):
        bericht.fehler_bei(ort, '"bild" muss ein Objekt sein: { "datei", "urheber", "lizenz", "quelle" }')
        return
    datei = bild.get("datei")
    if not (isinstance(datei, str) and BILD_MUSTER.match(datei)):
        bericht.fehler_bei(ort, 'bild."datei" muss so aussehen: "bilder/<id>.jpg" (jpg, png, webp oder svg)')
        return
    endung = datei.rsplit(".", 1)[1]
    if datei != f"bilder/{frage.get('id')}.{endung}":
        bericht.fehler_bei(ort, f'Bild muss wie die Frage heißen: "bilder/{frage.get("id")}.{endung}" '
                                f'(ein sprechender Name würde die Lösung verraten)')
    pfad = DOCS_ORDNER / datei
    if not pfad.is_file():
        bericht.fehler_bei(ort, f'Bilddatei "docs/{datei}" gibt es nicht')
    elif pfad.stat().st_size > MAX_BILD_KB * 1024:
        bericht.hinweis_bei(ort, f"Bild ist groß ({pfad.stat().st_size // 1024} KB) – lädt auf dem Handy langsam")
    if not ist_text(bild.get("urheber")):
        bericht.fehler_bei(ort, 'bild."urheber" fehlt (Lizenzen verlangen die Namensnennung)')
    if not ist_text(bild.get("lizenz")):
        bericht.fehler_bei(ort, 'bild."lizenz" fehlt, z. B. "gemeinfrei" oder "CC BY-SA 4.0"')
    quelle = bild.get("quelle")
    if not (isinstance(quelle, dict) and ist_text(quelle.get("titel"))
            and isinstance(quelle.get("url"), str) and quelle["url"].startswith("https://")):
        bericht.fehler_bei(ort, 'bild."quelle" braucht "titel" und "url" (https://) – woher das Bild stammt')


def pruefe_auswahl(frage, ort, bericht):
    optionen = frage.get("optionen")
    if not (isinstance(optionen, list) and 2 <= len(optionen) <= 4):
        bericht.fehler_bei(ort, '"optionen" muss eine Liste mit 2 bis 4 Antworten sein')
        return
    if not all(ist_text(o) for o in optionen):
        bericht.fehler_bei(ort, "jede Option muss ein nicht-leerer Text sein")
        return
    if len(set(optionen)) != len(optionen):
        bericht.fehler_bei(ort, "zwei Optionen sind gleich")
    for option in optionen:
        if len(option) > MAX_OPTIONSTEXT:
            bericht.hinweis_bei(ort, f'Option "{option[:20]}…" ist sehr lang ({len(option)} Zeichen)')

    loesung = frage["loesung"]
    if not (ist_ganzzahl(loesung) and 0 <= loesung < len(optionen)):
        bericht.fehler_bei(
            ort, f'"loesung" muss die Nummer einer Option sein (0 bis {len(optionen) - 1}), ist aber {loesung!r}'
        )


def alphabetisch(liste):
    """Ungefähr wie localeCompare("de") im Browser: Groß/klein egal, Ä wie A usw."""
    ersatz = str.maketrans({"ä": "a", "ö": "o", "ü": "u", "ß": "ss"})
    return sorted(liste, key=lambda t: t.casefold().translate(ersatz))


def pruefe_reihenfolge(frage, ort, bericht):
    loesung = frage["loesung"]
    if not (isinstance(loesung, list) and 3 <= len(loesung) <= 6):
        bericht.fehler_bei(ort, '"loesung" muss eine Liste mit 3 bis 6 Elementen in richtiger Reihenfolge sein')
        return
    if not all(ist_text(e) and len(e) <= 40 for e in loesung):
        bericht.fehler_bei(ort, "jedes Element muss ein Text mit höchstens 40 Zeichen sein")
        return
    if len(set(loesung)) != len(loesung):
        bericht.fehler_bei(ort, "zwei Elemente sind gleich")
    if alphabetisch(loesung) == loesung:
        bericht.fehler_bei(ort, "alphabetisch sortiert ist schon die Lösung – die Handys würden sie sehen! "
                                '"oben"/"unten" tauschen und die Liste umdrehen')
    for feld in ("oben", "unten"):
        if feld in frage and not (isinstance(frage[feld], str) and len(frage[feld]) <= 40):
            bericht.fehler_bei(ort, f'"{feld}" muss ein Text mit höchstens 40 Zeichen sein')
    if "oben" not in frage or "unten" not in frage:
        bericht.hinweis_bei(ort, '"oben" und "unten" (z. B. "höchster"/"niedrigster") helfen beim Sortieren')
    if "werte" in frage:
        werte = frage["werte"]
        if not (isinstance(werte, list) and len(werte) == len(loesung) and all(isinstance(w, str) for w in werte)):
            bericht.fehler_bei(ort, '"werte" muss eine Liste mit einem Text pro Element sein, z. B. "8849 m"')


def pruefe_schaetzen(frage, ort, bericht):
    if not isinstance(frage.get("einheit"), str):
        bericht.fehler_bei(ort, '"einheit" fehlt (leerer Text "" bei reinen Anzahlen)')
    if not ist_zahl(frage["loesung"]):
        bericht.fehler_bei(ort, f'"loesung" muss eine Zahl sein, ist aber {frage["loesung"]!r}')
    elif frage["loesung"] == 0:
        bericht.hinweis_bei(ort, "Lösung 0: nur eine exakt richtige Schätzung bekommt Punkte")


def pruefe_grafik(frage, ort, bericht):
    art = frage.get("art")
    if art not in GRAFIK_ARTEN:
        bericht.fehler_bei(ort, f'"art" muss einer von {", ".join(GRAFIK_ARTEN)} sein, ist aber {art!r}')
        return
    daten = frage.get("daten")
    if not isinstance(daten, dict):
        bericht.fehler_bei(ort, '"daten" fehlt oder ist kein Objekt')
        return

    loesung = frage["loesung"]

    if art == "balken":
        if not isinstance(daten.get("einheit"), str):
            bericht.fehler_bei(ort, 'daten."einheit" fehlt (leerer Text "" erlaubt)')
        balken = daten.get("balken")
        if not (isinstance(balken, list) and 2 <= len(balken) <= MAX_BALKEN):
            bericht.fehler_bei(ort, f'daten."balken" muss eine Liste mit 2 bis {MAX_BALKEN} Balken sein')
            return
        for b in balken:
            if not (isinstance(b, dict) and ist_text(b.get("name"))):
                bericht.fehler_bei(ort, 'jeder Balken braucht einen "name"')
                return
            if b.get("wert") is not None and not (ist_zahl(b.get("wert")) and b["wert"] >= 0):
                bericht.fehler_bei(ort, f'Balken "{b["name"]}": "wert" muss eine Zahl ab 0 oder null sein')
        offen = [b for b in balken if b.get("wert") is None]
        if len(offen) != 1:
            bericht.fehler_bei(ort, f'genau ein Balken braucht "wert": null (gefunden: {len(offen)})')
        if not (ist_zahl(loesung) and loesung >= 0):
            bericht.fehler_bei(ort, f'"loesung" muss eine Zahl ab 0 sein, ist aber {loesung!r}')

    elif art == "zeitleiste":
        von, bis = daten.get("von"), daten.get("bis")
        if not (ist_ganzzahl(von) and ist_ganzzahl(bis) and von < bis):
            bericht.fehler_bei(ort, 'daten."von" und "bis" müssen ganze Jahre sein, "von" kleiner als "bis"')
            return
        ereignisse = daten.get("ereignisse")
        if not (isinstance(ereignisse, list) and len(ereignisse) <= MAX_EREIGNISSE):
            bericht.fehler_bei(ort, f'daten."ereignisse" muss eine Liste mit höchstens {MAX_EREIGNISSE} Einträgen sein')
            return
        for e in ereignisse:
            if not (isinstance(e, dict) and ist_text(e.get("name"))
                    and ist_ganzzahl(e.get("jahr")) and von <= e["jahr"] <= bis):
                bericht.fehler_bei(ort, f'jedes Ereignis braucht "name" und ein "jahr" zwischen {von} und {bis}')
                return
        if not (ist_ganzzahl(loesung) and von <= loesung <= bis):
            bericht.fehler_bei(ort, f'"loesung" muss ein Jahr zwischen {von} und {bis} sein, ist aber {loesung!r}')
        elif any(e["jahr"] == loesung for e in ereignisse):
            # Kein harter Fehler – es kann zufällig ein anderes Ereignis im selben Jahr geben
            bericht.hinweis_bei(ort, f"ein Hilfsereignis hat genau das Lösungsjahr {loesung} – verrät es die Antwort?")
        if len(ereignisse) < 2:
            bericht.hinweis_bei(ort, "weniger als 2 Hilfsereignisse – die Zeitleiste ist schwer einzuschätzen")

    else:  # karte
        mitte = daten.get("mitte")
        if not (isinstance(mitte, list) and len(mitte) == 2 and ist_ort({"lat": mitte[0], "lng": mitte[1]})):
            bericht.fehler_bei(ort, 'daten."mitte" muss [Breite, Länge] sein, z. B. [50, 10]')
        zoom = daten.get("zoom")
        if not (ist_ganzzahl(zoom) and 1 <= zoom <= 8):
            bericht.fehler_bei(ort, 'daten."zoom" muss eine ganze Zahl von 1 bis 8 sein')
        if not ist_ort(loesung):
            bericht.fehler_bei(ort, '"loesung" muss { "lat": Breite, "lng": Länge } sein (lat −90…90, lng −180…180)')


# ---------------------------------------------------------------------------
# Links prüfen (nur mit --links)
# ---------------------------------------------------------------------------

def pruefe_links(paket, bericht):
    """Ruft jeden Quellen-Link auf. Findet erfundene oder kaputte Links."""
    fragen = paket.get("fragen") if isinstance(paket.get("fragen"), list) else []
    stechfragen = paket.get("stechfragen") if isinstance(paket.get("stechfragen"), list) else []
    alle = [(f"Frage {n}{id_text(f)}", f) for n, f in enumerate(fragen, start=1)]
    alle += [(f"Stechfrage {n}{id_text(f)}", f) for n, f in enumerate(stechfragen, start=1)]

    for ort, frage in alle:
        quelle = frage.get("quelle") if isinstance(frage, dict) else None
        url = quelle.get("url") if isinstance(quelle, dict) else None
        if not (isinstance(url, str) and url.startswith("https://")):
            continue
        # Sonderzeichen (z. B. "í" in Reykjavík) für die Anfrage umwandeln
        sichere_url = urllib.parse.quote(url, safe=":/?#[]@!$&'()*+,;=%")
        anfrage = urllib.request.Request(sichere_url, headers={"User-Agent": "Quiz-Abend-Paketpruefer/1.0"})
        try:
            with urllib.request.urlopen(anfrage, timeout=10) as antwort:
                if antwort.status >= 400:
                    bericht.hinweis_bei(ort, f"Link antwortet mit Status {antwort.status}: {url}")
        except Exception as fehler:  # noqa: BLE001 – jede Art von Fehler nur melden
            bericht.hinweis_bei(ort, f"Link nicht erreichbar ({fehler}): {url}")


# ---------------------------------------------------------------------------
# Paketliste index.json
# ---------------------------------------------------------------------------

def pruefe_index(bericht):
    """Steht jedes Paket in index.json, und gibt es jede dort genannte Datei?"""
    index_datei = PAKET_ORDNER / "index.json"
    try:
        index = json.loads(index_datei.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as fehler:
        bericht.fehler_bei("index.json", f"kann nicht gelesen werden ({fehler})")
        return

    eintraege = index.get("pakete") if isinstance(index, dict) else None
    if not isinstance(eintraege, list):
        bericht.fehler_bei("index.json", '"pakete" muss eine Liste sein')
        return

    genannt = set()
    for eintrag in eintraege:
        datei = eintrag.get("datei") if isinstance(eintrag, dict) else None
        if not (isinstance(datei, str) and datei.endswith(".json") and "/" not in datei and "\\" not in datei):
            bericht.fehler_bei("index.json", f'ungültiger Eintrag {eintrag!r} (braucht "datei": "name.json")')
            continue
        genannt.add(datei)
        if not (PAKET_ORDNER / datei).is_file():
            bericht.fehler_bei("index.json", f'Datei "{datei}" gibt es nicht')
        if not ist_text(eintrag.get("thema")):
            bericht.fehler_bei("index.json", f'Eintrag "{datei}" braucht ein "thema"')

    for datei in sorted(p.name for p in PAKET_ORDNER.glob("*.json")):
        if datei != "index.json" and datei not in genannt:
            bericht.hinweis_bei("index.json", f'"{datei}" fehlt in der Liste – im Spiel nicht auswählbar')


# ---------------------------------------------------------------------------
# Hauptprogramm
# ---------------------------------------------------------------------------

def pruefe_datei(pfad, links):
    """Prüft eine Paketdatei und gibt den Bericht zurück."""
    bericht = Bericht()
    try:
        paket = json.loads(Path(pfad).read_text(encoding="utf-8"))
    except OSError as fehler:
        bericht.fehler_bei("Datei", f"kann nicht gelesen werden ({fehler})")
        return bericht
    except json.JSONDecodeError as fehler:
        bericht.fehler_bei("Datei", f"ist kein gültiges JSON – Zeile {fehler.lineno}, Spalte {fehler.colno}: {fehler.msg}")
        return bericht

    pruefe_paket(paket, bericht)
    if links and isinstance(paket, dict):
        pruefe_links(paket, bericht)
    return bericht


def ausgeben(name, bericht):
    if not bericht.fehler and not bericht.hinweise:
        print(f"✔ {name}: alles in Ordnung")
        return
    zeichen = "✖" if bericht.fehler else "✔"
    print(f"{zeichen} {name}: {len(bericht.fehler)} Fehler, {len(bericht.hinweise)} Hinweise")
    for text in bericht.fehler:
        print(f"    FEHLER   {text}")
    for text in bericht.hinweise:
        print(f"    Hinweis  {text}")


def main():
    # Windows-Konsole: Umlaute und ✔ sicher ausgeben
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    argumente = sys.argv[1:]
    links = "--links" in argumente
    dateien = [a for a in argumente if a != "--links"]

    alle_pakete = not dateien
    if alle_pakete:
        dateien = sorted(p for p in PAKET_ORDNER.glob("*.json") if p.name != "index.json")

    fehler_gesamt = 0
    for datei in dateien:
        bericht = pruefe_datei(datei, links)
        ausgeben(Path(datei).name, bericht)
        fehler_gesamt += len(bericht.fehler)

    if alle_pakete:
        bericht = Bericht()
        pruefe_index(bericht)
        ausgeben("index.json", bericht)
        fehler_gesamt += len(bericht.fehler)

    print()
    if fehler_gesamt:
        print(f"{fehler_gesamt} Fehler gefunden – bitte korrigieren.")
        sys.exit(1)
    print("Alle Pakete sind spielbar ✔")


if __name__ == "__main__":
    main()
