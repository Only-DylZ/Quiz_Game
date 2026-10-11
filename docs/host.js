// host.js – Logik des Host-Bildschirms.
//
// Ablauf eines Spiels (Regeln: CLAUDE.md, Abschnitt 1 „Spielregeln“):
//   Lobby → Themenwahl → Frage → Auflösung → Zwischenstand → Frage → …
//         → (bei Gleichstand: Stechfrage) → Rundenende (1 GP für den Sieger)
//         → Themenwahl → … → wer das GP-Ziel erreicht: Siegertreppchen
//
// Der Host ist der "Chef" des Spiels:
// - nur er kennt das Fragenpaket mit den Lösungen,
// - er schickt den Handys die Fragen OHNE Lösung,
// - er nimmt die Antworten an und misst die Zeit,
// - erst nach Ablauf der Zeit schickt er die Auflösung,
// - er rechnet die Punkte aus und führt Rangliste und Gewinnpunkte (GP).

import { neuerRaumcode, raumBetreten, neueId } from "./realtime.js";
import { neu, zahlText, bildGueltig, bildZeigen } from "./engine/hilfen.js";
import {
  anteilRestzeit, ranglisteBerechnen, rundenSpitze, stechfrageSieger,
} from "./engine/punkte.js";
import { rundeZusammenstellen, kennung } from "./engine/runde.js";
import { angeboteErstellen, radDrehung, radZeichnen } from "./engine/rad.js";
import * as auswahl from "./engine/auswahl.js";
import * as schaetzen from "./engine/schaetzen.js";
import * as grafik from "./engine/grafik.js";
import * as reihenfolge from "./engine/reihenfolge.js";

// Alle Modi, die wir können
const MODI = { auswahl, schaetzen, grafik, reihenfolge };

// Dateinamen von Paketen: nur Kleinbuchstaben, Ziffern und "-" plus ".json".
// So kann niemand über index.json oder die Adresse andere Dateien laden lassen
// (z. B. "../irgendwas").
const DATEI_MUSTER = /^[a-z0-9-]{1,40}\.json$/;

// Zum Testen: host.html?paket=geographie spielt in Runde 1 direkt dieses Thema
// (ohne Kandidaten und Glücksrad).
const PAKET_AUS_LINK = (new URLSearchParams(location.search).get("paket") || "") + ".json";

// Antwortzeit in Sekunden, wenn die Frage keine eigene "zeit" hat
const STANDARD_ZEIT = 20;

// So viele Plätze zeigt der Zwischenstand
const ZWISCHENSTAND_PLAETZE = 10;

// Grenzen für die Einstellung "GPs zum Sieg"
const GP_ZIEL_MIN = 1;
const GP_ZIEL_MAX = 10;

// Höchstens so viele Booster pro Spieler und Runde (Einstellung in der Lobby)
const BOOSTER_MAX = 3;

// Kurzschreibweise, um Elemente per id zu finden
const $ = (id) => document.getElementById(id);

// Abschnitte der Seite – es ist immer genau einer sichtbar
const ABSCHNITTE = ["lobby", "themenwahl", "spiel", "rundenende", "ende"];

function zeige(name) {
  for (const abschnitt of ABSCHNITTE) {
    $(abschnitt).hidden = abschnitt !== name;
  }
}

// ---------------------------------------------------------------------------
// Spielzustand
// ---------------------------------------------------------------------------
let schritt = "lobby";      // "lobby" | "themenwahl" | "rad" | "frage" | "aufloesung"
                            // | "zwischenstand" | "rundenende" | "ende"
let themen = [];            // alle Themen aus packs/index.json: [{ datei, thema }]
let gespielteThemen = new Set(); // Dateien, die in diesem Spiel schon dran waren
let gpZiel = 3;             // so viele GP braucht man zum Sieg
let boosterProRunde = 1;    // so viele Booster hat jeder Spieler in jeder Runde
let rundenNummer = 0;       // die wievielte Runde gerade läuft (1, 2, …)
let aktuellesThema = null;  // { datei, thema } der laufenden Runde

let themenOffen = [];       // Themen, die bei dieser Themenwahl angeboten werden dürfen
let angebote = new Map();   // Spieler-id → seine 3 Themen [{ datei, thema }]
let kandidaten = new Map(); // Spieler-id → { datei, booster } – sein Kandidat und eingesetzte Booster
let ausgeschlossen = new Set(); // Themen, die sich nicht laden ließen (nur diese Themenwahl)
let gewaehltesThema = null; // was das Glücksrad ausgewählt hat

let fragen = [];            // die 10 Fragen dieser Runde (zufällig aus dem Pool)
let stechfragen = [];       // Stechfragen des Pakets (nur bei Gleichstand)
let nummer = -1;            // Index der aktuellen Frage in "fragen"
let frageZaehler = 0;       // zählt alle Fragen des Spiels – eindeutige Nummer für die Handys
let aktuelleFrage = null;   // die gerade gestellte Frage (auch eine Stechfrage)
let stechen = null;         // während einer Stechfrage: Set mit den ids der Teilnehmer
let stechSiegerId = null;   // wer die Stechfrage gewonnen hat
let stechInfo = "";         // kurzer Text, wie die Stechfrage entschieden wurde

let restzeit = 0;           // Sekunden bis zur Auflösung
let gesamtzeit = 0;         // Antwortzeit der aktuellen Frage in Sekunden
let uhr = null;             // der Countdown-Zeitgeber
let startZeit = 0;          // wann die aktuelle Frage gestartet wurde (ms)
let antworten = new Map();  // Spieler-id → { antwort, zeitMs }  (endgültig gesendet)
let entwuerfe = new Map();  // Spieler-id → antwort  (getippt, aber noch nicht gesendet)
let anwesend = [];          // Spieler, die gerade im Raum sind: [{ id, name }]
let spielstand = new Map(); // Spieler-id → { id, name, punkte, gp } – alle, die je da waren
                            // punkte = Punkte der laufenden Runde, gp = Gewinnpunkte

// ---------------------------------------------------------------------------
// 1. Raum öffnen
// ---------------------------------------------------------------------------
const raumcode = neuerRaumcode();
$("raumcode").textContent = raumcode;

// Adresse der Spieler-Seite anzeigen (gleicher Ordner wie diese Seite)
const spielerAdresse = new URL("play.html", location.href);
$("adresse").textContent = spielerAdresse.host + spielerAdresse.pathname;

// 127.0.0.1 / localhost bedeutet "dieses Gerät" – auf dem Handy nutzlos.
if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
  $("lokalHinweis").hidden = false;
}

const ich = { id: neueId(), name: "Host", rolle: "host" };
const raum = raumBetreten(raumcode, ich, beiNachricht, beiTeilnehmern);

raum.bereit.catch((fehler) => {
  $("meldung").textContent = "Fehler: " + fehler.message;
});

// ---------------------------------------------------------------------------
// 2. Themenliste laden (packs/index.json)
// ---------------------------------------------------------------------------
themenLaden();

async function themenLaden() {
  try {
    const antwort = await fetch("packs/index.json");
    const liste = await antwort.json();
    const pakete = Array.isArray(liste.pakete) ? liste.pakete : [];

    // Nur Einträge mit erlaubtem Dateinamen und einem Thema übernehmen
    themen = pakete
      .filter((p) => typeof p.datei === "string" && DATEI_MUSTER.test(p.datei))
      .filter((p) => typeof p.thema === "string" && p.thema !== "")
      .map((p) => ({ datei: p.datei, thema: p.thema.slice(0, 40) }));

    $("themenInfo").textContent = themen.length + " Themen bereit";
  } catch (fehler) {
    $("themenInfo").textContent = "Themenliste konnte nicht geladen werden.";
    console.error(fehler);
  }
  startKnopfAktualisieren();
}

// ---------------------------------------------------------------------------
// 3. Ein Fragenpaket für die Runde laden
// ---------------------------------------------------------------------------
async function paketLaden(eintrag) {
  const antwort = await fetch("packs/" + eintrag.datei);
  if (!antwort.ok) throw new Error("Paket nicht gefunden (" + antwort.status + ")");
  const paket = await antwort.json();

  // Nur Fragen übernehmen, deren Modus wir kennen und die gültig sind
  const alle = Array.isArray(paket.fragen) ? paket.fragen : [];
  const pool = alle.filter(frageSpielbar);
  if (pool.length === 0) throw new Error("Das Paket enthält keine spielbaren Fragen.");

  // Aus dem Pool 10 zufällige Fragen ziehen – bisher ungespielte zuerst
  fragen = rundeZusammenstellen(pool, gedaechtnisLaden(eintrag.datei, pool));

  // Stechfragen sind immer Schätzfragen
  const stech = Array.isArray(paket.stechfragen) ? paket.stechfragen : [];
  stechfragen = stech.filter((f) => f.modus === "schaetzen" && frageSpielbar(f));
}

// Prüft eine Frage aus dem Paket: gemeinsame Pflichtfelder + Modus-Regeln
function frageSpielbar(frage) {
  const modul = MODI[frage.modus];
  return (
    modul !== undefined &&
    typeof frage.frage === "string" &&
    frage.quelle && typeof frage.quelle.titel === "string" &&
    (frage.bild === undefined || bildGueltig(frage)) && // Bild ist freiwillig
    modul.pruefeFrage(frage)
  );
}

// ---------------------------------------------------------------------------
// Gedächtnis: welche Fragen eines Pakets schon gespielt wurden
// ---------------------------------------------------------------------------
// Liegt im Browser des Hosts (localStorage), bleibt also auch über mehrere
// Spielabende erhalten. Enthält nur Kennungen wie "rf-03", keine Lösungen.
function gedaechtnisSchluessel(datei) {
  return "quiz-gespielt:packs/" + datei;
}

function gedaechtnisLaden(datei, pool) {
  let gespielt = new Set();
  try {
    const gespeichert = JSON.parse(localStorage.getItem(gedaechtnisSchluessel(datei)) || "[]");
    if (Array.isArray(gespeichert)) gespielt = new Set(gespeichert.filter((k) => typeof k === "string"));
  } catch {
    // Kein Speicher verfügbar (z. B. privates Fenster) – dann eben ohne Gedächtnis
  }

  // Alle Fragen schon gespielt? Dann beginnt das Gedächtnis von vorne.
  if (pool.every((f) => gespielt.has(kennung(f)))) {
    gespielt = new Set();
    try {
      localStorage.removeItem(gedaechtnisSchluessel(datei));
    } catch {
      // ohne Speicher geht es auch
    }
  }
  return gespielt;
}

// Merkt sich eine Frage als gespielt (wird beim Zeigen der Frage aufgerufen)
function alsGespieltMerken(datei, frage) {
  try {
    const schluessel = gedaechtnisSchluessel(datei);
    const gespeichert = JSON.parse(localStorage.getItem(schluessel) || "[]");
    const liste = Array.isArray(gespeichert) ? gespeichert : [];
    if (!liste.includes(kennung(frage))) liste.push(kennung(frage));
    localStorage.setItem(schluessel, JSON.stringify(liste));
  } catch {
    // ohne Speicher geht es auch
  }
}

// ---------------------------------------------------------------------------
// 4. Spieler kommen und gehen
// ---------------------------------------------------------------------------
function beiTeilnehmern(teilnehmer) {
  anwesend = teilnehmer
    .filter((t) => t.rolle === "spieler" && idGueltig(t.id))
    .map((t) => ({ id: t.id, name: String(t.name || "?").slice(0, 16) }));

  // Neue Spieler mit 0 Punkten und 0 GP in den Spielstand aufnehmen
  for (const s of anwesend) {
    if (!spielstand.has(s.id)) {
      spielstand.set(s.id, { id: s.id, name: s.name, punkte: 0, gp: 0 });
    }
  }

  // Spielerliste in der Lobby neu anzeigen
  const liste = $("spielerliste");
  liste.replaceChildren();
  for (const s of anwesend) {
    liste.append(neu("li", "", s.name)); // neu() nutzt textContent – sicher
  }
  $("anzahl").textContent = anwesend.length;
  startKnopfAktualisieren();

  // Kommt jemand während der Themenwahl, bekommt er auch 3 Themen
  if (schritt === "themenwahl") angeboteErgaenzen();

  if (schritt === "frage") {
    // Kommt jemand während einer Frage (neu oder nach Verbindungsabbruch),
    // schicken wir die Frage nochmal. Wer sie schon hat, ignoriert sie.
    frageSenden();
    zaehlerAktualisieren();
    // Geht jemand, haben vielleicht alle Übrigen schon geantwortet
    alleFertigPruefen();
  }
}

// Spieler-Kennungen sind 16 Zeichen 0-9/a-f (siehe neueId in realtime.js)
function idGueltig(id) {
  return typeof id === "string" && /^[0-9a-f]{16}$/.test(id);
}

function startKnopfAktualisieren() {
  $("start").disabled = !(themen.length > 0 && anwesend.length > 0);
}

// ---------------------------------------------------------------------------
// 5. Knöpfe
// ---------------------------------------------------------------------------
$("start").addEventListener("click", () => {
  // Einstellungen prüfen: ganze Zahlen innerhalb der Grenzen
  gpZiel = ganzeZahl($("gpZiel").value, GP_ZIEL_MIN, GP_ZIEL_MAX, 3);
  boosterProRunde = ganzeZahl($("boosterAnzahl").value, 0, BOOSTER_MAX, 1);
  themenwahlZeigen();
});

// Liest eine ganze Zahl aus einem Eingabefeld und hält sie zwischen min und max
function ganzeZahl(text, min, max, standard) {
  const wert = Number.parseInt(text, 10);
  return Number.isInteger(wert) ? Math.min(max, Math.max(min, wert)) : standard;
}

$("rundeStarten").addEventListener("click", rundeStarten);

// Der Weiter-Knopf während des Spiels macht je nach Schritt etwas anderes
$("weiter").addEventListener("click", () => {
  if (schritt === "aufloesung" && stechen) rundeAbschliessen(stechSiegerId, stechInfo);
  else if (schritt === "aufloesung") zwischenstandZeigen();
  else if (schritt === "zwischenstand" && nummer + 1 >= fragen.length) rundeAuswerten();
  else if (schritt === "zwischenstand") naechsteFrage();
});

// Nach dem Rundenende: nächstes Thema oder Siegertreppchen
$("nachRunde").addEventListener("click", () => {
  if (schritt !== "rundenende") return;
  const gewonnen = [...spielstand.values()].some((s) => s.gp >= gpZiel);
  if (gewonnen) spielEnde();
  else themenwahlZeigen();
});

// ---------------------------------------------------------------------------
// 6. Themenwahl vor jeder Runde: Kandidaten + Glücksrad
// ---------------------------------------------------------------------------
// Jeder Spieler bekommt eigene 3 zufällige Themen und wählt eines als
// Kandidaten. Jeder Kandidat ist eine Karte auf dem Glücksrad. Der Host dreht,
// das Rad bleibt zufällig stehen – dieses Thema wird gespielt.
function themenwahlZeigen() {
  schritt = "themenwahl";
  zeige("themenwahl");
  $("rundeTitel").textContent = "Runde " + (rundenNummer + 1);
  $("radErgebnis").textContent = "";
  $("drehen").hidden = false;
  $("rundeStarten").hidden = true;
  kandidaten = new Map();
  ausgeschlossen = new Set();
  gewaehltesThema = null;

  // Nur Themen, die in diesem Spiel noch nicht dran waren.
  // Sind alle durch, dürfen alle wieder gewählt werden.
  themenOffen = themen.filter((t) => !gespielteThemen.has(t.datei));
  if (themenOffen.length === 0) {
    gespielteThemen = new Set();
    themenOffen = themen;
  }

  // Ab Runde 2: aktuellen GP-Stand zeigen
  $("themenwahlStand").replaceChildren();
  if (rundenNummer > 0) {
    $("themenwahlStand").append(
      neu("h2", "", "Stand (Ziel: " + gpZiel + " GP)"),
      ranglisteElement(gpRangliste(), " GP")
    );
  }

  // Testmodus: host.html?paket=sport spielt in Runde 1 direkt dieses Thema
  const ausLink = themenOffen.find((t) => t.datei === PAKET_AUS_LINK);
  if (rundenNummer === 0 && ausLink) {
    $("themenwahlText").textContent = "Testmodus: Thema aus dem Link";
    $("kandidatenListe").replaceChildren();
    $("rad").replaceChildren();
    themaFestlegen(ausLink);
    return;
  }

  $("themenwahlText").textContent = "Wählt auf dem Handy euren Kandidaten!";
  angebote = angeboteErstellen(anwesend.map((s) => s.id), themenOffen);
  themenwahlSenden();
  kandidatenAnzeigen();
}

// Schickt allen Handys ihre Themen-Angebote (Themen sind kein Geheimnis)
function themenwahlSenden() {
  raum.senden("themenwahl", {
    runde: rundenNummer + 1,
    angebote: [...angebote].map(([id, liste]) => ({ id, themen: liste })),
    booster: boosterProRunde,
  });
}

// Kommt jemand während der Themenwahl dazu, bekommt er auch ein Angebot
function angeboteErgaenzen() {
  let neue = false;
  for (const s of anwesend) {
    if (!angebote.has(s.id)) {
      angebote.set(s.id, angeboteErstellen([s.id], themenOffen).get(s.id));
      neue = true;
    }
  }
  if (neue) themenwahlSenden();
  kandidatenAnzeigen();
}

// Ein Handy hat einen Kandidaten gewählt (darf sich bis zum Drehen umentscheiden).
// booster = wie viele Booster es einsetzt (jeder = eine Karte mehr auf dem Rad).
function kandidatAnnehmen({ id, runde, datei, booster = 0 }) {
  if (schritt !== "themenwahl" || runde !== rundenNummer + 1) return;
  if (!anwesend.some((s) => s.id === id)) return;
  // Nur Themen aus dem eigenen Angebot sind erlaubt
  const angebot = angebote.get(id) || [];
  if (!angebot.some((t) => t.datei === datei)) return;

  // Nicht mehr Booster als erlaubt
  if (!Number.isInteger(booster) || booster < 0 || booster > boosterProRunde) return;

  kandidaten.set(id, { datei, booster });
  kandidatenAnzeigen();
}

// Die Karten auf dem Rad: pro anwesendem Spieler sein Kandidat –
// einmal plus einmal für jeden Booster
function radKarten() {
  const karten = [];
  for (const s of anwesend) {
    const wahl = kandidaten.get(s.id);
    if (!wahl || ausgeschlossen.has(wahl.datei)) continue;
    const eintrag = themen.find((t) => t.datei === wahl.datei);
    if (!eintrag) continue;
    for (let i = 0; i <= wahl.booster; i++) karten.push({ datei: wahl.datei, thema: eintrag.thema });
  }
  return karten;
}

// Host-Bildschirm: wer hat schon gewählt? Dazu das Rad mit den bisherigen Karten.
function kandidatenAnzeigen() {
  if (schritt !== "themenwahl") return;
  const liste = $("kandidatenListe");
  liste.replaceChildren();
  for (const s of anwesend) {
    const wahl = kandidaten.get(s.id);
    let text = s.name + " …";
    if (wahl) text = s.name + " ✓" + (wahl.booster > 0 ? " 🚀×" + wahl.booster : "");
    liste.append(neu("li", wahl ? "fertig" : "", text));
  }
  const karten = radKarten();
  $("rad").replaceChildren(radZeichnen(karten));
  $("drehen").disabled = karten.length === 0;
}

// So lange dreht sich das Rad (Millisekunden)
const DREHDAUER_MS = 5000;

$("drehen").addEventListener("click", () => {
  const karten = radKarten();
  if (schritt !== "themenwahl" || karten.length === 0) return;
  schritt = "rad";
  $("drehen").disabled = true;

  // Zuerst wird zufällig gezogen – das Rad dreht sich dann genau dorthin
  const gewinner = Math.floor(Math.random() * karten.length);
  const svg = radZeichnen(karten);
  $("rad").replaceChildren(svg);
  raum.senden("rad", {});

  // Drehung erst im übernächsten Bild starten, sonst sieht man die Animation nicht
  requestAnimationFrame(() => requestAnimationFrame(() => {
    svg.style.transition = "transform " + DREHDAUER_MS + "ms cubic-bezier(0.15, 0.85, 0.25, 1)";
    svg.style.transform = "rotate(" + radDrehung(karten.length, gewinner) + "deg)";
  }));
  setTimeout(() => themaFestlegen(karten[gewinner]), DREHDAUER_MS + 300);
});

// Das Thema der Runde steht fest
function themaFestlegen(karte) {
  schritt = "rad";
  gewaehltesThema = themen.find((t) => t.datei === karte.datei);
  $("radErgebnis").textContent = "Thema: " + gewaehltesThema.thema;
  $("drehen").hidden = true;
  $("rundeStarten").hidden = false;
  $("rundeStarten").disabled = false;
  raum.senden("radErgebnis", { thema: gewaehltesThema.thema });
}

async function rundeStarten() {
  if (schritt !== "rad" || !gewaehltesThema) return;
  const eintrag = gewaehltesThema;

  $("rundeStarten").disabled = true; // nicht doppelt klicken
  $("meldung").textContent = "";
  try {
    await paketLaden(eintrag);
  } catch (fehler) {
    // Thema nicht ladbar: Karte entfernen, Rad ohne sie noch einmal drehen
    $("meldung").textContent = "Thema „" + eintrag.thema + "“ konnte nicht geladen werden (" +
      fehler.message + ") – bitte das Rad noch einmal drehen.";
    ausgeschlossen.add(eintrag.datei);
    schritt = "themenwahl";
    $("radErgebnis").textContent = "";
    $("rundeStarten").hidden = true;
    $("drehen").hidden = false;
    kandidatenAnzeigen();
    return;
  }

  // Neue Runde: Punkte aller Spieler zurück auf 0
  aktuellesThema = eintrag;
  gespielteThemen.add(eintrag.datei);
  rundenNummer++;
  for (const s of spielstand.values()) s.punkte = 0;
  nummer = -1;

  zeige("spiel");
  naechsteFrage();
}

// ---------------------------------------------------------------------------
// 7. Eine Frage stellen
// ---------------------------------------------------------------------------
function naechsteFrage() {
  nummer++;
  const frage = fragen[nummer];
  alsGespieltMerken(aktuellesThema.datei, frage);
  $("fortschritt").textContent =
    aktuellesThema.thema + " · Frage " + (nummer + 1) + " von " + fragen.length;
  frageStellen(frage);
}

// Zeigt eine Frage (normal oder Stechfrage) und startet den Countdown
function frageStellen(frage) {
  const modul = MODI[frage.modus];
  aktuelleFrage = frage;
  frageZaehler++;

  antworten = new Map();
  entwuerfe = new Map();
  gesamtzeit = Number.isInteger(frage.zeit) && frage.zeit > 0 ? frage.zeit : STANDARD_ZEIT;
  restzeit = gesamtzeit;

  // Anzeige auf dem großen Bildschirm
  $("fragetext").textContent = frage.frage;
  bildZeigen($("bild"), frage.bild ? frage.bild.datei : null);
  modul.zeigeFrage($("bereich"), modul.oeffentlicheDaten(frage));
  $("infos").hidden = true;
  $("antwortZaehler").hidden = false;
  $("countdown").textContent = restzeit;
  zaehlerAktualisieren();

  // Frage an die Handys schicken und Countdown starten
  schritt = "frage";
  startZeit = performance.now();
  frageSenden();
  uhr = setInterval(sekundeVergangen, 1000);
}

// Schickt die aktuelle Frage an alle Handys – OHNE Lösung
function frageSenden() {
  const frage = aktuelleFrage;
  raum.senden("frage", {
    nummer: frageZaehler,                     // eindeutig im ganzen Spiel
    titel: $("fortschritt").textContent,      // z. B. "Sport · Frage 3 von 10"
    modus: frage.modus,
    text: frage.frage,
    restzeit: restzeit,
    daten: MODI[frage.modus].oeffentlicheDaten(frage),
    bild: frage.bild ? frage.bild.datei : null, // nur der neutrale Dateiname
    teilnehmer: stechen ? [...stechen] : null,  // bei der Stechfrage: wer antworten darf
  });
}

function sekundeVergangen() {
  restzeit--;
  $("countdown").textContent = restzeit;
  if (restzeit <= 0) aufloesen();
}

// ---------------------------------------------------------------------------
// 8. Antworten von den Handys annehmen
// ---------------------------------------------------------------------------
function beiNachricht(nachricht) {
  if (nachricht.typ === "antwort") {
    antwortAnnehmen(nachricht.daten || {});
  } else if (nachricht.typ === "entwurf") {
    entwurfAnnehmen(nachricht.daten || {});
  } else if (nachricht.typ === "kandidat") {
    kandidatAnnehmen(nachricht.daten || {});
  }
}

// Wer muss bei dieser Frage antworten? Normal alle, bei der Stechfrage nur
// die Spieler mit Gleichstand.
function sollenAntworten() {
  return stechen ? anwesend.filter((s) => stechen.has(s.id)) : anwesend;
}

// Darf dieser Spieler zur aktuellen Frage gerade (noch) etwas schicken?
// Alles prüfen – eine Nachricht könnte auch manipuliert sein.
function darfAntworten(id, antwortNummer) {
  return (
    schritt === "frage" &&                      // Zeit noch nicht um
    antwortNummer === frageZaehler &&           // keine alte Frage
    sollenAntworten().some((s) => s.id === id) && // bekannter (und bei Stechfrage: beteiligter) Spieler
    !antworten.has(id)                          // noch nicht endgültig geantwortet
  );
}

function antwortIstGueltig(antwort) {
  const modul = MODI[aktuelleFrage.modus];
  return modul.antwortGueltig(modul.oeffentlicheDaten(aktuelleFrage), antwort);
}

function antwortAnnehmen({ id, nummer: antwortNummer, antwort }) {
  if (!darfAntworten(id, antwortNummer)) return;
  if (!antwortIstGueltig(antwort)) return;

  // Zeit misst der Host selbst – so kann niemand schummeln
  antworten.set(id, { antwort, zeitMs: performance.now() - startZeit });
  entwuerfe.delete(id);
  zaehlerAktualisieren();
  alleFertigPruefen();
}

// Entwurf = was gerade im Eingabefeld steht. null heißt: Feld wurde geleert.
function entwurfAnnehmen({ id, nummer: antwortNummer, antwort }) {
  if (!darfAntworten(id, antwortNummer)) return;

  if (antwort === null) entwuerfe.delete(id);
  else if (antwortIstGueltig(antwort)) entwuerfe.set(id, antwort);
}

// Haben alle, die antworten sollen, geantwortet? Dann nicht weiter warten.
function alleFertigPruefen() {
  if (schritt === "frage" && sollenAntworten().every((s) => antworten.has(s.id))) aufloesen();
}

function zaehlerAktualisieren() {
  $("antwortZaehler").textContent =
    antworten.size + " von " + sollenAntworten().length + " haben geantwortet";
}

// ---------------------------------------------------------------------------
// 9. Auflösung – erst jetzt erfahren die Handys die Lösung
// ---------------------------------------------------------------------------
function aufloesen() {
  if (schritt !== "frage") return; // nicht doppelt auflösen
  schritt = "aufloesung";
  clearInterval(uhr);
  $("countdown").textContent = "";

  // Wer nicht gesendet hat, aber etwas eingetippt hatte: Entwurf zählt.
  // Als Antwortzeit gilt dann die volle Zeit (kein Tempo-Bonus).
  for (const [id, entwurf] of entwuerfe) {
    if (!antworten.has(id)) {
      antworten.set(id, { antwort: entwurf, zeitMs: gesamtzeit * 1000 });
    }
  }

  if (stechen) stechfrageAuswerten();
  else frageAuswerten();

  // Großer Bildschirm: Erklärung und Quelle
  const frage = aktuelleFrage;
  $("antwortZaehler").hidden = true;
  $("erklaerung").textContent = frage.erklaerung || "";
  quelleAnzeigen(frage.quelle);
  bildQuelleAnzeigen(frage.bild);
  $("infos").hidden = false;
}

// Normale Frage: Punkte vergeben, Ergebnis an die Handys
function frageAuswerten() {
  const frage = aktuelleFrage;
  const modul = MODI[frage.modus];
  const punkteDieseFrage = new Map(); // id → Punkte
  const fuerAnzeige = [];             // [{ name, antwort, punkte }]

  for (const [id, eintrag] of antworten) {
    const anteil = anteilRestzeit(eintrag.zeitMs, gesamtzeit);
    const punkte = modul.bewerte(frage, eintrag.antwort, anteil);
    const spieler = spielstand.get(id);

    spieler.punkte += punkte;
    punkteDieseFrage.set(id, punkte);
    fuerAnzeige.push({ name: spieler.name, antwort: eintrag.antwort, punkte });
  }

  // Jedes Handy bekommt: eigene Punkte dieser Frage, Rundenpunkte, Platz
  const ergebnisse = ranglisteBerechnen([...spielstand.values()]).map((r) => ({
    id: r.id,
    beantwortet: antworten.has(r.id),
    punkte: punkteDieseFrage.get(r.id) || 0,
    gesamt: r.punkte,
    platz: r.platz,
  }));

  raum.senden("aufloesung", {
    nummer: frageZaehler,
    loesungText: modul.loesungAlsText(frage),
    ergebnisse: ergebnisse,
  });

  modul.zeigeAufloesung($("bereich"), frage, fuerAnzeige);
  $("weiter").textContent = "Zwischenstand";
}

// Quelle als Text und – nur bei echten http(s)-Adressen – als Link
function quelleAnzeigen(quelle) {
  const ziel = $("quelle");
  ziel.replaceChildren("Quelle: ");

  if (typeof quelle.url === "string" && /^https?:\/\//.test(quelle.url)) {
    const link = neu("a", "", quelle.titel);
    link.href = quelle.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    ziel.append(link);
  } else {
    ziel.append(quelle.titel);
  }
}

// Bildnachweis – verlangen die Lizenzen freier Bilder (z. B. CC BY-SA)
function bildQuelleAnzeigen(bild) {
  const ziel = $("bildQuelle");
  ziel.replaceChildren();
  if (!bild) return;

  ziel.append("Bild: " + bild.urheber + ", " + bild.lizenz + " – ");
  const quelle = bild.quelle || {};
  if (typeof quelle.url === "string" && /^https:\/\//.test(quelle.url)) {
    const link = neu("a", "", quelle.titel || "Quelle");
    link.href = quelle.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    ziel.append(link);
  }
}

// ---------------------------------------------------------------------------
// 10. Zwischenstand nach jeder Frage
// ---------------------------------------------------------------------------
function zwischenstandZeigen() {
  schritt = "zwischenstand";
  $("fragetext").textContent = "Zwischenstand – " + aktuellesThema.thema;
  $("erklaerung").textContent = "";
  $("quelle").replaceChildren();
  $("bildQuelle").replaceChildren();
  bildZeigen($("bild"), null);

  const rangliste = ranglisteBerechnen([...spielstand.values()]);
  $("bereich").replaceChildren(ranglisteElement(rangliste.slice(0, ZWISCHENSTAND_PLAETZE)));

  const letzteFrage = nummer + 1 >= fragen.length;
  $("weiter").textContent = letzteFrage ? "Rundenende" : "Nächste Frage";
}

// Baut eine nummerierte Liste: "1. Anna – 1840" (bzw. "2 GP" mit einheit " GP")
function ranglisteElement(rangliste, einheit = "") {
  const liste = neu("ol", "rangliste");
  for (const r of rangliste) {
    const eintrag = neu("li");
    eintrag.append(
      neu("span", "platz", r.platz + "."),
      neu("span", "", r.name),
      neu("span", "punkte", r.punkte + einheit)
    );
    liste.append(eintrag);
  }
  return liste;
}

// Rangliste nach Gewinnpunkten (nutzt dieselbe Rechnung wie die Punkte-Rangliste)
function gpRangliste() {
  const nachGp = [...spielstand.values()].map((s) => ({ id: s.id, name: s.name, punkte: s.gp }));
  return ranglisteBerechnen(nachGp);
}

// ---------------------------------------------------------------------------
// 11. Rundenende: wer bekommt den GP? Bei Gleichstand: Stechfrage
// ---------------------------------------------------------------------------
function rundeAuswerten() {
  const spitze = rundenSpitze([...spielstand.values()]);
  if (spitze.length === 1) rundeAbschliessen(spitze[0].id, "");
  else stechfrageStarten(spitze);
}

function stechfrageStarten(spitze) {
  // Nur wer noch im Raum ist, kann die Stechfrage beantworten
  const dabei = spitze.filter((s) => anwesend.some((a) => a.id === s.id));

  if (dabei.length === 1) {
    rundeAbschliessen(dabei[0].id, "Gleichstand – die anderen sind nicht mehr da");
    return;
  }
  if (dabei.length === 0 || stechfragen.length === 0) {
    // Kommt praktisch nie vor (Paket ohne Stechfrage o. Ä.)
    rundeAbschliessen(zufaelligEiner(spitze).id, "Gleichstand – das Los hat entschieden");
    return;
  }

  stechen = new Set(dabei.map((s) => s.id));
  $("fortschritt").textContent = "Stechfrage: " + dabei.map((s) => s.name).join(" gegen ");
  frageStellen(zufaelligEiner(stechfragen));
}

// Stechfrage auswerten: keine Punkte, nur wer näher dran ist (siehe punkte.js)
function stechfrageAuswerten() {
  const frage = aktuelleFrage;
  const liste = [...antworten].map(([id, e]) => ({ id, antwort: e.antwort, zeitMs: e.zeitMs }));

  stechSiegerId = stechfrageSieger(liste, frage.loesung);
  stechInfo = "nach Stechfrage";
  if (stechSiegerId === null) {
    // Niemand hat geantwortet – dann entscheidet das Los
    stechSiegerId = zufaelligEiner([...stechen]);
    stechInfo = "Stechfrage ohne Antworten – das Los hat entschieden";
  }

  raum.senden("aufloesung", {
    nummer: frageZaehler,
    loesungText: schaetzen.loesungAlsText(frage),
    ergebnisse: [],
    stechen: true,
  });

  // Großer Bildschirm: Lösung und alle Schätzungen, die beste zuerst
  const abstand = (a) => Math.abs(a.antwort - frage.loesung);
  const sortiert = [...liste].sort((a, b) => abstand(a) - abstand(b) || a.zeitMs - b.zeitMs);
  const tabelle = neu("ol", "schaetzliste");
  for (const a of sortiert) {
    const eintrag = neu("li");
    eintrag.append(
      neu("span", "", spielstand.get(a.id).name),
      neu("span", "", zahlText(a.antwort) + " " + frage.einheit),
      neu("span", "plus", zahlText(abstand(a)) + " daneben")
    );
    tabelle.append(eintrag);
  }
  $("bereich").replaceChildren(
    neu("p", "gross-hinweis", "Lösung: " + schaetzen.loesungAlsText(frage)),
    tabelle
  );
  $("weiter").textContent = "Rundensieger";
}

// Der Sieger der Runde bekommt 1 GP – Anzeige und Nachricht an die Handys
function rundeAbschliessen(siegerId, info) {
  stechen = null;
  schritt = "rundenende";
  zeige("rundenende");

  const sieger = spielstand.get(siegerId);
  sieger.gp++;
  const stand = gpRangliste();
  const gewonnen = sieger.gp >= gpZiel;

  $("rundenInfo").textContent =
    "Runde " + rundenNummer + " · " + aktuellesThema.thema + (info ? " · " + info : "");
  $("rundenSieger").textContent = "🏆 " + sieger.name + " gewinnt das Thema!";
  $("gpListe").replaceChildren(
    ranglisteElement(stand, " GP"),
    neu("p", "hinweis", "Ziel: " + gpZiel + " GP")
  );
  $("nachRunde").textContent = gewonnen ? "Zum Siegertreppchen" : "Nächstes Thema";

  raum.senden("rundenende", {
    thema: aktuellesThema.thema,
    siegerId: sieger.id,
    siegerName: sieger.name,
    ziel: gpZiel,
    stand: stand.map((r) => ({ id: r.id, gp: r.punkte, platz: r.platz })),
  });
}

// Wählt zufällig ein Element aus einer Liste
function zufaelligEiner(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

// ---------------------------------------------------------------------------
// 12. Spielende mit Siegertreppchen (nach GP)
// ---------------------------------------------------------------------------
function spielEnde() {
  schritt = "ende";
  zeige("ende");

  const rangliste = gpRangliste();

  // Treppchen: Platz 2 links, Platz 1 in der Mitte, Platz 3 rechts
  const treppchen = $("treppchen");
  treppchen.replaceChildren();
  for (const index of [1, 0, 2]) {
    const r = rangliste[index];
    if (!r) continue; // weniger als 3 Spieler
    const stufe = neu("div", "stufe stufe-" + (index + 1));
    stufe.append(
      neu("span", "name", r.name),
      neu("span", "punkte", r.punkte + " GP"),
      neu("span", "platz", r.platz)
    );
    treppchen.append(stufe);
  }

  // Alle weiteren Plätze darunter
  $("endliste").replaceChildren(ranglisteElement(rangliste.slice(3), " GP"));

  raum.senden("ende", {
    rangliste: rangliste.map((r) => ({ id: r.id, name: r.name, gp: r.punkte, platz: r.platz })),
  });
}
