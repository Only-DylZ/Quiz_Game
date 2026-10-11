// engine/reihenfolge.js – Modus "reihenfolge".
//
// Die Spieler bringen 3–6 Elemente in die richtige Reihenfolge
// (z. B. Berge nach Höhe, Erfindungen nach Jahr).
//
// Im Paket steht die Lösung als Liste in richtiger Reihenfolge:
//   "loesung": ["Mount Everest", "K2", "Kangchendzönga", "Lhotse"],
//   "oben": "höchster", "unten": "niedrigster",       (Beschriftungen, freiwillig)
//   "werte": ["8849 m", "8611 m", "8586 m", "8516 m"] (für die Auflösung, freiwillig)
//
// Schummelschutz: Die Handys bekommen die Elemente ALPHABETISCH sortiert –
// nie in der richtigen Reihenfolge.
// Antwort eines Spielers: dieselben Elemente in seiner Reihenfolge.
// Punkte: nach richtig herum stehenden Paaren (punkteReihenfolge in punkte.js).
//
// Die Funktionen sind dieselben wie in auswahl.js – Beschreibung siehe dort.

import { neu } from "./hilfen.js";
import { punkteReihenfolge } from "./punkte.js";

const MIN_ELEMENTE = 3;
const MAX_ELEMENTE = 6;
const MAX_TEXT = 40; // Zeichen pro Element

// Höchstens so viele Spieler zeigt der Host bei der Auflösung an
const MAX_ANZEIGE = 10;

// Alphabetisch sortieren (deutsche Regeln, z. B. Ä wie A)
function alphabetisch(liste) {
  return [...liste].sort((a, b) => a.localeCompare(b, "de"));
}

export function pruefeFrage(frage) {
  const l = frage.loesung;
  const textOk = (t) => t === undefined || (typeof t === "string" && t.length <= MAX_TEXT);
  return (
    Array.isArray(l) &&
    l.length >= MIN_ELEMENTE &&
    l.length <= MAX_ELEMENTE &&
    l.every((e) => typeof e === "string" && e !== "" && e.length <= MAX_TEXT) &&
    new Set(l).size === l.length && // keine doppelten Elemente
    // Wäre alphabetisch schon die Lösung, sähen die Handys sie sofort!
    alphabetisch(l).join("|") !== l.join("|") &&
    textOk(frage.oben) &&
    textOk(frage.unten) &&
    (frage.werte === undefined ||
      (Array.isArray(frage.werte) && frage.werte.length === l.length &&
        frage.werte.every((w) => typeof w === "string")))
  );
}

// Nur die alphabetisch sortierten Elemente und die Beschriftungen – OHNE Lösung
export function oeffentlicheDaten(frage) {
  return {
    elemente: alphabetisch(frage.loesung),
    oben: frage.oben || "",
    unten: frage.unten || "",
  };
}

// ---------------------------------------------------------------------------
// Host: Elemente als Kacheln zeigen
// ---------------------------------------------------------------------------

export function zeigeFrage(bereich, daten) {
  const hinweis = neu("p", "hinweis",
    "Bringt die Elemente in die richtige Reihenfolge" +
    (daten.oben ? " – oben: " + daten.oben : "") +
    (daten.unten ? ", unten: " + daten.unten : ""));
  const kacheln = neu("div", "reihe-kacheln");
  for (const element of daten.elemente) kacheln.append(neu("span", "reihe-kachel", element));
  bereich.replaceChildren(hinweis, kacheln);
}

// ---------------------------------------------------------------------------
// Handy: Elemente der Reihe nach antippen, danach per Ziehen umsortieren
// ---------------------------------------------------------------------------

// Verschiebt ein Element einer Liste von Platz "von" auf Platz "nach"
// (gibt eine neue Liste zurück). Beispiel: [A, B, C, D], von 3 nach 1 → [A, D, B, C]
export function verschieben(liste, von, nach) {
  const kopie = [...liste];
  const [element] = kopie.splice(von, 1);
  kopie.splice(nach, 0, element);
  return kopie;
}

export function zeigeEingabe(bereich, daten, senden, entwurfSenden) {
  let reihe = []; // bisher angetippte Elemente, in dieser Reihenfolge
  let fertig = false;

  const liste = neu("ol", "reihe-liste");
  const tasten = neu("div", "reihe-tasten");
  const zuruecksetzen = neu("button", "klein", "Zurücksetzen");
  zuruecksetzen.type = "button";
  const knopf = neu("button", "", "Senden");
  const info = neu("p", "hinweis",
    "Tippe die Elemente der Reihe nach an – zuerst das oberste. " +
    "Mit ☰ kannst du sie danach noch verschieben.");

  // Sind alle Elemente einsortiert, zählt die Reihenfolge auch ohne Senden
  function entwurfPruefen() {
    if (reihe.length === daten.elemente.length) entwurfSenden([...reihe]);
  }

  function neuZeichnen() {
    // Liste: belegte Plätze (ziehbar) + leere Plätze
    const eintraege = [];
    for (let i = 0; i < daten.elemente.length; i++) {
      if (i < reihe.length) {
        const eintrag = neu("li", fertig ? "" : "ziehbar");
        if (!fertig) eintrag.append(neu("span", "griff", "☰"));
        eintrag.append(neu("span", "", reihe[i]));
        if (!fertig) ziehbarMachen(eintrag, i);
        eintraege.push(eintrag);
      } else {
        eintraege.push(neu("li", "leer", "…"));
      }
    }
    liste.replaceChildren(...eintraege);

    // Tasten: nur noch nicht gewählte Elemente
    const offen = daten.elemente.filter((e) => !reihe.includes(e));
    tasten.replaceChildren(...offen.map((element) => {
      const taste = neu("button", "reihe-taste", element);
      taste.type = "button";
      taste.disabled = fertig;
      taste.addEventListener("click", () => {
        reihe.push(element);
        entwurfPruefen();
        neuZeichnen();
      });
      return taste;
    }));

    knopf.disabled = fertig || reihe.length !== daten.elemente.length;
    zuruecksetzen.disabled = fertig || reihe.length === 0;
  }

  // Ziehen mit Finger oder Maus ("Pointer-Events" können beides).
  // Während des Ziehens wird nur verschoben angezeigt (CSS transform);
  // erst beim Loslassen ändert sich "reihe" und die Liste wird neu gezeichnet.
  function ziehbarMachen(eintrag, von) {
    eintrag.addEventListener("pointerdown", (ereignis) => {
      if (fertig) return;
      ereignis.preventDefault();
      eintrag.setPointerCapture(ereignis.pointerId); // Bewegungen kommen weiter hier an

      // Positionen aller belegten Plätze zu Beginn merken
      const plaetze = [...liste.children].slice(0, reihe.length);
      const mitten = plaetze.map((p) => {
        const r = p.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      // Abstand von einem Platz zum nächsten (Höhe + Lücke)
      const abstand = plaetze.length > 1
        ? mitten[1] - mitten[0]
        : eintrag.getBoundingClientRect().height;
      const startY = ereignis.clientY;
      let nach = von;
      eintrag.classList.add("wird-gezogen");

      function bewegen(e) {
        const dy = e.clientY - startY;
        eintrag.style.transform = "translateY(" + dy + "px)";

        // Neuer Platz = wie viele andere Plätze liegen über der gezogenen Mitte?
        const mitte = mitten[von] + dy;
        nach = mitten.filter((m, j) => j !== von && m < mitte).length;

        // Die anderen rücken auseinander, um Platz zu machen
        plaetze.forEach((p, j) => {
          if (j === von) return;
          let verschiebung = 0;
          if (von < nach && j > von && j <= nach) verschiebung = -abstand;
          if (nach < von && j >= nach && j < von) verschiebung = abstand;
          p.style.transform = verschiebung ? "translateY(" + verschiebung + "px)" : "";
        });
      }

      function loslassen(e) {
        eintrag.removeEventListener("pointermove", bewegen);
        eintrag.removeEventListener("pointerup", loslassen);
        eintrag.removeEventListener("pointercancel", loslassen);
        if (e.type === "pointerup" && nach !== von) {
          reihe = verschieben(reihe, von, nach);
          entwurfPruefen();
        }
        neuZeichnen(); // zeichnet alles ohne Verschiebungen neu
      }

      eintrag.addEventListener("pointermove", bewegen);
      eintrag.addEventListener("pointerup", loslassen);
      eintrag.addEventListener("pointercancel", loslassen);
    });
  }

  zuruecksetzen.addEventListener("click", () => {
    reihe = [];
    entwurfSenden(null); // nichts mehr fertig sortiert
    neuZeichnen();
  });

  const formular = neu("form", "schaetzen");
  formular.addEventListener("submit", (ereignis) => {
    ereignis.preventDefault(); // Seite nicht neu laden
    if (reihe.length !== daten.elemente.length) return;
    fertig = true; // nur eine Antwort erlaubt
    info.textContent = "";
    senden([...reihe]);
    neuZeichnen();
  });

  const teile = [];
  if (daten.oben) teile.push(neu("p", "reihe-rand", "▲ " + daten.oben));
  teile.push(liste);
  if (daten.unten) teile.push(neu("p", "reihe-rand", "▼ " + daten.unten));
  formular.append(...teile, tasten, zuruecksetzen, knopf, info);
  bereich.replaceChildren(formular);
  neuZeichnen();
}

// ---------------------------------------------------------------------------
// Auswerten
// ---------------------------------------------------------------------------

// Gültig = genau die Elemente der Frage, jedes einmal, in beliebiger Reihenfolge
export function antwortGueltig(daten, antwort) {
  return (
    Array.isArray(antwort) &&
    antwort.length === daten.elemente.length &&
    antwort.every((e) => typeof e === "string" && daten.elemente.includes(e)) &&
    new Set(antwort).size === antwort.length
  );
}

export function bewerte(frage, antwort, anteil) {
  return punkteReihenfolge(antwort, frage.loesung);
}

export function loesungAlsText(frage) {
  return frage.loesung.map((e, i) => i + 1 + ". " + e).join("  ");
}

// Host: richtige Reihenfolge (mit Werten), darunter die Punkte der Spieler
export function zeigeAufloesung(bereich, frage, antworten) {
  const teile = [];
  if (frage.oben) teile.push(neu("p", "reihe-rand", "▲ " + frage.oben));

  const liste = neu("ol", "reihe-liste reihe-loesung");
  frage.loesung.forEach((element, i) => {
    const eintrag = neu("li");
    eintrag.append(neu("span", "", element));
    if (frage.werte) eintrag.append(neu("span", "reihe-wert", frage.werte[i]));
    liste.append(eintrag);
  });
  teile.push(liste);
  if (frage.unten) teile.push(neu("p", "reihe-rand", "▼ " + frage.unten));

  const sortiert = [...antworten].sort((a, b) => b.punkte - a.punkte);
  const spieler = neu("ol", "schaetzliste");
  for (const a of sortiert.slice(0, MAX_ANZEIGE)) {
    const eintrag = neu("li");
    eintrag.append(neu("span", "", a.name), neu("span", "plus", "+" + a.punkte));
    spieler.append(eintrag);
  }
  teile.push(spieler);

  bereich.replaceChildren(...teile);
}
