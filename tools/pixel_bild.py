"""Macht aus einem KI-Bild einen sauberen Pixel-Art-Hintergrund für das Quiz.

KI-"Pixel-Art" ist oft unsauber: unterschiedlich große Pixel, verschwommene
Kanten, tausende Farbtöne. Dieses Skript bringt jedes Bild auf
  - ein festes Raster (Standard 640 × 360, wird im Browser scharf vergrößert),
  - eine begrenzte Farbpalette (Standard 48 Farben),
  - eine kleine PNG-Datei in docs/bilder/szenen/<name>.png.

Benutzung (im Projektordner):
    python tools/pixel_bild.py ki-bilder/farm.png farm
    python tools/pixel_bild.py ki-bilder/farm.png farm --breite 480 --farben 32

  --breite   Breite des Pixel-Rasters (Höhe = Breite × 9/16). Kleiner = gröbere Pixel.
  --farben   Anzahl Farben (16–128). Weniger = mehr "Retro".

Das Bild wird vorher mittig auf 16:9 zugeschnitten.
Braucht Pillow (pip install pillow).
"""

import argparse
import re
import sys
from pathlib import Path

try:
    from PIL import Image, ImageEnhance
except ImportError:
    sys.exit("Pillow fehlt: pip install pillow")

ZIEL = Path(__file__).resolve().parent.parent / "docs" / "bilder" / "szenen"


def zuschneiden_16_9(bild):
    """Schneidet mittig auf das Seitenverhältnis 16:9 zu."""
    b, h = bild.size
    if b / h > 16 / 9:
        neue_b = round(h * 16 / 9)
        links = (b - neue_b) // 2
        return bild.crop((links, 0, links + neue_b, h))
    neue_h = round(b * 9 / 16)
    oben = (h - neue_h) // 2
    return bild.crop((0, oben, b, oben + neue_h))


def umwandeln(eingabe, name, breite=640, farben=48):
    if not re.fullmatch(r"[a-z0-9-]{1,40}", name):
        raise ValueError("Name nur aus Kleinbuchstaben, Ziffern und '-' (z. B. farm, das-ist-deutsch)")
    if not 160 <= breite <= 1280:
        raise ValueError("--breite zwischen 160 und 1280")
    if not 16 <= farben <= 128:
        raise ValueError("--farben zwischen 16 und 128")

    with Image.open(eingabe) as original:
        bild = zuschneiden_16_9(original.convert("RGB"))

    # 1. Auf das Pixel-Raster verkleinern. BOX mittelt alle Pixel eines Feldes –
    #    so verschwinden die unsauberen "Fast-Pixel" der KI.
    hoehe = round(breite * 9 / 16)
    bild = bild.resize((breite, hoehe), Image.BOX)

    # 2. Etwas mehr Farbe und Kontrast (Verkleinern macht Bilder flauer)
    bild = ImageEnhance.Color(bild).enhance(1.15)
    bild = ImageEnhance.Contrast(bild).enhance(1.05)

    # 3. Farben begrenzen – ohne Rastern (Dithering), damit Flächen sauber bleiben
    bild = bild.quantize(colors=farben, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)

    ZIEL.mkdir(parents=True, exist_ok=True)
    datei = ZIEL / f"{name}.png"
    bild.save(datei, optimize=True)
    return datei


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description="KI-Bild → sauberer Pixel-Art-Hintergrund")
    p.add_argument("eingabe", help="Pfad zum KI-Bild (PNG/JPG/WEBP)")
    p.add_argument("name", help="Name der Szene, z. B. farm oder raumfahrt")
    p.add_argument("--breite", type=int, default=640)
    p.add_argument("--farben", type=int, default=48)
    a = p.parse_args()

    datei = umwandeln(a.eingabe, a.name, a.breite, a.farben)
    groesse = datei.stat().st_size / 1024
    print(f"Gespeichert: {datei.relative_to(ZIEL.parent.parent.parent)} ({groesse:.0f} KB)")
    if groesse > 300:
        print("Hinweis: über 300 KB – mit weniger --farben oder kleinerer --breite probieren.")


if __name__ == "__main__":
    main()
