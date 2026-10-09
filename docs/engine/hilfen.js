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
