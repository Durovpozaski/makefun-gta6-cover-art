// Fixed scenes for screenshots: ?shot=editor shows the studio with the demo
// photos loaded; ?shot=cover shows the cover alone at a chosen size.
// Query params: layout, grade, ink (0/1/2), title, script, tagline, size.
// window.__shotReady is set once painted.
export async function runShot(shot, query, api) {
  const { state, setPreviewSize, redraw } = api;
  const q = (k, d) => query.get(k) ?? d;
  if (q('layout')) state.layout = q('layout');
  if (q('grade')) state.grade = q('grade');
  if (q('ink') !== null && q('ink') !== undefined) state.ink = Number(q('ink'));
  if (q('title')) state.title = q('title');
  if (q('script')) state.script = q('script');
  if (q('tagline')) state.tagline = q('tagline');
  if (q('size')) api.applySize(q('size'));
  document.querySelectorAll('#layouts .pick').forEach((el) => el.classList.toggle('on', el.dataset.layout === state.layout));
  document.querySelectorAll('#grades .pick').forEach((el) => el.classList.toggle('on', el.dataset.grade === state.grade));
  document.querySelectorAll('#ink .pick').forEach((el) => el.classList.toggle('on', Number(el.dataset.ink) === state.ink));
  document.querySelectorAll('#sizes [data-size]').forEach((el) => el.classList.toggle('on', el.dataset.size === state.size));
  const titleEl = document.getElementById('title');
  const scriptEl = document.getElementById('scriptLine');
  const tagEl = document.getElementById('tagline');
  if (titleEl) titleEl.value = state.title;
  if (scriptEl) scriptEl.value = state.script;
  if (tagEl) tagEl.value = state.tagline;
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    setPreviewSize();
    // Cover shot: stretch the preview canvas to fill the viewport.
    const p = document.getElementById('preview');
    p.style.width = '100vw';
    p.style.height = '100vh';
  }
  redraw();
  await document.fonts.ready;
  redraw();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}
