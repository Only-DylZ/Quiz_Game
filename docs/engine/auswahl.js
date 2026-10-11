// engine/auswahl.js – Modus "auswahl" (Multiple Choice).
//
// Jede Modus-Datei bietet dieselben Funktionen an. So können host.js und
// play.js alle Modi gleich behandeln:
//
//   pruefeFrage(frage)               Host: Ist die Frage im Paket gültig?
//   oeffentlicheDaten(frage)         Host: Was die Handys sehen dürfen – OHNE Lösung!
//   zeigeFrage(bereich, daten)       Host: Frage auf dem großen Bildschirm zeigen
//   zeigeEingabe(bereich, daten, senden, entwurfSenden)  Handy: Eingabe für die Antwort.
//                                    entwurfSenden(antwort) ist optional: ein Zwischenstand,
//                                    der zählt, wenn die Zeit ohne Senden abläuft
//                                    (z. B. beim Schätzen). auswahl braucht das nicht.
//   antwortGueltig(daten, antwort)   Host: Ist eine eingegangene Antwort erlaubt?
//   bewerte(frage, antwort, anteil)  Host: Punkte für eine Antwort (0–1000).
//                                    anteil = übrige Zeit (1 = sofort, 0 = am Ende)
//   loesungAlsText(frage)            Host: Lösung als kurzer Text für die Handys
//   zeigeAufloesung(bereich, frage, antworten)  Host: Lösung und Statistik zeigen.
//                                    antworten = [{ name, antwort, punkte }, ...]
//   antwortAlsText(daten, antwort)   Handy (freiwillig): eigene Antwort als kurzer Text
//                                    für die Auflösung ("Deine Antwort: B – Giraffe")
//
// "daten" sind immer die öffentlichen Daten aus oeffentlicheDaten().

import { neu } from "./hilfen.js";
import { punkteAuswahl } from "./punkte.js";

// Alle Antworten sehen gleich aus – nur ein Buchstabe unterscheidet sie
const BUCHSTABEN = ["A", "B", "C", "D"];

// Eine Antwort-Kachel: Holzschild mit Buchstabe, daneben der Text
function kachel(tag, index, text, klassen = "") {
  const element = neu(tag, "pixel-option" + klassen);
  element.append(neu("span", "buchstabe", BUCHSTABEN[index]), neu("span", "", text));
  return element;
}

// Hat die Frage 2–4 Text-Optionen und zeigt die Lösung auf eine davon?
export function pruefeFrage(frage) {
  return (
    Array.isArray(frage.optionen) &&
    frage.optionen.length >= 2 &&
    frage.optionen.length <= 4 &&
    frage.optionen.every((option) => typeof option === "string") &&
    Number.isInteger(frage.loesung) &&
    frage.loesung >= 0 &&
    frage.loesung < frage.optionen.length
  );
}

// Nur die Optionen gehen an die Handys. Wir kopieren ausdrücklich nur dieses
// eine Feld, damit "loesung" nie aus Versehen mitgeschickt wird.
export function oeffentlicheDaten(frage) {
  return { optionen: frage.optionen.slice() };
}

// Host: die Antwortmöglichkeiten als Kacheln A–D zeigen
export function zeigeFrage(bereich, daten) {
  const raster = neu("div", "optionen");
  daten.optionen.forEach((text, index) => raster.append(kachel("div", index, text)));
  bereich.replaceChildren(raster);
}

// Handy: eine Taste pro Antwort. Nach dem ersten Tippen sind alle gesperrt.
export function zeigeEingabe(bereich, daten, senden) {
  const raster = neu("div", "optionen");
  const tasten = [];

  daten.optionen.forEach((text, index) => {
    const taste = kachel("button", index, text);

    taste.addEventListener("click", () => {
      for (const t of tasten) t.disabled = true; // nur eine Antwort erlaubt
      taste.classList.add("gewaehlt");
      senden(index);
    });

    tasten.push(taste);
    raster.append(taste);
  });

  bereich.replaceChildren(raster);
}

// Eine Antwort muss eine ganze Zahl sein, die zu einer Option passt
export function antwortGueltig(daten, antwort) {
  return Number.isInteger(antwort) && antwort >= 0 && antwort < daten.optionen.length;
}

export function bewerte(frage, antwort, anteil) {
  return punkteAuswahl(antwort === frage.loesung, anteil);
}

export function loesungAlsText(frage) {
  return BUCHSTABEN[frage.loesung] + " – " + frage.optionen[frage.loesung];
}

export function antwortAlsText(daten, antwort) {
  return BUCHSTABEN[antwort] + " – " + daten.optionen[antwort];
}

// Host: richtige Antwort hervorheben, falsche abdunkeln, Anzahl pro Option zeigen
export function zeigeAufloesung(bereich, frage, antworten) {
  const raster = neu("div", "optionen");

  frage.optionen.forEach((text, index) => {
    const anzahl = antworten.filter((a) => a.antwort === index).length;
    const richtig = index === frage.loesung;

    const element = kachel("div", index, text, richtig ? " richtig" : " falsch");
    element.append(neu("span", "anzahl", anzahl));
    raster.append(element);
  });

  bereich.replaceChildren(raster);
}
