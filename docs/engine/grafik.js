// engine/grafik.js – Modus "grafik".
//
// Es gibt drei Arten (Feld "art" in der Frage):
//   balken      – ein Balkendiagramm, bei dem ein Balken fehlt. Man schätzt seinen Wert.
//   zeitleiste  – eine Zeitleiste mit Ereignissen. Man schätzt das Jahr eines weiteren.
//   karte       – eine Landkarte. Man tippt den gesuchten Ort an.
//
// Balken und Zeitleiste werden als SVG selbst gezeichnet – auf dem Host groß,
// auf dem Handy klein über der Eingabe. Die Karte steckt in karte.js (Leaflet).
//
// Die Funktionen sind dieselben wie in auswahl.js – Beschreibung siehe dort.

import { neu, svgNeu, zahlText } from "./hilfen.js";
import { punkteSchaetzen, punkteZeitleiste, punkteKarte } from "./punkte.js";
import * as schaetzen from "./schaetzen.js";
import * as karte from "./karte.js";

// Höchstens so viele Antworten zeigt der Host bei der Auflösung an
const MAX_ANZEIGE = 10;
// Grenzen, damit die Grafik lesbar bleibt
const MAX_BALKEN = 8;
const MAX_EREIGNISSE = 8;
const MAX_NAME = 16; // Zeichen pro Beschriftung

// ---------------------------------------------------------------------------
// Prüfen und öffentliche Daten
// ---------------------------------------------------------------------------

export function pruefeFrage(frage) {
  const d = frage.daten;
  if (!d || typeof d !== "object") return false;

  if (frage.art === "balken") {
    return (
      typeof d.einheit === "string" &&
      Array.isArray(d.balken) &&
      d.balken.length >= 2 &&
      d.balken.length <= MAX_BALKEN &&
      d.balken.every((b) => b && typeof b.name === "string") &&
      // genau ein Balken ohne Wert – den rät man
      d.balken.filter((b) => b.wert === null).length === 1 &&
      // alle anderen haben eine Zahl ab 0
      d.balken.every((b) => b.wert === null || (Number.isFinite(b.wert) && b.wert >= 0)) &&
      Number.isFinite(frage.loesung) &&
      frage.loesung >= 0
    );
  }

  if (frage.art === "zeitleiste") {
    return (
      Number.isInteger(d.von) &&
      Number.isInteger(d.bis) &&
      d.von < d.bis &&
      Array.isArray(d.ereignisse) &&
      d.ereignisse.length <= MAX_EREIGNISSE &&
      d.ereignisse.every(
        (e) => e && typeof e.name === "string" &&
          Number.isInteger(e.jahr) && e.jahr >= d.von && e.jahr <= d.bis
      ) &&
      Number.isInteger(frage.loesung) &&
      frage.loesung >= d.von &&
      frage.loesung <= d.bis
    );
  }

  if (frage.art === "karte") {
    return (
      Array.isArray(d.mitte) &&
      d.mitte.length === 2 &&
      karte.ortGueltig({ lat: d.mitte[0], lng: d.mitte[1] }) &&
      Number.isInteger(d.zoom) &&
      d.zoom >= 1 &&
      d.zoom <= 18 &&
      karte.ortGueltig(frage.loesung)
    );
  }

  return false; // unbekannte Art
}

// Was die Handys sehen dürfen – OHNE Lösung.
// Wir kopieren jedes Feld einzeln, damit nie aus Versehen etwas mitrutscht.
export function oeffentlicheDaten(frage) {
  const d = frage.daten;

  if (frage.art === "balken") {
    return {
      art: "balken",
      einheit: d.einheit,
      balken: d.balken.map((b) => ({ name: b.name, wert: b.wert })),
    };
  }

  if (frage.art === "karte") {
    return { art: "karte", mitte: [d.mitte[0], d.mitte[1]], zoom: d.zoom };
  }

  // zeitleiste
  return {
    art: "zeitleiste",
    von: d.von,
    bis: d.bis,
    ereignisse: d.ereignisse.map((e) => ({ name: e.name, jahr: e.jahr })),
  };
}

// ---------------------------------------------------------------------------
// Anzeige auf dem Host
// ---------------------------------------------------------------------------

export function zeigeFrage(bereich, daten) {
  if (daten.art === "karte") return karte.zeigeFrage(bereich, daten);
  bereich.replaceChildren(zeichne(daten, null));
}

// ---------------------------------------------------------------------------
// Eingabe auf dem Handy
// ---------------------------------------------------------------------------

export function zeigeEingabe(bereich, daten, senden, entwurfSenden) {
  if (daten.art === "karte") return karte.zeigeEingabe(bereich, daten, senden, entwurfSenden);

  const grafik = neu("div", "grafik-klein");
  grafik.append(zeichne(daten, null));
  const eingabe = neu("div");
  bereich.replaceChildren(grafik, eingabe);

  if (daten.art === "balken") {
    // Dasselbe Zahlenfeld wie beim Schätzen
    schaetzen.zeigeEingabe(eingabe, { einheit: daten.einheit }, senden, entwurfSenden);
  } else {
    zeigeJahrEingabe(eingabe, daten, senden, entwurfSenden);
  }
}

// Wie lange nach der letzten Bewegung ein Entwurf verschickt wird (ms)
const ENTWURF_PAUSE = 400;

// Zeitleiste auf dem Handy: Schieberegler + Knöpfe −1/+1 + Senden
function zeigeJahrEingabe(bereich, daten, senden, entwurfSenden) {
  const formular = neu("form", "schaetzen");

  const anzeige = neu("p", "jahr-anzeige", "?");

  const regler = neu("input", "jahr-regler");
  regler.type = "range";
  regler.min = daten.von;
  regler.max = daten.bis;
  regler.step = 1;
  regler.value = Math.round((daten.von + daten.bis) / 2);

  const minus = neu("button", "klein", "−1");
  const plus = neu("button", "klein", "+1");
  minus.type = "button";
  plus.type = "button";
  const zeile = neu("div", "eingabezeile");
  zeile.append(minus, regler, plus);

  const knopf = neu("button", "", "Senden");
  knopf.type = "submit";
  const info = neu("p", "hinweis", "Regler schieben. Ohne Senden zählt bei Zeitablauf die letzte Einstellung.");

  let bewegt = false; // erst nach der ersten Bewegung gibt es eine Antwort
  let entwurfTimer = null;

  function geaendert() {
    bewegt = true;
    anzeige.textContent = regler.value; // Jahre ohne Tausenderpunkt
    clearTimeout(entwurfTimer);
    entwurfTimer = setTimeout(() => entwurfSenden(Number(regler.value)), ENTWURF_PAUSE);
  }

  regler.addEventListener("input", geaendert);
  minus.addEventListener("click", () => { regler.stepDown(); geaendert(); });
  plus.addEventListener("click", () => { regler.stepUp(); geaendert(); });

  formular.addEventListener("submit", (ereignis) => {
    ereignis.preventDefault(); // Seite nicht neu laden
    if (!bewegt) {
      info.textContent = "Bitte zuerst den Regler bewegen.";
      return;
    }
    // Nur eine Antwort erlaubt – alles sperren, keine Entwürfe mehr
    clearTimeout(entwurfTimer);
    for (const element of [regler, minus, plus, knopf]) element.disabled = true;
    info.textContent = "";
    senden(Number(regler.value));
  });

  formular.append(anzeige, zeile, knopf, info);
  bereich.replaceChildren(formular);
}

// ---------------------------------------------------------------------------
// Auswerten
// ---------------------------------------------------------------------------

export function antwortGueltig(daten, antwort) {
  if (daten.art === "balken") {
    return Number.isFinite(antwort) && Math.abs(antwort) < 1e15;
  }
  if (daten.art === "karte") return karte.ortGueltig(antwort);
  // zeitleiste: ganzes Jahr innerhalb der Zeitleiste
  return Number.isInteger(antwort) && antwort >= daten.von && antwort <= daten.bis;
}

// Die Zeit (anteil) spielt hier keine Rolle – nur die Genauigkeit
export function bewerte(frage, antwort, anteil) {
  if (frage.art === "balken") return punkteSchaetzen(antwort, frage.loesung);
  if (frage.art === "karte") return punkteKarte(antwort, frage.loesung);
  return punkteZeitleiste(antwort, frage.loesung, frage.daten.von, frage.daten.bis);
}

export function loesungAlsText(frage) {
  if (frage.art === "balken") {
    return (zahlText(frage.loesung) + " " + frage.daten.einheit).trim();
  }
  if (frage.art === "karte") return karte.ortAlsText(frage.loesung);
  return String(frage.loesung); // Jahr ohne Tausenderpunkt
}

// Host: Grafik mit eingetragener Lösung, darunter die besten Antworten
export function zeigeAufloesung(bereich, frage, antworten) {
  if (frage.art === "karte") return karte.zeigeAufloesung(bereich, frage, antworten);

  const grafik = zeichne(oeffentlicheDaten(frage), frage.loesung);
  const loesung = neu("p", "gross-hinweis", "Lösung: " + loesungAlsText(frage));

  const sortiert = [...antworten].sort((a, b) => b.punkte - a.punkte);
  const liste = neu("ol", "schaetzliste");
  for (const a of sortiert.slice(0, MAX_ANZEIGE)) {
    const antwortText = frage.art === "balken"
      ? (zahlText(a.antwort) + " " + frage.daten.einheit).trim()
      : String(a.antwort);
    const eintrag = neu("li");
    eintrag.append(
      neu("span", "", a.name),
      neu("span", "", antwortText),
      neu("span", "plus", "+" + a.punkte)
    );
    liste.append(eintrag);
  }

  bereich.replaceChildren(grafik, loesung, liste);
}

// ---------------------------------------------------------------------------
// Zeichnen (SVG)
// ---------------------------------------------------------------------------

// Zeichnet die passende Grafik. loesung = null → die gesuchte Stelle zeigt "?"
function zeichne(daten, loesung) {
  if (daten.art === "balken") return zeichneBalken(daten, loesung);
  return zeichneZeitleiste(daten, loesung);
}

// Kürzt lange Beschriftungen, damit sie nicht über die Grafik hinausragen
function kurz(text) {
  const t = String(text);
  return t.length > MAX_NAME ? t.slice(0, MAX_NAME - 1) + "…" : t;
}

// Balkendiagramm. Maße im "viewBox"-Raster 800 × 400; das SVG passt sich
// danach automatisch an die Breite des Bildschirms an.
function zeichneBalken(daten, loesung) {
  const BREITE = 800, HOEHE = 400;
  const OBEN = 40, UNTEN = 50; // Platz für Werte oben und Namen unten
  const grundlinie = HOEHE - UNTEN;
  const platz = grundlinie - OBEN;

  // Höchster Wert bestimmt den Maßstab (bei der Auflösung zählt die Lösung mit)
  const werte = daten.balken.map((b) => (b.wert === null ? loesung : b.wert))
    .filter((w) => Number.isFinite(w));
  const hoechster = Math.max(1, ...werte);

  const svg = svgNeu("svg", { viewBox: `0 0 ${BREITE} ${HOEHE}`, class: "grafik", role: "img" });
  const spalte = BREITE / daten.balken.length;
  const balkenBreite = spalte * 0.6;

  daten.balken.forEach((b, i) => {
    const mitte = spalte * i + spalte / 2;
    const gesucht = b.wert === null;
    const wert = gesucht ? loesung : b.wert;

    if (Number.isFinite(wert)) {
      const h = (wert / hoechster) * platz;
      svg.append(
        svgNeu("rect", {
          x: mitte - balkenBreite / 2, y: grundlinie - h, width: balkenBreite, height: h,
          class: gesucht ? "balken balken-loesung" : "balken",
        }),
        svgNeu("text", { x: mitte, y: grundlinie - h - 10, class: "grafik-wert" }, zahlText(wert))
      );
    } else {
      // Gesuchter Balken vor der Auflösung: nur ein großes Fragezeichen
      svg.append(svgNeu("text", { x: mitte, y: grundlinie - 20, class: "grafik-frage" }, "?"));
    }

    svg.append(svgNeu("text", { x: mitte, y: grundlinie + 32, class: "grafik-name" }, kurz(b.name)));
  });

  // Grundlinie und Einheit
  svg.append(svgNeu("line", { x1: 0, y1: grundlinie, x2: BREITE, y2: grundlinie, class: "grafik-linie" }));
  if (daten.einheit) {
    svg.append(svgNeu("text", { x: 4, y: 24, class: "grafik-einheit" }, "in " + daten.einheit));
  }
  return svg;
}

// Zeitleiste: waagrechte Linie von "von" bis "bis", Ereignisse als Punkte,
// Beschriftungen abwechselnd oberhalb und unterhalb (damit sie sich nicht überdecken).
function zeichneZeitleiste(daten, loesung) {
  const BREITE = 800, HOEHE = 300;
  const RAND = 100; // Platz links/rechts, damit Beschriftungen nicht abgeschnitten werden
  const y = HOEHE / 2;

  // Jahr → x-Position
  const xVon = (jahr) => RAND + ((jahr - daten.von) / (daten.bis - daten.von)) * (BREITE - 2 * RAND);

  const svg = svgNeu("svg", { viewBox: `0 0 ${BREITE} ${HOEHE}`, class: "grafik", role: "img" });
  svg.append(svgNeu("line", { x1: RAND, y1: y, x2: BREITE - RAND, y2: y, class: "grafik-linie" }));

  // Anfang und Ende beschriften
  for (const jahr of [daten.von, daten.bis]) {
    svg.append(
      svgNeu("line", { x1: xVon(jahr), y1: y - 10, x2: xVon(jahr), y2: y + 10, class: "grafik-linie" }),
      svgNeu("text", { x: xVon(jahr), y: y + 40, class: "grafik-rand" }, String(jahr))
    );
  }

  // Ereignisse nach Jahr sortiert, Beschriftung abwechselnd oben/unten
  const sortiert = [...daten.ereignisse].sort((a, b) => a.jahr - b.jahr);
  sortiert.forEach((e, i) => {
    const x = xVon(e.jahr);
    const oben = i % 2 === 0;
    svg.append(
      svgNeu("circle", { cx: x, cy: y, r: 8, class: "punkt" }),
      svgNeu("text", { x, y: oben ? y - 62 : y + 60, class: "grafik-name" }, kurz(e.name)),
      svgNeu("text", { x, y: oben ? y - 24 : y + 98, class: "grafik-wert" }, String(e.jahr))
    );
  });

  // Bei der Auflösung: Lösung als großer, farbiger Strich
  if (Number.isFinite(loesung)) {
    const x = xVon(loesung);
    svg.append(
      svgNeu("line", { x1: x, y1: 34, x2: x, y2: y + 20, class: "grafik-loesung" }),
      svgNeu("text", { x, y: 26, class: "grafik-wert grafik-loesung-text" }, String(loesung))
    );
  }
  return svg;
}
