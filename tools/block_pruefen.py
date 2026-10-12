"""Prüft einen neuen Fragen-Block mit einem einzigen Befehl.

„Neu“ heißt: noch nicht committet. Deshalb nach jedem fertigen Block committen –
sonst prüft der nächste Block die alten Fragen noch einmal mit.

Benutzung (im Projektordner):
    python tools/block_pruefen.py docs/packs/sport.json

Führt nacheinander aus:
    1. validate.py <datei> --neu    Format + Links der neuen Fragen
    2. doppelt.py --neu             ähnliche Fragen in allen Paketen
    3. lecks.py --neu               verrät eine Frage die Antwort einer anderen?
    4. node tools/pruefen.mjs       Syntax, Tests, alle Pakete

Treffer bei 2 und 3 sind Hinweise und werden von Hand bewertet. Harmlose
Treffer danach mit „--merken“ (doppelt.py / lecks.py) speichern, damit sie
nie wieder erscheinen. Nur Standardbibliothek.
"""

import subprocess
import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parent


def schritt(titel, befehl, kurz=False):
    """Führt einen Befehl aus. kurz=True: bei Erfolg nur die letzte Zeile zeigen."""
    print(f"\n=== {titel} ===", flush=True)
    if not kurz:
        return subprocess.run(befehl, cwd=TOOLS.parent).returncode
    lauf = subprocess.run(befehl, cwd=TOOLS.parent, capture_output=True,
                          text=True, encoding="utf-8", errors="replace")
    ausgabe = (lauf.stdout + lauf.stderr).strip()
    if lauf.returncode == 0:
        print(ausgabe.splitlines()[-1] if ausgabe else "ok")
    else:
        print(ausgabe)
    return lauf.returncode


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    datei = sys.argv[1]
    python = sys.executable

    fehler = schritt("1. Format + Links (neue Fragen)", [python, str(TOOLS / "validate.py"), datei, "--neu"])
    schritt("2. Ähnliche Fragen", [python, str(TOOLS / "doppelt.py"), "--neu"])
    schritt("3. Lecks", [python, str(TOOLS / "lecks.py"), "--neu"])
    fehler |= schritt("4. Gesamtprüfung", ["node", str(TOOLS / "pruefen.mjs")], kurz=True)

    print()
    if fehler:
        print("✖ Es gibt FEHLER (Schritt 1 oder 4) – bitte korrigieren.")
        sys.exit(1)
    print("Format und Gesamtprüfung in Ordnung. Treffer aus 2 und 3 bitte von Hand bewerten.")


if __name__ == "__main__":
    main()
