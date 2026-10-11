// engine/uifarben.js – Passt die Farben der Oberfläche an das Hintergrundbild an.
//
// Ablauf:
//   1. farbtonAusBild(bild): Bild verkleinert auf eine Leinwand malen und
//      zählen, welcher Farbton am häufigsten vorkommt (graue, fast schwarze und
//      fast weiße Pixel zählen nicht – sonst wäre der Weltraum einfach "schwarz").
//   2. paletteAus(ton, saettigung): Daraus alle UI-Farben ableiten
//      (Rahmen dunkel/mittel/hell, Pergament, Schrift, Knopf …).
//      Jede Schriftfarbe wird so lange dunkler/heller gemacht, bis sie gut
//      lesbar ist (Kontrast nach WCAG, mindestens 4,5 bzw. 7 für Fließtext).
//   3. uiFarbenSetzen(bild): Beides zusammen, setzt CSS-Variablen auf <html>.
//
// Punkt 2 ist reine Rechnung (ohne Browser) und wird in tools/spiel.test.mjs getestet.

// Mindest-Kontraste (WCAG: 4,5 = gut lesbar, 7 = sehr gut lesbar)
export const KONTRAST_TEXT = 7;
export const KONTRAST_GROSS = 4.5;

// ---------------------------------------------------------------------------
// Farben umrechnen
// ---------------------------------------------------------------------------

// HSL (Farbton 0–360, Sättigung 0–1, Helligkeit 0–1) → "#rrggbb"
export function hslZuHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const kanal = (n) => {
    const wert = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(wert * 255).toString(16).padStart(2, "0");
  };
  return "#" + kanal(0) + kanal(8) + kanal(4);
}

// RGB (je 0–255) → { h, s, l }
export function rgbZuHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s, l };
}

// Kontrast zweier Farben nach WCAG (1 = gleich, 21 = schwarz auf weiß)
export function kontrast(hex1, hex2) {
  const hell = (hex) => {
    const kanaele = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const [r, g, b] = kanaele.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = hell(hex1);
  const b = hell(hex2);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Macht eine Schriftfarbe (Farbton h, Sättigung s, Start-Helligkeit l) so lange
// dunkler bzw. heller, bis sie auf dem Grund mindestens "mindestens" Kontrast hat.
// richtung -1 = dunkler, +1 = heller.
function lesbar(h, s, l, grund, mindestens, richtung) {
  let farbe = hslZuHex(h, s, l);
  while (kontrast(farbe, grund) < mindestens && l > 0 && l < 1) {
    l = Math.min(1, Math.max(0, l + richtung * 0.02));
    farbe = hslZuHex(h, s, l);
  }
  return farbe;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

// Alle UI-Farben aus einem Farbton. Gibt { "--name": "#rrggbb", … } zurück –
// die Namen sind die CSS-Variablen aus style.css.
export function paletteAus(ton, saettigung) {
  const h = ((Number(ton) % 360) + 360) % 360 || 0;
  // Sehr graue oder knallige Bilder ergäben langweilige bzw. grelle Rahmen
  const s = Math.min(0.6, Math.max(0.3, Number(saettigung) || 0));
  const sHell = s * 0.75; // Pergament nur leicht eingefärbt

  const pergament = hslZuHex(h, sHell, 0.87);
  const knopf = hslZuHex(h, Math.min(0.7, s + 0.1), 0.65); // hell genug für dunkle Schrift, auch bei Blau
  const rahmen = hslZuHex(h, s, 0.3);

  return {
    "--holz-dunkel": hslZuHex(h, s, 0.15),
    "--holz": rahmen,
    "--holz-hell": hslZuHex(h, s, 0.47),
    "--pergament": pergament,
    "--pergament-hell": hslZuHex(h, sHell, 0.94),
    "--pergament-schatten": hslZuHex(h, sHell, 0.74),
    // Schrift auf Pergament: sehr dunkel im selben Farbton
    "--tinte": lesbar(h, 0.45, 0.14, pergament, KONTRAST_TEXT, -1),
    // Überschriften/Hervorhebungen: kräftig, aber noch gut lesbar
    "--akzent": lesbar(h, 0.65, 0.38, pergament, KONTRAST_GROSS, -1),
    "--knopf": knopf,
    "--knopf-hell": hslZuHex(h, Math.min(0.7, s + 0.1), 0.78),
    "--knopf-dunkel": hslZuHex(h, Math.min(0.7, s + 0.1), 0.48),
    "--knopf-schrift": lesbar(h, 0.45, 0.14, knopf, KONTRAST_GROSS, -1),
    // Helle Schrift auf dem mittleren Rahmen (z. B. Buchstaben-Schild A–D)
    "--rahmen-schrift": lesbar(45, 1, 0.7, rahmen, KONTRAST_GROSS, +1),
  };
}

// ---------------------------------------------------------------------------
// Im Browser: Farbton aus dem Bild lesen und anwenden
// ---------------------------------------------------------------------------

// Häufigster Farbton eines (fertig geladenen) Bildes → { ton, saettigung }
// oder null, wenn das Bild kaum Farbe hat oder nicht gelesen werden kann.
export function farbtonAusBild(bild) {
  const breite = 80;
  const hoehe = 45;
  const leinwand = document.createElement("canvas");
  leinwand.width = breite;
  leinwand.height = hoehe;
  const stift = leinwand.getContext("2d", { willReadFrequently: true });
  let pixel;
  try {
    stift.drawImage(bild, 0, 0, breite, hoehe);
    pixel = stift.getImageData(0, 0, breite, hoehe).data;
  } catch {
    return null; // z. B. Bild von fremder Adresse
  }

  // 24 Fächer à 15° – jedes Pixel zählt nach seiner Sättigung
  const faecher = new Array(24).fill(0);
  const saettigungen = new Array(24).fill(0);
  for (let i = 0; i < pixel.length; i += 4) {
    const { h, s, l } = rgbZuHsl(pixel[i], pixel[i + 1], pixel[i + 2]);
    if (s < 0.15 || l < 0.08 || l > 0.92) continue;
    const fach = Math.floor(h / 15) % 24;
    faecher[fach] += s;
    saettigungen[fach] += s * s;
  }

  let bestes = 0;
  for (let i = 1; i < 24; i++) if (faecher[i] > faecher[bestes]) bestes = i;
  if (faecher[bestes] === 0) return null;
  return { ton: bestes * 15 + 7.5, saettigung: saettigungen[bestes] / faecher[bestes] };
}

// Setzt die UI-Farben passend zum Bild. Klappt das nicht, bleiben die
// Standardfarben aus style.css (Holz und Pergament).
export function uiFarbenSetzen(bild) {
  const wurzel = document.documentElement.style;
  const farbton = farbtonAusBild(bild);
  if (!farbton) {
    uiFarbenZuruecksetzen();
    return;
  }
  for (const [name, wert] of Object.entries(paletteAus(farbton.ton, farbton.saettigung))) {
    wurzel.setProperty(name, wert);
  }
}

// Zurück zu den Standardfarben aus style.css
export function uiFarbenZuruecksetzen() {
  for (const name of Object.keys(paletteAus(0, 0))) {
    document.documentElement.style.removeProperty(name);
  }
}

// ---------------------------------------------------------------------------
// Hintergrundbild wechseln (bilder/szenen/<name>.png) – mit passenden Farben
// ---------------------------------------------------------------------------

// Nur einfache Namen wie "farm" oder "essen-trinken" – keine beliebigen Adressen
const SZENE_MUSTER = /^[a-z0-9-]{1,40}$/;
// Ersatz, wenn es für ein Thema (noch) kein Bild gibt
export const STANDARD_SZENE = "farm";

// Die Seite braucht ein <img id="szene" class="szene" alt="">.
// name = Paketdatei ohne ".json", "joker" für KI-Themen oder "farm".
export function hintergrundSetzen(name) {
  const bild = document.getElementById("szene");
  if (!bild) return;
  if (!SZENE_MUSTER.test(String(name))) name = STANDARD_SZENE;
  const pfad = "bilder/szenen/" + name + ".png";
  if (bild.getAttribute("src") === pfad) return; // schon da

  bild.onload = () => {
    bild.hidden = false;
    uiFarbenSetzen(bild);
  };
  bild.onerror = () => {
    // Bild fehlt → Standardbild; fehlt auch das: einfarbig mit Standardfarben
    if (name !== STANDARD_SZENE) hintergrundSetzen(STANDARD_SZENE);
    else {
      bild.hidden = true;
      uiFarbenZuruecksetzen();
    }
  };
  bild.src = pfad;
}

// Name des Hintergrunds zu einer Paketdatei: "sport.json" → "sport"
export function szeneZuDatei(datei) {
  return typeof datei === "string" ? datei.replace(/\.json$/, "") : STANDARD_SZENE;
}
