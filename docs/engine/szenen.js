// engine/szenen.js – Pixel-Hintergründe, mit Code gezeichnet.
//
// Jede Szene wird auf eine kleine Leinwand (640 × 360 Pixel) gemalt und dann
// per CSS groß gezogen – ohne Weichzeichnen (image-rendering: pixelated).
// So entsteht der Retro-Look, und wir brauchen keine fremden Bilddateien.
//
// 3D-Wirkung: Kugeln, Zylinder und Flächen werden nach einer Lichtquelle
// (oben links) schattiert. Zwischen zwei Farbstufen wird "gerastert"
// (Dithering mit Bayer-Muster) – wie in alten Spielen.
//
// Benutzung:  szeneZeichnen(document.querySelector("canvas"), "raumfahrt")
// Unbekannte Namen (z. B. Joker-Themen) bekommen die Szene "joker".

export const BREITE = 640;
export const HOEHE = 360;

// Alle Szenen. Der Name passt zum Dateinamen des Pakets (ohne .json).
const SZENEN = {
  farm,
  raumfahrt,
  tierwelt: dschungel,
  joker,
};

export function szeneZeichnen(canvas, name) {
  canvas.width = BREITE;
  canvas.height = HOEHE;
  const m = new Maler(BREITE, HOEHE);
  (SZENEN[name] || SZENEN.joker)(m);
  canvas.getContext("2d").putImageData(new ImageData(m.daten, BREITE, HOEHE), 0, 0);
}

// ---------------------------------------------------------------------------
// Der "Maler": malt direkt in einen Pixel-Speicher (schnell, immer scharf)
// ---------------------------------------------------------------------------

// Bayer-Muster 4×4: entscheidet beim Rastern, welcher Pixel welche Farbe bekommt
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((w) => (w + 0.5) / 16);
const bayer = (x, y) => BAYER[(Math.round(y) & 3) * 4 + (Math.round(x) & 3)];

// Richtung des Lichts (oben links, leicht von vorne)
const LICHT = normieren([-0.55, -0.65, 0.55]);

function normieren([x, y, z]) {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
}

class Maler {
  constructor(b, h) {
    this.b = b;
    this.h = h;
    this.daten = new Uint8ClampedArray(b * h * 4);
    this.farben = new Map();
    this.zufall = zufallsZahlen(42); // fester Startwert → jedes Mal dasselbe Bild
  }

  // "#a1b2c3" → [161, 178, 195] (gemerkt, damit es schnell geht)
  rgb(hex) {
    let f = this.farben.get(hex);
    if (!f) {
      f = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      this.farben.set(hex, f);
    }
    return f;
  }

  // Ein Pixel; mit alpha < 1 durchscheinend (für Licht, Schatten, Nebel)
  p(x, y, hex, alpha = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.b || y >= this.h) return;
    const [r, g, b] = this.rgb(hex);
    const i = (y * this.b + x) * 4;
    const d = this.daten;
    if (alpha >= 1) {
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    } else {
      d[i] += (r - d[i]) * alpha;
      d[i + 1] += (g - d[i + 1]) * alpha;
      d[i + 2] += (b - d[i + 2]) * alpha;
    }
    d[i + 3] = 255;
  }

  // Rechteck
  r(x, y, b, h, hex, alpha = 1) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    for (let yy = y0; yy < y0 + Math.round(h); yy++) {
      for (let xx = x0; xx < x0 + Math.round(b); xx++) this.p(xx, yy, hex, alpha);
    }
  }

  // Senkrechter Farbverlauf mit Rasterung zwischen den Stufen
  verlauf(y0, y1, stufen, x0 = 0, x1 = this.b) {
    for (let y = y0; y < y1; y++) {
      const pos = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (stufen.length - 1);
      const i = Math.floor(pos);
      for (let x = x0; x < x1; x++) {
        const j = Math.min(stufen.length - 1, i + (bayer(x, y) < pos - i ? 1 : 0));
        this.p(x, y, stufen[j]);
      }
    }
  }

  // Gefüllte Ellipse / Kreis
  ellipse(cx, cy, rx, ry, hex, alpha = 1) {
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      const t = 1 - (dy * dy) / ((ry + 0.5) ** 2);
      if (t < 0) continue;
      const w = Math.floor((rx + 0.5) * Math.sqrt(t));
      for (let dx = -w; dx <= w; dx++) this.p(cx + dx, cy + dy, hex, alpha);
    }
  }

  kreis(cx, cy, rad, hex, alpha = 1) {
    this.ellipse(cx, cy, rad, rad, hex, alpha);
  }

  // Schatten am Boden: dunkle, durchscheinende flache Ellipse
  schatten(cx, cy, rx, ry, staerke = 0.35) {
    this.ellipse(cx, cy, rx, ry, "#000000", staerke);
  }

  // Kugel mit Licht und Schatten. palette = Farben von dunkel nach hell
  // (oder eine Funktion (x, y) → palette, z. B. für Streifen auf Planeten)
  kugel(cx, cy, rad, palette, umriss = null) {
    const R = Math.ceil(rad);
    for (let dy = -R; dy <= R; dy++) {
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > (rad + 0.5) ** 2) continue;
        const nx = dx / rad;
        const ny = dy / rad;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const hell = nx * LICHT[0] + ny * LICHT[1] + nz * LICHT[2];
        const x = cx + dx;
        const y = cy + dy;
        const pal = typeof palette === "function" ? palette(x, y) : palette;
        this.p(x, y, stufeWaehlen(pal, (hell + 0.25) / 1.25, x, y));
      }
    }
    if (umriss) this.ring(cx, cy, rad, umriss);
  }

  // Dünner Kreisring (Umriss)
  ring(cx, cy, rad, hex) {
    for (let w = 0; w < 360; w += 0.5) {
      const a = (w * Math.PI) / 180;
      this.p(cx + rad * Math.cos(a), cy + rad * Math.sin(a), hex);
    }
  }

  // Stehender Zylinder (Silo, Baumstamm, Rakete): links hell, rechts dunkel
  zylinder(x, y, b, h, palette) {
    for (let xx = 0; xx < b; xx++) {
      const nx = ((xx + 0.5) / b) * 2 - 1;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
      const hell = nx * LICHT[0] + nz * (LICHT[2] + 0.35);
      for (let yy = 0; yy < h; yy++) {
        this.p(x + xx, y + yy, stufeWaehlen(palette, (hell + 0.3) / 1.3, x + xx, y + yy));
      }
    }
  }

  // Beliebige Fläche aus Eckpunkten [[x, y], …] (Zeile für Zeile gefüllt)
  vieleck(punkte, hex, alpha = 1) {
    const ys = punkte.map((pt) => pt[1]);
    const yMin = Math.max(0, Math.floor(Math.min(...ys)));
    const yMax = Math.min(this.h - 1, Math.ceil(Math.max(...ys)));
    for (let y = yMin; y <= yMax; y++) {
      const yy = y + 0.5;
      const xs = [];
      for (let i = 0; i < punkte.length; i++) {
        const [x0, y0] = punkte[i];
        const [x1, y1] = punkte[(i + 1) % punkte.length];
        if ((y0 <= yy && y1 > yy) || (y1 <= yy && y0 > yy)) {
          xs.push(x0 + ((yy - y0) * (x1 - x0)) / (y1 - y0));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.p(x, y, hex, alpha);
      }
    }
  }

  // Linie (auch dicker)
  linie(x0, y0, x1, y1, hex, dicke = 1, alpha = 1) {
    const schritte = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= schritte; i++) {
      const x = x0 + ((x1 - x0) * i) / schritte;
      const y = y0 + ((y1 - y0) * i) / schritte;
      this.r(x - Math.floor(dicke / 2), y - Math.floor(dicke / 2), dicke, dicke, hex, alpha);
    }
  }

  // Hügelkette mit heller Kante oben
  huegel(basisY, hoehe, wellen, versatz, hex, kante) {
    for (let x = 0; x < this.b; x++) {
      const y = Math.round(basisY - hoehe * (0.5 + 0.5 * Math.sin((x / this.b) * Math.PI * wellen + versatz)));
      for (let yy = y; yy < this.h; yy++) this.p(x, yy, hex);
      if (kante) { this.p(x, y, kante); this.p(x, y + 1, kante); }
    }
  }

  // Zufallszahl zwischen a und b (ganzzahlig)
  zz(a, b) {
    return a + Math.floor(this.zufall() * (b - a + 1));
  }
}

// Wählt aus einer Palette (dunkel → hell) die Stufe für eine Helligkeit 0…1,
// gerastert, damit die Übergänge weich wirken
function stufeWaehlen(palette, hell, x, y) {
  const pos = Math.min(1, Math.max(0, hell)) * (palette.length - 1);
  const i = Math.floor(pos);
  return palette[Math.min(palette.length - 1, i + (bayer(x, y) < pos - i ? 1 : 0))];
}

// Einfacher Zufallsgenerator mit festem Startwert ("mulberry32")
function zufallsZahlen(start) {
  let a = start;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Wiederverwendbare Teile
// ---------------------------------------------------------------------------
const WOLKE = ["#a9c6dc", "#c9deec", "#e6f1f8", "#ffffff"];
const LAUB = ["#1f4d22", "#2d6a2c", "#3f8a36", "#5aa845", "#7cc45a"];
const HOLZ = ["#3b1d0b", "#5b2c0f", "#7a4219", "#9a5a26", "#b87436"];

function wolke(m, x, y, s) {
  m.schatten(x, y + s * 0.9, s * 2.2, s * 0.25, 0.08);
  for (const [dx, dy, f] of [[-1.3, 0.25, 0.7], [1.3, 0.3, 0.65], [-0.5, -0.2, 0.9], [0.5, -0.1, 0.85], [0, 0.3, 0.8]]) {
    m.kugel(x + dx * s, y + dy * s, s * f, WOLKE);
  }
}

// Runder Laubbaum mit Stamm und Schatten
function laubbaum(m, x, boden, groesse) {
  m.schatten(x + groesse * 0.4, boden, groesse * 1.1, groesse * 0.22, 0.25);
  m.zylinder(x - groesse * 0.12, boden - groesse * 1.3, groesse * 0.24, groesse * 1.3, HOLZ);
  m.kugel(x - groesse * 0.45, boden - groesse * 1.5, groesse * 0.6, LAUB);
  m.kugel(x + groesse * 0.45, boden - groesse * 1.45, groesse * 0.58, LAUB);
  m.kugel(x, boden - groesse * 1.95, groesse * 0.75, LAUB);
}

// Langes Blatt entlang einer Achse; eine Hälfte heller (Licht), Blattader in der Mitte
function blatt(m, x, y, laenge, winkel, breite, hell, dunkel, ader) {
  const a = (winkel * Math.PI) / 180;
  const ax = Math.cos(a);
  const ay = Math.sin(a);
  const links = [];
  const rechts = [];
  const achse = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const w = breite * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (1 - t * 0.3);
    const px = x + ax * laenge * t;
    const py = y + ay * laenge * t + laenge * 0.12 * t * t; // Blatt hängt etwas durch
    achse.push([px, py]);
    links.push([px - ay * w, py + ax * w]);
    rechts.push([px + ay * w, py - ax * w]);
  }
  m.vieleck([...achse, ...links.reverse()], dunkel);
  m.vieleck([...achse, ...rechts.reverse()], hell);
  for (let i = 0; i < achse.length - 1; i++) {
    m.linie(achse[i][0], achse[i][1], achse[i + 1][0], achse[i + 1][1], ader);
  }
}

// ---------------------------------------------------------------------------
// Szene: Farm (Hauptmenü). Rechts bleibt Platz für das Jahrmarkt-Rad.
// ---------------------------------------------------------------------------
function farm(m) {
  m.verlauf(0, 230, ["#3a86d0", "#4f9ad9", "#66ade3", "#82c0ec", "#a2d3f3", "#c4e4f8", "#dff0fa"]);

  // Sonne mit Schein
  for (const [rad, a] of [[46, 0.12], [36, 0.18], [28, 0.3]]) m.kreis(84, 58, rad, "#fff6c8", a);
  m.kugel(84, 58, 20, ["#f5b82e", "#ffd34d", "#ffe680", "#fff4b8"]);

  wolke(m, 200, 52, 14);
  wolke(m, 380, 34, 11);
  wolke(m, 540, 70, 16);

  // Berge in der Ferne: Licht- und Schattenseite, Schneekappen
  for (const [x, hoehe, breite] of [[120, 95, 120], [250, 120, 140], [400, 90, 120], [530, 112, 150], [640, 80, 110]]) {
    const spitze = [x, 215 - hoehe];
    m.vieleck([spitze, [x - breite, 216], [x, 216]], "#7f9fc2");
    m.vieleck([spitze, [x, 216], [x + breite, 216]], "#5f7fa6");
    const s = hoehe * 0.28;
    m.vieleck([spitze, [x - s * 1.2, spitze[1] + s], [x - s * 0.3, spitze[1] + s * 0.75], [x, spitze[1] + s * 1.05]], "#f4f8fc");
    m.vieleck([spitze, [x, spitze[1] + s * 1.05], [x + s * 0.5, spitze[1] + s * 0.8], [x + s * 1.2, spitze[1] + s]], "#c9d8e8");
  }
  m.r(0, 190, 640, 30, "#dff0fa", 0.25); // Dunst vor den Bergen

  // Hügel und Baumreihe
  m.huegel(222, 22, 3, 0.4, "#5b9a45", "#7ab85c");
  for (let x = 8; x < 640; x += m.zz(26, 44)) laubbaum(m, x, 228 + m.zz(-3, 3), m.zz(9, 13));
  m.huegel(238, 12, 5, 2, "#64a84a", "#86c766");

  // Wiese: Verlauf + Grasbüschel
  m.verlauf(236, 360, ["#82c556", "#79bd4d", "#6fb244", "#64a63c", "#599a34"]);
  for (let i = 0; i < 900; i++) {
    const x = m.zz(0, 639);
    const y = m.zz(240, 359);
    const f = m.zz(0, 2) ? "#4e8e2e" : "#9bd86c";
    m.p(x, y, f);
    m.p(x - 1, y - 1, f);
    m.p(x + 1, y - 1, f);
  }

  feld(m);
  scheune(m, 268, 178);
  silo(m, 404, 140);

  // Heuballen neben der Scheune
  for (const [x, y, s] of [[392, 262, 12], [418, 268, 13]]) {
    m.schatten(x + 6, y + s - 2, s * 1.2, s * 0.3, 0.3);
    m.kugel(x, y, s, ["#a8781f", "#c8962e", "#e0b44a", "#f2d27a"], "#7a5414");
    m.ring(x, y, s * 0.55, "#b98a2a");
    m.ring(x, y, s * 0.25, "#b98a2a");
  }

  zelt(m, 590, 168); // Jahrmarktzelt ganz rechts (halb hinter dem Rad)

  // Wimpelkette vom Silo zum Zelt
  const wimpel = ["#e5484d", "#ffd166", "#3b82c4", "#3f9a3a", "#b05cd6"];
  for (let i = 0; i <= 40; i++) {
    const x = 422 + i * 4.3;
    const y = 150 + 14 * Math.sin((i / 40) * Math.PI);
    m.p(x, y, "#4a2410");
    if (i % 3 === 0) {
      const f = wimpel[(i / 3) % wimpel.length];
      m.vieleck([[x - 2, y + 1], [x + 3, y + 1], [x + 0.5, y + 8]], f);
      m.p(x - 1, y + 2, "#ffffff");
    }
  }

  zaun(m, 286);
  weg(m);

  // Blumen in Grüppchen
  const bluete = ["#ff6b8a", "#ffffff", "#ffd166", "#b28dff", "#ff8c42"];
  for (let g = 0; g < 26; g++) {
    const gx = m.zz(280, 630);
    const gy = m.zz(300, 352);
    const f = bluete[g % bluete.length];
    for (let k = 0; k < 4; k++) {
      const x = gx + m.zz(-6, 6);
      const y = gy + m.zz(-3, 3);
      m.p(x, y + 1, "#3f8f3a");
      m.p(x, y + 2, "#3f8f3a");
      m.p(x, y, f);
      m.p(x - 1, y, f, 0.6);
      m.p(x + 1, y, f, 0.6);
      m.p(x, y - 1, f, 0.6);
    }
  }
}

// Feld mit Pflanzenreihen in Perspektive (vorne größer)
function feld(m) {
  for (let reihe = 0; reihe < 9; reihe++) {
    const y = 252 + reihe * reihe * 1.25 + reihe * 6;
    const h = 4 + reihe * 0.8;
    const x0 = 10 - reihe * 2;
    const x1 = 250 + reihe * 4;
    m.r(x0, y, x1 - x0, h, "#8b5a2b");
    m.r(x0, y, x1 - x0, 1, "#a8743c");
    m.r(x0, y + h, x1 - x0, 2, "#5f3b1b");
    const abstand = 10 + reihe * 1.5;
    for (let x = x0 + 6; x < x1 - 4; x += abstand) {
      if ((reihe + Math.round(x)) % 7 === 0) {
        m.kugel(x, y - 1, 3 + reihe * 0.45, ["#b5520f", "#d9701c", "#f08f2e", "#ffb45c"]); // Kürbis
        m.p(x, y - 4 - reihe * 0.45, "#3f6b1f");
      } else {
        blattPaar(m, x, y, 2 + reihe * 0.35);
      }
    }
  }
}

function blattPaar(m, x, y, g) {
  m.vieleck([[x, y], [x - g * 1.6, y - g * 1.4], [x - g * 0.3, y - g * 0.5]], "#4f9e3a");
  m.vieleck([[x, y], [x + g * 1.6, y - g * 1.4], [x + g * 0.3, y - g * 0.5]], "#3a7f2c");
  m.vieleck([[x, y], [x - g * 0.4, y - g * 2.2], [x + g * 0.4, y - g * 2.2]], "#6cc04f");
}

// Scheune: Vorderseite, Seitenwand (dunkler, nach hinten), Dach, Schatten
function scheune(m, x0, y0) {
  const b = 104;
  const h = 76;
  const tief = 46;
  const steig = -22;

  // Schlagschatten nach rechts
  m.vieleck([[x0 + b, y0 + h], [x0 + b + tief + 40, y0 + h + steig + 6], [x0 + b + tief + 50, y0 + h + 10], [x0 + 20, y0 + h + 12]], "#000000", 0.22);

  // Seitenwand mit Brettern und Fenster
  m.vieleck([[x0 + b, y0], [x0 + b + tief, y0 + steig], [x0 + b + tief, y0 + h + steig], [x0 + b, y0 + h]], "#8f2a1f");
  for (let i = 1; i < 9; i++) {
    const y = y0 + (h * i) / 9;
    m.linie(x0 + b, y, x0 + b + tief, y + steig, "#7a2219");
  }
  m.vieleck([[x0 + b + 14, y0 + 18], [x0 + b + 30, y0 + 10], [x0 + b + 30, y0 + 26], [x0 + b + 14, y0 + 34]], "#f2e6d0");
  m.vieleck([[x0 + b + 16, y0 + 19], [x0 + b + 28, y0 + 13], [x0 + b + 28, y0 + 24], [x0 + b + 16, y0 + 31]], "#3b4a6b");

  // Vorderseite mit Brettern (oben heller)
  m.verlauf(y0, y0 + h, ["#d0503d", "#c4463a", "#b83d31", "#a8352a"], x0, x0 + b);
  for (let x = x0 + 8; x < x0 + b; x += 8) m.r(x, y0, 1, h, "#9b3024");
  // Giebel
  const spitze = [x0 + b / 2, y0 - 44];
  m.vieleck([[x0, y0 + 1], spitze, [x0 + b, y0 + 1]], "#c84a38");
  for (let i = 1; i < 6; i++) m.r(x0 + 8 * i, y0 - 7 * i + 2, b - 16 * i, 1, "#b03c2e");
  // Heuluke
  m.r(spitze[0] - 11, y0 - 24, 22, 20, "#f2e6d0");
  m.r(spitze[0] - 9, y0 - 22, 18, 18, "#3b1a0c");
  m.r(spitze[0] - 9, y0 - 22, 18, 3, "#e0b44a");

  // Dach: Fläche nach hinten, Kanten weiß
  const ecke = [x0 + b + 6, y0 + 3];
  m.vieleck([spitze, ecke, [ecke[0] + tief, ecke[1] + steig], [spitze[0] + tief, spitze[1] + steig]], "#5b3a2a");
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const a = [spitze[0] + (ecke[0] - spitze[0]) * t, spitze[1] + (ecke[1] - spitze[1]) * t];
    m.linie(a[0], a[1], a[0] + tief, a[1] + steig, "#4a2e20");
  }
  m.linie(spitze[0], spitze[1], spitze[0] + tief, spitze[1] + steig, "#7a5442", 2);
  m.linie(x0 - 6, y0 + 3, spitze[0], spitze[1] - 2, "#f2e6d0", 3);
  m.linie(spitze[0], spitze[1] - 2, ecke[0], ecke[1], "#d8cbb4", 3);

  // Tor mit weißem Rahmen und X
  const tx = x0 + b / 2 - 18;
  const ty = y0 + 26;
  m.r(tx - 3, ty - 3, 42, h - 23, "#f2e6d0");
  m.r(tx, ty, 36, h - 26, "#7e2419");
  m.r(tx + 17, ty, 2, h - 26, "#f2e6d0");
  m.linie(tx, ty, tx + 17, ty + h - 27, "#f2e6d0", 2);
  m.linie(tx + 17, ty, tx, ty + h - 27, "#f2e6d0", 2);
  m.linie(tx + 19, ty, tx + 36, ty + h - 27, "#f2e6d0", 2);
  m.linie(tx + 36, ty, tx + 19, ty + h - 27, "#f2e6d0", 2);
  m.r(tx, ty, 36, 4, "#000000", 0.25); // Schatten unter dem Torbalken
}

// Silo: Zylinder mit Ringen und Kuppel
function silo(m, x, y) {
  const b = 34;
  const h = 112;
  m.schatten(x + b / 2 + 14, y + h, 28, 6, 0.25);
  m.zylinder(x, y, b, h, ["#5d6872", "#76828c", "#929ea8", "#b0bac2", "#cfd6dc"]);
  for (let yy = y + 10; yy < y + h; yy += 14) {
    for (let xx = 0; xx < b; xx++) m.p(x + xx, yy, "#000000", 0.18);
  }
  m.kugel(x + b / 2, y, b / 2, ["#3d6a8a", "#4f82a6", "#6a9ec2", "#93c0dd"]);
  m.r(x - 1, y, b + 2, 3, "#5d6872");
  m.r(x + b / 2 - 1, y - b / 2 - 4, 2, 5, "#5d6872");
}

// Gestreiftes Jahrmarktzelt (rechte Hälfte im Schatten)
function zelt(m, x, y) {
  const b = 96;
  m.schatten(x, y + 64, 56, 8, 0.25);
  for (let i = 0; i < 8; i++) {
    const xa = x - b / 2 + (b / 8) * i;
    const hell = i % 2 ? "#f4efe6" : "#d93a3a";
    const dunkel = i % 2 ? "#d6cfc2" : "#b52c2c";
    const f = i < 4 ? hell : dunkel;
    m.r(xa, y + 18, b / 8, 46, f);
    m.vieleck([[x, y - 20], [xa, y + 18], [xa + b / 8, y + 18]], f);
  }
  for (let xa = x - b / 2; xa < x + b / 2; xa += 8) m.vieleck([[xa, y + 18], [xa + 8, y + 18], [xa + 4, y + 26]], "#ffd166");
  m.r(x - 10, y + 34, 20, 30, "#4a1b1b");
  m.r(x - 1, y - 30, 2, 12, "#5b2c0f");
  m.vieleck([[x + 1, y - 30], [x + 12, y - 26], [x + 1, y - 22]], "#3b82c4");
}

// Holzzaun mit 3D-Pfosten und Schatten
function zaun(m, y) {
  for (let x = -4; x < 640; x += 22) {
    if (x > 256 && x < 330) continue; // Lücke für den Weg
    m.schatten(x + 8, y + 24, 7, 2, 0.25);
    m.r(x, y, 6, 24, "#9a5a26");
    m.r(x + 6, y + 1, 2, 23, "#6e3b17");
    m.r(x, y, 6, 2, "#c98a4a");
    m.vieleck([[x, y], [x + 3, y - 3], [x + 6, y]], "#b87436");
  }
  for (const yy of [y + 5, y + 14]) {
    for (const [a, b] of [[0, 258], [328, 640]]) {
      m.r(a, yy, b - a, 4, "#a8682e");
      m.r(a, yy, b - a, 1, "#d09a5c");
      m.r(a, yy + 4, b - a, 1, "#000000", 0.25);
    }
  }
}

// Weg in Perspektive zum Scheunentor
function weg(m) {
  for (let y = 254; y < 360; y++) {
    const t = (y - 254) / 106;
    const mitte = 320 - t * 18;
    const halb = 10 + t * 46;
    for (let x = Math.round(mitte - halb); x < mitte + halb; x++) {
      const rand = Math.abs(x - mitte) > halb - 3;
      m.p(x, y, rand ? "#b8925a" : bayer(x, y) < 0.5 ? "#d9b77c" : "#cfac70");
    }
  }
  for (let i = 0; i < 40; i++) {
    const y = m.zz(262, 356);
    const x = 320 + m.zz(-30, 30) * ((y - 254) / 106);
    m.kugel(x, y, m.zz(1, 2), ["#7d7365", "#9c9282", "#bdb3a2"]);
  }
}

// ---------------------------------------------------------------------------
// Szene: Raumfahrt – Weltall mit Nebel, Erde, Ringplanet, Mond, Rakete
// ---------------------------------------------------------------------------
function raumfahrt(m) {
  m.verlauf(0, 360, ["#04061a", "#070b25", "#0b1132", "#10183f", "#16204d"]);

  // Nebel: viele schwache, durchscheinende Kreise
  for (let i = 0; i < 70; i++) {
    const x = 300 + Math.cos(i * 0.7) * (120 + i * 2) + m.zz(-20, 20);
    const y = 120 + Math.sin(i * 0.5) * 50 + m.zz(-20, 20);
    m.kreis(x, y, m.zz(16, 34), i % 3 ? "#5b3aa8" : "#2f6fb5", 0.05);
  }

  // Sterne in drei Größen
  for (let i = 0; i < 420; i++) {
    m.p(m.zz(0, 639), m.zz(0, 300), ["#ffffff", "#c9dcff", "#ffe9c4", "#8fa8d8"][m.zz(0, 3)], m.zz(4, 10) / 10);
  }
  for (let i = 0; i < 18; i++) {
    const x = m.zz(0, 639);
    const y = m.zz(0, 280);
    m.kreis(x, y, 3, "#9ec9ff", 0.15);
    m.p(x, y, "#ffffff");
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) m.p(x + dx, y + dy, "#cfe3ff");
    if (i % 3 === 0) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) m.p(x + dx, y + dy, "#7fa6e0", 0.7);
  }

  // Erde in der Ferne: Meer + Kontinente, Atmosphäre
  m.kreis(78, 70, 33, "#6fb4ff", 0.15);
  m.kugel(78, 70, 28, (x, y) => {
    const land = Math.sin(x * 0.21) + Math.cos(y * 0.27 + x * 0.05) > 0.9;
    return land ? ["#173d1c", "#2a6a2c", "#4a9a3e", "#7cc35e"] : ["#0b2a5a", "#164a8e", "#2a6fc0", "#5aa0e6"];
  });

  ringplanet(m, 566, 112, 46);

  // Mondoberfläche mit Kratern
  for (let x = 0; x < 640; x++) {
    const y = Math.round(296 - 10 * Math.sin(x / 70) - 6 * Math.sin(x / 23 + 1));
    for (let yy = y; yy < 360; yy++) {
      const t = (yy - y) / (360 - y);
      m.p(x, yy, stufeWaehlen(["#5e636b", "#757b84", "#8d939c", "#a6acb4"], 1 - t * 0.9, x, yy));
    }
    m.p(x, y, "#c4c9cf");
  }
  for (const [x, y, rx] of [[60, 330, 26], [200, 344, 14], [430, 326, 34], [560, 348, 18], [320, 318, 10]]) krater(m, x, y, rx);
  for (let i = 0; i < 22; i++) m.kugel(m.zz(0, 639), m.zz(310, 358), m.zz(1, 3), ["#4d525a", "#6e747c", "#9aa0a8"]);

  // Flagge auf dem Mond
  m.r(606, 262, 2, 40, "#c9ced4");
  m.r(608, 262, 22, 14, "#e8edf2");
  m.r(608, 262, 22, 5, "#3b82c4");
  m.r(608, 271, 22, 5, "#e5484d");

  rakete(m, 64, 168);
}

function ringplanet(m, cx, cy, rad) {
  const ringFarbe = (x, y) => (Math.floor(Math.hypot((x - cx) / 2.2, y - cy) / 3) % 2 ? "#d9b27a" : "#b88c52");
  const imRing = (x, y) => {
    const aussen = ((x - cx) / (rad * 1.9)) ** 2 + ((y - cy) / 16) ** 2;
    const innen = ((x - cx) / (rad * 1.35)) ** 2 + ((y - cy) / 9) ** 2;
    return aussen <= 1 && innen > 1;
  };
  // hintere Ringhälfte
  for (let y = cy - 16; y <= cy; y++) {
    for (let x = cx - rad * 2; x <= cx + rad * 2; x++) if (imRing(x, y)) m.p(x, y, ringFarbe(x, y));
  }
  m.kugel(cx, cy, rad, (_x, y) => [
    ["#6e3412", "#a14f1d", "#d0752f", "#f0a35a"],
    ["#7a4a1f", "#b07035", "#d9984f", "#f5c27f"],
    ["#5f2c10", "#8f4418", "#bb6227", "#e08a45"],
  ][Math.floor((y - cy + rad) / 9) % 3]);
  // vordere Ringhälfte (vor dem Planeten), rechts im Schatten des Planeten
  for (let y = cy + 1; y <= cy + 16; y++) {
    for (let x = cx - rad * 2; x <= cx + rad * 2; x++) {
      if (!imRing(x, y)) continue;
      m.p(x, y, ringFarbe(x, y));
      if (x > cx + rad * 0.9 && x < cx + rad + 20) m.p(x, y, "#000000", 0.35);
    }
  }
}

// Krater: dunkle Mulde, Schatten oben innen, heller Rand
function krater(m, x, y, rx) {
  const ry = Math.max(3, rx * 0.32);
  m.ellipse(x, y, rx + 2, ry + 1.5, "#b4bac1");
  m.ellipse(x, y, rx, ry, "#6a7078");
  m.ellipse(x + rx * 0.15, y + ry * 0.15, rx * 0.8, ry * 0.7, "#7d838b");
  m.ellipse(x - rx * 0.15, y - ry * 0.3, rx * 0.75, ry * 0.4, "#52575e");
}

function rakete(m, x, y) {
  // Flamme mit Schein
  m.vieleck([[x + 2, y + 58], [x + 22, y + 58], [x + 12, y + 92]], "#e5484d");
  m.vieleck([[x + 5, y + 58], [x + 19, y + 58], [x + 12, y + 84]], "#ff8c42");
  m.vieleck([[x + 8, y + 58], [x + 16, y + 58], [x + 12, y + 74]], "#ffe680");
  // Flossen
  m.vieleck([[x, y + 34], [x - 10, y + 58], [x, y + 54]], "#c23b3b");
  m.vieleck([[x + 24, y + 34], [x + 34, y + 58], [x + 24, y + 54]], "#8f2525");
  // Rumpf
  m.zylinder(x, y, 24, 56, ["#7c8794", "#a4adb8", "#cdd4dc", "#eef2f6", "#ffffff"]);
  m.r(x, y + 40, 24, 3, "#c23b3b");
  // Spitze: nach oben schmaler, links hell, rechts dunkel
  for (let i = 0; i < 22; i++) {
    const halb = 12 * (1 - i / 22);
    for (let xx = -halb; xx < halb; xx++) {
      const hell = 0.6 - (xx / 12) * 0.8;
      m.p(x + 12 + xx, y - i, stufeWaehlen(["#7a1f1f", "#b52c2c", "#e5484d", "#ff7a7a"], hell, x + xx, y - i));
    }
  }
  // Bullauge
  m.kreis(x + 12, y + 18, 7, "#5d6872");
  m.kugel(x + 12, y + 18, 5, ["#163c6e", "#2a6fc0", "#5aa0e6", "#bfe0ff"]);
}

// ---------------------------------------------------------------------------
// Szene: Tierwelt – Dschungel mit Lianen, Riesenblättern, Papagei, Frosch
// ---------------------------------------------------------------------------
function dschungel(m) {
  // Hintergrund: dunkles Blätterdach oben, dunstiges Licht in der Mitte
  m.verlauf(0, 360, ["#0d2a1a", "#143b23", "#1d4f2d", "#2a6638", "#357a42", "#2b6a39", "#1f5530"]);

  // Ferne Baumstämme im Dunst
  for (const [x, b] of [[110, 18], [190, 12], [300, 22], [420, 14], [500, 20], [600, 16]]) {
    m.zylinder(x, 0, b, 300, ["#1e3f2a", "#28503a", "#335f45"]);
  }
  m.r(0, 0, 640, 360, "#7fbf8a", 0.12); // Dunst

  // Wasserfall in der Mitte hinten
  for (let y = 60; y < 300; y++) {
    for (let x = 290; x < 350; x++) {
      const streifen = (x * 7 + y * 3 + (x % 5) * 11) % 9;
      m.p(x, y, streifen < 3 ? "#e6f6ff" : streifen < 6 ? "#a9dcf2" : "#7cc4e6");
    }
  }
  m.r(286, 56, 68, 6, "#3d4f3a");
  for (let i = 0; i < 40; i++) m.kreis(290 + m.zz(0, 60), 300 + m.zz(-4, 6), m.zz(3, 7), "#ffffff", 0.35); // Gischt

  // Lichtstrahlen von oben links
  for (const [x0, breite] of [[80, 26], [200, 18], [380, 30], [520, 16]]) {
    m.vieleck([[x0, 0], [x0 + breite, 0], [x0 + breite + 160, 360], [x0 + 160, 360]], "#fff6b0", 0.07);
  }

  // Mittlere Ebene: Büsche aus Kugeln
  for (let x = -10; x < 660; x += 34) {
    m.kugel(x, 292 + m.zz(-6, 6), m.zz(22, 30), ["#143b20", "#1f5a2c", "#2f7a3a", "#4a9a48", "#6cbf5c"]);
  }

  // Große Baumstämme links und rechts mit Rinde und Moos
  for (const [x, b] of [[18, 54], [566, 62]]) {
    m.zylinder(x, 0, b, 330, ["#2e1a0d", "#4a2c16", "#6a4122", "#8a5a32", "#a87444"]);
    for (let i = 0; i < 60; i++) m.r(x + m.zz(4, b - 6), m.zz(0, 320), 1, m.zz(4, 10), "#2a160a", 0.6);
    for (let i = 0; i < 80; i++) m.p(x + m.zz(0, b * 0.5), m.zz(0, 330), "#5aa845", 0.7);
  }

  // Ast mit Papagei (links)
  m.linie(70, 196, 128, 204, "#5a3a1e", 7);
  m.linie(70, 193, 128, 201, "#8a5a32", 2);
  papagei(m, 104, 166);

  // Lianen von oben, mit kleinen Blättern
  for (const [x0, laenge, schwung] of [[150, 210, 18], [240, 150, 12], [470, 230, 20], [530, 120, 10]]) {
    let vorher = [x0, 0];
    for (let y = 0; y <= laenge; y += 3) {
      const x = x0 + schwung * Math.sin(y / 40);
      m.linie(vorher[0], vorher[1], x, y, "#3c5a22", 2);
      if (y % 18 === 0 && y > 0) blatt(m, x, y, 10, y % 36 ? 20 : 160, 4, "#5fb04a", "#3f8a36", "#2d6a2c");
      vorher = [x, y];
    }
  }

  // Fluss unten
  for (let y = 322; y < 360; y++) {
    for (let x = 0; x < 640; x++) {
      const welle = Math.sin(x / 9 + y * 0.8) + Math.sin(x / 23 - y * 0.3);
      m.p(x, y, welle > 1.2 ? "#bfe9f5" : welle > 0.2 ? "#4aa3c9" : "#2f7fa8");
    }
  }
  m.r(0, 320, 640, 3, "#24402a");

  // Blumen (Hibiskus)
  for (const [x, y] of [[90, 290], [470, 286], [612, 300]]) {
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      m.kugel(x + Math.cos(a) * 5, y + Math.sin(a) * 5, 4, ["#8a0f2a", "#c41e3a", "#ef4b6a", "#ff8fa6"]);
    }
    m.kreis(x, y, 2, "#ffd166");
  }

  // Vordere Riesenblätter in den Ecken
  blatt(m, -20, 330, 150, -35, 30, "#4fa845", "#2e7a33", "#9bd86c");
  blatt(m, -10, 360, 120, -60, 24, "#5bbf4f", "#36863a", "#a6e07a");
  blatt(m, 660, 320, 160, -150, 32, "#4fa845", "#2e7a33", "#9bd86c");
  blatt(m, 650, 360, 110, -120, 22, "#5bbf4f", "#36863a", "#a6e07a");
  blatt(m, 600, -10, 120, 120, 22, "#3f9a3e", "#24692b", "#86c766");
  blatt(m, 30, -10, 130, 60, 24, "#3f9a3e", "#24692b", "#86c766");

  // Frosch auf einem Blatt (rechts unten)
  blatt(m, 470, 318, 70, -8, 14, "#62b84f", "#3d8a36", "#a6e07a");
  frosch(m, 508, 306);

  // Schmetterling (Blauer Morphofalter)
  for (const [dx, dy, r] of [[-5, -3, 5], [5, -3, 5], [-3, 3, 3], [3, 3, 3]]) {
    m.kugel(250 + dx, 230 + dy, r, ["#0d3a8a", "#1e63d6", "#4ea2ff", "#a8d4ff"]);
  }
  m.r(249, 224, 2, 12, "#1a1a1a");
}

function papagei(m, x, y) {
  const rot = ["#7a0f12", "#b8181d", "#e53935", "#ff7b6b"];
  m.schatten(x + 4, y + 34, 10, 2, 0.3);
  m.vieleck([[x - 2, y + 22], [x + 6, y + 22], [x + 10, y + 52], [x + 2, y + 50]], "#1e63d6"); // Schwanz
  m.vieleck([[x + 2, y + 24], [x + 6, y + 24], [x + 7, y + 46]], "#ffd166");
  m.kugel(x, y + 12, 12, rot);                                                              // Körper
  m.vieleck([[x + 2, y + 6], [x + 14, y + 12], [x + 10, y + 26], [x - 2, y + 20]], "#1e63d6"); // Flügel
  m.vieleck([[x + 3, y + 8], [x + 12, y + 12], [x + 9, y + 18], [x + 1, y + 14]], "#ffd166");
  m.kugel(x - 4, y - 2, 8, rot);                                                            // Kopf
  m.kreis(x - 6, y - 3, 3, "#ffffff");
  m.p(x - 6, y - 3, "#111111");
  m.vieleck([[x - 11, y - 2], [x - 17, y + 2], [x - 10, y + 5]], "#e8e0c8");                 // Schnabel
  m.vieleck([[x - 11, y + 2], [x - 15, y + 3], [x - 10, y + 5]], "#3a3a3a");
  m.r(x - 2, y + 22, 2, 4, "#3a3a3a");
  m.r(x + 3, y + 22, 2, 4, "#3a3a3a");
}

function frosch(m, x, y) {
  const gruen = ["#1d5a1f", "#2f8a2e", "#4fc04a", "#9cf07a"];
  m.schatten(x, y + 8, 12, 3, 0.3);
  m.kugel(x, y, 10, gruen);
  for (const dx of [-6, 6]) {
    m.kugel(x + dx, y - 8, 4, gruen);
    m.kreis(x + dx, y - 8, 2, "#ffd166");
    m.p(x + dx, y - 8, "#111111");
  }
  m.r(x - 5, y + 2, 10, 1, "#1d5a1f");
  m.kreis(x - 9, y + 7, 3, "#ff8c42");
  m.kreis(x + 9, y + 7, 3, "#ff8c42");
}

// ---------------------------------------------------------------------------
// Szene: Joker – geheimnisvolles Labor mit schwebenden 3D-Fragezeichen
// ---------------------------------------------------------------------------
const FRAGEZEICHEN = [
  ".###.",
  "#...#",
  "....#",
  "...#.",
  "..#..",
  ".....",
  "..#..",
];

function joker(m) {
  // Ziegelwand: jeder Stein mit heller Oberkante und dunkler Unterkante
  m.r(0, 0, 640, 270, "#1c1029");
  for (let reihe = 0; reihe < 20; reihe++) {
    const y = reihe * 14;
    for (let x = (reihe % 2) * -16; x < 640; x += 32) {
      m.r(x + 1, y + 1, 30, 12, ["#3a2356", "#36204f", "#3f275d"][Math.abs(x * 7 + reihe * 3) % 3]);
      m.r(x + 1, y + 1, 30, 1, "#4d3170");
      m.r(x + 1, y + 12, 30, 1, "#25163a");
      m.r(x + 30, y + 1, 1, 12, "#25163a");
    }
  }

  // Boden in Perspektive (Schachbrett), hinten dunkler
  for (let y = 270; y < 360; y++) {
    const w = y - 250;
    for (let x = 0; x < 640; x++) {
      const weltX = ((x - 320) / w) * 6;
      const weltZ = 600 / w;
      const hellesFeld = (Math.floor(weltX) + Math.floor(weltZ / 3)) % 2 === 0;
      const vorne = (y - 270) / 90;
      m.p(x, y, stufeWaehlen(hellesFeld ? ["#241837", "#33244d", "#43305f"] : ["#160e24", "#1f1532", "#2a1d40"], vorne, x, y));
    }
  }
  // hinten im Dunkeln verschwinden lassen (sonst flimmert das Muster)
  for (let y = 270; y < 310; y++) m.r(0, y, 640, 1, "#0e0818", 0.85 * (1 - (y - 270) / 40));
  m.r(0, 268, 640, 3, "#4d3170");

  // Hängelampen mit Lichtkegel
  for (const x of [160, 480]) {
    m.r(x, 0, 2, 30, "#555555");
    m.vieleck([[x - 10, 40], [x + 12, 40], [x + 120, 360], [x - 118, 360]], "#ffe9a8", 0.06);
    m.kugel(x + 1, 38, 9, ["#8a6a1a", "#d9a92a", "#ffd166", "#fff3c4"]);
    m.kreis(x + 1, 38, 18, "#ffe9a8", 0.12);
  }

  // Regale links mit leuchtenden Flaschen (Bretter mit Oberseite)
  const fluessig = [
    ["#0e5a3a", "#1f9a62", "#59e0a0", "#c4ffe2"],
    ["#6a0f5a", "#b02a96", "#ff6bd1", "#ffd1f2"],
    ["#0d4a6e", "#1f7fb8", "#5bc8ff", "#d0f0ff"],
    ["#7a5a0f", "#c8961f", "#ffd166", "#fff3c4"],
    ["#3d1f7a", "#6a3fc0", "#b28dff", "#e6dbff"],
  ];
  const glas = ["#8a96a3", "#c8d2dc", "#eef4fa"];
  for (const [y, n] of [[96, 6], [170, 5]]) {
    for (let i = 0; i < n; i++) {
      const x = 30 + i * 22;
      const pal = fluessig[(i + y) % fluessig.length];
      m.kreis(x + 6, y - 10, 14, pal[2], 0.08);       // Leuchten
      m.zylinder(x + 4, y - 26, 5, 8, glas);           // Flaschenhals
      m.r(x + 3, y - 28, 7, 3, "#7a4a24");             // Korken
      m.kugel(x + 6, y - 11, 9, pal);
      m.p(x + 2, y - 15, "#ffffff");
      m.p(x + 3, y - 16, "#ffffff");
    }
    m.vieleck([[16, y], [160, y], [170, y - 6], [26, y - 6]], "#9a5a26");
    m.r(16, y, 144, 6, "#6e3b17");
    m.r(16, y + 6, 144, 2, "#000000", 0.3);
  }

  // Tisch rechts in 3D mit Kolben und Glasröhren
  m.schatten(530, 340, 90, 10, 0.35);
  m.vieleck([[440, 262], [620, 262], [640, 250], [460, 250]], "#b87436");
  m.r(440, 262, 180, 10, "#7a4219");
  for (const x of [448, 606]) {
    m.r(x, 272, 10, 64, "#5b2c0f");
    m.r(x, 272, 3, 64, "#7a4219");
  }
  m.kreis(530, 220, 34, "#59e0a0", 0.12);
  m.zylinder(524, 186, 12, 22, glas);
  m.kugel(530, 228, 22, fluessig[0]);
  m.ellipse(522, 220, 5, 7, "#ffffff", 0.5);
  for (const [x, y, r] of [[534, 176, 3], [526, 164, 2], [536, 152, 4], [530, 138, 2]]) m.kugel(x, y, r, ["#59e0a0", "#9ff5c9", "#e2fff1"]);
  m.linie(542, 200, 590, 180, "#c8d2dc", 3);
  m.linie(590, 180, 590, 240, "#c8d2dc", 3);
  m.kugel(590, 244, 10, fluessig[1]);

  // Schwebende 3D-Fragezeichen: dunkle Tiefe, dann Vorderseite mit Licht
  for (const [x, y, gr, pal] of [
    [292, 30, 8, ["#8a6a10", "#d9a92a", "#ffd166", "#fff3c4"]],
    [560, 40, 6, fluessig[0]],
    [380, 150, 4, fluessig[1]],
    [210, 200, 5, fluessig[2]],
    [90, 220, 6, fluessig[4]],
  ]) {
    m.schatten(x + gr * 2.5, 330, gr * 4, gr * 0.8, 0.25);
    const breite = 5 * gr;
    const hoehe = 7 * gr;
    for (let tiefe = 4; tiefe >= 1; tiefe--) {
      FRAGEZEICHEN.forEach((zeile, zy) => [...zeile].forEach((z, zx) => {
        if (z === "#") m.r(x + zx * gr + tiefe, y + zy * gr + tiefe, gr, gr, pal[0]);
      }));
    }
    FRAGEZEICHEN.forEach((zeile, zy) => [...zeile].forEach((z, zx) => {
      if (z !== "#") return;
      for (let yy = 0; yy < gr; yy++) {
        for (let xx = 0; xx < gr; xx++) {
          const px = x + zx * gr + xx;
          const py = y + zy * gr + yy;
          const hell = 1 - ((px - x) / breite) * 0.4 - ((py - y) / hoehe) * 0.6;
          m.p(px, py, stufeWaehlen(pal.slice(1), hell, px, py));
        }
      }
    }));
  }
}
