// probe.js – Optik-Probe: zeigt den Pixel-Stil mit Beispielinhalten.
// Keine Spiellogik, keine Verbindung zu Supabase.

import { szeneZeichnen } from "./engine/szenen.js";
import { jahrmarktErstellen } from "./engine/jahrmarkt.js";
import { FARBEN } from "./engine/rad.js";
import { neu } from "./engine/hilfen.js";
import { uiFarbenSetzen, uiFarbenZuruecksetzen } from "./engine/uifarben.js";

const $ = (id) => document.getElementById(id);

// Themen der Probe: Dateiname = Name des Hintergrundbilds (bilder/szenen/<name>.png)
const THEMEN = [
  ["raumfahrt", "Raumfahrt"], ["geographie", "Geographie"], ["tierwelt", "Tierwelt"],
  ["essen-trinken", "Essen & Trinken"], ["biologie", "Biologie"], ["chemie", "Chemie"],
  ["physik", "Physik"], ["mathe", "Mathe"], ["geschichte", "Zurück in die Vergangenheit"],
  ["das-ist-deutsch", "Das ist Deutsch"], ["filme-serien", "Filme & Serien"],
  ["videospiele", "Videospiele"], ["sport", "Sport"], ["jauch", "Die 500-€-Frage"],
  ["joker", "🃏 Eigenes Thema (Joker)"],
];

// Beispiel für den Joker (eigene Themen haben kein Paket)
const JOKER_BEISPIEL = {
  titel: "🃏 Valorant · Frage 1 von 10",
  frage: "Aus welchem Land stammt der Agent „Sage“?",
  optionen: ["China", "Japan", "Südkorea", "Vietnam"],
};

const auswahlListe = $("themaWahl");
for (const [name, titel] of THEMEN) {
  const option = neu("option", "", titel);
  option.value = name;
  auswahlListe.append(option);
}
auswahlListe.addEventListener("change", () => ansichtZeigen(auswahlListe.value));

// Holt eine zufällige Auswahlfrage aus dem echten Paket
async function beispielLaden(name) {
  if (name === "joker") return JOKER_BEISPIEL;
  const paket = await (await fetch("packs/" + name + ".json")).json();
  const auswahl = paket.fragen.filter((f) => f.modus === "auswahl" && !f.bild);
  const f = auswahl[Math.floor(Math.random() * auswahl.length)];
  return { titel: paket.thema + " · Frage 3 von 10", frage: f.frage, optionen: f.optionen };
}

// ---------------------------------------------------------------------------
// Umschalten zwischen den Ansichten
// ---------------------------------------------------------------------------
for (const knopf of document.querySelectorAll("[data-ansicht]")) {
  knopf.addEventListener("click", () => ansichtZeigen(knopf.dataset.ansicht));
}

async function ansichtZeigen(name) {
  const istMenue = name === "menue";
  $("menue").hidden = !istMenue;
  $("frage").hidden = istMenue;
  hintergrund(istMenue ? MENUE_BILD : name);
  if (!istMenue) {
    auswahlListe.value = name;
    frageZeigen(await beispielLaden(name));
  }
}

// Hintergrund: gibt es ein fertiges Bild (bilder/szenen/<name>.png), wird es
// gezeigt – sonst die mit Code gezeichnete Szene.
// Zum Vergleichen: probe.html?bild=farm-grob zeigt im Hauptmenü dieses Bild.
const MENUE_BILD = /^[a-z0-9-]{1,40}$/.test(new URLSearchParams(location.search).get("bild") || "")
  ? new URLSearchParams(location.search).get("bild")
  : "farm";

function hintergrund(name) {
  const bild = $("szeneBild");
  bild.onload = () => {
    bild.hidden = false;
    $("szene").hidden = true;
    uiFarbenSetzen(bild); // Rahmen, Pergament und Schrift passend zum Bild
  };
  bild.onerror = () => {
    bild.hidden = true;
    uiFarbenZuruecksetzen();
    $("szene").hidden = false;
    szeneZeichnen($("szene"), name === MENUE_BILD ? "farm" : name);
  };
  bild.src = "bilder/szenen/" + name + ".png";
}

function frageZeigen(beispiel) {
  $("fortschritt").textContent = beispiel.titel;
  $("fragetext").textContent = beispiel.frage;
  // Einheitliche Antwort-Knöpfe: nur ein Buchstabe A–D unterscheidet sie
  const buchstaben = ["A", "B", "C", "D"];
  $("optionen").replaceChildren(...beispiel.optionen.map((text, i) => {
    const knopf = neu("button", "pixel-option");
    knopf.append(neu("span", "buchstabe", buchstaben[i]), neu("span", "", text));
    return knopf;
  }));
}

// ---------------------------------------------------------------------------
// Jahrmarkt-Rad (Anna hat 2 Booster → 3 Karten in ihrer Farbe)
// ---------------------------------------------------------------------------
const KARTEN = [
  { thema: "Raumfahrt", farbe: FARBEN[0] },
  { thema: "Raumfahrt", farbe: FARBEN[0] },
  { thema: "Raumfahrt", farbe: FARBEN[0] },
  { thema: "Sport", farbe: FARBEN[1] },
  { thema: "Valorant", farbe: FARBEN[2] },
];

const rad = jahrmarktErstellen($("jahrmarkt"));
rad.kartenSetzen(KARTEN);

$("drehen").addEventListener("click", async () => {
  $("drehen").disabled = true;
  $("ergebnis").textContent = "";
  await rad.kartenSetzen(KARTEN); // von vorne losdrehen
  const gewinner = Math.floor(Math.random() * KARTEN.length);
  await rad.drehen(gewinner);
  $("ergebnis").textContent = "Thema: " + KARTEN[gewinner].thema + "!";
  $("drehen").disabled = false;
});

// Start-Ansicht: probe.html#tierwelt zeigt direkt die Tierwelt-Frage
const ausLink = location.hash.slice(1);
ansichtZeigen(THEMEN.some(([name]) => name === ausLink) ? ausLink : "menue");
