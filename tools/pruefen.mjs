// tools/pruefen.mjs – Prüft das ganze Projekt mit einem Befehl:
//
//   node tools/pruefen.mjs
//
// 1. Syntax: Hat eine JavaScript-Datei in docs/ einen Tippfehler?
// 2. Tests:  Stimmen Punkte, Zahlen-Eingabe und Lösungsschutz? (tools/*.test.mjs)
//
// Läuft nur auf dem eigenen PC mit Node.js – gehört nicht zur Website.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const projekt = join(import.meta.dirname, "..");
let fehler = 0;

// ---------------------------------------------------------------------------
// 1. Syntax aller .js-Dateien in docs/ prüfen
// ---------------------------------------------------------------------------
// Hinweis: "node --check datei.js" findet Fehler in ES-Modulen NICHT zuverlässig.
// Deshalb geben wir den Inhalt über die Eingabe mit --input-type=module weiter.
console.log("1. Syntax prüfen …");

for (const datei of jsDateien(join(projekt, "docs"))) {
  if (datei.endsWith("config.js")) continue; // enthält Schlüssel – nicht anfassen
  const ergebnis = spawnSync(process.execPath, ["--input-type=module", "--check"], {
    input: readFileSync(datei),
    encoding: "utf8",
  });
  const name = datei.slice(projekt.length + 1);
  if (ergebnis.status === 0) {
    console.log("   ok     " + name);
  } else {
    console.log("   FEHLER " + name);
    console.log(ergebnis.stderr.split("\n").filter((z) => z.trim()).slice(0, 4).join("\n"));
    fehler++;
  }
}

// ---------------------------------------------------------------------------
// 2. Tests ausführen
// ---------------------------------------------------------------------------
console.log("\n2. Tests ausführen …");
const tests = readdirSync(import.meta.dirname)
  .filter((n) => n.endsWith(".test.mjs"))
  .map((n) => join(import.meta.dirname, n));

const lauf = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
if (lauf.status !== 0) fehler++;

// ---------------------------------------------------------------------------
console.log(fehler === 0 ? "\nAlles in Ordnung ✔" : "\nEs gibt Fehler ✘");
process.exit(fehler === 0 ? 0 : 1);

// Findet alle .js-Dateien in einem Ordner und seinen Unterordnern
function jsDateien(ordner) {
  const liste = [];
  for (const eintrag of readdirSync(ordner, { withFileTypes: true })) {
    const pfad = join(ordner, eintrag.name);
    if (eintrag.isDirectory()) liste.push(...jsDateien(pfad));
    else if (eintrag.name.endsWith(".js")) liste.push(pfad);
  }
  return liste;
}
