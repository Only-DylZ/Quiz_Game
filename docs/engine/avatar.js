// engine/avatar.js – Avatare aus LPC-Teilen zusammensetzen.
//
// Die Teile (Körper, Kopf, Frisur, Kleidung …) liegen in docs/avatare/,
// erzeugt von tools/avatar_teile.py. Die Liste steht in avatare/teile.json.
//
// Ein Avatar ist nur eine Handvoll Zahlen – so geht er klein und sicher übers Netz:
//   { figur: 0, teile: { kopf: 2, frisur: 5, hut: -1, … }, farben: { figur: 3, frisur: 1, … } }
//   figur   – Index in katalog.figuren (0 = männlich, 1 = weiblich)
//   teile   – pro Kategorie der Index des Teils, -1 = nichts (nur bei freiwilligen)
//   farben  – pro Kategorie der Index der Farbe (nur bei Teilen mit Farbtabelle)
// Wer einen Avatar von außen bekommt, prüft ihn immer mit avatarPruefen().
//
// Aufbau eines fertigen Bildes ("Blatt", 576 × 1024): 4 Animationen untereinander,
// je 4 Zeilen (Richtung oben, links, unten, rechts), siehe ANIMATION und RICHTUNG.

export const FELD = 64; // ein Einzelbild ist 64 × 64 Pixel

// Animation → erste Zeile im Blatt und Anzahl Bilder
export const ANIMATION = {
  laufen: { zeile: 0, bilder: 9 },
  stehen: { zeile: 4, bilder: 2 },
  springen: { zeile: 8, bilder: 5 },
  jubeln: { zeile: 12, bilder: 3 },
};

// Richtung → Zeile innerhalb einer Animation
export const RICHTUNG = { oben: 0, links: 1, unten: 2, rechts: 3 };

// Kopfbedeckung und Haare teilen sich die Farbe ihrer eigenen Kategorie –
// die Haut (Farbtabelle "haut") kommt aber immer von der Figur.
const HAUT_VON = "figur";

// ---------------------------------------------------------------------------
// Katalog laden (einmal pro Seite)
// ---------------------------------------------------------------------------
let katalogVersprechen = null;

export function katalogLaden() {
  if (!katalogVersprechen) {
    katalogVersprechen = fetch("avatare/teile.json").then((antwort) => {
      if (!antwort.ok) throw new Error("Avatar-Teile fehlen");
      return antwort.json();
    });
  }
  return katalogVersprechen;
}

function kategorie(katalog, id) {
  return katalog.kategorien.find((k) => k.id === id);
}

// ---------------------------------------------------------------------------
// Avatare erzeugen und prüfen (reine Rechnung – getestet in spiel.test.mjs)
// ---------------------------------------------------------------------------

// Zufälliger Avatar. zufall() liefert 0 ≤ x < 1 (zum Testen austauschbar).
export function zufallsAvatar(katalog, zufall = Math.random) {
  const wahl = (anzahl) => Math.floor(zufall() * anzahl);
  const avatar = { figur: wahl(katalog.figuren.length), teile: {}, farben: {} };
  for (const k of katalog.kategorien) {
    // Freiwilliges (Hut, Brille) nur manchmal
    const nichts = k.freiwillig && k.id !== "frisur" && zufall() < 0.6;
    avatar.teile[k.id] = nichts ? -1 : wahl(k.teile.length);
    const tabelle = farbtabelleVon(katalog, k.id);
    if (tabelle) avatar.farben[k.id] = wahl(katalog.farben[tabelle].varianten.length);
  }
  avatar.teile.figur = 0; // es gibt nur einen Körper (die Form kommt von "figur")
  return avatar;
}

// Welche Farbtabelle kann eine Kategorie haben? (die erste, die ein Teil benutzt)
export function farbtabelleVon(katalog, kategorieId) {
  const k = kategorie(katalog, kategorieId);
  if (!k) return null;
  const teil = k.teile.find((t) => t.farbe);
  return teil ? teil.farbe : null;
}

// Prüft einen Avatar, der von außen kommt (z. B. vom Handy).
// Gibt einen sauberen, vollständigen Avatar zurück – oder null, wenn etwas nicht stimmt.
// Nur ganze Zahlen im erlaubten Bereich, keine fremden Felder.
export function avatarPruefen(katalog, wert) {
  if (!wert || typeof wert !== "object") return null;
  const ganz = (zahl, min, max) => Number.isInteger(zahl) && zahl >= min && zahl <= max;

  if (!ganz(wert.figur, 0, katalog.figuren.length - 1)) return null;
  const teile = wert.teile && typeof wert.teile === "object" ? wert.teile : {};
  const farben = wert.farben && typeof wert.farben === "object" ? wert.farben : {};

  const sauber = { figur: wert.figur, teile: {}, farben: {} };
  for (const k of katalog.kategorien) {
    const min = k.freiwillig ? -1 : 0;
    const teil = Object.hasOwn(teile, k.id) ? teile[k.id] : min;
    if (!ganz(teil, min, k.teile.length - 1)) return null;
    sauber.teile[k.id] = teil;

    const tabelle = farbtabelleVon(katalog, k.id);
    if (tabelle) {
      const farbe = Object.hasOwn(farben, k.id) ? farben[k.id] : 0;
      if (!ganz(farbe, 0, katalog.farben[tabelle].varianten.length - 1)) return null;
      sauber.farben[k.id] = farbe;
    }
  }
  return sauber;
}

// Liste der Ebenen zum Zeichnen, von hinten nach vorne:
// [{ datei, farbtabelle, farbe }] – farbe = Index der Variante oder null.
export function ebenenListe(katalog, avatar) {
  const figur = katalog.figuren[avatar.figur];
  const ebenen = [];
  for (const k of katalog.kategorien) {
    const index = avatar.teile[k.id];
    if (index < 0) continue;
    const teil = k.teile[index];
    // Haut immer von der Figur, sonst die Farbe der eigenen Kategorie
    const farbKategorie = teil.farbe === "haut" ? HAUT_VON : k.id;
    for (const ebene of teil.ebenen) {
      if (!ebene[figur]) continue;
      ebenen.push({
        z: ebene.z,
        datei: ebene[figur],
        farbtabelle: teil.farbe,
        farbe: teil.farbe ? avatar.farben[farbKategorie] ?? 0 : null,
      });
    }
  }
  return ebenen.sort((a, b) => a.z - b.z);
}

// Ersetzt Farben in Pixeldaten (RGBA, wie von getImageData): jede Farbe aus
// "von" wird zur Farbe an derselben Stelle in "nach". Andere Farben bleiben.
export function farbenTauschen(pixel, von, nach) {
  const tabelle = new Map();
  von.forEach((farbe, i) => tabelle.set(farbe.toLowerCase(), nach[i]));
  for (let i = 0; i < pixel.length; i += 4) {
    if (pixel[i + 3] === 0) continue;
    const hex = "#" + [pixel[i], pixel[i + 1], pixel[i + 2]]
      .map((wert) => wert.toString(16).padStart(2, "0")).join("");
    const neu = tabelle.get(hex);
    if (neu) {
      pixel[i] = parseInt(neu.slice(1, 3), 16);
      pixel[i + 1] = parseInt(neu.slice(3, 5), 16);
      pixel[i + 2] = parseInt(neu.slice(5, 7), 16);
    }
  }
}

// ---------------------------------------------------------------------------
// Im Browser: Avatar als Bild ("Blatt") zusammensetzen
// ---------------------------------------------------------------------------
const bildSpeicher = new Map();  // Datei → Promise<Image>
const blattSpeicher = new Map(); // Avatar als Text → Promise<Canvas>

function bildLaden(datei) {
  if (!bildSpeicher.has(datei)) {
    bildSpeicher.set(datei, new Promise((fertig, fehler) => {
      const bild = new Image();
      bild.onload = () => fertig(bild);
      bild.onerror = () => fehler(new Error("Bild fehlt: " + datei));
      bild.src = "avatare/" + datei; // Dateinamen kommen nur aus teile.json, nie vom Netz
    }));
  }
  return bildSpeicher.get(datei);
}

// Gibt eine Leinwand mit allen Animationen des Avatars zurück (zwischengespeichert)
export function blattZeichnen(katalog, avatar) {
  const schluessel = JSON.stringify(avatar);
  if (!blattSpeicher.has(schluessel)) {
    blattSpeicher.set(schluessel, blattBauen(katalog, avatar));
  }
  return blattSpeicher.get(schluessel);
}

async function blattBauen(katalog, avatar) {
  const ebenen = ebenenListe(katalog, avatar);
  const bilder = await Promise.all(ebenen.map((e) => bildLaden(e.datei)));

  const blatt = document.createElement("canvas");
  blatt.width = bilder[0].width;
  blatt.height = bilder[0].height;
  const stift = blatt.getContext("2d");

  // Jede Ebene auf eigener Leinwand umfärben, dann aufs Blatt legen
  const ebene = document.createElement("canvas");
  ebene.width = blatt.width;
  ebene.height = blatt.height;
  const ebenenStift = ebene.getContext("2d", { willReadFrequently: true });

  ebenen.forEach((e, i) => {
    ebenenStift.clearRect(0, 0, ebene.width, ebene.height);
    ebenenStift.drawImage(bilder[i], 0, 0);
    if (e.farbtabelle) {
      const tabelle = katalog.farben[e.farbtabelle];
      const variante = tabelle.varianten[e.farbe];
      const daten = ebenenStift.getImageData(0, 0, ebene.width, ebene.height);
      farbenTauschen(daten.data, tabelle.quelle, variante.farben);
      ebenenStift.putImageData(daten, 0, 0);
    }
    stift.drawImage(ebene, 0, 0);
  });
  return blatt;
}

// Zeichnet ein Einzelbild des Avatars auf eine Leinwand.
//   ziel        – Canvas-Kontext
//   blatt       – Ergebnis von blattZeichnen
//   animation   – "laufen" | "stehen" | "springen" | "jubeln"
//   richtung    – "oben" | "links" | "unten" | "rechts"
//   bildNummer  – wird automatisch auf die Anzahl Bilder begrenzt (läuft im Kreis)
//   x, y, groesse – wohin und wie groß (in Pixeln der Ziel-Leinwand)
export function bildZeichnen(ziel, blatt, animation, richtung, bildNummer, x, y, groesse) {
  const a = ANIMATION[animation];
  const spalte = bildNummer % a.bilder;
  const zeile = a.zeile + RICHTUNG[richtung];
  ziel.imageSmoothingEnabled = false;
  ziel.drawImage(blatt, spalte * FELD, zeile * FELD, FELD, FELD, x, y, groesse, groesse);
}

// Kleiner Kopf für Ranglisten: Ausschnitt aus "stehen, unten", als neue Leinwand
export function kopfZeichnen(blatt, groesse = 32) {
  const kopf = document.createElement("canvas");
  kopf.width = groesse;
  kopf.height = groesse;
  kopf.className = "avatar-kopf";
  const stift = kopf.getContext("2d");
  stift.imageSmoothingEnabled = false;
  // Kopf sitzt im 64er-Feld etwa bei x 16–48, y 4–36
  const zeile = ANIMATION.stehen.zeile + RICHTUNG.unten;
  stift.drawImage(blatt, 16, zeile * FELD + 4, 32, 32, 0, 0, groesse, groesse);
  return kopf;
}
