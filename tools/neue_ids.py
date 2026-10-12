"""Gemeinsame Hilfen für die Prüfwerkzeuge (lecks.py, doppelt.py, validate.py).

- alle_fragen(): alle Fragen + Stechfragen aus allen Paketen, mit Paketname.
- neue_ids():    ids, die noch nicht im letzten Commit (git HEAD) stehen –
                 also die Fragen des Blocks, der gerade geprüft wird.
- auswahl_ids(): wählt ids nach Präfix/Liste ("geo-", "geo-101,geo-102") oder "--neu".

Nur Standardbibliothek.
"""

import json
import subprocess
from pathlib import Path

PROJEKT = Path(__file__).resolve().parent.parent
PACKS = PROJEKT / "docs" / "packs"


def paket_dateien():
    """Alle Paketdateien außer index.json."""
    return [d for d in sorted(PACKS.glob("*.json")) if d.name != "index.json"]


def fragen_aus(paket):
    """Fragen + Stechfragen eines geladenen Pakets (nur echte Objekte)."""
    liste = (paket.get("fragen") or []) + (paket.get("stechfragen") or [])
    return [f for f in liste if isinstance(f, dict)]


def alle_fragen():
    """Liste von (paketname, frage) über alle Pakete."""
    ergebnis = []
    for datei in paket_dateien():
        paket = json.loads(datei.read_text(encoding="utf-8"))
        ergebnis += [(datei.stem, f) for f in fragen_aus(paket)]
    return ergebnis


def ids_im_commit(datei):
    """ids einer Paketdatei im letzten Commit. Neue Datei → leere Menge."""
    try:
        pfad = datei.relative_to(PROJEKT).as_posix()
        text = subprocess.run(
            ["git", "show", f"HEAD:{pfad}"], cwd=PROJEKT,
            capture_output=True, check=True,
        ).stdout.decode("utf-8")
    except (ValueError, OSError, subprocess.CalledProcessError):
        return set()  # Datei außerhalb des Projekts, kein git oder noch nie committet
    return {f.get("id") for f in fragen_aus(json.loads(text))}


def neue_ids(dateien=None):
    """ids, die in den Paketdateien stehen, aber noch nicht im letzten Commit."""
    neu = set()
    for datei in dateien or paket_dateien():
        paket = json.loads(Path(datei).read_text(encoding="utf-8"))
        jetzt = {f.get("id") for f in fragen_aus(paket)}
        neu |= jetzt - ids_im_commit(Path(datei).resolve())
    neu.discard(None)
    return neu


def auswahl_passt(fid, auswahl):
    """auswahl: None = alle; Menge von ids; oder Liste von Präfixen (z. B. ["geo-"])."""
    if auswahl is None:
        return True
    if isinstance(auswahl, set):
        return fid in auswahl
    return any(fid.startswith(p) for p in auswahl)


def auswahl_aus_argumenten(argumente):
    """'--neu' → Menge neuer ids; 'geo-' oder 'geo-101,geo-102' → Präfixliste; sonst None."""
    if "--neu" in argumente:
        return neue_ids()
    rest = [a for a in argumente if not a.startswith("--")]
    if rest:
        return [t for a in rest for t in a.split(",") if t]
    return None
