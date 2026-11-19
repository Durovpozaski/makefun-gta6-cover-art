# makefun-gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Durovpozaski/makefun-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Durovpozaski/makefun-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

NEON TIDE Cover Studio turns your photos and a caption into a multi-panel poster in the style of GTA 6 key art — bold gradient lettering, a neon Vice City sunset grade, and a comic-book panel grid — and exports it as a PNG to share. It runs fully offline in a desktop browser from its own static files: your photos never leave the machine.

What it does:

- **Multi-panel layouts** — 6 layouts, from a 9-panel Key Art grid to a Diagonal Split in the style of the GTA VI key art.
- **Colour grades** — 6 sunset/neon grades (Heatwave, Neon Nights, Golden Hour, Vice Pink, Midnight, Palm Noir) applied consistently across every panel.
- **Poster Ink** — a halftone + posterize treatment with Off/Low/High strength. It is face-aware: a draggable face box marks the skin that Poster Ink keeps smooth, so faces stay clean while the rest of the poster gets the print treatment.
- **Any photo, any panel** — drag-and-drop or pick photos, click a panel to select it, drag to reposition, zoom, and swap photos per panel. A "Surprise me" button randomizes layout, grade, and photos.
- **One-click PNG export** — 1920×1080, 1080×1350, and 1080×1080, rendered straight from canvas.
- **Fully offline** — every font and sample photo is bundled under `app/`; nothing is fetched at runtime. No Rockstar logos, artwork, or fonts are used.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Load your own photos (or use the bundled samples), pick a layout and grade, edit the title and tagline, and export a PNG.

## Build the dossier

```sh
node main.ts
```

`main.ts` checks the screenshots and the app's files, then copies `app/`, `screenshots/`, and `dossier.json` into the output directory (it respects `MAKEFUN_OUTPUT_DIR`, defaulting to `out/`).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards — see the [Make GTA 6 Cover Art bounty](https://make.fun/bounty/gta6-cover-art-01).</sub>
