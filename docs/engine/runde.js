// engine/runde.js – Stellt aus dem Fragen-Pool eines Pakets eine Runde zusammen.
//
// Ein Paket enthält viele Fragen (Ziel: 150). Pro Runde werden zufällig
// FRAGEN_PRO_RUNDE gezogen – mit festem Mix aus den Modi (MIX). Fragen, die
// schon gespielt wurden, kommen erst dran, wenn keine ungespielten mehr übrig sind.
//
// Hier wird nur ausgewählt, nichts angezeigt – deshalb automatisch testbar.

export const FRAGEN_PRO_RUNDE = 10;

// So viele Fragen pro Modus enthält eine Runde (zusammen = FRAGEN_PRO_RUNDE)
export const MIX = { auswahl: 4, schaetzen: 3, grafik: 3 };

// Eindeutige Kennung einer Frage fürs Gedächtnis: die id (Pflicht im Paket),
// zur Sicherheit sonst der Fragetext.
export function kennung(frage) {
  return typeof frage.id === "string" && frage.id !== "" ? frage.id : String(frage.frage);
}

// Stellt eine Runde zusammen.
//   pool     – alle spielbaren Fragen des Pakets
//   gespielt – Set mit Kennungen bereits gespielter Fragen
//   zufall   – Zufallsfunktion wie Math.random (in Tests ersetzbar)
// Ergebnis: Liste mit höchstens FRAGEN_PRO_RUNDE Fragen in zufälliger Reihenfolge.
export function rundeZusammenstellen(pool, gespielt, zufall = Math.random) {
  const gewaehlt = [];

  // 1. Pro Modus die gewünschte Anzahl ziehen – ungespielte zuerst
  for (const [modus, anzahl] of Object.entries(MIX)) {
    const vomModus = pool.filter((f) => f.modus === modus);
    gewaehlt.push(...ziehen(vomModus, anzahl, gespielt, zufall));
  }

  // 2. Fehlen Fragen (ein Modus hat zu wenige)? Mit beliebigen anderen auffüllen.
  if (gewaehlt.length < FRAGEN_PRO_RUNDE) {
    const rest = pool.filter((f) => !gewaehlt.includes(f));
    gewaehlt.push(...ziehen(rest, FRAGEN_PRO_RUNDE - gewaehlt.length, gespielt, zufall));
  }

  // 3. Reihenfolge mischen, damit die Modi abwechseln
  return mischen(gewaehlt, zufall);
}

// Zieht "anzahl" Fragen: erst aus den ungespielten, dann aus den gespielten
function ziehen(fragen, anzahl, gespielt, zufall) {
  const neu = mischen(fragen.filter((f) => !gespielt.has(kennung(f))), zufall);
  const alt = mischen(fragen.filter((f) => gespielt.has(kennung(f))), zufall);
  return [...neu, ...alt].slice(0, anzahl);
}

// Mischt eine Liste zufällig ("Fisher-Yates"-Verfahren) und gibt eine neue Liste zurück
export function mischen(liste, zufall = Math.random) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
