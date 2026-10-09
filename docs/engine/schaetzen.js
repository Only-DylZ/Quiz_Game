// engine/schaetzen.js – Modus "schaetzen".
//
// Die Spieler tippen eine Zahl ein. Je näher an der Lösung, desto mehr Punkte
// (Regel in punkte.js). Die Geschwindigkeit zählt hier nicht.
//
// Die Funktionen sind dieselben wie in auswahl.js – Beschreibung siehe dort.

import { neu, zahlLesen, zahlText } from "./hilfen.js";
import { punkteSchaetzen } from "./punkte.js";

// Höchstens so viele Schätzungen zeigt der Host bei der Auflösung an
const MAX_ANZEIGE = 10;

// Braucht eine Einheit (Text, darf leer sein) und eine Zahl als Lösung
export function pruefeFrage(frage) {
  return typeof frage.einheit === "string" && Number.isFinite(frage.loesung);
}

// Die Handys bekommen nur die Einheit – NICHT die Lösung
export function oeffentlicheDaten(frage) {
  return { einheit: frage.einheit };
}

// Host: Hinweis, dass auf dem Handy geschätzt wird
export function zeigeFrage(bereich, daten) {
  const text = daten.einheit
    ? "Schätzt auf dem Handy (in " + daten.einheit + ")!"
    : "Schätzt auf dem Handy!";
  bereich.replaceChildren(neu("p", "gross-hinweis", text));
}

// Wie lange nach dem letzten Tastendruck ein Entwurf verschickt wird (ms)
const ENTWURF_PAUSE = 400;

// Handy: Zahlenfeld + Senden-Knopf. Darunter steht, wie die Zahl verstanden wurde.
//   senden(zahl)         – endgültige Antwort (Knopf oder Enter)
//   entwurfSenden(zahl)  – Zwischenstand beim Tippen; zählt, falls die Zeit
//                          abläuft, ohne dass gesendet wurde. null = Feld leer.
export function zeigeEingabe(bereich, daten, senden, entwurfSenden) {
  const formular = neu("form", "schaetzen");
  const zeile = neu("div", "eingabezeile");

  const feld = neu("input");
  feld.inputMode = "decimal"; // Zahlen-Tastatur auf dem Handy
  feld.autocomplete = "off";
  feld.maxLength = 20;
  feld.placeholder = "Deine Schätzung";

  zeile.append(feld);
  if (daten.einheit) zeile.append(neu("span", "einheit", daten.einheit));

  const vorschau = neu("p", "hinweis");
  const knopf = neu("button", "", "Senden");
  knopf.type = "submit";
  const info = neu("p", "hinweis", "Ohne Senden zählt bei Zeitablauf, was im Feld steht.");

  let entwurfTimer = null;

  feld.addEventListener("input", () => {
    // Anzeigen, welche Zahl erkannt wurde ("= 384.400 km")
    const zahl = zahlLesen(feld.value);
    if (feld.value === "") vorschau.textContent = "";
    else if (zahl === null) vorschau.textContent = "Keine gültige Zahl";
    else vorschau.textContent = "= " + zahlText(zahl) + " " + daten.einheit;

    // Entwurf erst schicken, wenn kurz nicht mehr getippt wurde
    clearTimeout(entwurfTimer);
    entwurfTimer = setTimeout(() => entwurfSenden(zahl), ENTWURF_PAUSE);
  });

  formular.addEventListener("submit", (ereignis) => {
    ereignis.preventDefault(); // Seite nicht neu laden
    const zahl = zahlLesen(feld.value);
    if (zahl === null) {
      vorschau.textContent = "Bitte eine Zahl eingeben";
      return;
    }
    // Nur eine Antwort erlaubt – ab jetzt keine Entwürfe mehr
    clearTimeout(entwurfTimer);
    feld.disabled = true;
    knopf.disabled = true;
    info.textContent = "";
    senden(zahl);
  });

  formular.append(zeile, vorschau, knopf, info);
  bereich.replaceChildren(formular);
  feld.focus();
}

// Eine Antwort muss eine echte Zahl in vernünftiger Größe sein
export function antwortGueltig(daten, antwort) {
  return Number.isFinite(antwort) && Math.abs(antwort) < 1e15;
}

// Die Zeit (anteil) spielt beim Schätzen keine Rolle
export function bewerte(frage, antwort, anteil) {
  return punkteSchaetzen(antwort, frage.loesung);
}

export function loesungAlsText(frage) {
  return (zahlText(frage.loesung) + " " + frage.einheit).trim();
}

// Host: Lösung groß, darunter die Schätzungen – die besten zuerst
export function zeigeAufloesung(bereich, frage, antworten) {
  const loesung = neu("p", "gross-hinweis", "Lösung: " + loesungAlsText(frage));

  const sortiert = [...antworten].sort((a, b) => b.punkte - a.punkte);
  const liste = neu("ol", "schaetzliste");
  for (const a of sortiert.slice(0, MAX_ANZEIGE)) {
    const eintrag = neu("li");
    eintrag.append(
      neu("span", "", a.name),
      neu("span", "", zahlText(a.antwort) + " " + frage.einheit),
      neu("span", "plus", "+" + a.punkte)
    );
    liste.append(eintrag);
  }

  bereich.replaceChildren(loesung, liste);
}
