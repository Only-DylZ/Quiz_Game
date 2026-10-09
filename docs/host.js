// host.js – Logik des Host-Bildschirms.
//
// Ablauf: Lobby → Frage (Countdown) → Auflösung → Zwischenstand → Frage → …
//         → Siegertreppchen
//
// Der Host ist der "Chef" des Spiels:
// - nur er kennt das Fragenpaket mit den Lösungen,
// - er schickt den Handys die Fragen OHNE Lösung,
// - er nimmt die Antworten an und misst die Zeit,
// - erst nach Ablauf der Zeit schickt er die Auflösung,
// - er rechnet die Punkte aus und führt die Rangliste.

import { neuerRaumcode, raumBetreten, neueId } from "./realtime.js";
import { neu } from "./engine/hilfen.js";
import { anteilRestzeit, ranglisteBerechnen } from "./engine/punkte.js";
import * as auswahl from "./engine/auswahl.js";
import * as schaetzen from "./engine/schaetzen.js";

// Alle Modi, die wir schon können. In Phase 2 kommt "grafik" dazu.
const MODI = { auswahl, schaetzen };

// Welches Paket gespielt wird (Themenauswahl kommt in Phase 4)
const PAKET_DATEI = "packs/raumfahrt.json";

// Antwortzeit in Sekunden, wenn die Frage keine eigene "zeit" hat
const STANDARD_ZEIT = 20;

// So viele Plätze zeigt der Zwischenstand
const ZWISCHENSTAND_PLAETZE = 10;

// Kurzschreibweise, um Elemente per id zu finden
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Spielzustand
// ---------------------------------------------------------------------------
let fragen = [];            // die spielbaren Fragen aus dem Paket
let nummer = -1;            // Index der aktuellen Frage (-1 = noch nicht gestartet)
let schritt = "lobby";      // "lobby" | "frage" | "aufloesung" | "zwischenstand" | "ende"
let restzeit = 0;           // Sekunden bis zur Auflösung
let gesamtzeit = 0;         // Antwortzeit der aktuellen Frage in Sekunden
let uhr = null;             // der Countdown-Zeitgeber
let startZeit = 0;          // wann die aktuelle Frage gestartet wurde (ms)
let antworten = new Map();  // Spieler-id → { antwort, zeitMs }  (endgültig gesendet)
let entwuerfe = new Map();  // Spieler-id → antwort  (getippt, aber noch nicht gesendet)
let anwesend = [];          // Spieler, die gerade im Raum sind: [{ id, name }]
let spielstand = new Map(); // Spieler-id → { id, name, punkte } – alle, die je da waren

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
// 2. Fragenpaket laden
// ---------------------------------------------------------------------------
paketLaden();

async function paketLaden() {
  try {
    const antwort = await fetch(PAKET_DATEI);
    const paket = await antwort.json();

    // Nur Fragen übernehmen, deren Modus wir kennen und die gültig sind
    const alle = Array.isArray(paket.fragen) ? paket.fragen : [];
    fragen = alle.filter(frageSpielbar);

    const uebersprungen = alle.length - fragen.length;
    $("paketInfo").textContent =
      "Paket „" + paket.thema + "“: " + fragen.length + " Fragen spielbar" +
      (uebersprungen > 0 ? " (" + uebersprungen + " kommen in späteren Schritten)" : "");
  } catch (fehler) {
    $("paketInfo").textContent = "Fragenpaket konnte nicht geladen werden.";
    console.error(fehler);
  }
  startKnopfAktualisieren();
}

// Prüft eine Frage aus dem Paket: gemeinsame Pflichtfelder + Modus-Regeln
function frageSpielbar(frage) {
  const modul = MODI[frage.modus];
  return (
    modul !== undefined &&
    typeof frage.frage === "string" &&
    frage.quelle && typeof frage.quelle.titel === "string" &&
    modul.pruefeFrage(frage)
  );
}

// ---------------------------------------------------------------------------
// 3. Spieler kommen und gehen
// ---------------------------------------------------------------------------
function beiTeilnehmern(teilnehmer) {
  anwesend = teilnehmer
    .filter((t) => t.rolle === "spieler" && idGueltig(t.id))
    .map((t) => ({ id: t.id, name: String(t.name || "?").slice(0, 16) }));

  // Neue Spieler mit 0 Punkten in den Spielstand aufnehmen
  for (const s of anwesend) {
    if (!spielstand.has(s.id)) {
      spielstand.set(s.id, { id: s.id, name: s.name, punkte: 0 });
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
  $("start").disabled = !(fragen.length > 0 && anwesend.length > 0);
}

$("start").addEventListener("click", () => {
  $("lobby").hidden = true;
  $("spiel").hidden = false;
  naechsteFrage();
});

// Der Weiter-Knopf macht je nach Schritt etwas anderes
$("weiter").addEventListener("click", () => {
  if (schritt === "aufloesung") zwischenstandZeigen();
  else if (schritt === "zwischenstand") naechsteFrage();
});

// ---------------------------------------------------------------------------
// 4. Eine Frage stellen
// ---------------------------------------------------------------------------
function naechsteFrage() {
  nummer++;
  if (nummer >= fragen.length) {
    spielEnde();
    return;
  }

  const frage = fragen[nummer];
  const modul = MODI[frage.modus];

  antworten = new Map();
  entwuerfe = new Map();
  gesamtzeit = Number.isInteger(frage.zeit) && frage.zeit > 0 ? frage.zeit : STANDARD_ZEIT;
  restzeit = gesamtzeit;

  // Anzeige auf dem großen Bildschirm
  $("fortschritt").textContent = "Frage " + (nummer + 1) + " von " + fragen.length;
  $("fragetext").textContent = frage.frage;
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
  const frage = fragen[nummer];
  raum.senden("frage", {
    nummer: nummer,
    gesamt: fragen.length,
    modus: frage.modus,
    text: frage.frage,
    restzeit: restzeit,
    daten: MODI[frage.modus].oeffentlicheDaten(frage),
  });
}

function sekundeVergangen() {
  restzeit--;
  $("countdown").textContent = restzeit;
  if (restzeit <= 0) aufloesen();
}

// ---------------------------------------------------------------------------
// 5. Antworten von den Handys annehmen
// ---------------------------------------------------------------------------
function beiNachricht(nachricht) {
  if (nachricht.typ === "antwort") {
    antwortAnnehmen(nachricht.daten || {});
  } else if (nachricht.typ === "entwurf") {
    entwurfAnnehmen(nachricht.daten || {});
  }
}

// Darf dieser Spieler zur aktuellen Frage gerade (noch) etwas schicken?
// Alles prüfen – eine Nachricht könnte auch manipuliert sein.
function darfAntworten(id, antwortNummer) {
  return (
    schritt === "frage" &&                    // Zeit noch nicht um
    antwortNummer === nummer &&               // keine alte Frage
    anwesend.some((s) => s.id === id) &&      // bekannter Spieler
    !antworten.has(id)                        // noch nicht endgültig geantwortet
  );
}

function antwortIstGueltig(antwort) {
  const frage = fragen[nummer];
  const modul = MODI[frage.modus];
  return modul.antwortGueltig(modul.oeffentlicheDaten(frage), antwort);
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

// Haben alle anwesenden Spieler geantwortet? Dann nicht weiter warten.
function alleFertigPruefen() {
  if (schritt === "frage" && anwesend.every((s) => antworten.has(s.id))) aufloesen();
}

function zaehlerAktualisieren() {
  $("antwortZaehler").textContent =
    antworten.size + " von " + anwesend.length + " haben geantwortet";
}

// ---------------------------------------------------------------------------
// 6. Auflösung – erst jetzt erfahren die Handys die Lösung
// ---------------------------------------------------------------------------
function aufloesen() {
  if (schritt !== "frage") return; // nicht doppelt auflösen
  schritt = "aufloesung";
  clearInterval(uhr);
  $("countdown").textContent = "";

  const frage = fragen[nummer];
  const modul = MODI[frage.modus];

  // Wer nicht gesendet hat, aber etwas eingetippt hatte: Entwurf zählt.
  // Als Antwortzeit gilt dann die volle Zeit (kein Tempo-Bonus).
  for (const [id, entwurf] of entwuerfe) {
    if (!antworten.has(id)) {
      antworten.set(id, { antwort: entwurf, zeitMs: gesamtzeit * 1000 });
    }
  }

  // Punkte für jede Antwort berechnen und zum Spielstand addieren
  const punkteDieseRunde = new Map(); // id → Punkte
  const fuerAnzeige = [];             // [{ name, antwort, punkte }]

  for (const [id, eintrag] of antworten) {
    const anteil = anteilRestzeit(eintrag.zeitMs, gesamtzeit);
    const punkte = modul.bewerte(frage, eintrag.antwort, anteil);
    const spieler = spielstand.get(id);

    spieler.punkte += punkte;
    punkteDieseRunde.set(id, punkte);
    fuerAnzeige.push({ name: spieler.name, antwort: eintrag.antwort, punkte });
  }

  // Jedes Handy bekommt: eigene Punkte dieser Runde, Gesamtpunkte, Platz
  const ergebnisse = ranglisteBerechnen([...spielstand.values()]).map((r) => ({
    id: r.id,
    beantwortet: antworten.has(r.id),
    punkte: punkteDieseRunde.get(r.id) || 0,
    gesamt: r.punkte,
    platz: r.platz,
  }));

  raum.senden("aufloesung", {
    nummer: nummer,
    loesungText: modul.loesungAlsText(frage),
    ergebnisse: ergebnisse,
  });

  // Großer Bildschirm: Lösung, Erklärung, Quelle
  modul.zeigeAufloesung($("bereich"), frage, fuerAnzeige);
  $("antwortZaehler").hidden = true;
  $("erklaerung").textContent = frage.erklaerung || "";
  quelleAnzeigen(frage.quelle);
  $("weiter").textContent = "Zwischenstand";
  $("infos").hidden = false;
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

// ---------------------------------------------------------------------------
// 7. Zwischenstand nach jeder Frage
// ---------------------------------------------------------------------------
function zwischenstandZeigen() {
  schritt = "zwischenstand";
  $("fragetext").textContent = "Zwischenstand";
  $("erklaerung").textContent = "";
  $("quelle").replaceChildren();

  const rangliste = ranglisteBerechnen([...spielstand.values()]);
  $("bereich").replaceChildren(ranglisteElement(rangliste.slice(0, ZWISCHENSTAND_PLAETZE)));

  const letzteFrage = nummer + 1 >= fragen.length;
  $("weiter").textContent = letzteFrage ? "Zum Siegertreppchen" : "Nächste Frage";
}

// Baut eine nummerierte Liste: "1. Anna – 1.840"
function ranglisteElement(rangliste) {
  const liste = neu("ol", "rangliste");
  for (const r of rangliste) {
    const eintrag = neu("li");
    eintrag.append(
      neu("span", "platz", r.platz + "."),
      neu("span", "", r.name),
      neu("span", "punkte", r.punkte)
    );
    liste.append(eintrag);
  }
  return liste;
}

// ---------------------------------------------------------------------------
// 8. Spielende mit Siegertreppchen
// ---------------------------------------------------------------------------
function spielEnde() {
  schritt = "ende";
  $("spiel").hidden = true;
  $("ende").hidden = false;

  const rangliste = ranglisteBerechnen([...spielstand.values()]);

  // Treppchen: Platz 2 links, Platz 1 in der Mitte, Platz 3 rechts
  const treppchen = $("treppchen");
  treppchen.replaceChildren();
  for (const index of [1, 0, 2]) {
    const r = rangliste[index];
    if (!r) continue; // weniger als 3 Spieler
    const stufe = neu("div", "stufe stufe-" + (index + 1));
    stufe.append(
      neu("span", "name", r.name),
      neu("span", "punkte", r.punkte),
      neu("span", "platz", r.platz)
    );
    treppchen.append(stufe);
  }

  // Alle weiteren Plätze darunter
  $("endliste").replaceChildren(ranglisteElement(rangliste.slice(3)));

  raum.senden("ende", {
    rangliste: rangliste.map((r) => ({ id: r.id, name: r.name, punkte: r.punkte, platz: r.platz })),
  });
}
