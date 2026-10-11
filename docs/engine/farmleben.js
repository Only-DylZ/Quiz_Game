// engine/farmleben.js – Die Avatare laufen über die Farm (Hintergrund farm.png).
//
// Jede Figur hat einen Zustand:
//   stehen   – wartet ein paar Sekunden (manchmal mit Sprechblase)
//   laufen   – geht auf den Wegen der Farm zu einem zufälligen Ziel
//   springen – hüpft einmal
//   jubeln   – Arme hoch und hüpfen (Gewinner)
// Dreht sich das Glücksrad, bleiben alle stehen und schauen hin.
//
// Benutzung:
//   const farm = farmlebenStarten(document.body, katalog);
//   farm.spielerSetzen([{ id, name, avatar }, …]);   // wer gerade da ist
//   farm.sagen(id, "Hallo!");                          // Sprechblase
//   farm.zumRadSchauen(true);  farm.jubeln(id);        // Glücksrad
//
// Alle Positionen sind in Pixeln des Hintergrundbilds (640 × 360). Weil das Bild
// den Bildschirm mit "object-fit: cover" füllt, rechnen wir genauso um.

import { blattZeichnen, bildZeichnen, FELD } from "./avatar.js";
import { spruch } from "./sprueche.js";

const BILD_BREITE = 640;
const BILD_HOEHE = 360;

// Wegenetz der Farm: Punkte auf den Wegen und welche verbunden sind.
// (Ausgemessen im Bild farm.png – nur der Bereich zwischen Tafel und Rad.)
const PUNKTE = {
  tor: [330, 184],
  kreuzung: [330, 205],
  scheuneLinks: [300, 197],
  scheuneRechts: [364, 197],
  links: [270, 207],
  teich: [250, 229],
  linksMitte: [234, 257],
  linksUnten: [222, 284],
  rechts: [400, 207],
  knick: [436, 214],
  rechtsMitte: [438, 246],
  rechtsUnten: [438, 280],
};
const WEGE = [
  ["tor", "kreuzung"], ["kreuzung", "scheuneLinks"], ["kreuzung", "scheuneRechts"],
  ["kreuzung", "links"], ["links", "teich"], ["teich", "linksMitte"], ["linksMitte", "linksUnten"],
  ["kreuzung", "rechts"], ["rechts", "knick"], ["knick", "rechtsMitte"], ["rechtsMitte", "rechtsUnten"],
];

const TEMPO = 26;               // Bildpixel pro Sekunde beim Laufen
const BILDER_PRO_SEKUNDE = 10;  // Tempo der Animationen
const FUSS_Y = 60;              // wo im 64er-Feld die Füße stehen
const GROESSE = 0.9;            // Figuren etwas kleiner als "ganze Pixel"
const BLASE_MS = 5000;          // so lange bleibt eine Sprechblase stehen

// Kürzester Weg (nach Anzahl Abschnitten) zwischen zwei Punkten im Wegenetz
export function wegFinden(start, ziel) {
  const nachbarn = {};
  for (const [a, b] of WEGE) {
    (nachbarn[a] ||= []).push(b);
    (nachbarn[b] ||= []).push(a);
  }
  const vorher = { [start]: null };
  const warteschlange = [start];
  while (warteschlange.length) {
    const punkt = warteschlange.shift();
    if (punkt === ziel) break;
    for (const n of nachbarn[punkt] || []) {
      if (!(n in vorher)) {
        vorher[n] = punkt;
        warteschlange.push(n);
      }
    }
  }
  if (!(ziel in vorher)) return [];
  const weg = [];
  for (let p = ziel; p !== null; p = vorher[p]) weg.unshift(p);
  return weg;
}

// Richtung, in die man schaut, wenn man von (x1,y1) nach (x2,y2) will.
// seitlich > 1: lieber nach links/rechts schauen (z. B. zum Rad – sonst sähe man
// beim Hochschauen nur den Hinterkopf).
export function richtungNach(x1, y1, x2, y2, seitlich = 1) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) * seitlich >= Math.abs(dy)) return dx >= 0 ? "rechts" : "links";
  return dy >= 0 ? "unten" : "oben";
}

const zufallZwischen = (min, max) => min + Math.random() * (max - min);
const zufallsPunkt = () => {
  const namen = Object.keys(PUNKTE);
  return namen[Math.floor(Math.random() * namen.length)];
};

export function farmlebenStarten(behaelter, katalog) {
  // Leinwand für die Figuren und eine Ebene für Sprechblasen (HTML, Text nur per textContent)
  const leinwand = document.createElement("canvas");
  leinwand.className = "farm-figuren";
  const blasen = document.createElement("div");
  blasen.className = "farm-blasen";
  behaelter.append(leinwand, blasen);
  const stift = leinwand.getContext("2d");

  const figuren = new Map(); // id → Figur
  let radZiel = null;        // { x, y } in Bildschirm-Pixeln, solange das Rad dreht
  let letzteZeit = performance.now();
  let laeuft = true;

  // Umrechnung Bildpixel → Bildschirm (wie object-fit: cover)
  function massstab() {
    const b = window.innerWidth;
    const h = window.innerHeight;
    const s = Math.max(b / BILD_BREITE, h / BILD_HOEHE);
    return { s, ox: (b - BILD_BREITE * s) / 2, oy: (h - BILD_HOEHE * s) / 2 };
  }

  function groesseAnpassen() {
    const dpr = window.devicePixelRatio || 1;
    leinwand.width = Math.round(window.innerWidth * dpr);
    leinwand.height = Math.round(window.innerHeight * dpr);
  }
  groesseAnpassen();
  window.addEventListener("resize", groesseAnpassen);

  function figurNeu(spieler) {
    const start = zufallsPunkt();
    const [x, y] = PUNKTE[start];
    const figur = {
      id: spieler.id,
      name: spieler.name,
      blatt: null,
      x: x + zufallZwischen(-6, 6),
      y: y + zufallZwischen(-3, 3),
      punkt: start,
      richtung: "unten",
      zustand: "stehen",
      zeit: 0,             // Sekunden im aktuellen Zustand
      dauer: zufallZwischen(1, 4),
      weg: [],             // noch abzulaufende Punkte [x, y]
      blase: null,         // { element, bis }
      jubelBis: 0,
    };
    blattZeichnen(katalog, spieler.avatar).then((blatt) => { figur.blatt = blatt; });
    return figur;
  }

  // ---------------------------------------------------------------------------
  // Verhalten
  // ---------------------------------------------------------------------------
  function naechsterZustand(figur) {
    figur.zeit = 0;
    const wurf = Math.random();
    if (wurf < 0.55) {
      // Zu einem zufälligen Punkt laufen – entlang der Wege
      const ziel = zufallsPunkt();
      const weg = wegFinden(figur.punkt, ziel);
      figur.weg = weg.slice(1).map((name) => {
        const [x, y] = PUNKTE[name];
        return [x + zufallZwischen(-6, 6), y + zufallZwischen(-3, 3)];
      });
      figur.punkt = ziel;
      figur.zustand = figur.weg.length ? "laufen" : "stehen";
      figur.dauer = zufallZwischen(1.5, 4);
    } else if (wurf < 0.7) {
      figur.zustand = "springen";
      figur.dauer = 5 / BILDER_PRO_SEKUNDE + 0.1;
    } else {
      figur.zustand = "stehen";
      figur.dauer = zufallZwischen(2, 6);
      // Ab und zu etwas sagen: meistens Wartesprüche, manchmal ein Fakt
      if (Math.random() < 0.35) sagen(figur.id, spruch(Math.random() < 0.3 ? "fakten" : "warten"));
    }
  }

  function bewegen(figur, sekunden) {
    figur.zeit += sekunden;

    // Rad dreht: stehen bleiben und hinschauen (der Gewinner jubelt trotzdem)
    if (radZiel && figur.zustand !== "jubeln") {
      const { s, ox, oy } = massstab();
      figur.richtung = richtungNach(ox + figur.x * s, oy + figur.y * s, radZiel.x, radZiel.y, 3);
      figur.zustand = "stehen";
      figur.weg = [];
      return;
    }

    if (figur.zustand === "laufen") {
      const [zx, zy] = figur.weg[0];
      const dx = zx - figur.x;
      const dy = zy - figur.y;
      const abstand = Math.hypot(dx, dy);
      const schritt = TEMPO * sekunden;
      figur.richtung = richtungNach(figur.x, figur.y, zx, zy);
      if (abstand <= schritt) {
        figur.x = zx;
        figur.y = zy;
        figur.weg.shift();
        if (!figur.weg.length) {
          figur.zustand = "stehen";
          figur.zeit = 0;
          figur.dauer = zufallZwischen(2, 5);
          if (Math.random() < 0.3) figur.richtung = "unten"; // zum Publikum drehen
        }
      } else {
        figur.x += (dx / abstand) * schritt;
        figur.y += (dy / abstand) * schritt;
      }
      return;
    }

    if (figur.zustand === "jubeln") {
      figur.richtung = "unten";
      if (performance.now() > figur.jubelBis) {
        figur.zustand = "stehen";
        figur.zeit = 0;
        figur.dauer = 3;
      }
      return;
    }

    if (figur.zeit >= figur.dauer) naechsterZustand(figur);
  }

  // ---------------------------------------------------------------------------
  // Zeichnen
  // ---------------------------------------------------------------------------
  function zeichnen() {
    const dpr = window.devicePixelRatio || 1;
    const { s, ox, oy } = massstab();
    // Vergrößerung der Figuren: grob in ganzen Bildschirm-Pixeln (Pixel bleiben fast
    // gleich groß), dann um GROESSE verkleinert (Wunsch: 10 % kleiner)
    const k = Math.max(1, Math.round(s * 0.7 * dpr)) * GROESSE;
    const groesse = FELD * k;

    stift.setTransform(1, 0, 0, 1, 0, 0);
    stift.clearRect(0, 0, leinwand.width, leinwand.height);
    stift.font = Math.round(8.5 * k) + "px 'Jersey 15', sans-serif";
    stift.textAlign = "center";
    stift.textBaseline = "top";
    stift.lineJoin = "round";

    // Wer weiter unten steht, wird später (also davor) gezeichnet
    const sortiert = [...figuren.values()].sort((a, b) => a.y - b.y);
    for (const f of sortiert) {
      const sx = Math.round((ox + f.x * s) * dpr);
      const sy = Math.round((oy + f.y * s) * dpr);
      let animation = "stehen";
      let bild = Math.floor(f.zeit * 2); // stehen: langsam atmen
      let hoch = 0;
      if (f.zustand === "laufen") {
        animation = "laufen";
        bild = 1 + (Math.floor(f.zeit * BILDER_PRO_SEKUNDE) % 8); // Bild 0 = stillstehen
      } else if (f.zustand === "springen") {
        animation = "springen";
        bild = Math.min(4, Math.floor(f.zeit * BILDER_PRO_SEKUNDE));
        hoch = Math.sin(Math.min(1, f.zeit / (5 / BILDER_PRO_SEKUNDE)) * Math.PI) * 10;
      } else if (f.zustand === "jubeln") {
        animation = "jubeln";
        bild = Math.min(2, Math.floor(f.zeit * BILDER_PRO_SEKUNDE));
        hoch = Math.abs(Math.sin(f.zeit * 5)) * 8;
      }

      const x = Math.round(sx - (FELD / 2) * k);
      const y = Math.round(sy - FUSS_Y * k - hoch * k);
      if (f.blatt) bildZeichnen(stift, f.blatt, animation, f.richtung, bild, x, y, Math.round(groesse));

      // Name unter den Füßen (fillText setzt nur Text – kein HTML)
      stift.lineWidth = Math.max(2, k);
      stift.strokeStyle = "rgba(30, 15, 5, 0.9)";
      stift.strokeText(f.name, sx, sy + 2 * k);
      stift.fillStyle = "#fff8e8";
      stift.fillText(f.name, sx, sy + 2 * k);

      // Sprechblase über dem Kopf (in CSS-Pixeln)
      if (f.blase) {
        if (performance.now() > f.blase.bis) {
          f.blase.element.remove();
          f.blase = null;
        } else {
          f.blase.element.style.left = sx / dpr + "px";
          f.blase.element.style.top = (y + 8 * k) / dpr + "px";
        }
      }
    }
  }

  function schleife(jetzt) {
    if (!laeuft) return;
    const sekunden = Math.min(0.1, (jetzt - letzteZeit) / 1000); // nach Tab-Wechsel nicht springen
    letzteZeit = jetzt;
    for (const f of figuren.values()) bewegen(f, sekunden);
    zeichnen();
    requestAnimationFrame(schleife);
  }
  requestAnimationFrame(schleife);

  // ---------------------------------------------------------------------------
  // Nach außen
  // ---------------------------------------------------------------------------
  function sagen(id, text, dauerMs = BLASE_MS) {
    const figur = figuren.get(id);
    if (!figur) return;
    if (figur.blase) figur.blase.element.remove();
    const element = document.createElement("div");
    element.className = "sprechblase";
    element.textContent = String(text).slice(0, 60); // nie innerHTML
    blasen.append(element);
    figur.blase = { element, bis: performance.now() + dauerMs };
  }

  return {
    // liste = [{ id, name, avatar }] – Neue kommen dazu, Fehlende verschwinden
    spielerSetzen(liste) {
      const ids = new Set(liste.map((s) => s.id));
      for (const [id, figur] of figuren) {
        if (!ids.has(id)) {
          if (figur.blase) figur.blase.element.remove();
          figuren.delete(id);
        }
      }
      for (const spieler of liste) {
        const vorhanden = figuren.get(spieler.id);
        if (!vorhanden) {
          figuren.set(spieler.id, figurNeu(spieler));
        } else {
          vorhanden.name = spieler.name;
          blattZeichnen(katalog, spieler.avatar).then((blatt) => { vorhanden.blatt = blatt; });
        }
      }
    },

    sagen,

    // Alle sagen etwas zur Situation (z. B. "rad"), leicht versetzt
    alleSagen(situation) {
      for (const id of figuren.keys()) {
        setTimeout(() => sagen(id, spruch(situation)), Math.random() * 1200);
      }
    },

    // ziel = { x, y } in Bildschirm-Pixeln (z. B. Mitte des Rads) oder null = weitermachen
    zumRadSchauen(ziel) {
      radZiel = ziel;
    },

    jubeln(id, dauerMs = 5000) {
      const figur = figuren.get(id);
      if (!figur) return;
      figur.zustand = "jubeln";
      figur.zeit = 0;
      figur.weg = [];
      figur.jubelBis = performance.now() + dauerMs;
    },

    beenden() {
      laeuft = false;
      window.removeEventListener("resize", groesseAnpassen);
      leinwand.remove();
      blasen.remove();
    },
  };
}
