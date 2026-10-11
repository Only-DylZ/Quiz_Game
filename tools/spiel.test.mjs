// tools/spiel.test.mjs – Automatische Tests für Punkte, Zahlen-Eingabe und Lösungsschutz.
//
// Starten (im Projektordner):  node tools/pruefen.mjs
// Läuft nur auf dem eigenen PC mit Node.js – gehört nicht zur Website.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  anteilRestzeit, punkteAuswahl, punkteSchaetzen, punkteZeitleiste, ranglisteBerechnen,
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
    if (frage.art === "karte") continue; // kommt in Phase 2b

    const daten = modul.oeffentlicheDaten(frage);
    const alsText = JSON.stringify(daten);

    assert.ok(!("loesung" in daten), frage.id + ": Feld 'loesung' wird mitgeschickt!");
    assert.ok(!alsText.includes("erklaerung"), frage.id + ": Erklärung wird mitgeschickt!");
    // Beim Schätzen und bei Grafiken darf auch die Zahl selbst nirgends auftauchen
    if (frage.modus === "schaetzen" || frage.modus === "grafik") {
      assert.ok(!alsText.includes(String(frage.loesung)), frage.id + ": Lösungszahl im Text!");
    }
  }
});

test("Beispielpaket: alle Fragen der bekannten Modi sind gültig", () => {
  for (const frage of paket.fragen) {
    const modul = MODI[frage.modus];
    if (!modul) continue;
    if (frage.art === "karte") continue; // kommt in Phase 2b
    assert.ok(modul.pruefeFrage(frage), frage.id + " ist ungültig");
    // Die richtige Antwort muss selbst als gültige Antwort durchgehen
    assert.ok(modul.antwortGueltig(modul.oeffentlicheDaten(frage), frage.loesung), frage.id);
    // … und volle Punkte bringen (bei sofortiger Antwort)
    assert.equal(modul.bewerte(frage, frage.loesung, 1), 1000, frage.id);
  }
});
