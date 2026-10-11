// tools/spiel.test.mjs – Automatische Tests für Punkte, Zahlen-Eingabe und Lösungsschutz.
//
// Starten (im Projektordner):  node tools/pruefen.mjs
// Läuft nur auf dem eigenen PC mit Node.js – gehört nicht zur Website.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  anteilRestzeit, punkteAuswahl, punkteSchaetzen, punkteZeitleiste, punkteKarte, entfernungKm,
  punkteReihenfolge, ranglisteBerechnen, rundenSpitze, stechfrageSieger,
} from "../docs/engine/punkte.js";
import { zahlLesen, zahlText, bildPfadGueltig, bildGueltig } from "../docs/engine/hilfen.js";
import * as auswahl from "../docs/engine/auswahl.js";
import * as schaetzen from "../docs/engine/schaetzen.js";
import * as grafik from "../docs/engine/grafik.js";
import * as reihenfolge from "../docs/engine/reihenfolge.js";
import { rundeZusammenstellen, kennung, MIX, FRAGEN_PRO_RUNDE } from "../docs/engine/runde.js";
import {
  angeboteErstellen, radDrehung, feldNachDrehung, THEMEN_PRO_SPIELER, VOLLE_RUNDEN,
} from "../docs/engine/rad.js";
import {
  paletteAus, kontrast, hslZuHex, rgbZuHsl, KONTRAST_TEXT, KONTRAST_GROSS,
} from "../docs/engine/uifarben.js";

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
// Punkte und Regeln: reihenfolge (richtige Paare)
// ---------------------------------------------------------------------------
test("reihenfolge: Punkte nach richtigen Paaren", () => {
  const l = ["A", "B", "C", "D"]; // 6 Paare
  assert.equal(punkteReihenfolge(["A", "B", "C", "D"], l), 1000);
  assert.equal(punkteReihenfolge(["A", "B", "D", "C"], l), 833); // 5 von 6
  assert.equal(punkteReihenfolge(["D", "A", "B", "C"], l), 500); // 3 von 6
  assert.equal(punkteReihenfolge(["D", "C", "B", "A"], l), 0);   // alles verkehrt
  assert.equal(punkteReihenfolge(["A", "B", "C"], l), 0);        // unvollständig
  assert.equal(punkteReihenfolge(["A", "B", "C", "X"], l), 0);   // fremdes Element
});

test("reihenfolge: Handys bekommen die Elemente alphabetisch, nie die Lösung", () => {
  const frage = { modus: "reihenfolge", loesung: ["Mars", "Jupiter", "Saturn"], oben: "nah", unten: "fern" };
  assert.ok(reihenfolge.pruefeFrage(frage));
  const daten = reihenfolge.oeffentlicheDaten(frage);
  assert.deepEqual(daten.elemente, ["Jupiter", "Mars", "Saturn"]);
  assert.ok(!("loesung" in daten));
  // Antworten: genau die Elemente, jedes einmal
  assert.ok(reihenfolge.antwortGueltig(daten, ["Saturn", "Mars", "Jupiter"]));
  assert.ok(!reihenfolge.antwortGueltig(daten, ["Mars", "Mars", "Jupiter"]));
  assert.ok(!reihenfolge.antwortGueltig(daten, ["Mars", "Jupiter"]));
  assert.ok(!reihenfolge.antwortGueltig(daten, ["Mars", "Jupiter", "<b>"]));
  assert.ok(!reihenfolge.antwortGueltig(daten, "Mars"));
  // kaputte Fragen
  assert.ok(!reihenfolge.pruefeFrage({ loesung: ["A", "B"] }));          // zu wenige
  assert.ok(!reihenfolge.pruefeFrage({ loesung: ["A", "A", "B"] }));     // doppelt
  assert.ok(!reihenfolge.pruefeFrage({ loesung: ["Apfel", "Birne", "Kiwi"] })); // alphabetisch = Lösung
  assert.ok(!reihenfolge.pruefeFrage({ loesung: ["A", "B", "C"], werte: ["1"] })); // Werte passen nicht
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
// Themenrunden: Rundensieger und Stechfrage
// ---------------------------------------------------------------------------
test("rundenSpitze: ein Sieger oder Gleichstand", () => {
  const eindeutig = rundenSpitze([
    { id: "a", punkte: 900 }, { id: "b", punkte: 1200 }, { id: "c", punkte: 300 },
  ]);
  assert.deepEqual(eindeutig.map((s) => s.id), ["b"]);

  const gleich = rundenSpitze([
    { id: "a", punkte: 1200 }, { id: "b", punkte: 1200 }, { id: "c", punkte: 300 },
  ]);
  assert.deepEqual(gleich.map((s) => s.id), ["a", "b"]);

  // Niemand hat Punkte: alle sind gleichauf
  assert.equal(rundenSpitze([{ id: "a", punkte: 0 }, { id: "b", punkte: 0 }]).length, 2);
  assert.deepEqual(rundenSpitze([]), []);
});

test("stechfrageSieger: näher dran gewinnt, bei Gleichstand der Schnellere", () => {
  // Lösung 100: Ben ist mit 103 näher dran als Anna mit 90
  assert.equal(stechfrageSieger([
    { id: "anna", antwort: 90, zeitMs: 1000 },
    { id: "ben", antwort: 103, zeitMs: 9000 },
  ], 100), "ben");

  // Beide 5 daneben (95 und 105) → wer schneller war
  assert.equal(stechfrageSieger([
    { id: "anna", antwort: 105, zeitMs: 4000 },
    { id: "ben", antwort: 95, zeitMs: 2000 },
  ], 100), "ben");

  // Niemand (gültig) geantwortet → null, dann entscheidet im Spiel das Los
  assert.equal(stechfrageSieger([], 100), null);
  assert.equal(stechfrageSieger([{ id: "a", antwort: "viel", zeitMs: 1 }], 100), null);
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
const MODI = { auswahl, schaetzen, grafik, reihenfolge };

// Alle Pakete aus docs/packs/index.json laden – jede neue Frage wird mitgeprüft
function lesen(datei) {
  return JSON.parse(readFileSync(new URL("../docs/packs/" + datei, import.meta.url), "utf8"));
}
const pakete = lesen("index.json").pakete.map((e) => ({ datei: e.datei, ...lesen(e.datei) }));

// Alle Fragen + Stechfragen aller Pakete, mit Paketname für Fehlermeldungen
const alleFragen = pakete.flatMap((p) =>
  [...p.fragen, ...p.stechfragen].map((frage) => ({ frage, wo: p.datei + " " + frage.id }))
);

test("oeffentlicheDaten enthält nie die Lösung (alle Pakete)", () => {
  for (const { frage, wo } of alleFragen) {
    const modul = MODI[frage.modus];
    const daten = modul.oeffentlicheDaten(frage);
    const alsText = JSON.stringify(daten);

    assert.ok(!alsText.includes("loesung"), wo + ": Feld 'loesung' wird mitgeschickt!");
    assert.ok(!alsText.includes("erklaerung"), wo + ": Erklärung wird mitgeschickt!");

    // Genau nachsehen, ob die Lösung irgendwo in den Daten steckt
    if (frage.modus === "reihenfolge") {
      assert.notDeepEqual(daten.elemente, frage.loesung, wo + ": Handys sehen die richtige Reihenfolge!");
    } else if (frage.modus === "schaetzen") {
      assert.deepEqual(Object.keys(daten), ["einheit"], wo + ": schickt mehr als die Einheit!");
    } else if (frage.art === "balken") {
      assert.ok(daten.balken.every((b) => b.wert !== frage.loesung), wo + ": Lösung als Balkenwert!");
    } else if (frage.art === "karte") {
      const [lat, lng] = daten.mitte;
      assert.ok(!(lat === frage.loesung.lat && lng === frage.loesung.lng), wo + ": Kartenmitte = Lösung!");
    }
  }
});

test("Alle Pakete: jede Frage ist gültig und die Lösung bringt 1000 Punkte", () => {
  for (const { frage, wo } of alleFragen) {
    const modul = MODI[frage.modus];
    assert.ok(modul, wo + ": unbekannter Modus");
    assert.ok(modul.pruefeFrage(frage), wo + " ist ungültig");
    // Die richtige Antwort muss selbst als gültige Antwort durchgehen
    assert.ok(modul.antwortGueltig(modul.oeffentlicheDaten(frage), frage.loesung), wo);
    // … und volle Punkte bringen (bei sofortiger Antwort)
    assert.equal(modul.bewerte(frage, frage.loesung, 1), 1000, wo);
  }
});

test("Alle Pakete: Stechfragen sind Schätzfragen", () => {
  for (const p of pakete) {
    assert.ok(p.stechfragen.length >= 1, p.datei);
    for (const stech of p.stechfragen) assert.equal(stech.modus, "schaetzen", p.datei + " " + stech.id);
  }
});

// ---------------------------------------------------------------------------
// Bilder: nur neutrale Pfade im Ordner bilder/
// ---------------------------------------------------------------------------
test("bild: nur erlaubte Pfade werden angezeigt", () => {
  assert.ok(bildPfadGueltig("bilder/dd-017.jpg"));
  assert.ok(bildPfadGueltig("bilder/geo-031.svg"));
  for (const pfad of ["https://boese.de/x.jpg", "bilder/../config.js", "bilder/x.html",
    "javascript:alert(1)", "bilder/Sauerbraten.jpg", "", null, 42]) {
    assert.ok(!bildPfadGueltig(pfad), "sollte verboten sein: " + pfad);
  }
});

test("bild: Datei muss wie die Frage heißen und Lizenz haben", () => {
  const gut = { id: "dd-017", bild: { datei: "bilder/dd-017.jpg", urheber: "X", lizenz: "CC0" } };
  assert.ok(bildGueltig(gut));
  assert.ok(!bildGueltig({ ...gut, bild: { ...gut.bild, datei: "bilder/sauerbraten.jpg" } }));
  assert.ok(!bildGueltig({ ...gut, bild: { ...gut.bild, lizenz: "" } }));
});

test("Alle Pakete: Bilder folgen den Regeln", () => {
  for (const { frage, wo } of alleFragen) {
    if (frage.bild !== undefined) assert.ok(bildGueltig(frage), wo + ": Bild ungültig");
  }
});

// ---------------------------------------------------------------------------
// Runde aus dem Pool zusammenstellen
// ---------------------------------------------------------------------------
// Ein Test-Pool: je 20 Fragen pro Modus
function testPool() {
  const pool = [];
  for (const modus of Object.keys(MIX)) {
    for (let i = 0; i < 20; i++) pool.push({ id: modus + "-" + i, modus, frage: modus + " " + i });
  }
  return pool;
}

test("runde: 10 Fragen mit dem festen Modus-Mix, keine doppelt", () => {
  const runde = rundeZusammenstellen(testPool(), new Set());
  assert.equal(runde.length, FRAGEN_PRO_RUNDE);
  for (const [modus, anzahl] of Object.entries(MIX)) {
    assert.equal(runde.filter((f) => f.modus === modus).length, anzahl, modus);
  }
  assert.equal(new Set(runde.map(kennung)).size, runde.length);
});

test("runde: ungespielte Fragen kommen zuerst", () => {
  const pool = testPool();
  // Alles gespielt außer genau so vielen Fragen pro Modus, wie MIX verlangt
  // → genau diese müssen gezogen werden
  const frei = new Set(
    Object.entries(MIX).flatMap(([modus, anzahl]) =>
      Array.from({ length: anzahl }, (_, i) => modus + "-" + i))
  );
  const gespielt = new Set(pool.map(kennung).filter((k) => !frei.has(k)));
  const runde = rundeZusammenstellen(pool, gespielt);
  assert.deepEqual(new Set(runde.map(kennung)), frei);
});

test("runde: fehlt ein Modus, wird mit anderen aufgefüllt", () => {
  const pool = testPool().filter((f) => f.modus !== "reihenfolge");
  const runde = rundeZusammenstellen(pool, new Set());
  assert.equal(runde.length, FRAGEN_PRO_RUNDE);
  // kleiner Pool → so viele wie da sind
  assert.equal(rundeZusammenstellen(pool.slice(0, 5), new Set()).length, 5);
});

// ---------------------------------------------------------------------------
// Themenwahl: Angebote und Glücksrad
// ---------------------------------------------------------------------------
test("angebote: jeder bekommt 3 verschiedene offene Themen", () => {
  const offen = ["a", "b", "c", "d", "e"].map((x) => ({ datei: x + ".json", thema: x }));
  const angebote = angeboteErstellen(["s1", "s2"], offen);
  for (const id of ["s1", "s2"]) {
    const liste = angebote.get(id);
    assert.equal(liste.length, THEMEN_PRO_SPIELER);
    assert.equal(new Set(liste.map((t) => t.datei)).size, liste.length); // keins doppelt
    assert.ok(liste.every((t) => offen.includes(t)));                    // nur offene Themen
  }
  // Nur noch 2 Themen offen → 2 Angebote
  assert.equal(angeboteErstellen(["s1"], offen.slice(0, 2)).get("s1").length, 2);
});

test("glücksrad: das Rad bleibt immer auf dem gezogenen Feld stehen", () => {
  for (const anzahl of [1, 2, 3, 5, 8, 13]) {
    for (let gewinner = 0; gewinner < anzahl; gewinner++) {
      for (const z of [0, 0.5, 0.999]) {
        const grad = radDrehung(anzahl, gewinner, () => z);
        assert.equal(feldNachDrehung(anzahl, grad), gewinner, anzahl + "/" + gewinner + "/" + z);
        assert.ok(grad > 360 * (VOLLE_RUNDEN - 1)); // ein paar volle Runden
      }
    }
  }
});

test("reihenfolge: Verschieben beim Ziehen", () => {
  const { verschieben } = reihenfolge;
  assert.deepEqual(verschieben(["A", "B", "C", "D"], 3, 1), ["A", "D", "B", "C"]); // nach oben
  assert.deepEqual(verschieben(["A", "B", "C", "D"], 0, 2), ["B", "C", "A", "D"]); // nach unten
  assert.deepEqual(verschieben(["A", "B", "C"], 1, 1), ["A", "B", "C"]);           // gleicher Platz
});

// ---------------------------------------------------------------------------
// UI-Farben passend zum Hintergrund (engine/uifarben.js)
// ---------------------------------------------------------------------------
test("uifarben: Umrechnung und Kontrast stimmen", () => {
  assert.equal(hslZuHex(0, 1, 0.5), "#ff0000");
  assert.equal(hslZuHex(120, 1, 0.25), "#008000");
  const { h, s, l } = rgbZuHsl(0, 0, 255);
  assert.deepEqual([Math.round(h), s, l], [240, 1, 0.5]);
  assert.equal(Math.round(kontrast("#000000", "#ffffff")), 21);
  assert.equal(kontrast("#777777", "#777777"), 1);
});

test("uifarben: jede Palette ist gut lesbar – bei jedem Farbton", () => {
  for (let ton = 0; ton < 360; ton += 5) {
    for (const saettigung of [0, 0.2, 0.5, 1]) {
      const p = paletteAus(ton, saettigung);
      const fall = ton + "° / " + saettigung;
      assert.ok(kontrast(p["--tinte"], p["--pergament"]) >= KONTRAST_TEXT, "Tinte " + fall);
      assert.ok(kontrast(p["--tinte"], p["--pergament-hell"]) >= KONTRAST_TEXT, "Tinte hell " + fall);
      assert.ok(kontrast(p["--akzent"], p["--pergament"]) >= KONTRAST_GROSS, "Akzent " + fall);
      assert.ok(kontrast(p["--knopf-schrift"], p["--knopf"]) >= KONTRAST_GROSS, "Knopf " + fall);
      assert.ok(kontrast(p["--rahmen-schrift"], p["--holz"]) >= KONTRAST_GROSS, "Rahmen " + fall);
      for (const wert of Object.values(p)) assert.match(wert, /^#[0-9a-f]{6}$/);
    }
  }
});
