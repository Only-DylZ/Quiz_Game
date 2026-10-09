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
