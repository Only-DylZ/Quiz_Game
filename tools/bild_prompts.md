# Prompts für die Hintergrundbilder

Für eine kostenlose Bild-KI (Gemini-App, Microsoft Designer). Ablauf:

1. Prompt = **Grundteil** + **Szene** des Themas (beides zusammen einfügen).
2. Bild herunterladen und in `ki-bilder/` legen – Dateiname wie in der Tabelle
   (Endung egal: .png, .jpg, .webp).
3. Umwandeln: `python tools/pixel_bild.py ki-bilder/<datei> <name> --farben 64`
   → landet in `docs/bilder/szenen/<name>.png`.

Tipps:
- Kommt das Bild quadratisch: „Bitte im Format 16:9 (breit) erzeugen.“
- Sieht es zu sehr nach 3D-Rendering aus: „More pixelated, like a real 2D pixel art video game, flat shading.“
- Keine echten Figuren, Logos oder Gebäude aus Spielen/Filmen – das Repo ist öffentlich.

---

## Grundteil (immer davor)

Kurz gehalten (283 Zeichen), damit Grundteil + Szene unter 750 Zeichen bleiben (Grenze bei Adobe Firefly).

```
16:9 widescreen, Stardew Valley style 16-bit pixel art, visible square pixels, soft limited palette, cozy, rich details. Center stays calm and simple (UI covers the upper middle); details at the left, right and bottom edges. No text, letters, numbers, logos, UI or known characters.
```

---

## Szenen

| Name (`<name>`) | Thema |
|---|---|
| `farm` | Hauptmenü – **fertig** |
| `raumfahrt` | Raumfahrt |
| `geographie` | Geographie |
| `tierwelt` | Tierwelt (Dschungel) |
| `essen-trinken` | Essen & Trinken |
| `biologie` | Biologie |
| `chemie` | Chemie |
| `physik` | Physik |
| `mathe` | Mathe |
| `geschichte` | Zurück in die Vergangenheit |
| `das-ist-deutsch` | Das ist Deutsch |
| `filme-serien` | Filme & Serien |
| `videospiele` | Videospiele |
| `sport` | Sport |
| `jauch` | Die 500-€-Frage – **fertig** |
| `joker` | eigene Themen (Themenjoker) |

### raumfahrt
```
Scene: outer space seen from the surface of a grey moon with craters. A starry night sky
with a colorful purple-blue nebula, the Earth small in the upper left, a big orange ringed
planet on the right. A small white rocket with a flame on the left, a little lunar lander
and a flag on the moon surface at the bottom right.
```

### geographie
```
Scene: an explorer's world-travel landscape. On the left a snowy mountain range with a
waterfall, on the right a sandy desert with a pyramid and palm trees at an oasis, at the
bottom a coast with a lighthouse, a sailing boat and a big old map with a compass lying on
a wooden table in the bottom corner. Blue sky with a hot air balloon.
```

### tierwelt
```
Scene: a lush tropical jungle. Huge tree trunks with moss and hanging lianas on the left
and right, big leaves in the corners, a waterfall far in the background, sunbeams through
the canopy, a river at the bottom. A red macaw parrot on a branch on the left, a small
green frog on a leaf at the bottom right, a blue butterfly, a monkey hanging from a liana
on the right, colorful flowers.
```

### essen-trinken
```
Scene: a cozy rustic farmhouse kitchen. Wooden shelves with jars, spices and bottles on the
left, a stone oven with fresh bread and a hanging copper pot on the right, a big wooden
table at the bottom with vegetables, fruit baskets, cheese, a cake and a teapot. Warm
evening light from a window, herbs hanging from the ceiling.
```

### biologie
```
Scene: a sunny greenhouse and garden laboratory. Glass walls, potted plants and big ferns
on the left, a microscope, petri dishes and a jar with a plant on a wooden desk at the
bottom right, butterflies and bees, a beehive, a mushroom patch and a little pond with
tadpoles at the bottom left. Leaves and vines in the corners.
```

### chemie
```
Scene: an old-fashioned chemistry laboratory. Shelves with glowing colorful potion flasks
on the left, a wooden workbench at the bottom right with bubbling round-bottom flasks,
glass tubes, a Bunsen burner with a small blue flame and colorful smoke, a wall with a
chart of colored squares (no readable letters), warm lamp light.
```

### physik
```
Scene: an inventor's workshop with physics experiments. A Tesla coil with small purple
lightning sparks on the left, a big brass telescope pointing at a round window with stars
on the right, gears, magnets, a pendulum, a prism splitting light into a rainbow on a
wooden desk at the bottom, light bulbs hanging from the ceiling.
```

### mathe
```
Scene: a cozy old study room for mathematics. A big green chalkboard far in the back with
simple chalk drawings of triangles, circles and graphs (no readable numbers), wooden
bookshelves on the left, an abacus, a globe, compasses, rulers and geometric wooden shapes
(cubes, pyramids, spheres) on a desk at the bottom right, a window with evening light.
```

### geschichte
```
Scene: a journey through history. On the left an ancient Egyptian pyramid and a Roman
column ruin, in the middle background a medieval castle on a hill, on the right a Viking
ship on a river and an old windmill, at the bottom an old wooden chest with scrolls, a
knight's helmet, a sword and an hourglass. Golden sunset light.
```

### das-ist-deutsch
```
Scene: a typical small German old town. Half-timbered houses (Fachwerk) on the left and
right, a church with a tower in the background, a beer garden at the bottom with wooden
tables, pretzels and beer mugs, a sausage stand, a cuckoo clock on a wall, a small
Christmas-market stall with lights, cobblestone street, autumn trees.
```

### filme-serien
```
Scene: a classic old cinema at night. Red velvet curtains on the left and right, rows of
red cinema seats at the bottom, a popcorn machine and a ticket booth on the left, an old
film projector with a light beam on the right, film reels, a clapperboard without text
and a director's chair, golden lamps.
```

### videospiele
```
Scene: a retro arcade hall at night with neon lights. Rows of colorful arcade cabinets on
the left and right (screens show abstract colorful shapes, no real games), a pinball
machine, a claw machine with plush toys, a carpet with a space pattern at the bottom,
game controllers and cartridges on a shelf, purple and cyan neon glow.
```

### sport
```
Scene: a sunny sports stadium. A green football field with white lines at the bottom,
stadium stands with a colorful crowd (tiny pixel people, no faces in detail) in the back,
floodlights, on the left a running track and a high-jump mat, on the right a basketball
hoop, a tennis net and a trophy on a podium, flags waving.
```

### jauch
```
Scene: a big TV quiz show studio at night. A round stage with a glowing blue circle on the
floor in the middle, two black leather chairs facing each other with small screens on
stands, a huge round glowing blue screen in the background, rows of spotlights at the top,
audience seats on the left and right and in the front (tiny pixel people, no faces in
detail), blue neon lines everywhere. No logos, no text, no host.
```

### joker
```
Scene: a mysterious magical laboratory for "anything is possible". Dark purple stone walls,
floating glowing question marks in different colors, shelves with strange glowing potions
on the left, a crystal ball and an old book on a table at the bottom right, a big
treasure chest with light coming out, small sparkles everywhere, hanging lamps.
```
