// engine/rad.js – Themenwahl: Angebote für die Spieler und das Glücksrad.
//
// Ablauf (CLAUDE.md, „Themenwahl vor jeder Runde“):
// 1. Jeder Spieler bekommt eigene 3 zufällige Themen (angeboteErstellen).
// 2. Er wählt eines als Kandidaten – das ist seine Karte auf dem Rad.
// 3. Der Host zieht zufällig eine Karte und dreht das Rad so, dass es genau
//    dort stehen bleibt (radDrehung). Jede Karte hat dieselbe Chance.
//
// Rechnen geht ohne Bildschirm (testbar), radZeichnen() baut das SVG.

import { svgNeu } from "./hilfen.js";
import { mischen } from "./runde.js";

export const THEMEN_PRO_SPIELER = 3;

// Farben auf dem Rad – jeder Spieler bekommt eine (wie die Antwortfarben, plus ein paar mehr)
export const FARBEN = ["#e21b3c", "#1368ce", "#d89e00", "#26890c", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

// Für jeden Spieler eigene zufällige Themen.
//   spielerIds – Liste der ids
//   offen      – Themen, die in diesem Spiel noch nicht dran waren: [{ datei, thema }]
//   Ergebnis   – Map id → Liste mit bis zu THEMEN_PRO_SPIELER Themen
export function angeboteErstellen(spielerIds, offen, zufall = Math.random) {
  const angebote = new Map();
  for (const id of spielerIds) {
    angebote.set(id, mischen(offen, zufall).slice(0, THEMEN_PRO_SPIELER));
  }
  return angebote;
}

// Um wie viel Grad (im Uhrzeigersinn) muss sich das Rad drehen, damit Feld
// "gewinner" unter dem Zeiger (oben) stehen bleibt?
// Feld i reicht von i·breite bis (i+1)·breite Grad, gemessen von oben im
// Uhrzeigersinn. Wir landen zufällig irgendwo im Feld (nicht genau auf dem
// Rand) und drehen vorher ein paar volle Runden – das sieht spannender aus.
export const VOLLE_RUNDEN = 6;

export function radDrehung(anzahl, gewinner, zufall = Math.random) {
  const breite = 360 / anzahl;
  const stelle = gewinner * breite + breite * (0.15 + 0.7 * zufall()); // Punkt im Feld
  return VOLLE_RUNDEN * 360 - stelle;
}

// Welches Feld steht nach einer Drehung um "grad" unter dem Zeiger?
// (Gegenstück zu radDrehung – damit prüfen die Tests die Rechnung.)
export function feldNachDrehung(anzahl, grad) {
  const breite = 360 / anzahl;
  const stelle = (((-grad) % 360) + 360) % 360; // dieser Punkt des Rads ist jetzt oben
  return Math.floor(stelle / breite);
}

// Zeichnet das Rad als SVG. karten = [{ thema, farbe }], eine Karte = ein Feld.
// farbe ist freiwillig (sonst reihum); alle Karten eines Spielers haben dieselbe.
// Texte nur über svgNeu (textContent) – Themen könnten später von Spielern kommen.
export function radZeichnen(karten) {
  const svg = svgNeu("svg", { viewBox: "-105 -105 210 210", class: "rad" });
  const n = karten.length;
  const R = 100;

  if (n === 0) {
    svg.append(svgNeu("circle", { r: R, class: "rad-leer" }));
    return svg;
  }

  const breite = 360 / n;
  const punkt = (grad) => {
    const rad = (grad * Math.PI) / 180;
    return [R * Math.sin(rad), -R * Math.cos(rad)]; // 0° = oben, im Uhrzeigersinn
  };

  karten.forEach((karte, i) => {
    const farbe = FARBEN.includes(karte.farbe) ? karte.farbe : FARBEN[i % FARBEN.length];
    if (n === 1) {
      svg.append(svgNeu("circle", { r: R, fill: farbe }));
    } else {
      const [x1, y1] = punkt(i * breite);
      const [x2, y2] = punkt((i + 1) * breite);
      const gross = breite > 180 ? 1 : 0;
      svg.append(svgNeu("path", {
        d: `M 0 0 L ${x1} ${y1} A ${R} ${R} 0 ${gross} 1 ${x2} ${y2} Z`,
        fill: farbe,
        class: "rad-feld",
      }));
    }

    // Beschriftung entlang der Mitte des Feldes. Auf der linken Hälfte wird
    // der Text zusätzlich umgedreht, damit er nicht auf dem Kopf steht.
    const mitte = i * breite + breite / 2;
    const name = karte.thema.length > 18 ? karte.thema.slice(0, 17) + "…" : karte.thema;
    const umdrehen = mitte > 180 ? " rotate(180)" : "";
    svg.append(svgNeu("text", {
      transform: `rotate(${mitte - 90}) translate(55 0)${umdrehen}`,
      class: "rad-text",
      "dominant-baseline": "middle",
    }, name));
  });

  svg.append(svgNeu("circle", { r: 8, class: "rad-mitte" }));
  return svg;
}
