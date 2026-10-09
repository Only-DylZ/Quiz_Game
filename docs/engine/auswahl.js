// engine/auswahl.js – Modus "auswahl" (Multiple Choice).
//
// Jede Modus-Datei bietet dieselben Funktionen an. So können host.js und
// play.js alle Modi gleich behandeln:
//
//   pruefeFrage(frage)               Host: Ist die Frage im Paket gültig?
//   oeffentlicheDaten(frage)         Host: Was die Handys sehen dürfen – OHNE Lösung!
//   zeigeFrage(bereich, daten)       Host: Frage auf dem großen Bildschirm zeigen
//   zeigeEingabe(bereich, daten, senden)  Handy: Eingabe für die Antwort
//   antwortGueltig(daten, antwort)   Host: Ist eine eingegangene Antwort erlaubt?
//   istRichtig(frage, antwort)       Host: Richtig oder falsch? (ab 1c: Punkte)
//   loesungAlsText(frage)            Host: Lösung als kurzer Text für die Handys
//   zeigeAufloesung(bereich, frage, antworten)  Host: Lösung und Statistik zeigen
//
// "daten" sind immer die öffentlichen Daten aus oeffentlicheDaten().

import { neu } from "./hilfen.js";

// Symbole für die Antworten – so sind sie auch ohne Farben unterscheidbar
const SYMBOLE = ["▲", "◆", "●", "■"];

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

// Host: die Antwortmöglichkeiten als farbige Kacheln zeigen
export function zeigeFrage(bereich, daten) {
  const raster = neu("div", "optionen");
  daten.optionen.forEach((text, index) => {
    const kachel = neu("div", "option option-" + index);
    kachel.append(neu("span", "symbol", SYMBOLE[index]), neu("span", "", text));
    raster.append(kachel);
  });
  bereich.replaceChildren(raster);
}

// Handy: eine Taste pro Antwort. Nach dem ersten Tippen sind alle gesperrt.
export function zeigeEingabe(bereich, daten, senden) {
  const raster = neu("div", "optionen");
  const tasten = [];

  daten.optionen.forEach((text, index) => {
    const taste = neu("button", "option option-" + index);
    taste.append(neu("span", "symbol", SYMBOLE[index]), neu("span", "", text));

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

export function istRichtig(frage, antwort) {
  return antwort === frage.loesung;
}

export function loesungAlsText(frage) {
  return SYMBOLE[frage.loesung] + " " + frage.optionen[frage.loesung];
}

// Host: richtige Antwort hervorheben, falsche abdunkeln, Anzahl pro Option zeigen.
//   antworten – Liste der abgegebenen Antworten, z. B. [2, 1, 2]
export function zeigeAufloesung(bereich, frage, antworten) {
  const raster = neu("div", "optionen");

  frage.optionen.forEach((text, index) => {
    const anzahl = antworten.filter((a) => a === index).length;
    const richtig = index === frage.loesung;

    const kachel = neu("div", "option option-" + index + (richtig ? " richtig" : " falsch"));
    kachel.append(
      neu("span", "symbol", richtig ? "✔" : SYMBOLE[index]),
      neu("span", "", text),
      neu("span", "anzahl", anzahl)
    );
    raster.append(kachel);
  });

  bereich.replaceChildren(raster);
}
