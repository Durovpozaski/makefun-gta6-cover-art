// Neon Tide studio: wires the page — photos, layout/grade pickers, Poster Ink,
// caption editor, panel pan/zoom, face-box adjust, 1-click PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).
import { drawCover, defaultAssigns, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');

export const SIZES = {
  '1920x1080': { w: 1920, h: 1080, label: '1920 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 x 1350' },
  '1080x1080': { w: 1080, h: 1080, label: '1080 x 1080' },
};

const state = {
  layout: 'keyart',
  grade: 'heatwave',
  ink: 1,
  title: 'NEON TIDE',
  script: 'Vice City',
  tagline: 'WELCOME TO LEONIDA — SUMMER 2026',
  badge: 'NEW SUMMER 2026',
  photos: [], // { img, name }
  assigns: {},
  selected: 0,
  size: '1920x1080',
  faceMode: false,
};
window.__state = state;

function assignsFor(layoutId) {
  if (!state.assigns[layoutId]) state.assigns[layoutId] = defaultAssigns(layoutId);
  return state.assigns[layoutId];
}

function layoutPanels() {
  return LAYOUTS[state.layout].panels;
}

function panelRect(i) {
  const p = layoutPanels()[i];
  const W = preview.width, H = preview.height;
  if (p.poly) {
    const xs = p.poly.map((q) => q[0]), ys = p.poly.map((q) => q[1]);
    return { x: Math.min(...xs) * W, y: Math.min(...ys) * H,
      w: (Math.max(...xs) - Math.min(...xs)) * W, h: (Math.max(...ys) - Math.min(...ys)) * H };
  }
  return { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
}

function pointInPoly(x, y, poly, W, H) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0] * W, yi = poly[i][1] * H, xj = poly[j][0] * W, yj = poly[j][1] * H;
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function panelAt(mx, my) {
  const W = preview.width, H = preview.height;
  const panels = layoutPanels();
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.poly) { if (pointInPoly(mx, my, p.poly, W, H)) return i; }
    else if (mx >= p.x * W && mx < (p.x + p.w) * W && my >= p.y * H && my < (p.y + p.h) * H) return i;
  }
  return -1;
}

let redrawQueued = false;
function redraw() {
  if (redrawQueued) return;
  redrawQueued = true;
  requestAnimationFrame(() => {
    redrawQueued = false;
    drawCover(preview, state);
    // Cover screenshots must be clean: no selection outline or face box.
    if (!document.body.classList.contains('shot-cover')) overlaySelection();
  });
}

// Dashed outline + face box for the selected panel, drawn over the preview.
function overlaySelection() {
  const i = state.selected;
  if (i < 0 || i >= layoutPanels().length) return;
  const r = panelRect(i);
  pctx.save();
  pctx.strokeStyle = '#ffd23f';
  pctx.lineWidth = 2;
  pctx.setLineDash([8, 6]);
  pctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  pctx.setLineDash([]);
  const a = assignsFor(state.layout)[i];
  if (a && a.face) {
    pctx.strokeStyle = '#22d3ee';
    pctx.lineWidth = 2;
    pctx.setLineDash([4, 4]);
    pctx.strokeRect(r.x + a.face.x * r.w, r.y + a.face.y * r.h, a.face.w * r.w, a.face.h * r.h);
    pctx.setLineDash([]);
    pctx.fillStyle = '#22d3ee';
    pctx.font = `700 ${Math.max(11, r.w * 0.03)}px sans-serif`;
    pctx.fillText('FACE — kept smooth', r.x + a.face.x * r.w + 4, r.y + a.face.y * r.h + 14);
  }
  pctx.restore();
}

function setPreviewSize() {
  const s = SIZES[state.size];
  const scale = Math.min(960 / s.w, 560 / s.h);
  preview.width = Math.round(s.w * scale);
  preview.height = Math.round(s.h * scale);
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(img, name) {
  state.photos.push({ img, name });
  renderPhotoStrip();
}

async function loadSamples() {
  const names = ['woman', 'driver', 'car', 'skyline'];
  for (const n of names) {
    try { addPhoto(await loadImage(`samples/${n}.jpg`), n); } catch { /* sample missing: skip */ }
  }
}

function renderPhotoStrip() {
  const strip = $('photos');
  strip.innerHTML = '';
  state.photos.forEach((p, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = p.name;
    const im = document.createElement('img');
    im.src = p.img.src;
    im.alt = p.name;
    b.appendChild(im);
    b.addEventListener('click', () => {
      const a = assignsFor(state.layout);
      if (state.selected >= 0 && a[state.selected]) {
        a[state.selected].photo = idx;
        $('status').textContent = `Panel ${state.selected + 1} now uses “${p.name}”.`;
        redraw();
      }
    });
    strip.appendChild(b);
  });
}

function buildPickers() {
  const lp = $('layouts');
  lp.innerHTML = '';
  Object.entries(LAYOUTS).forEach(([id, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (id === state.layout ? ' on' : '');
    b.dataset.layout = id;
    b.innerHTML = `<span class="mini mini-${id}"></span>${def.name}`;
    b.addEventListener('click', () => {
      state.layout = id;
      state.selected = 0;
      document.querySelectorAll('#layouts .pick').forEach((el) => el.classList.toggle('on', el.dataset.layout === id));
      $('status').textContent = `Layout: ${def.name}.`;
      redraw();
    });
    lp.appendChild(b);
  });
  const gp = $('grades');
  gp.innerHTML = '';
  Object.entries(GRADES).forEach(([id, def]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (id === state.grade ? ' on' : '');
    b.dataset.grade = id;
    const [s, m, h] = def.stops;
    const css = `linear-gradient(135deg, rgb(${s}), rgb(${m}) 55%, rgb(${h}))`;
    b.innerHTML = `<span class="swatch" style="background:${css}"></span>${def.name}`;
    b.addEventListener('click', () => {
      state.grade = id;
      document.querySelectorAll('#grades .pick').forEach((el) => el.classList.toggle('on', el.dataset.grade === id));
      redraw();
    });
    gp.appendChild(b);
  });
}

function setInk(level) {
  state.ink = level;
  document.querySelectorAll('#ink .pick').forEach((el) => el.classList.toggle('on', Number(el.dataset.ink) === level));
  $('status').textContent = level === 0 ? 'Poster Ink off — grade only.' : `Poster Ink ${level === 1 ? 'Low' : 'High'} — faces stay smooth.`;
  redraw();
}

async function exportPNG(sizeKey) {
  const s = SIZES[sizeKey];
  const c = document.createElement('canvas');
  c.width = s.w; c.height = s.h;
  drawCover(c, state);
  const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neon-tide-${sizeKey}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  $('status').textContent = `Exported neon-tide-${sizeKey}.png (${s.w} x ${s.h}).`;
  return blob;
}
window.__exportPNG = exportPNG;

function surprise() {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  state.layout = layouts[(Math.random() * layouts.length) | 0];
  state.grade = grades[(Math.random() * grades.length) | 0];
  state.ink = 1 + ((Math.random() * 2) | 0);
  const a = assignsFor(state.layout);
  a.forEach((p) => { p.photo = (Math.random() * state.photos.length) | 0; });
  state.selected = 0;
  document.querySelectorAll('#layouts .pick').forEach((el) => el.classList.toggle('on', el.dataset.layout === state.layout));
  document.querySelectorAll('#grades .pick').forEach((el) => el.classList.toggle('on', el.dataset.grade === state.grade));
  setInk(state.ink);
  $('status').textContent = `Surprise! Layout ${LAYOUTS[state.layout].name}, grade ${GRADES[state.grade].name}.`;
  redraw();
}

// ---- pointer: click selects a panel; drag pans its photo (or moves its face box) ----
let drag = null;
preview.addEventListener('pointerdown', (e) => {
  const r = preview.getBoundingClientRect();
  const mx = ((e.clientX - r.left) / r.width) * preview.width;
  const my = ((e.clientY - r.top) / r.height) * preview.height;
  const idx = panelAt(mx, my);
  if (idx < 0) return;
  state.selected = idx;
  $('panelLabel').textContent = `Panel ${idx + 1} of ${layoutPanels().length}`;
  const a = assignsFor(state.layout)[idx];
  $('zoom').value = a.zoom || 1;
  preview.setPointerCapture(e.pointerId);
  drag = { idx, x0: mx, y0: my, ox: a.ox || 0, oy: a.oy || 0, face: a.face ? { ...a.face } : null };
  redraw();
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const r = preview.getBoundingClientRect();
  const mx = ((e.clientX - r.left) / r.width) * preview.width;
  const my = ((e.clientY - r.top) / r.height) * preview.height;
  const a = assignsFor(state.layout)[drag.idx];
  const pr = panelRect(drag.idx);
  if (state.faceMode && drag.face) {
    a.face = {
      x: Math.max(0, Math.min(0.9, drag.face.x + (mx - drag.x0) / pr.w)),
      y: Math.max(0, Math.min(0.9, drag.face.y + (my - drag.y0) / pr.h)),
      w: drag.face.w, h: drag.face.h,
    };
  } else {
    a.ox = drag.ox + ((mx - drag.x0) / pr.w) * 2;
    a.oy = drag.oy + ((my - drag.y0) / pr.h) * 2;
  }
  redraw();
});
preview.addEventListener('pointerup', () => { drag = null; });

// ---- controls ----
$('photoInput').addEventListener('change', async (e) => {
  for (const f of e.target.files) {
    const img = await loadImage(URL.createObjectURL(f));
    addPhoto(img, f.name.replace(/\.[^.]+$/, ''));
  }
  $('status').textContent = `${e.target.files.length} photo(s) added — click a thumbnail to put one in the selected panel.`;
  redraw();
});
const drop = $('dropzone');
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', async (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  for (const f of e.dataTransfer.files) {
    if (!f.type.startsWith('image/')) continue;
    addPhoto(await loadImage(URL.createObjectURL(f)), f.name.replace(/\.[^.]+$/, ''));
  }
  redraw();
});
$('zoom').addEventListener('input', (e) => {
  const a = assignsFor(state.layout)[state.selected];
  if (a) { a.zoom = Number(e.target.value); redraw(); }
});
$('centerPhoto').addEventListener('click', () => {
  const a = assignsFor(state.layout)[state.selected];
  if (a) { a.ox = 0; a.oy = 0; a.zoom = 1; $('zoom').value = 1; redraw(); }
});
$('faceMode').addEventListener('change', (e) => {
  state.faceMode = e.target.checked;
  $('status').textContent = state.faceMode
    ? 'Face-box mode: drag the cyan box on the selected panel to where the face is.'
    : 'Pan mode: drag the photo to reposition it.';
  redraw();
});
document.querySelectorAll('#ink .pick').forEach((b) => b.addEventListener('click', () => setInk(Number(b.dataset.ink))));
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('scriptLine').addEventListener('input', (e) => { state.script = e.target.value; redraw(); });
$('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; redraw(); });
$('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
document.querySelectorAll('#exports [data-size]').forEach((b) => b.addEventListener('click', () => exportPNG(b.dataset.size)));
document.querySelectorAll('#sizes [data-size]').forEach((b) => b.addEventListener('click', () => {
  state.size = b.dataset.size;
  document.querySelectorAll('#sizes [data-size]').forEach((el) => el.classList.toggle('on', el === b));
  setPreviewSize();
  redraw();
}));
$('surprise').addEventListener('click', surprise);

// ---- boot ----
(async () => {
  buildPickers();
  await loadSamples();
  try {
    await Promise.all([
      document.fonts.load('900 100px "Display Condensed"'),
      document.fonts.load('900 100px "Script"'),
      document.fonts.load('700 40px "Sans Bold"'),
    ]);
  } catch { /* fall back to system fonts */ }
  const shot = new URLSearchParams(location.search).get('shot');
  setPreviewSize();
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      state, setPreviewSize, redraw,
      applySize(key) { state.size = key; setPreviewSize(); },
    });
  } else {
    redraw();
  }
})();
