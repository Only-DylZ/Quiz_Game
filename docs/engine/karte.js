// engine/karte.js – Die Art "karte" des Grafik-Modus (wird von grafik.js benutzt).
//
// Zeigt eine Landkarte mit Leaflet (Bibliothek). Leaflet wird in host.html und
// play.html per <script> geladen und steht dann als globales "L" bereit.
//
// Zwei Arten von Karte:
//   - Während der Frage (Host + Handy): eine selbst gezeichnete Weltkarte
//     OHNE Beschriftung aus karten/welt.json (Natural Earth, gemeinfrei).
//     Sonst könnte man den gesuchten Ort einfach auf der Karte ablesen.
//   - Bei der Auflösung (Host): OpenStreetMap MIT Beschriftung. OSM ist
//     kostenlos, verlangt aber sichtbare Namensnennung und keine
//     Massen-Downloads (wir laden nur, was gerade zu sehen ist).

import { neu, zahlText } from "./hilfen.js";
import { entfernungKm } from "./punkte.js";

const KACHELN = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Fester Text von uns (kein Spieler-Input) – darf deshalb HTML enthalten
const NAMENSNENNUNG = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende';

// Weltkarte ohne Namen (siehe oben). Wird nur einmal geladen und dann gemerkt.
const WELT_DATEI = "karten/welt.json";
let weltVersprechen = null;

// Farben der selbst gezeichneten Karte
const LAND = { color: "#8a8a8a", weight: 1, fillColor: "#f2efe9", fillOpacity: 1 };
const WASSER = { color: "#8a8a8a", weight: 1, fillColor: "#a8cbe6", fillOpacity: 1 };

// Höchstens so viele Spieler zeigt der Host bei der Auflösung in der Liste an
const MAX_ANZEIGE = 10;

// Die gerade angezeigte Karte und ihr Größen-Beobachter. Vor einer neuen Karte
// wird die alte sauber entfernt, damit nichts im Hintergrund weiterläuft.
let aktiveKarte = null;
let beobachter = null;

// ---------------------------------------------------------------------------
// Prüfen und Text
// ---------------------------------------------------------------------------

// Ist das ein gültiger Ort { lat, lng }? (lat = Breite −90…90, lng = Länge −180…180)
export function ortGueltig(ort) {
  return (
    ort !== null &&
    typeof ort === "object" &&
    Number.isFinite(ort.lat) && ort.lat >= -90 && ort.lat <= 90 &&
    Number.isFinite(ort.lng) && ort.lng >= -180 && ort.lng <= 180
  );
}

// { lat: 45.96, lng: 63.31 } → "45,96° N, 63,31° O"
export function ortAlsText(ort) {
  const breite = zahlText(Math.abs(ort.lat)) + "° " + (ort.lat >= 0 ? "N" : "S");
  const laenge = zahlText(Math.abs(ort.lng)) + "° " + (ort.lng >= 0 ? "O" : "W");
  return breite + ", " + laenge;
}

// ---------------------------------------------------------------------------
// Karte erzeugen
// ---------------------------------------------------------------------------

// Legt eine neue Leaflet-Karte im Bereich an und gibt sie zurück.
// klasse = "karte" (Host, groß) oder "karte karte-handy" (Handy)
// beschriftet = true → OpenStreetMap mit Namen (nur für die Auflösung!)
function neueKarte(bereich, daten, klasse, beschriftet = false) {
  if (beobachter) beobachter.disconnect();
  if (aktiveKarte) aktiveKarte.remove();
  aktiveKarte = null;
  beobachter = null;

  // Leaflet nicht geladen (z. B. CDN nicht erreichbar)? Freundlich melden.
  if (typeof L === "undefined") {
    bereich.replaceChildren(neu("p", "meldung", "Die Karte konnte nicht geladen werden."));
    return null;
  }

  const behaelter = neu("div", klasse);
  bereich.replaceChildren(behaelter);

  let karte;
  if (beschriftet) {
    karte = L.map(behaelter, { worldCopyJump: true, minZoom: 1, maxZoom: 18 })
      .setView(daten.mitte, daten.zoom);
    L.tileLayer(KACHELN, { maxZoom: 18, attribution: NAMENSNENNUNG }).addTo(karte);
  } else {
    // Nur eine Welt (kein Weiterschieben über die Datumsgrenze), nicht zu nah
    // heranzoomen – die Umrisse sind dafür zu grob.
    karte = L.map(behaelter, {
      minZoom: 1, maxZoom: 8, preferCanvas: true,
      maxBounds: [[-90, -180], [90, 180]], maxBoundsViscosity: 1,
    }).setView(daten.mitte, daten.zoom);
    behaelter.classList.add("karte-ohne-namen"); // Meer-Farbe als Hintergrund
    umrisseZeichnen(karte);
  }

  // Leaflet muss die Größe neu messen, sobald der Bereich sichtbar wird
  // (auf dem Handy wird die Seite erst nach dem Aufbau eingeblendet).
  beobachter = new ResizeObserver(() => karte.invalidateSize());
  beobachter.observe(behaelter);

  aktiveKarte = karte;
  return karte;
}

// Lädt die Weltkarte (nur beim ersten Mal wirklich, danach aus dem Gedächtnis)
function weltLaden() {
  if (!weltVersprechen) {
    weltVersprechen = fetch(WELT_DATEI).then((antwort) => {
      if (!antwort.ok) throw new Error("Weltkarte nicht gefunden");
      return antwort.json();
    });
    weltVersprechen.catch(() => { weltVersprechen = null; }); // beim nächsten Mal neu versuchen
  }
  return weltVersprechen;
}

// Zeichnet Länder und Seen auf eine Karte ohne Beschriftung
async function umrisseZeichnen(karte) {
  karte.attributionControl.addAttribution("Natural Earth");
  try {
    const welt = await weltLaden();
    if (karte !== aktiveKarte) return; // inzwischen schon eine andere Karte
    const sammlung = (liste) => ({ type: "GeometryCollection", geometries: liste });
    L.geoJSON(sammlung(welt.laender), { style: LAND, interactive: false }).addTo(karte);
    L.geoJSON(sammlung(welt.seen), { style: WASSER, interactive: false }).addTo(karte);
  } catch (fehler) {
    console.error(fehler);
    karte.attributionControl.addAttribution("⚠ Umrisse konnten nicht geladen werden");
  }
}

// Ein farbiger Punkt auf der Karte (ohne Bilddateien, deshalb circleMarker)
function punkt(ort, farbe, groesse) {
  return L.circleMarker([ort.lat, ort.lng], {
    radius: groesse, color: "#111", weight: 2, fillColor: farbe, fillOpacity: 1,
    interactive: false, // Klicks gehen durch den Punkt hindurch an die Karte
  });
}

// ---------------------------------------------------------------------------
// Host: Frage zeigen
// ---------------------------------------------------------------------------

export function zeigeFrage(bereich, daten) {
  neueKarte(bereich, daten, "karte");
}

// ---------------------------------------------------------------------------
// Handy: Ort antippen + Senden
// ---------------------------------------------------------------------------

export function zeigeEingabe(bereich, daten, senden, entwurfSenden) {
  const kartenBereich = neu("div");
  const info = neu("p", "hinweis", "Tippe auf die Karte, um deinen Tipp zu setzen.");
  const knopf = neu("button", "", "Senden");
  knopf.disabled = true; // erst nach dem ersten Tippen

  const formular = neu("form", "schaetzen");
  formular.append(knopf, info);
  bereich.replaceChildren(kartenBereich, formular);

  const karte = neueKarte(kartenBereich, daten, "karte karte-handy");
  if (!karte) return;

  let tipp = null;   // { lat, lng }
  let marker = null;

  karte.on("click", (ereignis) => {
    // wrap(): falls man über die Datumsgrenze hinaus geschoben hat
    const ort = ereignis.latlng.wrap();
    tipp = { lat: runden(ort.lat), lng: runden(ort.lng) };

    if (marker) marker.setLatLng([tipp.lat, tipp.lng]);
    else marker = punkt(tipp, "#facc15", 10).addTo(karte);

    knopf.disabled = false;
    info.textContent = "Ohne Senden zählt bei Zeitablauf dein letzter Tipp.";
    entwurfSenden(tipp);
  });

  formular.addEventListener("submit", (ereignis) => {
    ereignis.preventDefault(); // Seite nicht neu laden
    if (!tipp) return;
    // Nur eine Antwort erlaubt – Karte nimmt keine Klicks mehr an
    karte.off("click");
    knopf.disabled = true;
    info.textContent = "";
    senden(tipp);
  });
}

// Auf 4 Nachkommastellen (≈ 10 m) – genauer braucht es nicht
function runden(zahl) {
  return Math.round(zahl * 10000) / 10000;
}

// ---------------------------------------------------------------------------
// Host: Auflösung – Lösung + alle Tipps auf der Karte, darunter die Liste
// ---------------------------------------------------------------------------

export function zeigeAufloesung(bereich, frage, antworten) {
  const kartenBereich = neu("div");
  const loesungText = neu("p", "gross-hinweis", "Lösung: " + ortAlsText(frage.loesung));

  // Liste: die besten zuerst, mit Entfernung
  const sortiert = [...antworten].sort((a, b) => b.punkte - a.punkte);
  const liste = neu("ol", "schaetzliste");
  for (const a of sortiert.slice(0, MAX_ANZEIGE)) {
    const km = Math.round(entfernungKm(a.antwort, frage.loesung));
    const eintrag = neu("li");
    eintrag.append(
      neu("span", "", a.name),
      neu("span", "", zahlText(km) + " km daneben"),
      neu("span", "plus", "+" + a.punkte)
    );
    liste.append(eintrag);
  }

  bereich.replaceChildren(kartenBereich, loesungText, liste);

  const daten = { mitte: [frage.loesung.lat, frage.loesung.lng], zoom: frage.daten.zoom };
  const karte = neueKarte(kartenBereich, daten, "karte", true); // jetzt MIT Namen
  if (!karte) return;

  const alleOrte = [[frage.loesung.lat, frage.loesung.lng]];

  // Tipps der Spieler: Linie zur Lösung + Punkt mit Namen
  for (const a of antworten) {
    const ort = [a.antwort.lat, a.antwort.lng];
    alleOrte.push(ort);
    L.polyline([ort, alleOrte[0]], { color: "#818cf8", weight: 2, dashArray: "6 6", interactive: false }).addTo(karte);
    // Namen als Element übergeben, NICHT als Text-String: Leaflet würde
    // einen String als HTML einfügen – so kann niemand Code einschleusen.
    punkt(a.antwort, "#818cf8", 8)
      .bindTooltip(neu("span", "", a.name), { permanent: true, direction: "top" })
      .addTo(karte);
  }

  // Lösung zuletzt, damit sie oben liegt
  punkt(frage.loesung, "#facc15", 12).addTo(karte);

  // Ausschnitt so wählen, dass Lösung und alle Tipps zu sehen sind
  if (alleOrte.length > 1) karte.fitBounds(alleOrte, { padding: [40, 40], maxZoom: 8 });
}
