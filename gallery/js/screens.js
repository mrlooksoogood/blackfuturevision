// Giant gallery screens. A screen is a mesh plus a "source" that paints it:
//   video    - an .mp4 that loops (muted until the visitor taps the screen)
//   carousel - cycles the catalog; tapping opens the piece on show
//   slides   - cycles any list of image files
//   card     - cycles short text slides (the concierge / welcome wall)
// What each screen shows is set in assets/screens.json, so a screen is changed without touching code.
import * as THREE from 'three';

const INK = '#f4ecd8', SOFT = '#b3a988', GOLD = '#e6c04e', EMERALD = '#3fd0b4';
const FADE_STEPS = 9;

function backdrop(g, w, h) {
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#07100c'); grd.addColorStop(.55, '#05070a'); grd.addColorStop(1, '#0c0a14');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(230,192,78,.55)'; g.fillRect(0, 0, w, Math.max(2, h * .006)); g.fillRect(0, h - Math.max(2, h * .006), w, Math.max(2, h * .006));
}
function fitText(g, text, maxW, size, weight, family) {
  let fs = size; g.font = `${weight} ${fs}px ${family}`;
  while (g.measureText(text).width > maxW && fs > 12) { fs -= 2; g.font = `${weight} ${fs}px ${family}`; }
  return fs;
}
function wrap(g, text, maxW) {
  const words = text.split(' '), lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
function contain(g, img, cx, cy, maxW, maxH, alpha = 1) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
  g.globalAlpha = alpha; g.drawImage(img, cx - w / 2, cy - h / 2, w, h); g.globalAlpha = 1;
}
function cover(g, img, w, h) {
  if (!img || !img.complete || !img.naturalWidth) return;
  const k = Math.max(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * k, dh = img.naturalHeight * k;
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// One painted canvas that steps through `count` slides, cross-fading between them.
function canvasSource(mesh, { w, h, hold, count, paint, mirror }) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  if (mirror) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; }
  mesh.material.map = tex; mesh.material.needsUpdate = true;
  let index = 0, clock = hold, fade = 0, painted = false;
  const scratch = document.createElement('canvas'); scratch.width = w; scratch.height = h;
  const sg = scratch.getContext('2d');
  function blit(alpha) { g.globalAlpha = alpha; g.drawImage(scratch, 0, 0); g.globalAlpha = 1; tex.needsUpdate = true; }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { painted = false; });   // redraw once the display fonts arrive
  return {
    get index() { return index; },
    tick(dt, near) {
      if (!near && painted) return;
      if (!painted) { paint(sg, index, w, h); blit(1); painted = true; return; }
      if (fade > 0) { fade--; paint(sg, index, w, h); blit(fade === 0 ? 1 : .34); return; }
      clock -= dt;
      if (clock <= 0 && count() > 1) { index = (index + 1) % count(); clock = hold; fade = FADE_STEPS; }
    },
    repaint() { painted = false; },
  };
}

export function carouselScreen(mesh, { items, artURL, priceOf, mirror }) {
  const cache = new Map();
  let src = null;
  const img = i => { const it = items[(i + items.length) % items.length];
    if (!cache.has(it.slug)) { const im = new Image(); im.onload = () => src && src.repaint(); im.src = artURL(it.slug, 'deco'); cache.set(it.slug, im); }
    return cache.get(it.slug); };
  src = canvasSource(mesh, {
    w: 2048, h: 576, hold: 5.5, mirror, count: () => items.length,
    paint(g, i, w, h) {
      const it = items[i]; backdrop(g, w, h);
      contain(g, img(i - 1), w * .095, h * .5, w * .13, h * .6, .32);
      contain(g, img(i + 1), w * .905, h * .5, w * .13, h * .6, .32);
      contain(g, img(i), w * .33, h * .5, w * .26, h * .88);
      img(i + 2);                                              // warm the next one
      const x = w * .49, maxW = w * .33; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = GOLD; g.font = `700 ${h * .05}px "Space Mono", monospace`; g.fillText('N O W   S H O W I N G', x, h * .2);
      g.fillStyle = INK; const title = it.title.toUpperCase(), face = '"Unbounded", Georgia, serif';
      let fs = h * .14; g.font = `800 ${fs}px ${face}`;
      let lines = wrap(g, title, maxW);
      if (lines.length > 2) { fs = h * .1; g.font = `800 ${fs}px ${face}`; lines = wrap(g, title, maxW).slice(0, 3); }
      lines.forEach((ln, k) => { fitText(g, ln, maxW, fs, 800, face); g.fillText(ln, x, h * .4 + k * fs * 1.08); });
      const price = priceOf(it);
      g.fillStyle = SOFT; g.font = `500 ${h * .058}px "Sora", system-ui, sans-serif`;
      g.fillText(price ? `$${price.toFixed(2)}  ·  Instant digital download` : 'Black Future Vision', x, h * .8);
      g.fillStyle = EMERALD; g.font = `700 ${h * .046}px "Space Mono", monospace`; g.fillText('TAP THE SCREEN TO VIEW  →', x, h * .9);
    },
  });
  return { tick: src.tick, current: () => items[src.index], kind: 'carousel' };
}

export function slidesScreen(mesh, { images, mirror }) {
  const ims = images.map(u => { const im = new Image(); im.src = u; return im; });
  const src = canvasSource(mesh, { w: 1920, h: 1080, hold: 6, mirror, count: () => ims.length,
    paint(g, i, w, h) { backdrop(g, w, h); cover(g, ims[i], w, h); } });
  ims.forEach(im => { im.onload = () => src.repaint(); });
  return { tick: src.tick, kind: 'slides' };
}

export function cardScreen(mesh, { slides, mirror }) {
  const src = canvasSource(mesh, {
    w: 1600, h: 900, hold: 6.5, mirror, count: () => slides.length,
    paint(g, i, w, h) {
      const s = slides[i]; backdrop(g, w, h); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = GOLD; g.font = `700 ${h * .04}px "Space Mono", monospace`; g.fillText(s.eyebrow.toUpperCase().split('').join(' '), w / 2, h * .26);
      g.fillStyle = INK; const fs = fitText(g, s.title, w * .84, h * .13, 800, '"Unbounded", Georgia, serif');
      g.font = `800 ${fs}px "Unbounded", Georgia, serif`; g.fillText(s.title, w / 2, h * .5);
      g.fillStyle = SOFT; g.font = `500 ${h * .05}px "Sora", system-ui, sans-serif`;
      wrap(g, s.body, w * .78).slice(0, 3).forEach((ln, k) => g.fillText(ln, w / 2, h * .64 + k * h * .072));
      slides.forEach((_, k) => { g.fillStyle = k === i ? GOLD : 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(w / 2 + (k - (slides.length - 1) / 2) * h * .045, h * .9, h * .011, 0, 7); g.fill(); });
    },
  });
  return { tick: src.tick, repaint: src.repaint, kind: 'card' };
}

// Video: shows a title card until the first frame plays, pauses when nobody is near, tap toggles sound.
export function videoScreen(mesh, { src, title, mirror }) {
  const poster = cardScreen(mesh, { slides: [{ eyebrow: 'Black Future Vision', title: title || 'Now screening', body: '' }], mirror });
  const video = document.createElement('video');
  video.src = src; video.muted = true; video.loop = true; video.playsInline = true; video.preload = 'auto';
  video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
  const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace;
  if (mirror) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; tex.offset.x = 1; }
  let live = false, failed = false;
  video.addEventListener('playing', () => { if (live) return; live = true; mesh.material.map = tex; mesh.material.needsUpdate = true; });
  video.addEventListener('error', () => { failed = true; console.warn('[gallery] screen video failed to load:', src); });
  const play = () => { if (!failed) video.play().catch(() => {}); };
  return {
    kind: 'video',
    tick(dt, near) { if (!live) poster.tick(dt, near); if (near && video.paused) play(); else if (!near && !video.paused) video.pause(); },
    kick: play,
    toggleSound() { video.muted = !video.muted; if (!video.muted) play(); return !video.muted; },
  };
}

export const DEFAULT_SCREENS = {
  monolith: { type: 'video', src: './assets/video/hero-loop7.mp4', title: 'Black Future Vision' },
  rotunda: { type: 'carousel' },
  concierge: { type: 'card', slides: [
    { eyebrow: 'Welcome', title: 'Black Future Vision', body: 'An Afrofuturist collection, hung in a gallery suspended in space.' },
    { eyebrow: 'How to move', title: 'Walk the gallery', body: 'Scroll or swipe up to follow the tour. Use the arrow keys or the joystick to roam on your own.' },
    { eyebrow: 'How to buy', title: 'Tap any piece', body: 'Every work opens its own card with the price and a direct link to buy.' },
  ] },
};

// Build the source a config entry asks for. Unknown or broken entries fall back to the default for that screen.
export function makeScreen(mesh, cfg, ctx, mirror = false) {
  if (cfg.type === 'video' && cfg.src) return videoScreen(mesh, { src: cfg.src, title: cfg.title, mirror });
  if (cfg.type === 'slides' && Array.isArray(cfg.images) && cfg.images.length) return slidesScreen(mesh, { images: cfg.images, mirror });
  if (cfg.type === 'card' && Array.isArray(cfg.slides) && cfg.slides.length) return cardScreen(mesh, { slides: cfg.slides, mirror });
  if (cfg.type === 'carousel' && ctx.items.length) return carouselScreen(mesh, { ...ctx, mirror });
  return cardScreen(mesh, { slides: DEFAULT_SCREENS.concierge.slides, mirror });
}
