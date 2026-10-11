// engine/punkte.js – Alle Punkteregeln an einer Stelle (siehe CLAUDE.md, Abschnitt 5).
//
// Hier wird nur gerechnet, nichts angezeigt. Deshalb lassen sich die Regeln
// automatisch testen:  node tools/pruefen.mjs
//

export const MAX_PUNKTE = 1000;

// Wie viel der Antwortzeit war noch übrig? 1 = sofort, 0 = in letzter Sekunde.
//   zeitMs          – gemessene Antwortzeit in Millisekunden
//   gesamtSekunden  – Antwortzeit der Frage in Sekunden
export function anteilRestzeit(zeitMs, gesamtSekunden) {
  if (!(gesamtSekunden > 0)) return 0;
  return begrenzen(1 - zeitMs / (gesamtSekunden * 1000), 0, 1);
}

// auswahl: falsch = 0 Punkte, richtig = 500 bis 1000 Punkte – je schneller, desto mehr.
export function punkteAuswahl(richtig, anteil) {
  if (!richtig) return 0;
  return Math.round(500 + 500 * begrenzen(anteil, 0, 1));
}

// schaetzen: nach prozentualer Abweichung von der Lösung.
// Genau richtig = 1000, 10 % daneben = 900, 100 % oder mehr daneben = 0.
export function punkteSchaetzen(antwort, loesung) {
  if (!Number.isFinite(antwort) || !Number.isFinite(loesung)) return 0;

  // Sonderfall Lösung 0: Teilen durch 0 geht nicht – nur exakt 0 gibt Punkte
  if (loesung === 0) return antwort === 0 ? MAX_PUNKTE : 0;

  const abweichung = Math.abs(antwort - loesung) / Math.abs(loesung);
  return Math.round(MAX_PUNKTE * Math.max(0, 1 - abweichung));
}

// zeitleiste: wie schaetzen, aber die Abweichung wird auf die Spanne der
// Zeitleiste bezogen (bis − von), nicht auf die Jahreszahl. Sonst wäre
// 1959 statt 1969 nur 0,5 % daneben. Beispiel Spanne 50 Jahre:
// genau = 1000, 5 Jahre daneben = 900, 50 Jahre oder mehr daneben = 0.
export function punkteZeitleiste(antwort, loesung, von, bis) {
  const spanne = bis - von;
  if (!Number.isFinite(antwort) || !Number.isFinite(loesung) || !(spanne > 0)) return 0;

  const abweichung = Math.abs(antwort - loesung) / spanne;
  return Math.round(MAX_PUNKTE * Math.max(0, 1 - abweichung));
}

// karte: nach Entfernung zur Lösung.
// 0 km = 1000, 500 km = 750, ab KARTE_NULL_KM km = 0 Punkte.
export const KARTE_NULL_KM = 2000;

export function punkteKarte(antwort, loesung) {
  const km = entfernungKm(antwort, loesung);
  if (!Number.isFinite(km)) return 0;
  return Math.round(MAX_PUNKTE * Math.max(0, 1 - km / KARTE_NULL_KM));
}

// Entfernung zwischen zwei Orten { lat, lng } in km – "Haversine-Formel".
// Sie rechnet auf einer Kugel (der Erde) statt auf einer flachen Karte.
export function entfernungKm(a, b) {
  const ERDRADIUS_KM = 6371;
  const rad = (grad) => (grad * Math.PI) / 180;

  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;

  return 2 * ERDRADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Rangliste: sortiert nach Punkten, gleiche Punkte = gleicher Platz.
//   spieler – Liste von { id, name, punkte }
//   Ergebnis – neue Liste, jeder Eintrag zusätzlich mit "platz"
export function ranglisteBerechnen(spieler) {
  const sortiert = [...spieler].sort((a, b) => b.punkte - a.punkte);
  const ergebnis = [];

  for (let i = 0; i < sortiert.length; i++) {
    let platz = i + 1;
    // Gleich viele Punkte wie der Vordermann? Dann denselben Platz übernehmen.
    if (i > 0 && sortiert[i].punkte === sortiert[i - 1].punkte) {
      platz = ergebnis[i - 1].platz;
    }
    ergebnis.push({ ...sortiert[i], platz });
  }
  return ergebnis;
}

// Hält einen Wert zwischen min und max. Ungültige Werte (NaN) werden zu min.
function begrenzen(wert, min, max) {
  if (!Number.isFinite(wert)) return min;
  return Math.min(max, Math.max(min, wert));
}
