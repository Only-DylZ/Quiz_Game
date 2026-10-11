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
