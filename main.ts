// Neon Tide, a gta6-cover-art-01 entry (Node 22, standard library only).
// The app is this directory's app/ folder: plain static files a desktop
// browser loads offline (app/index.html and its ES modules, local fonts and
// sample photos, no library and no network request at runtime). This program
// hands the app in: it copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json, the summary the judge reads, with
// the vendored make.fun library. Before it copies anything it runs a small
// pre-flight: the screenshots must be 1-4 files of at most 256 KiB each, and
// no .html/.js/.css file under app/ may reference an http(s) URL (the app
// must work offline). Serve it locally with `node serve.ts`, then open
// http://localhost:8080. Outside the grader's container, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SHOT_BYTES = 262144;

// Walk a directory and return every file path under it.
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// Pre-flight 1: 1-4 screenshots, each at most 256 KiB.
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir) ? walk(shotsDir).sort() : [];
if (shots.length < 1 || shots.length > 4) throw new Error(`expected 1-4 screenshots, found ${shots.length}`);
for (const s of shots) {
  const bytes = statSync(s).size;
  if (bytes > MAX_SHOT_BYTES) throw new Error(`${s} is ${bytes} bytes, over the 256 KiB screenshot cap`);
}

// Pre-flight 2: the app must not load anything over the network at runtime.
const appDir = join(here, 'app');
const external = walk(appDir)
  .filter((f) => /\.(html|js|css)$/.test(f))
  .filter((f) => /https?:\/\//.test(readFileSync(f, 'utf8')));
if (external.length) throw new Error(`app/ references external URLs in: ${external.join(', ')}`);

// Pre-flight 3: the bundled fonts the cover lettering needs must be there.
for (const font of ['display-black.ttf', 'display-cond-black.ttf', 'script-italic.ttf', 'sans-bold.ttf']) {
  if (!existsSync(join(appDir, 'fonts', font))) throw new Error(`missing bundled font app/fonts/${font}`);
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (shots.length) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of
// app files, in all, or a path under app/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: MAX_SHOT_BYTES },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

console.log(`Neon Tide handed in: ${shots.length} screenshot(s), ${walk(appDir).length} app file(s) -> ${out}`);
