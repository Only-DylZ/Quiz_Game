// engine/jahrmarkt.js – Das Glücksrad als Jahrmarkt-Rad im Pixel-Stil.
//
// Damit das Rad zu den Pixel-Hintergründen passt, wird es in GROBEN Pixeln
// gezeichnet – genauso groß wie die Pixel des Hintergrunds. Bei jeder
// Bewegung wird es neu gezeichnet, so stehen die Pixel nie schief.
//
// Aufbau (von hinten nach vorne), alles auf einer kleinen Leinwand:
//   1. Gestell aus Holz           (steht still)
//   2. Rad mit den Feldern        (dreht sich)
//   3. Rand, Glühbirnen, Zeiger   (steht still, Birnen blinken)
// Die Beschriftung liegt auf einer zweiten, scharfen Leinwand darüber.
//
// Benutzung:
//   const rad = jahrmarktErstellen(document.getElementById("jahrmarkt"));
//   await rad.kartenSetzen([{ thema: "Sport", farbe: "#3b7fb5" }, …]);
//   await rad.drehen(gewinnerIndex);   // dreht 5 s und bleibt dort stehen

import { svgNeu } from "./hilfen.js";
import { radZeichnen, radDrehung } from "./rad.js";
// Größe der Hintergrundbilder (bilder/szenen/*.png) in Pixeln
const BREITE = 640;
const HOEHE = 360;

export const DREHDAUER_MS = 5000;

// Maße in "Rad-Einheiten": Mitte des Rads = (0, 0), Rad-Radius ≈ 100
const BOX = { x: -130, y: -130, b: 260, h: 338 };

// Holzfarben passend zum Zaun im Farm-Bild
const HOLZ_DUNKEL = "#3b230f";
const HOLZ = "#6b4220";
const HOLZ_HELL = "#a5703a";
const HOLZ_GLANZ = "#d39b55";

export function jahrmarktErstellen(behaelter) {
  const pixel = document.createElement("canvas");  // grobe Pixel
  const schrift = document.createElement("canvas"); // scharfe Beschriftung
  pixel.className = "jahrmarkt-pixel";
  schrift.className = "jahrmarkt-schrift";
  behaelter.replaceChildren(pixel, schrift);

  let karten = [];
  let winkel = 0;          // aktuelle Drehung in Grad
  let birnenAn = true;
  let bilder = null;       // { hinten, rad, vorneAn, vorneAus }
  let massstab = 1;        // Leinwand-Pixel pro Rad-Einheit
  let auftrag = 0;         // zählt Vorbereitungen – nur die neueste wird gezeichnet

  // Wie groß ist ein Hintergrund-Pixel auf dem Bildschirm? (object-fit: cover)
  function pixelGroesse() {
    return Math.max(window.innerWidth / BREITE, window.innerHeight / HOEHE);
  }

  // Alle Bilder in der passenden Pixelgröße neu erzeugen
  async function vorbereiten() {
    const breite = behaelter.clientWidth;
    const hoehe = behaelter.clientHeight;
    if (!breite || !hoehe) return;
    const px = pixelGroesse();
    pixel.width = Math.max(40, Math.round(breite / px));
    pixel.height = Math.round((pixel.width * BOX.h) / BOX.b);
    massstab = pixel.width / BOX.b;

    const dpr = window.devicePixelRatio || 1;
    schrift.width = Math.round(breite * dpr);
    schrift.height = Math.round(hoehe * dpr);

    const durchmesser = Math.round(210 * massstab);
    const meinAuftrag = ++auftrag;
    const [hinten, rad, vorneAn, vorneAus] = await Promise.all([
      svgAlsBild(gestellHinten(), pixel.width, pixel.height),
      svgAlsBild(radZeichnen(karten, false), durchmesser, durchmesser),
      svgAlsBild(gestellVorne(true), pixel.width, pixel.height),
      svgAlsBild(gestellVorne(false), pixel.width, pixel.height),
    ]);
    // Inzwischen neue Karten gesetzt (z. B. ein Spieler hat umgewählt)? Dann nicht überschreiben
    if (meinAuftrag !== auftrag) return;
    bilder = { hinten, rad, vorneAn, vorneAus };
    zeichnen();
  }

  function zeichnen() {
    if (!bilder) return;
    const ctx = pixel.getContext("2d");
    ctx.imageSmoothingEnabled = false; // grobe Pixel, nichts verwischen
    ctx.clearRect(0, 0, pixel.width, pixel.height);
    const mx = -BOX.x * massstab;
    const my = -BOX.y * massstab;

    ctx.drawImage(bilder.hinten, 0, 0);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate((winkel * Math.PI) / 180);
    ctx.drawImage(bilder.rad, -bilder.rad.width / 2, -bilder.rad.height / 2);
    ctx.restore();
    ctx.drawImage(birnenAn ? bilder.vorneAn : bilder.vorneAus, 0, 0);

    beschriften();
  }

  // Themen-Namen scharf auf die zweite Leinwand, mitgedreht
  function beschriften() {
    const ctx = schrift.getContext("2d");
    ctx.clearRect(0, 0, schrift.width, schrift.height);
    const s = schrift.width / BOX.b; // Bildschirm-Pixel pro Rad-Einheit
    const n = karten.length;
    if (n === 0) return;
    ctx.save();
    ctx.translate(-BOX.x * s, -BOX.y * s);
    ctx.rotate((winkel * Math.PI) / 180);
    ctx.font = Math.round(13 * s) + "px 'Jersey 15', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    karten.forEach((karte, i) => {
      const mitte = ((i + 0.5) / n) * 360;
      const name = karte.thema.length > 16 ? karte.thema.slice(0, 15) + "…" : karte.thema;
      ctx.save();
      ctx.rotate(((mitte - 90) * Math.PI) / 180);
      ctx.translate(58 * s, 0);
      if (mitte > 180) ctx.rotate(Math.PI); // linke Hälfte nicht auf dem Kopf
      ctx.lineWidth = 3 * s * 0.5;
      ctx.strokeStyle = "rgba(40, 20, 5, 0.85)";
      ctx.strokeText(name, 0, 0); // fillText/strokeText setzen nur Text – kein HTML
      ctx.fillStyle = "#fff8e8";
      ctx.fillText(name, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  // Glühbirnen blinken
  setInterval(() => {
    birnenAn = !birnenAn;
    zeichnen();
  }, 450);

  // Bei Größenänderung neu vorbereiten
  new ResizeObserver(() => vorbereiten()).observe(behaelter);

  return {
    async kartenSetzen(neueKarten) {
      karten = neueKarten;
      winkel = 0;
      await document.fonts.load("20px 'Jersey 15'");
      await vorbereiten();
    },

    // Dreht das Rad so, dass es auf karten[gewinner] stehen bleibt
    drehen(gewinner) {
      const ziel = radDrehung(karten.length, gewinner);
      const start = performance.now();
      return new Promise((fertig) => {
        function schritt(jetzt) {
          const t = Math.min(1, (jetzt - start) / DREHDAUER_MS);
          winkel = ziel * (1 - (1 - t) ** 4); // erst schnell, dann langsam auslaufen
          zeichnen();
          if (t < 1) requestAnimationFrame(schritt);
          else fertig();
        }
        requestAnimationFrame(schritt);
      });
    },
  };
}

// Wandelt ein SVG-Element in ein Bild der gewünschten Größe um
function svgAlsBild(svg, breite, hoehe) {
  svg.setAttribute("width", breite);
  svg.setAttribute("height", hoehe);
  const text = new XMLSerializer().serializeToString(svg);
  return new Promise((fertig, fehler) => {
    const bild = new Image();
    bild.onload = () => fertig(bild);
    bild.onerror = fehler;
    bild.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
  });
}

function leeresSvg() {
  return svgNeu("svg", { viewBox: `${BOX.x} ${BOX.y} ${BOX.b} ${BOX.h}` });
}

// Holz-Gestell: zwei Beine mit Lichtkante, Querstrebe, Bodenplatte aus Brettern
function gestellHinten() {
  const svg = leeresSvg();
  const kante = { stroke: HOLZ_DUNKEL, "stroke-width": 4, "stroke-linejoin": "round" };
  svg.append(
    svgNeu("polygon", { points: "-16,0 -4,0 -64,196 -82,196", fill: HOLZ, ...kante }),
    svgNeu("polygon", { points: "16,0 4,0 64,196 82,196", fill: HOLZ, ...kante }),
    svgNeu("polygon", { points: "-12,4 -8,4 -68,192 -74,192", fill: HOLZ_HELL }),
    svgNeu("polygon", { points: "12,4 8,4 68,192 62,192", fill: HOLZ_HELL }),
    svgNeu("rect", { x: -56, y: 138, width: 112, height: 10, fill: HOLZ_HELL, ...kante }),
    svgNeu("rect", { x: -104, y: 190, width: 208, height: 16, fill: HOLZ, ...kante }),
    svgNeu("rect", { x: -100, y: 193, width: 200, height: 3, fill: HOLZ_GLANZ }),
    svgNeu("circle", { r: 113, fill: HOLZ_DUNKEL })
  );
  for (const x of [-60, -10, 40]) svg.append(svgNeu("rect", { x, y: 190, width: 3, height: 16, fill: HOLZ_DUNKEL }));
  return svg;
}

// Vorne: Holzrand, Glühbirnen (an/aus), Glanz, Nabe, Zeiger
function gestellVorne(birnenAn) {
  const svg = leeresSvg();
  const defs = svgNeu("defs");
  const glanz = svgNeu("radialGradient", { id: "glanz", cx: "35%", cy: "30%", r: "80%" });
  glanz.append(
    svgNeu("stop", { offset: "0", "stop-color": "#ffffff", "stop-opacity": "0.3" }),
    svgNeu("stop", { offset: "0.5", "stop-color": "#ffffff", "stop-opacity": "0" }),
    svgNeu("stop", { offset: "1", "stop-color": "#000000", "stop-opacity": "0.35" })
  );
  defs.append(glanz);
  svg.append(
    defs,
    svgNeu("circle", { r: 101, fill: "url(#glanz)" }),
    svgNeu("circle", { r: 107, fill: "none", stroke: HOLZ_DUNKEL, "stroke-width": 14 }),
    svgNeu("circle", { r: 107, fill: "none", stroke: HOLZ, "stroke-width": 9 }),
    svgNeu("path", { d: "M -97 -45 A 107 107 0 0 1 45 -97", fill: "none", stroke: HOLZ_HELL, "stroke-width": 3 })
  );

  const anzahl = 20;
  for (let i = 0; i < anzahl; i++) {
    const w = (i / anzahl) * Math.PI * 2;
    const x = 107 * Math.sin(w);
    const y = -107 * Math.cos(w);
    const an = birnenAn === (i % 2 === 0);
    if (an) svg.append(svgNeu("circle", { cx: x, cy: y, r: 7, fill: "#ffe9a0", opacity: 0.35 }));
    svg.append(
      svgNeu("circle", { cx: x, cy: y, r: 3.8, fill: an ? "#fff3b0" : "#9a7a3a", stroke: HOLZ_DUNKEL, "stroke-width": 1.2 }),
      svgNeu("circle", { cx: x - 1.2, cy: y - 1.2, r: 1.1, fill: "#ffffff", opacity: an ? 0.9 : 0.3 })
    );
  }

  // Nabe
  svg.append(
    svgNeu("circle", { r: 15, fill: HOLZ_DUNKEL }),
    svgNeu("circle", { r: 11, fill: "#e0a83a" }),
    svgNeu("circle", { cx: -3, cy: -3, r: 4, fill: "#ffe2a0" }),
    svgNeu("circle", { r: 3, fill: HOLZ_DUNKEL })
  );

  // Zeiger oben: Holzpfeil mit roter Spitze
  svg.append(
    svgNeu("rect", { x: -7, y: -130, width: 14, height: 14, fill: HOLZ, stroke: HOLZ_DUNKEL, "stroke-width": 3 }),
    svgNeu("polygon", { points: "-12,-118 12,-118 0,-94", fill: "#c8473a", stroke: HOLZ_DUNKEL, "stroke-width": 3, "stroke-linejoin": "round" }),
    svgNeu("polygon", { points: "-7,-115 0,-115 -2,-106", fill: "#e8806f" })
  );
  return svg;
}
