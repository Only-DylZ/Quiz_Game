"""avatar_teile.py – Holt die Avatar-Teile (LPC-Figuren) und bereitet sie fürs Spiel auf.

Quelle: Universal LPC Spritesheet Character Generator
        https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator
Die Teile stehen unter freien Lizenzen (CC0, CC-BY, CC-BY-SA, OGA-BY). Das Skript
nimmt nur Teile, bei denen JEDE Quellenangabe mindestens eine dieser Lizenzen hat,
und schreibt alle Urheber nach docs/avatare/CREDITS.txt (Pflicht laut Lizenz).

Was es macht:
  1. Für jedes Teil in AUSWAHL die Beschreibung (sheet_definitions/…json) laden.
  2. Pro Figur (männlich/weiblich) und Ebene die Animationen laden:
     walk (9 Bilder), idle (2), jump (5), emote (3) – je 4 Richtungen.
  3. Die vier Animationen untereinander in EIN Bild packen (576 × 1024):
       Zeilen 0–3 laufen, 4–7 stehen, 8–11 springen, 12–15 jubeln
       (Richtungen je: oben, links, unten, rechts).
  4. docs/avatare/teile.json schreiben: Kategorien, Teile, Farbtabellen.

Starten (im Projektordner, braucht Pillow und Internet):
    python tools/avatar_teile.py

Danach mit `node tools/pruefen.mjs` prüfen. Neue Teile: in AUSWAHL eintragen und
das Skript erneut starten (es lädt dann alles neu).
"""

import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

QUELLE = "https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/"
ZIEL = Path(__file__).resolve().parent.parent / "docs" / "avatare"

# Lizenzen, die wir nutzen dürfen (Namensnennung genügt bzw. gleiche Lizenz weitergeben)
ERLAUBT = {"CC0", "CC-BY 3.0", "CC-BY 4.0", "CC-BY-SA 3.0", "CC-BY-SA 4.0", "OGA-BY 3.0", "OGA-BY 4.0"}

# Animationen: Name → Anzahl Bilder pro Richtung. Reihenfolge = Reihenfolge im fertigen Bild.
ANIMATIONEN = [("walk", 9), ("idle", 2), ("jump", 5), ("emote", 3)]
FELD = 64      # ein Einzelbild ist 64 × 64 Pixel
BREITE = 9 * FELD
HOEHE = 4 * FELD * len(ANIMATIONEN)

FIGUREN = ["male", "female"]

# Farbtabellen (Grundfarbe = die Farbe, in der die Bilder gezeichnet sind)
FARBTABELLEN = {
    "haut": ("palette_definitions/body/body_ulpc.json", "light",
             ["light", "amber", "olive", "taupe", "bronze", "brown", "black", "green", "blue", "lavender"]),
    "haar": ("palette_definitions/hair/hair_ulpc.json", "orange",
             ["black", "dark_brown", "chestnut", "light_brown", "blonde", "platinum", "gray", "redhead",
              "orange", "pink", "purple", "blue", "green"]),
    "stoff": ("palette_definitions/cloth/cloth_ulpc.json", "white",
              ["black", "charcoal", "white", "red", "maroon", "orange", "yellow", "green", "forest",
               "teal", "sky", "blue", "navy", "purple", "pink", "brown", "tan"]),
}
# Welche Farbtabelle zu welchem LPC-Material gehört
MATERIAL = {"body": "haut", "hair": "haar", "cloth": "stoff"}

# Die Auswahl: Kategorie → Liste von (Datei der Beschreibung, deutscher Name, feste Variante)
# feste Variante nur bei Teilen ohne Farbtabelle (z. B. Hüte), sonst None.
AUSWAHL = {
    "figur": [
        ("body/body.json", "Figur", None),
    ],
    "kopf": [
        ("head/heads/human/heads_human_male.json", "Mensch 1", None),
        ("head/heads/human/heads_human_female.json", "Mensch 2", None),
        ("head/heads/human/heads_human_male_plump.json", "Pausbacke", None),
        ("head/heads/human/heads_human_male_elderly.json", "Opa", None),
        ("head/heads/human/heads_human_female_elderly.json", "Oma", None),
        ("head/heads/undead/heads_skeleton.json", "Skelett", None),
        ("head/heads/undead/heads_zombie.json", "Zombie", None),
        ("head/heads/undead/heads_vampire.json", "Vampir", None),
        ("head/heads/undead/heads_frankenstein.json", "Frankenstein", None),
        ("head/heads/undead/heads_jack.json", "Kürbis", None),
        ("head/heads/fantasy/heads_orc_male.json", "Ork", None),
        ("head/heads/fantasy/heads_goblin.json", "Goblin", None),
        ("head/heads/fantasy/heads_troll.json", "Troll", None),
    ],
    "frisur": [
        ("hair/short/hair_messy1.json", "Verwuschelt", None),
        ("hair/short/hair_bedhead.json", "Aufgestanden", None),
        ("hair/short/hair_bangs.json", "Pony", None),
        ("hair/short/hair_curtains.json", "Mittelscheitel", None),
        ("hair/short/hair_pixie.json", "Pixie", None),
        ("hair/short/hair_swoop.json", "Tolle", None),
        ("hair/spiky/hair_spiked.json", "Stacheln", None),
        ("hair/bald/hair_buzzcut.json", "Buzzcut", None),
        ("hair/bald/hair_shorthawk.json", "Irokese", None),
        ("hair/curly/hair_curly_short.json", "Locken", None),
        ("hair/afro/hair_afro.json", "Afro", None),
        ("hair/afro/hair_dreadlocks_short.json", "Dreads", None),
        ("hair/bob/hair_bob.json", "Bob", None),
        ("hair/long/hair_long.json", "Lang", None),
        ("hair/braids/hair_ponytail.json", "Pferdeschwanz", None),
        ("hair/braids/hair_high_ponytail.json", "Hoher Zopf", None),
        ("hair/pigtails/hair_pigtails.json", "Zöpfe", None),
    ],
    "oberteil": [
        ("torso/shirts/shortsleeve/torso_clothes_shortsleeve.json", "T-Shirt", None),
        ("torso/shirts/shortsleeve/torso_clothes_shortsleeve_polo.json", "Polo", None),
        ("torso/shirts/longsleeve/torso_clothes_longsleeve.json", "Langarm", None),
        ("torso/shirts/longsleeve/torso_clothes_longsleeve2_vneck.json", "V-Ausschnitt", None),
        ("torso/shirts/longsleeve/torso_clothes_longsleeve2_cardigan.json", "Strickjacke", None),
        ("torso/shirts/sleeveless/torso_clothes_sleeveless2.json", "Ärmellos", None),
    ],
    "unterteil": [
        ("legs/pants/legs_pants.json", "Hose", None),
        ("legs/pants/legs_cuffed.json", "Krempelhose", None),
        ("legs/shorts/legs_shorts.json", "Shorts", None),
        ("legs/shorts/legs_shorts_short.json", "Hotpants", None),
        ("legs/skirts/legs_skirts_plain.json", "Rock", None),
    ],
    "schuhe": [
        ("feet/shoes/feet_shoes_basic.json", "Schuhe", None),
        ("feet/shoes/feet_shoes_sara.json", "Ballerinas", None),
        ("feet/boots/feet_boots_basic.json", "Stiefel", None),
    ],
    "hut": [
        ("headwear/hats/caps/hat_cap_leather.json", "Kappe", "red"),
        ("headwear/hats/formal/hat_formal_tophat.json", "Zylinder", None),
        ("headwear/hats/formal/hat_formal_bowler.json", "Melone", None),
        ("headwear/hats/formal/hat_formal_crown.json", "Krone", None),
        ("headwear/hats/magic/hat_magic_wizard.json", "Zauberhut", None),
        ("headwear/hats/holiday/hat_holiday_christmas.json", "Weihnachtsmütze", None),
        ("headwear/coverings/bandana/hat_bandana.json", "Bandana", None),
    ],
    "brille": [
        ("headwear/accessories/glasses/facial_glasses_sunglasses.json", "Sonnenbrille", None),
        ("headwear/accessories/glasses/facial_glasses_shades.json", "Shades", None),
        ("headwear/accessories/glasses/facial_glasses_nerd.json", "Nerdbrille", None),
        ("headwear/accessories/glasses/facial_glasses_round.json", "Runde Brille", None),
        ("headwear/accessories/eyepatch/facial_eyepatch_left.json", "Augenklappe", None),
    ],
}

# Deutsche Namen der Kategorien (in dieser Reihenfolge erscheinen sie beim Beitreten)
KATEGORIE_NAMEN = {
    "figur": "Figur", "kopf": "Kopf", "frisur": "Frisur", "oberteil": "Oberteil",
    "unterteil": "Unterteil", "schuhe": "Schuhe", "hut": "Hut", "brille": "Brille",
}
# Welche Farbtabellen pro Kategorie Sinn ergeben (Haut nur für Figur und Kopf …)
PASSENDE_FARBEN = {
    "figur": {"haut"}, "kopf": {"haut"}, "frisur": {"haar"}, "oberteil": {"stoff"},
    "unterteil": {"stoff"}, "schuhe": {"stoff"}, "hut": {"stoff"}, "brille": set(),
}
# Kategorien, bei denen man auch "nichts" wählen kann
FREIWILLIG = {"frisur", "hut", "brille"}


def laden(pfad):
    """Lädt eine Datei aus dem LPC-Repo. Gibt None zurück, wenn es sie nicht gibt."""
    try:
        with urllib.request.urlopen(QUELLE + pfad, timeout=30) as antwort:
            return antwort.read()
    except urllib.error.HTTPError as fehler:
        if fehler.code == 404:
            return None
        raise


def json_laden(pfad):
    daten = laden(pfad)
    if daten is None:
        raise SystemExit("Fehlt im LPC-Repo: " + pfad)
    return json.loads(daten.decode("utf-8"))


def lizenz_ok(beschreibung):
    """Jede Quellenangabe muss mindestens eine erlaubte Lizenz haben."""
    credits = beschreibung.get("credits", [])
    return bool(credits) and all(set(c.get("licenses", [])) & ERLAUBT for c in credits)


def farbtabelle_von(beschreibung):
    """Welche unserer Farbtabellen (haut/haar/stoff) passt zum Teil? None = feste Farbe."""
    umfaerben = beschreibung.get("recolors")
    if not umfaerben:
        # Körper und manche Köpfe: "wie die Hautfarbe"
        return "haut" if beschreibung.get("match_body_color") else None
    material = umfaerben.get("material") or umfaerben.get("color_1", {}).get("material")
    return MATERIAL.get(material)


def bild_laden(pfad):
    daten = laden(pfad)
    if daten is None:
        return None
    # Über Pillow neu einlesen – so landen nur echte Bilddaten im Repo
    return Image.open(io.BytesIO(daten)).convert("RGBA")


def blatt_bauen(ordner, variante):
    """Packt walk/idle/jump/emote eines Teils untereinander in ein Bild.
    Fehlt eine Animation, steht dort das erste Laufbild (besser als ein Loch)."""
    blatt = Image.new("RGBA", (BREITE, HOEHE), (0, 0, 0, 0))
    bilder = {}
    for name, _ in ANIMATIONEN:
        pfad = "spritesheets/" + ordner + name + ("/" + variante if variante else "") + ".png"
        bilder[name] = bild_laden(pfad)
    if bilder["walk"] is None:
        return None, []

    fehlend = []
    y = 0
    for name, anzahl in ANIMATIONEN:
        bild = bilder[name]
        for richtung in range(4):
            for i in range(anzahl):
                if bild is not None and bild.width >= (i + 1) * FELD and bild.height >= 4 * FELD:
                    feld = bild.crop((i * FELD, richtung * FELD, (i + 1) * FELD, (richtung + 1) * FELD))
                else:
                    feld = bilder["walk"].crop((0, richtung * FELD, FELD, (richtung + 1) * FELD))
                blatt.paste(feld, (i * FELD, y + richtung * FELD))
        if bild is None:
            fehlend.append(name)
        y += 4 * FELD
    return blatt, fehlend


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # Umlaute auch in der Windows-Konsole
    ZIEL.mkdir(parents=True, exist_ok=True)
    gespeichert = {}  # LPC-Ordner+Variante → unser Dateiname (gleiche Bilder nur einmal)
    credits = []
    kategorien = []

    for kategorie, eintraege in AUSWAHL.items():
        teile = []
        for definition, name, variante in eintraege:
            beschreibung = json_laden("sheet_definitions/" + definition)
            if not lizenz_ok(beschreibung):
                print("  übersprungen (Lizenz):", definition)
                continue

            ebenen = []
            for schluessel, ebene in sorted(beschreibung.items()):
                if not schluessel.startswith("layer_"):
                    continue
                eintrag = {"z": ebene.get("zPos", 0)}
                for figur in FIGUREN:
                    ordner = ebene.get(figur)
                    if not ordner:
                        continue
                    kennung = ordner + (variante or "")
                    if kennung not in gespeichert:
                        blatt, fehlend = blatt_bauen(ordner, variante)
                        if blatt is None:
                            continue
                        datei = kategorie + "/" + kennung.strip("/").replace("/", "_") + ".png"
                        (ZIEL / kategorie).mkdir(exist_ok=True)
                        blatt.save(ZIEL / datei, optimize=True)
                        gespeichert[kennung] = datei
                        if fehlend:
                            print("  Hinweis:", name, figur, "ohne", ", ".join(fehlend))
                    eintrag[figur] = gespeichert[kennung]
                if any(f in eintrag for f in FIGUREN):
                    ebenen.append(eintrag)

            if not ebenen:
                print("  übersprungen (keine Bilder):", definition)
                continue
            farbe = farbtabelle_von(beschreibung)
            if farbe not in PASSENDE_FARBEN[kategorie]:
                farbe = None  # z. B. Skelett-Kopf: eigene Farben behalten
            teile.append({"name": name, "farbe": farbe, "ebenen": ebenen})
            for c in beschreibung.get("credits", []):
                credits.append((name, c))
            print("  ok", kategorie, "–", name)

        kategorien.append({
            "id": kategorie,
            "name": KATEGORIE_NAMEN[kategorie],
            "freiwillig": kategorie in FREIWILLIG,
            "teile": teile,
        })

    # Farbtabellen: nur die gewählten Farben, Grundfarbe als "quelle"
    farben = {}
    for name, (pfad, grund, auswahl) in FARBTABELLEN.items():
        tabelle = json_laden(pfad)
        farben[name] = {
            "quelle": tabelle[grund],
            "varianten": [{"name": v, "farben": tabelle[v]} for v in auswahl if v in tabelle],
        }

    teile_json = {
        "hinweis": "Erzeugt von tools/avatar_teile.py – nicht von Hand ändern.",
        "feld": FELD,
        "animationen": [{"name": n, "bilder": a, "zeile": i * 4} for i, (n, a) in enumerate(ANIMATIONEN)],
        "figuren": FIGUREN,
        "farben": farben,
        "kategorien": kategorien,
    }
    (ZIEL / "teile.json").write_text(json.dumps(teile_json, ensure_ascii=False, indent=1), encoding="utf-8")

    # Urheber und Lizenzen (Pflicht bei CC-BY / CC-BY-SA / OGA-BY)
    zeilen = [
        "Avatar-Grafiken: Liberated Pixel Cup (LPC) und Nachfolger",
        "über den Universal LPC Spritesheet Character Generator",
        "https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator",
        "Für die Avatar-Bilder in diesem Ordner gilt die Lizenz CC-BY-SA 3.0 (bzw. die unten genannten).",
        "",
    ]
    schon = set()
    for name, c in credits:
        schluessel = c.get("file", "")
        if schluessel in schon:
            continue
        schon.add(schluessel)
        zeilen += [
            name + " (" + schluessel + ")",
            "  Urheber: " + ", ".join(c.get("authors", [])),
            "  Lizenzen: " + ", ".join(c.get("licenses", [])),
            "  Quellen: " + " ".join(c.get("urls", [])),
            "",
        ]
    (ZIEL / "CREDITS.txt").write_text("\n".join(zeilen), encoding="utf-8")

    groesse = sum(p.stat().st_size for p in ZIEL.rglob("*.png"))
    print("\nFertig:", len(gespeichert), "Bilder,", round(groesse / 1024), "KB →", ZIEL)


if __name__ == "__main__":
    sys.exit(main())
