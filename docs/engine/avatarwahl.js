// engine/avatarwahl.js – Avatar-Baukasten zum Beitreten (wie bei skribbl.io):
// oben eine große Vorschau, darunter pro Kategorie "◀ Frisur: Afro ▶".
//
// Benutzung:
//   const wahl = await avatarwahlErstellen(behaelter, katalog);
//   wahl.avatar   – der aktuell gewählte Avatar (geprüft, siehe avatar.js)
//
// Die Wahl merkt sich der Browser (localStorage), damit man beim nächsten
// Spielabend nicht alles neu einstellen muss. Klappt das nicht (privates
// Fenster o. Ä.), gibt es einfach einen Zufalls-Avatar.

import { neu } from "./hilfen.js";
import {
  zufallsAvatar, avatarPruefen, farbtabelleVon, blattZeichnen, bildZeichnen, FELD,
} from "./avatar.js";

const SPEICHER = "quiz-avatar";
const FIGUR_NAMEN = ["Männlich", "Weiblich"];

// Deutsche Namen der Farben aus den LPC-Farbtabellen
const FARB_NAMEN = {
  light: "Hell", amber: "Bernstein", olive: "Oliv", taupe: "Taupe", bronze: "Bronze",
  brown: "Braun", black: "Schwarz", green: "Grün", blue: "Blau", lavender: "Lavendel",
  dark_brown: "Dunkelbraun", chestnut: "Kastanie", light_brown: "Hellbraun", blonde: "Blond",
  platinum: "Platin", gray: "Grau", redhead: "Rot", orange: "Orange", pink: "Pink",
  purple: "Lila", charcoal: "Anthrazit", white: "Weiß", red: "Rot", maroon: "Weinrot",
  yellow: "Gelb", forest: "Waldgrün", teal: "Petrol", sky: "Himmelblau", navy: "Marine",
  tan: "Sand",
};

function gespeichert(katalog) {
  try {
    return avatarPruefen(katalog, JSON.parse(localStorage.getItem(SPEICHER)));
  } catch {
    return null;
  }
}

function speichern(avatar) {
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(avatar));
  } catch {
    // egal – dann eben nicht gemerkt
  }
}

export async function avatarwahlErstellen(behaelter, katalog) {
  let avatar = gespeichert(katalog) || zufallsAvatar(katalog);

  // Vorschau: läuft auf der Stelle nach unten
  const vorschau = neu("canvas", "avatar-vorschau");
  vorschau.width = 128;
  vorschau.height = 128;
  const stift = vorschau.getContext("2d");
  let blatt = null;
  let bildNummer = 0;
  setInterval(() => {
    if (!blatt || !vorschau.isConnected) return;
    bildNummer = (bildNummer + 1) % 8;
    stift.clearRect(0, 0, 128, 128);
    bildZeichnen(stift, blatt, "laufen", "unten", bildNummer + 1, 0, 0, 128);
  }, 110);

  const zeilen = neu("div", "avatar-zeilen");
  const zufall = neu("button", "klein", "🎲 Zufall");
  zufall.type = "button";
  zufall.addEventListener("click", () => {
    avatar = zufallsAvatar(katalog);
    aktualisieren();
  });
  behaelter.replaceChildren(vorschau, zeilen, zufall);

  // Eine Zeile "◀ Name: Wert ▶". wert() liefert den Text, schritt(+1/-1) blättert.
  function zeile(name, wert, schritt, farbe = null) {
    const links = neu("button", "klein pfeil", "◀");
    const rechts = neu("button", "klein pfeil", "▶");
    links.type = "button";
    rechts.type = "button";
    links.setAttribute("aria-label", name + " zurück");
    rechts.setAttribute("aria-label", name + " weiter");
    links.addEventListener("click", () => { schritt(-1); aktualisieren(); });
    rechts.addEventListener("click", () => { schritt(1); aktualisieren(); });

    const mitte = neu("span", "avatar-wert");
    mitte.append(neu("span", "avatar-name", name));
    if (farbe) {
      const muster = neu("span", "farb-muster");
      muster.style.background = farbe; // Farbe kommt aus teile.json, nicht vom Netz
      mitte.append(muster);
    }
    mitte.append(neu("span", "", wert()));
    const element = neu("div", "avatar-zeile");
    element.append(links, mitte, rechts);
    return element;
  }

  // Im Kreis blättern: bei freiwilligen Kategorien gibt es zusätzlich -1 = nichts
  const blaettern = (wert, richtung, anzahl, min) =>
    ((wert - min + richtung + (anzahl - min)) % (anzahl - min)) + min;

  function aktualisieren() {
    avatar = avatarPruefen(katalog, avatar) || zufallsAvatar(katalog);
    speichern(avatar);
    const liste = [];

    liste.push(zeile("Figur", () => FIGUR_NAMEN[avatar.figur] || "Figur " + (avatar.figur + 1),
      (r) => { avatar.figur = blaettern(avatar.figur, r, katalog.figuren.length, 0); }));

    for (const k of katalog.kategorien) {
      // Die "Figur"-Kategorie hat nur ein Teil (den Körper) – dort nur die Hautfarbe zeigen
      if (k.teile.length > 1 || k.freiwillig) {
        const min = k.freiwillig ? -1 : 0;
        liste.push(zeile(k.name,
          () => (avatar.teile[k.id] < 0 ? "keine" : k.teile[avatar.teile[k.id]].name),
          (r) => { avatar.teile[k.id] = blaettern(avatar.teile[k.id], r, k.teile.length, min); }));
      }

      // Farbzeile nur, wenn das gewählte Teil umgefärbt werden kann
      const tabelleName = farbtabelleVon(katalog, k.id);
      const teil = k.teile[avatar.teile[k.id]];
      if (!tabelleName || !teil || teil.farbe !== tabelleName) continue;
      if (tabelleName === "haut" && k.id !== "figur") continue; // Kopf: Haut kommt von der Figur
      const tabelle = katalog.farben[tabelleName];
      const variante = tabelle.varianten[avatar.farben[k.id]];
      const titel = k.id === "figur" ? "Haut" : k.id === "frisur" ? "Haarfarbe" : k.name + "-Farbe";
      liste.push(zeile(titel,
        () => FARB_NAMEN[variante.name] || variante.name,
        (r) => { avatar.farben[k.id] = blaettern(avatar.farben[k.id], r, tabelle.varianten.length, 0); },
        variante.farben[Math.floor(variante.farben.length / 2)]));
    }
    zeilen.replaceChildren(...liste);

    const meins = avatar;
    blattZeichnen(katalog, meins).then((fertig) => {
      if (meins === avatar) blatt = fertig;
    });
  }
  aktualisieren();

  return {
    get avatar() {
      return avatar;
    },
  };
}
