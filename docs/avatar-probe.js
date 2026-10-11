// avatar-probe.js – Probe für Avatare: Baukasten + Figuren auf der Farm.
// Keine Spiellogik, keine Verbindung zu Supabase.

import { hintergrundSetzen } from "./engine/uifarben.js";
import { katalogLaden, zufallsAvatar } from "./engine/avatar.js";
import { avatarwahlErstellen } from "./engine/avatarwahl.js";
import { farmlebenStarten } from "./engine/farmleben.js";
import { jahrmarktErstellen } from "./engine/jahrmarkt.js";

const $ = (id) => document.getElementById(id);
hintergrundSetzen("farm");

const katalog = await katalogLaden();
const wahl = await avatarwahlErstellen($("baukasten"), katalog);
const farm = farmlebenStarten(document.body, katalog);

// Ein Rad zum Hinschauen
const rad = jahrmarktErstellen($("radPlatz"));
rad.kartenSetzen([{ thema: "Sport", farbe: "#c8473a" }, { thema: "Mathe", farbe: "#3b7fb5" }, { thema: "Chemie", farbe: "#5a9a3c" }]);

const NAMEN = ["Anna", "Ben", "Cem", "Dana", "Emil", "Fiona", "Gül", "Hugo"];
const spieler = [{ id: "ich", name: "Du", avatar: wahl.avatar }];
for (let i = 0; i < 5; i++) spieler.push({ id: "s" + i, name: NAMEN[i], avatar: zufallsAvatar(katalog) });
farm.spielerSetzen(spieler);

// Eigener Avatar: bei jeder Änderung im Baukasten neu setzen
$("baukasten").addEventListener("click", () => {
  spieler[0].avatar = wahl.avatar;
  farm.spielerSetzen(spieler);
});

$("mehr").addEventListener("click", () => {
  const i = spieler.length - 1;
  spieler.push({ id: "s" + i, name: NAMEN[i % NAMEN.length] + (i >= NAMEN.length ? i : ""), avatar: zufallsAvatar(katalog) });
  farm.spielerSetzen(spieler);
});

$("rad").addEventListener("click", async () => {
  const kasten = $("radPlatz").getBoundingClientRect();
  farm.zumRadSchauen({ x: kasten.left + kasten.width / 2, y: kasten.top + kasten.height * 0.35 });
  farm.alleSagen("rad");
  const gewinner = Math.floor(Math.random() * 3);
  await rad.drehen(gewinner);
  farm.zumRadSchauen(null);
  const glueckspilz = spieler[Math.floor(Math.random() * spieler.length)];
  farm.jubeln(glueckspilz.id);
  farm.sagen(glueckspilz.id, "LET'S GOOO! 🎉");
});

$("gewinner").addEventListener("click", () => {
  farm.jubeln("ich");
  farm.sagen("ich", "Victory Royale! 👑");
});
$("richtig").addEventListener("click", () => farm.alleSagen("richtig"));
$("falsch").addEventListener("click", () => farm.alleSagen("falsch"));

// avatar-probe.html#rad dreht nach kurzer Zeit automatisch (zum Ausprobieren)
if (location.hash === "#rad") setTimeout(() => $("rad").click(), 1500);
