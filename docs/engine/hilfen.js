// engine/hilfen.js – Kleine Hilfsfunktionen, die alle Modi benutzen.

// Erzeugt ein neues HTML-Element, z. B. neu("p", "frage", "Hallo").
// Der Text wird immer mit textContent gesetzt – also nie als HTML ausgeführt.
// So kann niemand über Namen oder Fragetexte Code einschleusen.
export function neu(tag, klasse = "", text = "") {
  const element = document.createElement(tag);
  if (klasse) element.className = klasse;
  if (text !== "") element.textContent = String(text);
  return element;
}

// Liest eine Zahl aus einer Eingabe – so, wie man sie in Deutschland tippt.
//   "384400"  → 384400      "384.400" → 384400 (Punkt als Tausendertrenner)
//   "3,5"     → 3.5         "3.5"     → 3.5
//   "1.234,5" → 1234.5      "abc"     → null (keine Zahl)
export function zahlLesen(eingabe) {
  let text = String(eingabe).replace(/\s/g, ""); // Leerzeichen entfernen

  // Erlaubt sind nur Ziffern, Punkt, Komma und ein Minus am Anfang
  if (!/^-?[0-9.,]+$/.test(text)) return null;

  if (text.includes(",")) {
    // Komma = Dezimaltrenner, Punkte sind Tausendertrenner
    text = text.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(text)) {
    // Nur Punkte im Tausender-Muster (z. B. 1.000.000) = Tausendertrenner
    text = text.replace(/\./g, "");
  }

  const zahl = Number(text);
  return Number.isFinite(zahl) ? zahl : null;
}

// Zahl schön auf Deutsch anzeigen: 384400 → "384.400", 3.5 → "3,5"
export function zahlText(zahl) {
  return Number(zahl).toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

// Erzeugt ein SVG-Element (für selbst gezeichnete Grafiken), z. B.
//   svgNeu("rect", { x: 10, y: 20, width: 30, height: 40, class: "balken" })
// Text kommt wie bei neu() nur über textContent hinein, nie als HTML.
export function svgNeu(tag, eigenschaften = {}, text = "") {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, wert] of Object.entries(eigenschaften)) {
    element.setAttribute(name, String(wert));
  }
  if (text !== "") element.textContent = String(text);
  return element;
}

// ---------------------------------------------------------------------------
// Bilder zu Fragen
// ---------------------------------------------------------------------------
// Bilder liegen im Ordner docs/bilder/ und heißen wie die Frage, z. B.
// "bilder/dd-017.jpg". Ein Name wie "sauerbraten.jpg" würde die Lösung verraten!
// Nur genau dieses Muster ist erlaubt – so kann auch niemand über eine
// gefälschte Nachricht fremde Adressen auf den Handys laden lassen.
const BILD_MUSTER = /^bilder\/[a-z0-9-]{1,40}\.(jpg|png|webp|svg)$/;

export function bildPfadGueltig(pfad) {
  return typeof pfad === "string" && BILD_MUSTER.test(pfad);
}

// Passt das Bild einer Frage zu den Regeln? (Datei heißt wie die id, Lizenz angegeben)
export function bildGueltig(frage) {
  const bild = frage.bild;
  return (
    bild !== null && typeof bild === "object" &&
    bildPfadGueltig(bild.datei) &&
    bild.datei.replace(/^bilder\//, "").replace(/\.[a-z]+$/, "") === frage.id &&
    typeof bild.urheber === "string" && bild.urheber !== "" &&
    typeof bild.lizenz === "string" && bild.lizenz !== ""
  );
}

// Zeigt ein Bild im <img>-Element – oder versteckt es, wenn es keins gibt
export function bildZeigen(element, pfad) {
  if (bildPfadGueltig(pfad)) {
    element.src = pfad;
    element.hidden = false;
  } else {
    element.removeAttribute("src");
    element.hidden = true;
  }
}

