// play.js – Logik der Spieler-Seite (Handy).
//
// Das Handy kennt nie die Lösungen. Es zeigt nur, was der Host schickt:
//   "frage"      → Eingabe anzeigen, Antwort an den Host senden
//   "aufloesung" → richtig/falsch und die Lösung anzeigen
//   "ende"       → Spielende anzeigen

import { raumBetreten, raumcodePruefen, neueId } from "./realtime.js";
import { zahlText } from "./engine/hilfen.js";
import * as auswahl from "./engine/auswahl.js";
import * as schaetzen from "./engine/schaetzen.js";

// Alle Modi, die wir schon können (muss zu host.js passen)
const MODI = { auswahl, schaetzen };

// Wie lange wir nach dem Verbinden auf den Host warten (Millisekunden)
const HOST_WARTEZEIT = 4000;

const $ = (id) => document.getElementById(id);

let raum = null;           // die Verbindung zum Raum
let ich = null;            // { id, name, rolle }
let hostGefunden = false;  // ist der Host im Raum?
let warteTimer = null;     // Zeitgeber für "Raum nicht gefunden"
let aktuelleNummer = -1;   // welche Frage gerade angezeigt wird
let uhr = null;            // Countdown-Zeitgeber

// ---------------------------------------------------------------------------
// Anzeige: immer nur einen Abschnitt zeigen
// ---------------------------------------------------------------------------
const ABSCHNITTE = ["beitreten", "warten", "frage", "ergebnis", "ende"];

function zeige(name) {
  for (const abschnitt of ABSCHNITTE) {
    $(abschnitt).hidden = abschnitt !== name;
  }
}

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

  if (nachricht.typ === "frage") frageAnzeigen(daten);
  else if (nachricht.typ === "aufloesung") ergebnisAnzeigen(daten);
  else if (nachricht.typ === "ende") spielEnde(daten);
  // Andere Nachrichten (z. B. Antworten anderer Spieler) ignorieren wir.
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
  $("meldung").textContent = "";
  $("fortschritt").textContent = "Frage " + (daten.nummer + 1) + " von " + daten.gesamt;
  $("fragetext").textContent = daten.text;
  $("status").textContent = "";

  // Der Modus zeichnet die Eingabe.
  // - senden(antwort): endgültige Antwort
  // - entwurfSenden(antwort): Zwischenstand, zählt bei Zeitablauf ohne Senden
  const senden = (antwort) => {
    raum.senden("antwort", { id: ich.id, nummer: daten.nummer, antwort });
    $("status").textContent = "Antwort gesendet – warte auf die Auflösung …";
  };
  const entwurfSenden = (antwort) => {
    raum.senden("entwurf", { id: ich.id, nummer: daten.nummer, antwort });
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

  const ergebnisse = Array.isArray(daten.ergebnisse) ? daten.ergebnisse : [];
  const meins = ergebnisse.find((e) => e.id === ich.id);

  let text;
  if (!meins || !meins.beantwortet) text = "Keine Antwort 😴";
  else if (meins.punkte > 0) text = "+" + zahlText(meins.punkte) + " Punkte 🎉";
  else text = "Leider 0 Punkte";

  $("ergebnisText").textContent = text;
  $("loesungText").textContent = "Lösung: " + daten.loesungText;
  $("standText").textContent = meins
    ? "Gesamt: " + zahlText(meins.gesamt) + " Punkte · Platz " + meins.platz
    : "";
  zeige("ergebnis");
}

function spielEnde(daten) {
  clearInterval(uhr);

  const rangliste = Array.isArray(daten.rangliste) ? daten.rangliste : [];
  const meins = rangliste.find((r) => r.id === ich.id);

  $("endeText").textContent = meins
    ? "Platz " + meins.platz + " von " + rangliste.length +
      " mit " + zahlText(meins.punkte) + " Punkten"
    : "";
  zeige("ende");
}
