// Neon Tide cover renderer: turns photos into a multi-panel GTA-style poster.
// Pure canvas 2D, no network. drawCover(canvas, state) paints the whole cover
// at the canvas's own size, so the same code drives the live preview and the
// exported PNGs (1920x1080, 1080x1350, 1080x1080).
//
// The look is built in three passes per panel:
//   1. grade: a gradient map (shadows -> mids -> highlights) that unifies
//      photos from different sources into one poster palette, plus posterize.
//   2. Poster Ink: a halftone dot screen on top, strongest at "High".
//   3. face-aware: inside a panel's face box the posterize is gentler and
//      the halftone is skipped entirely, so skin never gets the speckled
//      artefacts that sank the current top 1's heroine.
// Then the title lockup (gradient block title + neon script + tagline bar
// + starburst badge) is drawn in the layout's title zone.

// ---- colour grades: [shadow, mid, highlight] as [r, g, b] ----
export const GRADES = {
  heatwave:  { name: 'Heatwave',    stops: [[38, 8, 44], [214, 51, 108], [255, 179, 71]] },
  neon:      { name: 'Neon Nights', stops: [[10, 16, 48], [123, 47, 247], [34, 211, 238]] },
  golden:    { name: 'Golden Hour', stops: [[11, 43, 51], [224, 120, 64], [255, 209, 102]] },
  vicepink:  { name: 'Vice Pink',   stops: [[43, 10, 30], [255, 77, 141], [255, 230, 109]] },
  midnight:  { name: 'Midnight',    stops: [[5, 5, 16], [59, 74, 140], [245, 245, 245]] },
  noir:      { name: 'Palm Noir',   stops: [[16, 16, 16], [138, 143, 152], [255, 243, 224]] },
};

// ---- layouts: panels as fractions of the cover, title zone as fractions ----
// photo: index into state.photos (0 woman, 1 driver, 2 car, 3 skyline).
// face: face box in panel fractions, or null (no face-aware treatment).
// zoom/ox/oy: default crop for that panel (cover-fit, zoom >= 1, offsets -1..1).
export const LAYOUTS = {
  keyart: { name: 'Key Art 9', panels: [
    { x: 0.00, y: 0.00, w: 0.36, h: 0.66, photo: 0, face: { x: 0.28, y: 0.06, w: 0.48, h: 0.46 } },
    { x: 0.36, y: 0.00, w: 0.32, h: 0.33, photo: 3 },
    { x: 0.68, y: 0.00, w: 0.32, h: 0.33, photo: 1, face: { x: 0.36, y: 0.10, w: 0.32, h: 0.56 } },
    { x: 0.36, y: 0.33, w: 0.32, h: 0.33, photo: 0, zoom: 1.45, ox: -0.15, oy: -0.08 },
    { x: 0.68, y: 0.33, w: 0.32, h: 0.33, photo: 2 },
    { x: 0.00, y: 0.66, w: 0.12, h: 0.34, photo: 3, zoom: 1.5 },
    { x: 0.12, y: 0.66, w: 0.12, h: 0.34, photo: 2, zoom: 1.5, oy: 0.10 },
    { x: 0.24, y: 0.66, w: 0.12, h: 0.34, photo: 1, zoom: 1.6, ox: -0.10 },
  ], title: { x: 0.36, y: 0.66, w: 0.64, h: 0.34 } },
  diagonal: { name: 'Diagonal Split', panels: [
    { poly: [[0, 0], [0.60, 0], [0.44, 1], [0, 1]], photo: 0, face: { x: 0.22, y: 0.06, w: 0.42, h: 0.40 } },
    { poly: [[0.60, 0], [1, 0], [1, 1], [0.44, 1]], photo: 2 },
  ], title: { x: 0, y: 0.76, w: 1, h: 0.24, overlay: true } },
  hero: { name: 'Hero + Strip', panels: [
    { x: 0, y: 0, w: 1, h: 0.55, photo: 2 },
    { x: 0.00, y: 0.55, w: 0.25, h: 0.20, photo: 0, face: { x: 0.28, y: 0.04, w: 0.48, h: 0.52 } },
    { x: 0.25, y: 0.55, w: 0.25, h: 0.20, photo: 1, face: { x: 0.36, y: 0.08, w: 0.32, h: 0.60 } },
    { x: 0.50, y: 0.55, w: 0.25, h: 0.20, photo: 3 },
    { x: 0.75, y: 0.55, w: 0.25, h: 0.20, photo: 0, zoom: 1.7, ox: -0.10 },
  ], title: { x: 0, y: 0.75, w: 1, h: 0.25 } },
  grid: { name: 'Grid 6', panels: [
    { x: 0.00, y: 0.00, w: 0.333, h: 0.36, photo: 0, face: { x: 0.28, y: 0.04, w: 0.48, h: 0.50 } },
    { x: 0.333, y: 0.00, w: 0.334, h: 0.36, photo: 2 },
    { x: 0.667, y: 0.00, w: 0.333, h: 0.36, photo: 1, face: { x: 0.36, y: 0.08, w: 0.32, h: 0.58 } },
    { x: 0.00, y: 0.36, w: 0.333, h: 0.36, photo: 3 },
    { x: 0.333, y: 0.36, w: 0.334, h: 0.36, photo: 0, zoom: 1.7, ox: 0.10 },
    { x: 0.667, y: 0.36, w: 0.333, h: 0.36, photo: 2, zoom: 1.4, oy: 0.10 },
  ], title: { x: 0, y: 0.72, w: 1, h: 0.28 } },
  duo: { name: 'Duo', panels: [
    { x: 0, y: 0, w: 0.5, h: 0.72, photo: 0, face: { x: 0.26, y: 0.05, w: 0.48, h: 0.42 } },
    { x: 0.5, y: 0, w: 0.5, h: 0.72, photo: 1, face: { x: 0.34, y: 0.08, w: 0.34, h: 0.52 } },
  ], title: { x: 0, y: 0.72, w: 1, h: 0.28 } },
  stack: { name: 'Poster Stack', panels: [
    { x: 0, y: 0, w: 1, h: 0.45, photo: 0, face: { x: 0.34, y: 0.04, w: 0.34, h: 0.55 } },
    { x: 0, y: 0.45, w: 1, h: 0.30, photo: 2 },
  ], title: { x: 0, y: 0.75, w: 1, h: 0.25 } },
};

// Poster Ink levels per strength: [posterize levels, halftone on?]
const INK = { 0: null, 1: { levels: 6, dots: true, cell: 9 }, 2: { levels: 4, dots: true, cell: 7 } };

function lerp(a, b, t) { return a + (b - a) * t; }

// Map one channel value through the grade's gradient stops.
function gradeChannel(v, stops) {
  const t = v / 255;
  const [s, m, h] = stops;
  if (t < 0.5) { const u = t / 0.5; return [lerp(s[0], m[0], u), lerp(s[1], m[1], u), lerp(s[2], m[2], u)]; }
  const u = (t - 0.5) / 0.5;
  return [lerp(m[0], h[0], u), lerp(m[1], h[1], u), lerp(m[2], h[2], u)];
}

// Draw one photo into a panel rect (cover-fit with zoom + pan offsets).
function drawPhotoInto(ctx, img, px, py, pw, ph, zoom, ox, oy) {
  const s = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * (zoom || 1);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  const dx = px + (pw - dw) / 2 + (ox || 0) * pw * 0.2;
  const dy = py + (ph - dh) / 2 + (oy || 0) * ph * 0.2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

// Grade + posterize one panel's pixels. `face` is the face box in panel
// fractions (or null); inside it the posterize is gentler and the mapped
// colour is blended back toward the original, so skin stays smooth. The
// face weight is feathered over ~6% of the panel, so the clean face blends
// into the posterised surroundings instead of showing a hard rectangle.
function gradePanel(tmp, grade, levels, face) {
  const ctx = tmp.getContext('2d');
  const w = tmp.width, h = tmp.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const stops = GRADES[grade].stops;
  const fx0 = face ? face.x * w : -1, fy0 = face ? face.y * h : -1;
  const fx1 = face ? (face.x + face.w) * w : -1, fy1 = face ? (face.y + face.h) * h : -1;
  const feather = Math.max(8, Math.min(w, h) * 0.06);
  const step = 255 / (levels - 1);
  const faceStep = 255 / 7; // gentler posterize for skin
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const [mr, mg, mb] = gradeChannel(lum, stops);
      // Feathered face weight: 0 deep inside the face box, 1 outside it.
      let fw = 1;
      if (face) {
        const dx = Math.max(fx0 - x, 0, x - fx1);
        const dy = Math.max(fy0 - y, 0, y - fy1);
        const f = Math.min(1, Math.sqrt(dx * dx + dy * dy) / feather);
        fw = f * f * (3 - 2 * f);
      }
      // Face keeps 45% of the photo, surroundings only 18%.
      const mix = 0.55 + 0.27 * fw;
      const or = r * (1 - mix) + mr * mix;
      const og = g * (1 - mix) + mg * mix;
      const ob = b * (1 - mix) + mb * mix;
      const st = faceStep + (step - faceStep) * fw;
      d[i] = Math.round(or / st) * st;
      d[i + 1] = Math.round(og / st) * st;
      d[i + 2] = Math.round(ob / st) * st;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Halftone dot screen. Dots grow where the panel is dark; the dot alpha
// fades out across the feathered face zone, so skin never gets speckled.
function halftone(tmp, cell, face) {
  const ctx = tmp.getContext('2d');
  const w = tmp.width, h = tmp.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const fx0 = face ? face.x * w : -1, fy0 = face ? face.y * h : -1;
  const fx1 = face ? (face.x + face.w) * w : -1, fy1 = face ? (face.y + face.h) * h : -1;
  const feather = Math.max(8, Math.min(w, h) * 0.06);
  for (let cy = 0; cy < h; cy += cell) {
    for (let cx = 0; cx < w; cx += cell) {
      const mx = Math.min(cx + (cell >> 1), w - 1), my = Math.min(cy + (cell >> 1), h - 1);
      let fw = 1;
      if (face) {
        const dx = Math.max(fx0 - mx, 0, mx - fx1);
        const dy = Math.max(fy0 - my, 0, my - fy1);
        const f = Math.min(1, Math.sqrt(dx * dx + dy * dy) / feather);
        fw = f * f * (3 - 2 * f);
      }
      if (fw <= 0.05) continue;
      const i = (my * w + mx) * 4;
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum < 42 || lum > 205) continue;
      const r = (cell * 0.52 * (1 - lum / 255)) | 0;
      if (r < 1) continue;
      ctx.fillStyle = `rgba(18, 4, 14, ${(0.55 * fw).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx + cell / 2, cy + cell / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Brighten small panels a touch so none of them turns into a dark smudge
// (the bottom row of the current top 1 is unreadably dark).
function liftShadows(tmp, amount) {
  if (!amount) return;
  const ctx = tmp.getContext('2d');
  const w = tmp.width, h = tmp.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.min(255, d[i] + amount);
    d[i + 1] = Math.min(255, d[i + 1] + amount);
    d[i + 2] = Math.min(255, d[i + 2] + amount);
  }
  ctx.putImageData(img, 0, 0);
}

// Render one panel (photo + grade + ink) into the main context.
function renderPanel(ctx, panel, img, state, W, H, gutter) {
  const rect = panel.poly
    ? { x: Math.min(...panel.poly.map((p) => p[0])) * W, y: Math.min(...panel.poly.map((p) => p[1])) * H,
        w: (Math.max(...panel.poly.map((p) => p[0])) - Math.min(...panel.poly.map((p) => p[0]))) * W,
        h: (Math.max(...panel.poly.map((p) => p[1])) - Math.min(...panel.poly.map((p) => p[1]))) * H }
    : { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H };
  const px = Math.round(rect.x + gutter), py = Math.round(rect.y + gutter);
  const pw = Math.max(8, Math.round(rect.w - gutter * 2)), ph = Math.max(8, Math.round(rect.h - gutter * 2));
  const tmp = document.createElement('canvas');
  tmp.width = pw; tmp.height = ph;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.fillStyle = '#241028';
  tctx.fillRect(0, 0, pw, ph);
  if (img) drawPhotoInto(tctx, img, 0, 0, pw, ph, panel.zoom, panel.ox, panel.oy);
  // Small panels get lifted shadows; hero panels keep their contrast.
  const small = pw * ph < W * H * 0.09;
  if (small) liftShadows(tmp, 14);
  const ink = INK[state.ink];
  if (ink) gradePanel(tmp, state.grade, ink.levels, panel.face || null);
  else gradePanel(tmp, state.grade, 10, panel.face || null);
  if (ink && ink.dots) halftone(tmp, Math.max(4, Math.round(ink.cell * (pw / 500))), panel.face || null);
  ctx.save();
  if (panel.poly) {
    ctx.beginPath();
    panel.poly.forEach(([fx, fy], i) => { const X = fx * W, Y = fy * H; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
    ctx.closePath();
    ctx.clip();
  }
  ctx.drawImage(tmp, px, py);
  ctx.restore();
}

// Fit a font size so `text` fits `maxW` (shrinks, never grows past `start`).
function fitFont(ctx, text, start, maxW, family, weight) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

// Starburst badge (e.g. "NEW / SUMMER 2026").
function starburst(ctx, cx, cy, r, label) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.strokeStyle = '#1a0512';
  ctx.stroke();
  ctx.fillStyle = '#1a0512';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = label.split(' ');
  const fs = fitFont(ctx, words[0], r * 0.52, r * 1.3, '"Display Condensed", sans-serif', '900');
  ctx.font = `900 ${fs}px "Display Condensed", sans-serif`;
  ctx.fillText(words[0], 0, -fs * 0.42);
  const fs2 = fitFont(ctx, words.slice(1).join(' '), r * 0.30, r * 1.3, '"Display Condensed", sans-serif', '900');
  ctx.font = `900 ${fs2}px "Display Condensed", sans-serif`;
  ctx.fillText(words.slice(1).join(' '), 0, fs * 0.45);
  ctx.restore();
}

// Title lockup inside the layout's title zone.
function drawTitle(ctx, zone, state, W, H) {
  const x = zone.x * W, y = zone.y * H, w = zone.w * W, h = zone.h * H;
  if (!zone.overlay) {
    const bg = ctx.createLinearGradient(x, y, x, y + h);
    bg.addColorStop(0, '#2b0a33');
    bg.addColorStop(1, '#12041c');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
  } else {
    const bg = ctx.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, 'rgba(18, 4, 28, 0)');
    bg.addColorStop(0.35, 'rgba(18, 4, 28, 0.88)');
    bg.addColorStop(1, 'rgba(18, 4, 28, 0.96)');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
  }
  const pad = Math.max(10, w * 0.03);
  const tx = x + pad, tw = w - pad * 2;
  // Main title: gradient fill + dark outline.
  const title = (state.title || 'NEON TIDE').toUpperCase();
  const titleSize = fitFont(ctx, title, h * 0.42, tw * 0.92, '"Display Condensed", sans-serif', '900');
  const ty = y + h * 0.46;
  const grad = ctx.createLinearGradient(0, ty - titleSize * 0.8, 0, ty + titleSize * 0.15);
  grad.addColorStop(0, '#ffe259');
  grad.addColorStop(0.5, '#ff7e5f');
  grad.addColorStop(1, '#ff2e88');
  ctx.font = `900 ${titleSize}px "Display Condensed", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, titleSize * 0.07);
  ctx.strokeStyle = '#1a0512';
  ctx.strokeText(title, tx, ty);
  ctx.fillStyle = grad;
  ctx.fillText(title, tx, ty);
  // Neon script subtitle.
  const script = state.script || 'Vice City';
  const scSize = fitFont(ctx, script, h * 0.26, tw * 0.75, '"Script", serif', '900');
  ctx.font = `italic 900 ${scSize}px "Script", serif`;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ff2e88';
  ctx.shadowBlur = scSize * 0.35;
  ctx.fillText(script, tx + titleSize * 0.12, ty + scSize * 0.95);
  ctx.shadowBlur = 0;
  // Tagline bar.
  const tag = (state.tagline || '').toUpperCase();
  if (tag) {
    const tgSize = fitFont(ctx, tag, h * 0.11, tw * 0.9, '"Sans Bold", sans-serif', '700');
    ctx.font = `700 ${tgSize}px "Sans Bold", sans-serif`;
    const tgW = Math.min(tw, ctx.measureText(tag).width + tgSize * 1.6);
    const tgY = y + h - tgSize * 1.9;
    ctx.fillStyle = '#0d0208';
    ctx.fillRect(tx, tgY, tgW, tgSize * 1.5);
    ctx.fillStyle = '#ffd23f';
    ctx.textAlign = 'left';
    ctx.fillText(tag, tx + tgSize * 0.8, tgY + tgSize * 1.12);
  }
  // Starburst badge, top-right of the title zone.
  if (state.badge) {
    const r = Math.min(w, h) * 0.30;
    starburst(ctx, x + w - r - pad * 0.5, y + r + pad * 0.3, r, state.badge);
  }
}

// Full cover paint. `state` carries layout, grade, ink (0/1/2), title,
// script, tagline, badge and photos[] (HTMLImageElement or null).
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const layout = LAYOUTS[state.layout] || LAYOUTS.keyart;
  ctx.fillStyle = '#14081a';
  ctx.fillRect(0, 0, W, H);
  const gutter = Math.max(2, Math.round(W * 0.004));
  const assigns = state.assigns && state.assigns[state.layout];
  layout.panels.forEach((panel, i) => {
    const a = assigns && assigns[i] ? assigns[i] : {};
    const photo = a.photo !== undefined ? a.photo : panel.photo;
    const entry = state.photos[photo];
    const img = entry ? (entry.img || entry) : null;
    const merged = {
      ...panel,
      zoom: a.zoom !== undefined ? a.zoom : panel.zoom,
      ox: a.ox !== undefined ? a.ox : panel.ox,
      oy: a.oy !== undefined ? a.oy : panel.oy,
      face: a.face !== undefined ? a.face : (panel.face || null),
    };
    renderPanel(ctx, merged, img, state, W, H, gutter);
  });
  drawTitle(ctx, layout.title, state, W, H);
}

// Default per-panel assignments for a layout (photo slots from the layout).
export function defaultAssigns(layoutId) {
  const layout = LAYOUTS[layoutId];
  return layout.panels.map((p) => ({ photo: p.photo, zoom: p.zoom || 1, ox: p.ox || 0, oy: p.oy || 0, face: p.face || null }));
}
