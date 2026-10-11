// engine/sprueche.js – Was die Avatare in ihren Sprechblasen sagen.
//
// Pro Situation eine Liste. spruch("warten") sucht zufällig einen aus.
// Neue Sprüche einfach in die passende Liste schreiben (kurz halten: max. ~40 Zeichen,
// sonst wird die Sprechblase zu breit).
//
// Achtung bei FAKTEN: Sie dürfen keine Antwort einer Quizfrage verraten!
// Vor dem Ergänzen kurz in docs/packs/ suchen, ob das Thema dort vorkommt.

export const SPRUECHE = {
  // Herumstehen in Lobby und Themenwahl
  warten: [
    "Digga, wann geht's los?",
    "Lowkey hab ich Angst 😬",
    "Ich bin heute Main Character.",
    "Aura farmen, bitte warten …",
    "Bin AFK, nur Spaß.",
    "Wer nicht mitmacht, ist ein NPC.",
    "Ready, Bro!",
    "One more round? Wir haben nicht mal angefangen.",
    "Das crazy, wie gut ich gleich bin.",
    "No cap, ich gewinn das.",
    "Ich spür die Aura.",
    "Lag im Kopf, bitte neu laden.",
    "Erst mal Snacks holen 🍿",
    "Ich hab heute nur Wikipedia gelesen.",
    "Bin bereit wie ein Speedrunner.",
    "Wer zuletzt lacht, hat Lag.",
    "Kurz stretchen, dann 1000 Punkte.",
    "Mein Gehirn lädt noch … 12 %",
    "Gönn dir, aber nicht den Sieg.",
    "Sheesh, voll viele Leute hier!",
    "Ich hab Skill. Glaub ich.",
    "GL HF, ihr Lappen 😄",
    "Bin nur wegen den Snacks hier.",
    "Wer hat das WLAN-Passwort?",
    "Respawn in 3 … 2 … 1 …",
  ],

  // Das Glücksrad dreht sich
  rad: [
    "Komm schon, komm schon …",
    "Bitte nicht Mathe 🙏",
    "Mein Thema, MEIN THEMA!",
    "RNG, sei mein Freund.",
    "Ich kann nicht hinschauen 🙈",
    "Dreh dich, du Ding!",
    "Gacha-Moment, Leute.",
    "Wenn das klappt, bin ich Legende.",
    "Jetzt wird's sus …",
    "Ohhh, knapp!",
  ],

  // Mein Kandidat hat auf dem Rad gewonnen
  radGewonnen: [
    "LET'S GOOO! 🎉",
    "W-Rad, W-Ich.",
    "Ehrenrad!",
    "Das war Absicht. Skill.",
    "Jackpot, Digga!",
    "Main-Character-Energie!",
  ],

  // Eine Frage richtig / mit vielen Punkten
  richtig: [
    "EZ.",
    "Big Brain Time 🧠",
    "Sheesh, Volltreffer!",
    "Das war so easy.",
    "Ich bin einfach built different.",
    "Aura +1000",
    "W!",
    "Kopfschuss! 🎯",
    "Hab ich doch gesagt.",
    "Wissen ist Macht, Bro.",
    "Speedrun-Antwort!",
    "Ehrenantwort.",
  ],

  // Eine Frage falsch / 0 Punkte
  falsch: [
    "Skill Issue …",
    "Das war Lag!",
    "Bodenlos, ich weiß.",
    "L. Einfach nur L.",
    "Ich war AFK!",
    "Wer hat die Frage geschrieben?!",
    "Bin raus. Ganz raus.",
    "Goofy Antwort, sorry.",
    "Aura −500",
    "Mein Daumen ist abgerutscht.",
    "Cringe, ehrlich.",
    "Absichtlich verloren, für die Spannung.",
    "Controller-Fehler!",
  ],

  // Runde gewonnen (GP bekommen)
  rundeGewonnen: [
    "GG EZ 😎",
    "Ich nehm den GP, danke.",
    "Wer hat's erfunden? Ich.",
    "Das ist Aura, Leute.",
    "Clutch!",
    "Victory Royale! 👑",
  ],

  // Runde verloren
  rundeVerloren: [
    "Nächste Runde gehört mir.",
    "Rematch, sofort!",
    "Ich lass euch nur gewinnen.",
    "GG WP, ehrlich.",
    "Nerf den Gewinner!",
    "Das Thema war gegen mich.",
  ],

  // Spiel gewonnen (Treppchen ganz oben)
  spielGewonnen: [
    "Ich bin der GOAT 🐐",
    "Ehrenmann/Ehrenfrau des Abends!",
    "Hall of Fame, Baby!",
    "Ich danke meinen Fans.",
    "Trophäe gesichert 🏆",
  ],

  // Spiel verloren
  spielVerloren: [
    "Hauptsache Spaß gehabt … oder?",
    "Ich will meinen Anwalt.",
    "Nächstes Mal ultra tryhard.",
    "GG, ihr wart okay.",
    "Platz 2 ist der erste Verlierer 😭",
  ],

  // "Wusstest du …?" – lustige Fakten zwischendurch (keine Quiz-Antworten!)
  fakten: [
    "Fakt: Faultiere halten länger die Luft an als Delfine.",
    "Fakt: Wombat-Kacke ist würfelförmig.",
    "Fakt: Kühe haben beste Freundinnen.",
    "Fakt: Otter halten beim Schlafen Händchen.",
    "Fakt: Ein Schneckenhaus wächst mit der Schnecke.",
    "Fakt: Krähen merken sich Gesichter.",
    "Fakt: Flamingos sind wegen ihres Futters rosa.",
    "Fakt: Seepferdchen-Papas bekommen die Babys.",
    "Fakt: Pinguine schenken sich Steine.",
    "Fakt: Katzen schnurren auch, wenn sie Angst haben.",
    "Fakt: Ziegen haben rechteckige Pupillen.",
  ],
};

// Zufälliger Spruch aus einer Situation (zufall zum Testen austauschbar)
export function spruch(situation, zufall = Math.random) {
  const liste = SPRUECHE[situation] || SPRUECHE.warten;
  return liste[Math.floor(zufall() * liste.length)];
}

// ---------------------------------------------------------------------------
// Sprüche nach einer Runde – passend zum Thema und dazu, wie gut sie lief.
// Schlüssel = Paketdatei ohne ".json" (wie die Hintergrundbilder).
// Achtung: keine Fakten, die eine Quizfrage verraten – nur Witze übers Thema.
// ---------------------------------------------------------------------------
export const THEMEN_SPRUECHE = {
  raumfahrt: {
    gut: [
      "Houston, ich hab KEIN Problem.",
      "Ich bin quasi Astronaut jetzt.",
      "To infinity and beyond! 🚀",
      "Mein Hirn ist in der Umlaufbahn.",
      "Ein kleiner Klick für mich …",
    ],
    schlecht: [
      "Houston, wir haben ein Problem.",
      "Ich war gedanklich auf dem Mars.",
      "Mein Raumschiff hatte Lag.",
      "Ich bin wohl im schwarzen Loch.",
      "Schwerelos … und punktelos.",
    ],
  },
  geographie: {
    gut: [
      "Ich bin ein wandelnder Atlas.",
      "Google Maps fragt jetzt MICH.",
      "Weltreise im Kopf: abgeschlossen.",
      "Ich kenn mich aus, Digga.",
    ],
    schlecht: [
      "Ich verlauf mich sogar im Supermarkt.",
      "Wo bin ich hier überhaupt?",
      "Mein Navi ist kaputt.",
      "Erdkunde war immer Freistunde.",
      "Die Karte war falsch herum!",
    ],
  },
  tierwelt: {
    gut: [
      "Ich bin quasi Tierarzt.",
      "Die Tiere haben mir geflüstert.",
      "Ich hab zu viele Tierdokus geschaut.",
      "Ich bin der Alpha hier. 🐺",
    ],
    schlecht: [
      "Ich kenn nur Hund und Katze.",
      "Ich bin eher so Faultier heute.",
      "Mein Haustier hätte das gewusst.",
      "Tiere sind mir zu hoch.",
      "Ich hab Goldfisch-Gedächtnis.",
    ],
  },
  "essen-trinken": {
    gut: [
      "Ich bin ein Gourmet, Baby.",
      "Fünf Sterne für mein Hirn. ⭐",
      "Essen ist halt mein Hobby.",
      "Gönn dir – hab ich.",
    ],
    schlecht: [
      "Ich koch nur Instant-Nudeln.",
      "Ich hatte Hunger, sorry.",
      "Mein Magen hat geantwortet.",
      "Ich kann nicht mal Toast.",
      "Hab nur an Pizza gedacht. 🍕",
    ],
  },
  biologie: {
    gut: [
      "Meine Zellen sind built different.",
      "Ich bin Biologie-Gott.",
      "Ich hab ein Gen für Quiz.",
      "Mein Gehirn hat Muskeln.",
    ],
    schlecht: [
      "Bio war immer nach der Pause …",
      "Meine Gehirnzellen schlafen.",
      "Ich bin eher so Einzeller.",
      "Evolution hat mich vergessen.",
      "Die Natur ist gegen mich.",
    ],
  },
  chemie: {
    gut: [
      "Die Chemie stimmt einfach.",
      "Ich bin Heisenberg. 🧪",
      "Reaktion: exotherm. Ich: heiß.",
      "Alles eine Frage der Formel.",
    ],
    schlecht: [
      "Bei mir hat's geknallt. 💥",
      "Chemie und ich: keine Verbindung.",
      "Ich hab das Labor angezündet.",
      "Zu viel Säure im Kopf.",
      "Meine Formel war falsch.",
    ],
  },
  physik: {
    gut: [
      "Ich hab die Physik gebrochen.",
      "Ich hab die Naturgesetze gecheckt.",
      "Ich bin geladen. ⚡",
      "Lichtgeschwindigkeit im Kopf.",
    ],
    schlecht: [
      "Schwerkraft hat mich runtergezogen.",
      "Ich bin eher Trägheit.",
      "Mein Hirn hat keinen Strom.",
      "Physik ist Hexerei, ehrlich.",
      "Die Formel war gegen mich.",
    ],
  },
  mathe: {
    gut: [
      "Ich bin ein menschlicher Taschenrechner.",
      "Mathe ist Liebe, Mathe ist Leben.",
      "Rechnen? Easy.",
      "Ich hab mitgerechnet. Im Kopf.",
    ],
    schlecht: [
      "Ich war noch nie gut in Mathe.",
      "Wozu gibt's Taschenrechner?!",
      "2 + 2 = Fisch.",
      "Zahlen sind nicht meine Freunde.",
      "Ich hab mich verrechnet. Oft.",
    ],
  },
  geschichte: {
    gut: [
      "Ich bin quasi ein Zeitreisender.",
      "Ich war live dabei, damals.",
      "Geschichte schreib ich selbst.",
      "Der Geschichtslehrer wär stolz.",
    ],
    schlecht: [
      "Das ist mir alles zu lange her.",
      "Ich lebe im Hier und Jetzt.",
      "Geschichte wiederholt sich: ich verlier.",
      "Ich hab in Geschichte geschlafen.",
      "Früher war alles besser. Ich nicht.",
    ],
  },
  "das-ist-deutsch": {
    gut: [
      "Ordnung muss sein. ✔",
      "Deutscher als ein Gartenzwerg.",
      "Pünktlich und richtig. Typisch.",
      "Ich trag Socken in Sandalen.",
    ],
    schlecht: [
      "Ich bin wohl nicht deutsch genug.",
      "Da fehlt mir das Formular.",
      "Ich muss das erst beantragen.",
      "Zu viel Bürokratie im Kopf.",
      "Ich hab den Feierabend verpasst.",
    ],
  },
  "filme-serien": {
    gut: [
      "Netflix-Abo hat sich gelohnt.",
      "Ich bin der Main Character.",
      "Bingewatching zahlt sich aus.",
      "And the Oscar goes to … mir!",
    ],
    schlecht: [
      "Ich schau nur YouTube.",
      "Ich bin bei der Folge eingeschlafen.",
      "Spoiler: Ich verlier.",
      "Mein Leben ist eine Tragödie.",
      "Ich hab nur den Trailer gesehen.",
    ],
  },
  videospiele: {
    gut: [
      "10.000 Stunden Gaming zahlen sich aus.",
      "Pro-Gamer-Move.",
      "Achievement freigeschaltet! 🏆",
      "Ich hab den Speedrun gewonnen.",
    ],
    schlecht: [
      "Ich hab gefettfingert, ich schwöre!",
      "Mein Controller ist kaputt.",
      "Ich spiel nur Handyspiele.",
      "Lag! Das war Lag!",
      "Game Over, Insert Coin.",
    ],
  },
  sport: {
    gut: [
      "Ich bin Sportler. Im Kopf.",
      "Tor! Tor! TOOOR! ⚽",
      "Goldmedaille für mich.",
      "Ich bin fit – zumindest im Wissen.",
    ],
    schlecht: [
      "Ich mach nur Sofa-Sport.",
      "Ich hab Muskelkater im Hirn.",
      "Rote Karte für mich.",
      "Ich war beim Aufwärmen.",
      "Sport ist Mord. Für meine Punkte.",
    ],
  },
};

// Passt zu jedem Thema (auch zu eigenen Themen per Joker)
export const ALLGEMEINE_RUNDEN_SPRUECHE = {
  gut: [
    "Das Thema liegt mir einfach.",
    "Ich bin Experte. Offiziell.",
    "Hab ich mal auf TikTok gesehen.",
    "Easy Peasy Lemon Squeezy.",
    "Wikipedia ist mein Zuhause.",
    "Ich hab gar nicht geraten. Ehrlich.",
    "Big Brain, Big Punkte.",
  ],
  schlecht: [
    "Ich hab gefettfingert, ich schwöre!",
    "Wer hat dieses Thema gewählt?!",
    "Das Thema war gegen mich.",
    "Ich hab alles geraten. Sieht man.",
    "Mein Handy hat falsch gedrückt.",
    "Nächstes Thema wird besser. Hoffentlich.",
    "Ich war mit dem Kopf woanders.",
  ],
};

// Spruch nach einer Runde: thema = Paketname (z. B. "mathe") oder null (eigenes Thema),
// gut = true/false. Halb themenbezogen, halb allgemein (falls es Themensprüche gibt).
export function rundenSpruch(thema, gut, zufall = Math.random) {
  const art = gut ? "gut" : "schlecht";
  const themen = Object.hasOwn(THEMEN_SPRUECHE, String(thema)) ? THEMEN_SPRUECHE[thema][art] : null;
  const liste = themen && zufall() < 0.65 ? themen : ALLGEMEINE_RUNDEN_SPRUECHE[art];
  return liste[Math.floor(zufall() * liste.length)];
}
