// host.js – Logik des Host-Bildschirms.
//
// Ablauf: Lobby → Frage (Countdown) → Auflösung → Frage → … → Ende
//
// Der Host ist der "Chef" des Spiels:
// - nur er kennt das Fragenpaket mit den Lösungen,
// - er schickt den Handys die Fragen OHNE Lösung,
// - er nimmt die Antworten an und misst die Zeit,
// - erst nach Ablauf der Zeit schickt er die Auflösung.

import { neuerRaumcode, raumBetreten, neueId } from "./realtime.js";
import * as auswahl from "./engine/auswahl.js";

// Alle Modi, die wir schon können. In Schritt 1c kommt "schaetzen" dazu.
const MODI = { auswahl };

// Welches Paket gespielt wird (Themenauswahl kommt in Phase 4)
const PAKET_DATEI = "packs/raumfahrt.json";

// Antwortzeit in Sekunden, wenn die Frage keine eigene "zeit" hat
const STANDARD_ZEIT = 20;

// Kurzschreibweise, um Elemente per id zu finden
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// Spielzustand
// ---------------------------------------------------------------------------
let fragen = [];            // die spielbaren Fragen aus dem Paket
let nummer = -1;            // Index der aktuellen Frage (-1 = noch nicht gestartet)
let frageOffen = false;     // läuft gerade der Countdown?
let restzeit = 0;           // Sekunden bis zur Auflösung
let uhr = null;             // der Countdown-Zeitgeber
let startZeit = 0;          // wann die aktuelle Frage gestartet wurde (ms)
let antworten = new Map();  // Spieler-id → { antwort, zeitMs }
let anwesend = [];          // Spieler, die gerade im Raum sind: [{ id, name }]

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

  // Spielerliste in der Lobby neu anzeigen
  const liste = $("spielerliste");
  liste.replaceChildren();
  for (const s of anwesend) {
    const eintrag = document.createElement("li");
    eintrag.textContent = s.name; // textContent: Namen nie als HTML einfügen!
    liste.appendChild(eintrag);
  }
  $("anzahl").textContent = anwesend.length;
  startKnopfAktualisieren();

  if (frageOffen) {
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

$("weiter").addEventListener("click", naechsteFrage);

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
  restzeit = Number.isInteger(frage.zeit) && frage.zeit > 0 ? frage.zeit : STANDARD_ZEIT;

  // Anzeige auf dem großen Bildschirm
  $("fortschritt").textContent = "Frage " + (nummer + 1) + " von " + fragen.length;
  $("fragetext").textContent = frage.frage;
  modul.zeigeFrage($("bereich"), modul.oeffentlicheDaten(frage));
  $("infos").hidden = true;
  $("countdown").textContent = restzeit;
  zaehlerAktualisieren();

  // Frage an die Handys schicken und Countdown starten
  frageOffen = true;
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
  }
}

function antwortAnnehmen({ id, nummer: antwortNummer, antwort }) {
  // Alles prüfen – eine Nachricht könnte auch manipuliert sein
  if (!frageOffen) return;                            // Zeit schon um
  if (antwortNummer !== nummer) return;               // Antwort auf eine alte Frage
  if (!anwesend.some((s) => s.id === id)) return;     // unbekannter Spieler
  if (antworten.has(id)) return;                      // hat schon geantwortet

  const frage = fragen[nummer];
  const modul = MODI[frage.modus];
  if (!modul.antwortGueltig(modul.oeffentlicheDaten(frage), antwort)) return;

  // Zeit misst der Host selbst – so kann niemand schummeln
  antworten.set(id, { antwort, zeitMs: performance.now() - startZeit });
  zaehlerAktualisieren();
  alleFertigPruefen();
}

// Haben alle anwesenden Spieler geantwortet? Dann nicht weiter warten.
function alleFertigPruefen() {
  if (frageOffen && anwesend.every((s) => antworten.has(s.id))) aufloesen();
}

function zaehlerAktualisieren() {
  $("antwortZaehler").textContent =
    antworten.size + " von " + anwesend.length + " haben geantwortet";
}

// ---------------------------------------------------------------------------
// 6. Auflösung – erst jetzt erfahren die Handys die Lösung
// ---------------------------------------------------------------------------
function aufloesen() {
  if (!frageOffen) return; // nicht doppelt auflösen
  frageOffen = false;
  clearInterval(uhr);
  $("countdown").textContent = "";

  const frage = fragen[nummer];
  const modul = MODI[frage.modus];

  // Ergebnis pro Spieler (ab 1c kommen hier Punkte dazu)
  const ergebnisse = [];
  for (const [id, eintrag] of antworten) {
    ergebnisse.push({ id, richtig: modul.istRichtig(frage, eintrag.antwort) });
  }

  raum.senden("aufloesung", {
    nummer: nummer,
    loesungText: modul.loesungAlsText(frage),
    ergebnisse: ergebnisse,
  });

  // Großer Bildschirm: Lösung, Erklärung, Quelle
  const alleAntworten = [...antworten.values()].map((e) => e.antwort);
  modul.zeigeAufloesung($("bereich"), frage, alleAntworten);
  $("erklaerung").textContent = frage.erklaerung || "";
  quelleAnzeigen(frage.quelle);
  $("weiter").textContent = nummer + 1 < fragen.length ? "Nächste Frage" : "Zum Ergebnis";
  $("infos").hidden = false;
}

// Quelle als Text und – nur bei echten http(s)-Adressen – als Link
function quelleAnzeigen(quelle) {
  const ziel = $("quelle");
  ziel.replaceChildren("Quelle: ");

  if (typeof quelle.url === "string" && /^https?:\/\//.test(quelle.url)) {
    const link = document.createElement("a");
    link.href = quelle.url;
    link.textContent = quelle.titel;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    ziel.append(link);
  } else {
    ziel.append(quelle.titel);
  }
}

// ---------------------------------------------------------------------------
// 7. Spielende
// ---------------------------------------------------------------------------
function spielEnde() {
  $("spiel").hidden = true;
  $("ende").hidden = false;
  raum.senden("ende", {});
}
