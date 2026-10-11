// play.js – Logik der Spieler-Seite (Handy).
//
// Das Handy kennt nie die Lösungen. Es zeigt nur, was der Host schickt:
//   "themenwahl" → eigene 3 Themen zeigen, Kandidat an den Host senden
//   "rad" / "radErgebnis" → Glücksrad dreht sich / gewähltes Thema
//   "frage"      → Eingabe anzeigen, Antwort an den Host senden
//                  (Stechfrage: nur die Spieler mit Gleichstand)
//   "aufloesung" → richtig/falsch und die Lösung anzeigen
//   "rundenende" → wer den Gewinnpunkt (GP) bekommt
//   "ende"       → Spielende anzeigen

import { raumBetreten, raumcodePruefen, neueId } from "./realtime.js";
import { neu, zahlText, bildZeigen } from "./engine/hilfen.js";
import * as auswahl from "./engine/auswahl.js";
import * as schaetzen from "./engine/schaetzen.js";
import * as grafik from "./engine/grafik.js";
import * as reihenfolge from "./engine/reihenfolge.js";
import { hintergrundSetzen, STANDARD_SZENE } from "./engine/uifarben.js";

// Alle Modi, die wir schon können (muss zu host.js passen)
const MODI = { auswahl, schaetzen, grafik, reihenfolge };

// Wie lange wir nach dem Verbinden auf den Host warten (Millisekunden)
const HOST_WARTEZEIT = 4000;

const $ = (id) => document.getElementById(id);

let raum = null;           // die Verbindung zum Raum
let ich = null;            // { id, name, rolle }
let hostGefunden = false;  // ist der Host im Raum?
let warteTimer = null;     // Zeitgeber für "Raum nicht gefunden"
let aktuelleNummer = -1;   // welche Frage gerade angezeigt wird
let themenRunde = 0;       // für welche Runde die Themenwahl gerade angezeigt wird
let uhr = null;            // Countdown-Zeitgeber
let meineAntwort = null;   // { modul, daten, antwort } – was ich zur aktuellen Frage geschickt habe
let szene = STANDARD_SZENE; // Hintergrund der laufenden Runde (schickt der Host mit der Frage)

// ---------------------------------------------------------------------------
// Anzeige: immer nur einen Abschnitt zeigen
// ---------------------------------------------------------------------------
const ABSCHNITTE = ["beitreten", "warten", "themenwahl", "frage", "ergebnis", "rundenende", "ende"];

function zeige(name) {
  for (const abschnitt of ABSCHNITTE) {
    $(abschnitt).hidden = abschnitt !== name;
  }
  // Bei Frage und Ergebnis das Bild zum Thema, sonst die Farm
  hintergrundSetzen(name === "frage" || name === "ergebnis" ? szene : STANDARD_SZENE);
}
zeige("beitreten");

// ---------------------------------------------------------------------------
// 1. Beitreten
// ---------------------------------------------------------------------------

// Falls der Link schon einen Code enthält (play.html?raum=KX7Q), eintragen
const codeAusLink = new URLSearchParams(location.search).get("raum");
if (codeAusLink) $("code").value = codeAusLink;

$("beitreten").addEventListener("submit", async (ereignis) => {
  ereignis.preventDefault(); // Seite nicht neu laden
  $("meldung").textContent = "";

  // Eingaben prüfen
  const raumcode = raumcodePruefen($("code").value);
  const name = $("name").value.trim();

  if (!raumcode) {
    $("meldung").textContent = "Der Raumcode hat 4 Zeichen (Buchstaben/Ziffern).";
    return;
  }
  if (name.length < 1 || name.length > 16) {
    $("meldung").textContent = "Bitte einen Namen mit 1 bis 16 Zeichen eingeben.";
    return;
  }

  // Raum betreten
  $("beitreten").querySelector("button").disabled = true;
  ich = { id: neueId(), name, rolle: "spieler" };
  raum = raumBetreten(raumcode, ich, beiNachricht, beiTeilnehmern);

  try {
    await raum.bereit;
  } catch (fehler) {
    abbrechen("Verbindung fehlgeschlagen. Bitte nochmal versuchen.");
    return;
  }

  // Kurz warten, ob ein Host im Raum ist – sonst war der Code falsch
  warteTimer = setTimeout(() => {
    if (!hostGefunden) {
      abbrechen("Diesen Raum gibt es nicht. Code richtig eingegeben?");
    }
  }, HOST_WARTEZEIT);
});

// Wird aufgerufen, wenn jemand den Raum betritt oder verlässt
function beiTeilnehmern(teilnehmer) {
  const host = teilnehmer.find((t) => t.rolle === "host");

  if (host && !hostGefunden) {
    // Host gefunden: wir sind drin
    hostGefunden = true;
    $("meinName").textContent = ich.name;
    zeige("warten");
  } else if (!host && hostGefunden) {
    // Host ist weg (z. B. Seite geschlossen)
    $("meldung").textContent = "Der Host hat den Raum verlassen.";
  }
}

// Verbindung trennen und Formular wieder freigeben
function abbrechen(text) {
  clearTimeout(warteTimer);
  if (raum) raum.verlassen();
  raum = null;
  $("meldung").textContent = text;
  $("beitreten").querySelector("button").disabled = false;
}

// ---------------------------------------------------------------------------
// 2. Nachrichten vom Host
// ---------------------------------------------------------------------------
function beiNachricht(nachricht) {
  const daten = nachricht.daten || {};

  if (nachricht.typ === "themenwahl") themenwahlAnzeigen(daten);
  else if (nachricht.typ === "rad") radDreht();
  else if (nachricht.typ === "radErgebnis") radErgebnisAnzeigen(daten);
  else if (nachricht.typ === "radNochmal") radNochmalAnzeigen(daten);
  else if (nachricht.typ === "frage") frageAnzeigen(daten);
  else if (nachricht.typ === "aufloesung") ergebnisAnzeigen(daten);
  else if (nachricht.typ === "rundenende") rundenendeAnzeigen(daten);
  else if (nachricht.typ === "ende") spielEnde(daten);
  // Andere Nachrichten (z. B. Antworten anderer Spieler) ignorieren wir.
}

// Texte aus Nachrichten: nur echte Texte, gekürzt (angezeigt wird mit textContent)
function text(wert, laenge = 80) {
  return typeof wert === "string" ? wert.slice(0, laenge) : "";
}

// Vor jeder Runde: eigene 3 Themen als Knöpfe – eins antippen = Kandidat.
// Umentscheiden ist erlaubt, bis das Glücksrad sich dreht.
function themenwahlAnzeigen(daten) {
  if (!Number.isInteger(daten.runde)) return;
  // Dieselbe Themenwahl kann mehrmals kommen (wenn jemand Neues beitritt) –
  // dann die schon getroffene Wahl nicht verwerfen
  if (daten.runde === themenRunde) return;

  const angebote = Array.isArray(daten.angebote) ? daten.angebote : [];
  const meins = angebote.find((a) => a && a.id === ich.id);
  if (!meins || !Array.isArray(meins.themen)) return; // noch kein Angebot für uns

  themenRunde = daten.runde;
  clearInterval(uhr);
  $("themenwahlTitel").textContent = "Runde " + daten.runde;

  // Joker gelten fürs ganze Spiel: so viele habe ich noch (schickt der Host mit)
  const anzahl = (wert, max) => (Number.isInteger(wert) ? Math.min(Math.max(wert, 0), max) : 0);
  const maxBooster = anzahl(meins.booster, 5);
  const jokerUebrig = anzahl(meins.joker, 3);
  let gewaehlt = null; // { datei, name } meines Kandidaten
  let booster = 0;     // eingesetzte Booster

  // Wahl an den Host schicken und unten anzeigen
  function kandidatSenden() {
    if (!gewaehlt) return;
    const wahl = gewaehlt.eigenes ? { eigenes: gewaehlt.eigenes } : { datei: gewaehlt.datei };
    raum.senden("kandidat", { id: ich.id, runde: daten.runde, ...wahl, booster });
    $("kandidatStatus").textContent = "Dein Kandidat: " + gewaehlt.name +
      (booster > 0 ? " – " + (booster + 1) + " Karten auf dem Rad 🚀" : "");
  }

  const knoepfe = $("themenKnoepfe");
  knoepfe.replaceChildren();
  for (const thema of meins.themen.slice(0, 3)) {
    if (!thema || typeof thema.datei !== "string") continue;
    const knopf = neu("button", "thema-knopf", text(thema.thema, 40));
    knopf.addEventListener("click", () => {
      for (const k of knoepfe.children) k.classList.remove("gewaehlt");
      knopf.classList.add("gewaehlt");
      gewaehlt = { datei: thema.datei, name: knopf.textContent };
      kandidatSenden();
      boosterZeichnen();
    });
    knoepfe.append(knopf);
  }

  // Booster-Zeile: [−]  1 von 2 Boostern  [+]
  const zeile = $("boosterZeile");
  const minus = neu("button", "klein", "−");
  const plus = neu("button", "klein", "+ Booster");
  const anzeige = neu("span");
  minus.addEventListener("click", () => {
    booster = Math.max(0, booster - 1);
    kandidatSenden();
    boosterZeichnen();
  });
  plus.addEventListener("click", () => {
    booster = Math.min(maxBooster, booster + 1);
    kandidatSenden();
    boosterZeichnen();
  });
  function boosterZeichnen() {
    anzeige.textContent = "🚀 " + booster + " (noch " + maxBooster + " im Spiel)";
    minus.disabled = booster === 0;
    plus.disabled = booster === maxBooster || !gewaehlt; // erst Kandidat wählen
  }
  zeile.replaceChildren(minus, anzeige, plus);
  zeile.hidden = maxBooster === 0;
  boosterZeichnen();

  // Themenjoker: eigenes Thema eintippen (die KI erzeugt die Fragen erst,
  // wenn das Rad darauf stehen bleibt)
  const joker = $("joker");
  joker.hidden = jokerUebrig === 0;
  $("jokerText").textContent = "🃏 Themenjoker (noch " + jokerUebrig + ") – oder ein eigenes Thema:";
  $("jokerFeld").value = "";
  $("jokerFeld").disabled = false;
  joker.querySelector("button").disabled = false;
  joker.onsubmit = (ereignis) => {
    ereignis.preventDefault(); // Seite nicht neu laden
    const eigenes = $("jokerFeld").value.replace(/\s+/g, " ").trim().slice(0, 60);
    if (eigenes.length < 2) {
      $("kandidatStatus").textContent = "Bitte ein Thema mit mindestens 2 Zeichen eingeben.";
      return;
    }
    for (const k of knoepfe.children) k.classList.remove("gewaehlt");
    gewaehlt = { eigenes, name: "🃏 " + eigenes };
    kandidatSenden();
    boosterZeichnen();
  };

  $("kandidatStatus").textContent = "";
  zeige("themenwahl");
}

// Das Glücksrad dreht sich: ab jetzt keine Änderung mehr
function radDreht() {
  for (const knopf of $("themenKnoepfe").children) knopf.disabled = true;
  for (const knopf of $("boosterZeile").querySelectorAll("button")) knopf.disabled = true;
  $("jokerFeld").disabled = true;
  $("joker").querySelector("button").disabled = true;
  $("kandidatStatus").textContent = "Das Glücksrad dreht sich … 🎡";
}

function radErgebnisAnzeigen(daten) {
  $("wartenText").textContent = "Gewählt: „" + text(daten.thema, 60) + "“" +
    (daten.eigenes ? " 🃏 – die KI schreibt gerade die Fragen …" : " – gleich geht's los!");
  zeige("warten");
}

// Das gewählte Thema ließ sich nicht laden/erzeugen → es wird nochmal gedreht
function radNochmalAnzeigen(daten) {
  $("wartenText").textContent = "„" + text(daten.thema, 60) +
    "“ ging leider nicht – das Glücksrad dreht gleich noch einmal …";
  zeige("warten");
}

function frageAnzeigen(daten) {
  // Dieselbe Frage kann mehrmals kommen (z. B. wenn jemand Neues beitritt)
  if (daten.nummer === aktuelleNummer) return;

  const modul = MODI[daten.modus];
  if (!modul) {
    $("meldung").textContent = "Diesen Fragetyp kennt die Seite noch nicht.";
    return;
  }

  aktuelleNummer = daten.nummer;
  meineAntwort = null;
  // Hintergrund zum Thema (hintergrundSetzen prüft den Namen selbst)
  szene = typeof daten.szene === "string" ? daten.szene : STANDARD_SZENE;
  $("meldung").textContent = "";

  // Stechfrage, bei der wir nicht dabei sind: nur zuschauen
  if (Array.isArray(daten.teilnehmer) && !daten.teilnehmer.includes(ich.id)) {
    clearInterval(uhr);
    $("wartenText").textContent =
      "Stechfrage! Die Besten der Runde schätzen – schau auf den großen Bildschirm.";
    zeige("warten");
    return;
  }

  $("fortschritt").textContent = text(daten.titel);
  $("fragetext").textContent = daten.text;
  bildZeigen($("bild"), daten.bild); // prüft selbst, ob der Pfad erlaubt ist
  $("status").textContent = "";

  // Der Modus zeichnet die Eingabe.
  // - senden(antwort): endgültige Antwort
  // - entwurfSenden(antwort): Zwischenstand, zählt bei Zeitablauf ohne Senden
  const senden = (antwort) => {
    raum.senden("antwort", { id: ich.id, nummer: daten.nummer, antwort });
    meineAntwort = { modul, daten: daten.daten, antwort, endgueltig: true };
    $("status").textContent = "Antwort gesendet – warte auf die Auflösung …";
  };
  const entwurfSenden = (antwort) => {
    raum.senden("entwurf", { id: ich.id, nummer: daten.nummer, antwort });
    // Ein Entwurf zählt, wenn nichts gesendet wurde – also auch hier merken
    if (!meineAntwort || !meineAntwort.endgueltig) {
      meineAntwort = antwort === null ? null : { modul, daten: daten.daten, antwort, endgueltig: false };
    }
  };
  modul.zeigeEingabe($("eingabe"), daten.daten, senden, entwurfSenden);

  countdownStarten(daten.restzeit);
  zeige("frage");
}

// Eigener Countdown auf dem Handy – nur zur Anzeige.
// Wann die Zeit wirklich um ist, entscheidet der Host.
function countdownStarten(sekunden) {
  clearInterval(uhr);
  let rest = Number(sekunden) || 0;
  $("countdown").textContent = rest;

  uhr = setInterval(() => {
    rest = Math.max(0, rest - 1);
    $("countdown").textContent = rest;
    if (rest === 0) clearInterval(uhr);
  }, 1000);
}

function ergebnisAnzeigen(daten) {
  if (daten.nummer !== aktuelleNummer) return; // gehört nicht zu unserer Frage
  clearInterval(uhr);
  $("loesungText").textContent = "Richtig: " + text(daten.loesungText);
  $("meineAntwortText").textContent = "";

  // Stechfrage: keine Punkte – wer gewonnen hat, zeigt gleich das Rundenende
  if (daten.stechen) {
    $("ergebnisText").textContent = "Stechfrage vorbei";
    $("standText").textContent = "Wer war näher dran? Schau auf den großen Bildschirm!";
    zeige("ergebnis");
    return;
  }

  const ergebnisse = Array.isArray(daten.ergebnisse) ? daten.ergebnisse : [];
  const meins = ergebnisse.find((e) => e.id === ich.id);

  let ergebnis;
  if (!meins || !meins.beantwortet) ergebnis = "Keine Antwort 😴";
  else if (meins.punkte > 0) ergebnis = "+" + zahlText(meins.punkte) + " Punkte 🎉";
  else ergebnis = "Leider 0 Punkte";

  $("ergebnisText").textContent = ergebnis;

  // Eigene Antwort zeigen (falls der Modus das kann), bei Multiple Choice mit ✓/✗
  if (meins && meins.beantwortet && meineAntwort && meineAntwort.modul.antwortAlsText) {
    const antwortText = meineAntwort.modul.antwortAlsText(meineAntwort.daten, meineAntwort.antwort);
    const zeichen = meineAntwort.modul === auswahl ? (meins.punkte > 0 ? " ✓" : " ✗") : "";
    if (antwortText) $("meineAntwortText").textContent = "Deine Antwort: " + antwortText + zeichen;
  }
  $("standText").textContent = meins
    ? "In dieser Runde: " + zahlText(meins.gesamt) + " Punkte · Platz " + meins.platz
    : "";
  zeige("ergebnis");
}

function rundenendeAnzeigen(daten) {
  clearInterval(uhr);
  const ziel = Number(daten.ziel);
  const thema = "„" + text(daten.thema, 40) + "“";

  $("rundenSieger").textContent = daten.siegerId === ich.id
    ? "Du gewinnst das Thema " + thema + "! 🏆"
    : text(daten.siegerName, 16) + " gewinnt das Thema " + thema;

  const stand = Array.isArray(daten.stand) ? daten.stand : [];
  const meins = stand.find((s) => s.id === ich.id);
  $("meineGp").textContent = meins ? "Du hast " + meins.gp + " von " + ziel + " GP" : "";

  // Hat jemand das Ziel erreicht, ist das Spiel gleich vorbei
  const vorbei = stand.some((s) => s.gp >= ziel);
  $("rundenHinweis").textContent = vorbei
    ? "Das war die letzte Runde!"
    : "Gleich geht's mit dem nächsten Thema weiter …";
  zeige("rundenende");
}

function spielEnde(daten) {
  clearInterval(uhr);

  const rangliste = Array.isArray(daten.rangliste) ? daten.rangliste : [];
  const meins = rangliste.find((r) => r.id === ich.id);

  $("endeText").textContent = meins
    ? "Platz " + meins.platz + " von " + rangliste.length + " mit " + meins.gp + " GP"
    : "";
  zeige("ende");
}
