// realtime.js – Verbindung zu Supabase Realtime.
//
// Jeder Spielraum ist ein Echtzeit-Kanal mit dem Namen "quiz-<RAUMCODE>".
// - "Presence" verrät, wer gerade im Raum ist (Host und Spieler).
// - "Broadcast" verschickt Nachrichten an alle anderen im Raum.
// Es werden keine Daten dauerhaft gespeichert.

// Supabase-Bibliothek vom CDN (feste Version, damit sich nichts unbemerkt ändert)
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm";
// Unsere Zugangsdaten (nur URL + anon key, siehe config.example.js)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Buchstaben für Raumcodes. Ohne I, O, 0 und 1, weil man die leicht verwechselt.
const ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LAENGE = 4;

// Erzeugt einen zufälligen Raumcode, z. B. "KX7Q".
export function neuerRaumcode() {
  const zufall = new Uint32Array(CODE_LAENGE);
  crypto.getRandomValues(zufall); // sicherer Zufall aus dem Browser
  let code = "";
  for (const zahl of zufall) {
    code += ZEICHEN[zahl % ZEICHEN.length];
  }
  return code;
}

// Prüft, ob ein eingegebener Code gültig aussieht. Gibt den sauberen Code
// (Großbuchstaben, ohne Leerzeichen) zurück oder null, wenn er ungültig ist.
export function raumcodePruefen(eingabe) {
  const code = String(eingabe || "").trim().toUpperCase();
  const erlaubt = new RegExp("^[" + ZEICHEN + "]{" + CODE_LAENGE + "}$");
  return erlaubt.test(code) ? code : null;
}

// Betritt einen Raum.
//   raumcode  – z. B. "KX7Q"
//   ich       – { id, name, rolle } mit rolle "host" oder "spieler",
//               bei Spielern dazu avatar (nur Zahlen, siehe engine/avatar.js)
//   beiNachricht(nachricht)  – wird bei jeder eingehenden Nachricht aufgerufen
//   beiTeilnehmern(liste)    – wird aufgerufen, wenn jemand kommt oder geht
//
// Gibt ein Objekt zurück mit:
//   bereit     – Promise, das erfüllt ist, sobald wir verbunden sind
//   senden(typ, daten) – schickt eine Nachricht an alle anderen im Raum
//   verlassen()        – Raum verlassen
export function raumBetreten(raumcode, ich, beiNachricht, beiTeilnehmern) {
  const kanal = supabase.channel("quiz-" + raumcode, {
    config: {
      broadcast: { self: false },  // eigene Nachrichten nicht zurückbekommen
      presence: { key: ich.id },   // jeder Teilnehmer hat eine eigene Kennung
    },
  });

  // Eingehende Nachrichten weiterreichen
  kanal.on("broadcast", { event: "nachricht" }, (paket) => {
    const nachricht = paket.payload;
    // Nur Nachrichten in unserem Format annehmen
    if (nachricht && typeof nachricht.typ === "string") {
      beiNachricht(nachricht);
    }
  });

  // Teilnehmerliste neu bauen, wenn sich etwas ändert
  kanal.on("presence", { event: "sync" }, () => {
    const zustand = kanal.presenceState(); // { id: [ {id, name, rolle}, ... ] }
    const liste = [];
    for (const eintraege of Object.values(zustand)) {
      // Pro Kennung kann es mehrere Einträge geben (z. B. zwei Tabs) – wir nehmen den ersten
      liste.push(eintraege[0]);
    }
    beiTeilnehmern(liste);
  });

  // Verbinden und uns im Raum "anmelden"
  const bereit = new Promise((erfuellt, abgelehnt) => {
    kanal.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const eintrag = { id: ich.id, name: ich.name, rolle: ich.rolle };
        if (ich.avatar) eintrag.avatar = ich.avatar; // der Host prüft ihn mit avatarPruefen
        await kanal.track(eintrag);
        erfuellt();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        abgelehnt(new Error("Verbindung zu Supabase fehlgeschlagen (" + status + ")"));
      }
    });
  });

  return {
    bereit,
    senden(typ, daten = {}) {
      return kanal.send({ type: "broadcast", event: "nachricht", payload: { typ, daten } });
    },
    verlassen() {
      return supabase.removeChannel(kanal);
    },
  };
}

// Themenjoker (Phase 5): Bittet die Edge Function "themenjoker", zu einem
// eigenen Thema ein Fragenpaket mit der KI zu erzeugen. Dauert ca. 10–30 s.
// Der KI-Schlüssel liegt nur auf dem Server – der Browser schickt nur Raumcode + Thema.
// Ergebnis: { ok: true, paket } oder { ok: false, fehler: "Text" }
export async function themenjokerErzeugen(raumcode, thema) {
  try {
    const { data, error } = await supabase.functions.invoke("themenjoker", {
      body: { raumcode, thema },
    });
    if (error || !data || typeof data !== "object") throw error || new Error("leere Antwort");
    return data;
  } catch (fehler) {
    console.error(fehler);
    return { ok: false, fehler: "Der Themenjoker ist gerade nicht erreichbar." };
  }
}

// Erzeugt eine zufällige Kennung für diesen Teilnehmer, z. B. "3f9a0c1e7b2d4e68".
// (Nicht crypto.randomUUID(), denn das fehlt auf Handys, die die Seite
//  beim Testen über http://192.168.… im WLAN öffnen.)
export function neueId() {
  const zufall = new Uint8Array(8);
  crypto.getRandomValues(zufall);
  return Array.from(zufall, (b) => b.toString(16).padStart(2, "0")).join("");
}
