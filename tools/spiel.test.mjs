// tools/spiel.test.mjs – Automatische Tests für Punkte, Zahlen-Eingabe und Lösungsschutz.
//
// Starten (im Projektordner):  node tools/pruefen.mjs
// Läuft nur auf dem eigenen PC mit Node.js – gehört nicht zur Website.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  anteilRestzeit, punkteAuswahl, punkteSchaetzen, punkteZeitleiste, punkteKarte, entfernungKm, ranglisteBerechnen,
} from "../docs/engine/punkte.js";
import { zahlLesen, zahlText } from "../docs/engine/hilfen.js";
import * as auswahl from "../docs/engine/auswahl.js";
import * as schaetzen from "../docs/engine/schaetzen.js";
import * as grafik from "../docs/engine/grafik.js";

// ---------------------------------------------------------------------------
// Punkte: auswahl
// ---------------------------------------------------------------------------
test("auswahl: falsch gibt 0 Punkte", () => {
  assert.equal(punkteAuswahl(false, 1), 0);
});

test("auswahl: richtig gibt 500 bis 1000 Punkte je nach Tempo", () => {
  assert.equal(punkteAuswahl(true, 1), 1000);   // sofort
  assert.equal(punkteAuswahl(true, 0.5), 750);  // nach der halben Zeit
  assert.equal(punkteAuswahl(true, 0), 500);    // in letzter Sekunde
});

test("anteilRestzeit: rechnet Millisekunden richtig um", () => {
  assert.equal(anteilRestzeit(0, 20), 1);
  assert.equal(anteilRestzeit(10000, 20), 0.5);
  assert.equal(anteilRestzeit(25000, 20), 0);   // zu spät → nicht negativ
  assert.equal(anteilRestzeit(5000, 0), 0);     // kaputte Zeit → 0
});

// ---------------------------------------------------------------------------
// Punkte: schaetzen (Beispiele aus CLAUDE.md, Abschnitt 5)
// ---------------------------------------------------------------------------
test("schaetzen: Beispiele aus CLAUDE.md", () => {
  assert.equal(punkteSchaetzen(384400, 384400), 1000);  // exakt
  assert.equal(punkteSchaetzen(110, 100), 900);         // 10 % zu viel
  assert.equal(punkteSchaetzen(90, 100), 900);          // 10 % zu wenig
  assert.equal(punkteSchaetzen(200, 100), 0);           // 100 % daneben
  assert.equal(punkteSchaetzen(5000, 100), 0);          // nie negativ
});

test("schaetzen: Lösung 0 und ungültige Werte stürzen nicht ab", () => {
  assert.equal(punkteSchaetzen(0, 0), 1000);
  assert.equal(punkteSchaetzen(1, 0), 0);
  assert.equal(punkteSchaetzen(NaN, 100), 0);
  assert.equal(punkteSchaetzen(Infinity, 100), 0);
});

// ---------------------------------------------------------------------------
// Punkte: zeitleiste (Abweichung bezogen auf die Spanne bis − von)
// ---------------------------------------------------------------------------
test("zeitleiste: Abweichung zählt im Verhältnis zur Spanne", () => {
  assert.equal(punkteZeitleiste(1969, 1969, 1950, 2000), 1000); // exakt
  assert.equal(punkteZeitleiste(1964, 1969, 1950, 2000), 900);  // 5 von 50 Jahren daneben
  assert.equal(punkteZeitleiste(1959, 1969, 1950, 2000), 800);  // 10 Jahre daneben
  assert.equal(punkteZeitleiste(1950, 2000, 1950, 2000), 0);    // ganze Spanne daneben
  assert.equal(punkteZeitleiste(1969, 1969, 2000, 2000), 0);    // kaputte Spanne → 0
  assert.equal(punkteZeitleiste(NaN, 1969, 1950, 2000), 0);
});

// ---------------------------------------------------------------------------
// Punkte: karte (Entfernung in km, ab 2000 km = 0 Punkte)
// ---------------------------------------------------------------------------
test("karte: Entfernung mit der Haversine-Formel", () => {
  const berlin = { lat: 52.52, lng: 13.405 };
  const paris = { lat: 48.8566, lng: 2.3522 };
  const km = entfernungKm(berlin, paris);
  assert.ok(km > 870 && km < 890, "Berlin–Paris sind etwa 878 km, gerechnet: " + km);
  assert.equal(entfernungKm(berlin, berlin), 0);
});

test("karte: Punkte nach Entfernung (Beispiele aus CLAUDE.md)", () => {
  const ort = { lat: 0, lng: 0 };
  assert.equal(punkteKarte(ort, ort), 1000);                  // 0 km
  // 1 Längengrad am Äquator ≈ 111,19 km → 500 km ≈ 4,4966°
  assert.equal(punkteKarte({ lat: 0, lng: 500 / 111.195 }, ort), 750);
  assert.equal(punkteKarte({ lat: 0, lng: 90 }, ort), 0);     // ~10.000 km → nie negativ
  assert.equal(punkteKarte({ lat: NaN, lng: 0 }, ort), 0);
});

// ---------------------------------------------------------------------------
// Grafik: Prüfregeln für Fragen und Antworten
// ---------------------------------------------------------------------------
const balkenFrage = {
  modus: "grafik", art: "balken", loesung: 50,
  daten: { einheit: "m", balken: [{ name: "A", wert: 10 }, { name: "B", wert: null }] },
};
const zeitFrage = {
  modus: "grafik", art: "zeitleiste", loesung: 1969,
  daten: { von: 1950, bis: 2000, ereignisse: [{ name: "X", jahr: 1957 }] },
};

const kartenFrage = {
  modus: "grafik", art: "karte", loesung: { lat: 45.96, lng: 63.31 },
  daten: { mitte: [45, 60], zoom: 3 },
};

test("grafik: kaputte Fragen werden erkannt", () => {
  assert.ok(grafik.pruefeFrage(balkenFrage));
  assert.ok(grafik.pruefeFrage(zeitFrage));
  // zwei fehlende Balken
  assert.ok(!grafik.pruefeFrage({ ...balkenFrage, daten: { einheit: "m", balken: [{ name: "A", wert: null }, { name: "B", wert: null }] } }));
  // kein fehlender Balken
  assert.ok(!grafik.pruefeFrage({ ...balkenFrage, daten: { einheit: "m", balken: [{ name: "A", wert: 1 }, { name: "B", wert: 2 }] } }));
  // Lösung außerhalb der Zeitleiste
  assert.ok(!grafik.pruefeFrage({ ...zeitFrage, loesung: 2010 }));
  // von nach bis
  assert.ok(!grafik.pruefeFrage({ ...zeitFrage, daten: { von: 2000, bis: 1950, ereignisse: [] } }));
  // unbekannte Art
  assert.ok(!grafik.pruefeFrage({ ...zeitFrage, art: "torte" }));
  // Karte: gültig, Lösung außerhalb der Erde, Zoom kaputt
  assert.ok(grafik.pruefeFrage(kartenFrage));
  assert.ok(!grafik.pruefeFrage({ ...kartenFrage, loesung: { lat: 95, lng: 0 } }));
  assert.ok(!grafik.pruefeFrage({ ...kartenFrage, daten: { mitte: [45, 60], zoom: 0 } }));
});

test("grafik: nur passende Antworten werden angenommen", () => {
  const z = grafik.oeffentlicheDaten(zeitFrage);
  assert.ok(grafik.antwortGueltig(z, 1960));
  assert.ok(!grafik.antwortGueltig(z, 1949));     // vor der Zeitleiste
  assert.ok(!grafik.antwortGueltig(z, 1960.5));   // kein ganzes Jahr
  assert.ok(!grafik.antwortGueltig(z, "1960"));   // Text statt Zahl
  const b = grafik.oeffentlicheDaten(balkenFrage);
  assert.ok(grafik.antwortGueltig(b, 42.5));
  assert.ok(!grafik.antwortGueltig(b, Infinity));
  assert.ok(!grafik.antwortGueltig(b, null));
  const k = grafik.oeffentlicheDaten(kartenFrage);
  assert.ok(grafik.antwortGueltig(k, { lat: 10, lng: -20 }));
  assert.ok(!grafik.antwortGueltig(k, { lat: 100, lng: 0 }));   // gibt es nicht
  assert.ok(!grafik.antwortGueltig(k, { lat: "10", lng: 0 }));  // Text statt Zahl
  assert.ok(!grafik.antwortGueltig(k, null));
  assert.ok(!grafik.antwortGueltig(k, 42));
});

// ---------------------------------------------------------------------------
// Rangliste
// ---------------------------------------------------------------------------
test("rangliste: sortiert, gleiche Punkte = gleicher Platz", () => {
  const ergebnis = ranglisteBerechnen([
    { id: "a", name: "Anna", punkte: 500 },
    { id: "b", name: "Ben", punkte: 900 },
    { id: "c", name: "Cem", punkte: 500 },
    { id: "d", name: "Dana", punkte: 100 },
  ]);
  assert.deepEqual(ergebnis.map((r) => [r.name, r.platz]), [
    ["Ben", 1], ["Anna", 2], ["Cem", 2], ["Dana", 4],
  ]);
});

// ---------------------------------------------------------------------------
// Zahlen-Eingabe auf dem Handy
// ---------------------------------------------------------------------------
test("zahlLesen: deutsche Schreibweisen", () => {
  assert.equal(zahlLesen("384400"), 384400);
  assert.equal(zahlLesen("384.400"), 384400);
  assert.equal(zahlLesen("384 400"), 384400);
  assert.equal(zahlLesen("1.234.567"), 1234567);
  assert.equal(zahlLesen("3,5"), 3.5);
  assert.equal(zahlLesen("3.5"), 3.5);
  assert.equal(zahlLesen("1.234,5"), 1234.5);
  assert.equal(zahlLesen("-12"), -12);
});

test("zahlLesen: Unsinn ergibt null", () => {
  for (const eingabe of ["", "abc", "12km", "1,2,3", ".", "-", "1e9", "<b>"]) {
    assert.equal(zahlLesen(eingabe), null, "Eingabe: " + eingabe);
  }
});

test("zahlText: deutsche Anzeige", () => {
  assert.equal(zahlText(384400), "384.400");
  assert.equal(zahlText(3.5), "3,5");
});

// ---------------------------------------------------------------------------
// SICHERHEIT: Die Handys dürfen die Lösung nie vorab bekommen
// ---------------------------------------------------------------------------
const MODI = { auswahl, schaetzen, grafik };
const paket = JSON.parse(readFileSync(new URL("../docs/packs/raumfahrt.json", import.meta.url), "utf8"));

test("oeffentlicheDaten enthält nie die Lösung", () => {
  for (const frage of paket.fragen) {
    const modul = MODI[frage.modus];
    if (!modul) continue; // Modus kommt erst später

    const daten = modul.oeffentlicheDaten(frage);
    const alsText = JSON.stringify(daten);

    assert.ok(!("loesung" in daten), frage.id + ": Feld 'loesung' wird mitgeschickt!");
    assert.ok(!alsText.includes("erklaerung"), frage.id + ": Erklärung wird mitgeschickt!");
    // Beim Schätzen und bei Grafiken darf auch die Zahl selbst nirgends auftauchen
    if (frage.art === "karte") {
      // Bei der Karte: weder Breite noch Länge der Lösung
      assert.ok(!alsText.includes(String(frage.loesung.lat)), frage.id + ": Lösungs-Breite im Text!");
      assert.ok(!alsText.includes(String(frage.loesung.lng)), frage.id + ": Lösungs-Länge im Text!");
    } else if (frage.modus === "schaetzen" || frage.modus === "grafik") {
      assert.ok(!alsText.includes(String(frage.loesung)), frage.id + ": Lösungszahl im Text!");
    }
  }
});

test("Beispielpaket: alle Fragen der bekannten Modi sind gültig", () => {
  for (const frage of paket.fragen) {
    const modul = MODI[frage.modus];
    if (!modul) continue;
    assert.ok(modul.pruefeFrage(frage), frage.id + " ist ungültig");
    // Die richtige Antwort muss selbst als gültige Antwort durchgehen
    assert.ok(modul.antwortGueltig(modul.oeffentlicheDaten(frage), frage.loesung), frage.id);
    // … und volle Punkte bringen (bei sofortiger Antwort)
    assert.equal(modul.bewerte(frage, frage.loesung, 1), 1000, frage.id);
  }
});
