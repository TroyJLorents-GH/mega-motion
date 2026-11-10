// Signature site: one brand gesture, repeated. The intro, every page change and, in miniature, every heading are the
// same event: the brand mark opening as a mask (motion/threshold.js) or a block of brand colour wiping off a line
// (motion/wipe.js). Everything between thresholds is calm and scrubbed: CSS-sticky chapters, a 1:1 horizontal gallery.
//
// Rules this file keeps (skills/signature-site/SKILL.md):
// - Loading hides inside the brand screen: fonts, GL init and the procedural images are all done before it opens.
// - Pins are CSS position: sticky; ScrollTriggers only read progress. No GSAP pins.
// - ?capture: no intro, no Lenis, no lag; wipes and counts are scrubbed by scroll, the hero has a fixed painted
//   stroke, so a scroll position is always the same frame.
// - Reduced motion: thresholds fade in 200 ms, no smooth scroll, no sticky travel, wipes at their end state, the hero
//   is a still with the painted layer showing, the gallery is a grid. Every word stays.
// Words, links and colours: content.json. Timings and easings: tokens.js. Drawings: art/.
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger.js';
import {CustomEase} from 'gsap/CustomEase.js';
import {EASE, CSS_EASE, THRESHOLD, WIPE, HERO, GALLERY, UI, SCROLL, PHONE} from './tokens.js';
import {createThreshold, bindPageTransitions, arrivedByTransition} from './motion/threshold.js';
import {createWipes} from './motion/wipe.js';
import {rollButtons, createMenu} from './motion/ui.js';
import {rockField, paintRock, paintTopo, drawTopo, MOODS} from './art/rock-art.js';
import {createHeroRock} from './art/hero-rock.js';

const html = document.documentElement;
clearTimeout(window.__thFailsafe);
// Last resort: if anything below throws, the brand screen still lifts.
const hardFailsafe = setTimeout(() => {
  html.classList.remove('th-on', 'th-covered');
  document.querySelector('.threshold')?.classList.remove('is-on');
}, THRESHOLD.hardFailsafe * 1000);

gsap.registerPlugin(ScrollTrigger, CustomEase);
window.ScrollTrigger = ScrollTrigger;
for (const [name, path] of Object.entries(EASE)) CustomEase.create(name, path);

const CAPTURE = new URLSearchParams(location.search).has('capture');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isPhone = () => matchMedia(PHONE).matches;
const PAGE = document.body.dataset.page;
const covered = html.classList.contains('th-on');
const arriving = covered && arrivedByTransition();
if (RM) html.classList.add('rm');
if (CAPTURE) html.classList.add('capture');

const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
let revealed;
const afterReveal = new Promise((r) => (revealed = r));

// ---------------- content ----------------
const C = await fetch('./content.json').then((r) => r.json());
const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
const P = C.palette;
for (const [k, v] of Object.entries(P)) html.style.setProperty(`--${k}`, v);
html.style.setProperty('--house', CSS_EASE.house);
html.style.setProperty('--roll', CSS_EASE.roll);
html.style.setProperty('--dur-roll', `${UI.roll}s`);
html.style.setProperty('--roll-stagger', `${UI.rollStagger * 1000}ms`);
html.style.setProperty('--dur-card', `${UI.card}s`);
html.lang = C.meta.lang || 'en';
document.title = PAGE === 'climbs' ? C.climbsPage.title : C.meta.title;
q('meta[name="description"]')?.setAttribute('content', C.meta.description);

// The brand threshold takes over the first-paint cover right away, so the mark is breathing while the rest loads.
const th = createThreshold(q('.threshold'), {mark: C.mark, rm: RM, T: THRESHOLD});
if (covered) th.hold();

for (const n of qa('[data-c]')) {
  const v = get(n.dataset.c);
  if (v != null) n.textContent = v;
}
for (const n of qa('[data-href]')) n.setAttribute('href', get(n.dataset.href) || '#');
for (const n of qa('[data-aria]')) n.setAttribute('aria-label', get(n.dataset.aria) || '');
for (const p of qa('path[data-mark]')) p.setAttribute('d', C.mark.path);
for (const s of qa('svg[data-mark-svg]')) s.setAttribute('viewBox', `0 0 ${C.mark.viewBox.join(' ')}`);
q('.menu-email').href = `mailto:${C.menu.email}`;

// Menu links.
C.menu.links.forEach((l, i) => {
  const li = el('li');
  const a = el('a', 'menu-link');
  a.href = l.href;
  const line = el('span', 'ml-line');
  line.append(el('span', 'ml-in', l.label));
  a.append(el('span', 'mono ml-n', String(i + 1).padStart(2, '0')), line);
  li.append(a);
  q('.menu-links').append(li);
});
const here = location.pathname.split('/').pop() || 'index.html';
for (const a of qa('.nav-link, .menu-link')) {
  const u = new URL(a.href, location.href);
  if (!u.hash && (u.pathname.split('/').pop() || 'index.html') === here) a.setAttribute('aria-current', 'page');
}

// ---------------- page structure from content ----------------
const climbs = C.climbs;
const artJobs = []; // [canvasA, canvasB, seed]
function mediaPair(parent, c, label) {
  const a = el('canvas', 'card-img card-a');
  a.setAttribute('role', 'img');
  a.setAttribute('aria-label', `${label} ${c.name}`);
  const b = el('canvas', 'card-img card-b');
  b.setAttribute('aria-hidden', 'true');
  parent.append(a, b);
  artJobs.push([a, b, c.seed, c]);
}

if (PAGE === 'home') {
  const A = C.home.about;
  for (const f of A.facts) {
    const d = el('div');
    const dt = el('dt', 'mono', f.label);
    dt.dataset.wipe = '';
    d.append(dt, el('dd', '', f.value));
    q('.facts').append(d);
  }
  for (const s of C.home.stats.items) {
    const li = el('li', 'stat');
    const num = el('span', 'stat-num');
    // Final values only: a grade is a fact, not a counter. The number arrives with the house wipe.
    num.append(el('span', 'n', String(s.value)));
    if (s.suffix) num.append(el('span', 'sfx', s.suffix));
    num.dataset.wipe = '';
    const label = el('p', 'mono stat-label', s.label);
    label.dataset.wipe = '';
    li.append(num, label);
    q('.stats-row').append(li);
  }
  const featured = climbs.filter((c) => c.featured);
  featured.forEach((c, i) => {
    const li = el('li', 'card');
    const a = el('a', 'card-link');
    a.href = `climbs.html#${c.id}`;
    const media = el('div', 'card-media');
    mediaPair(media, c, C.home.gallery.cardLabel);
    const ov = el('div', 'card-overlay mono');
    ov.setAttribute('aria-hidden', 'true');
    ov.append(el('span', '', C.home.gallery.cardCta), el('b', '', '→'));
    media.append(ov);
    const meta = el('div', 'card-meta');
    const sub = el('p', 'mono card-sub');
    sub.append(el('span', '', c.grade), el('span', '', `${c.crag}, ${c.code}`), el('span', '', String(c.year)));
    meta.append(el('span', 'mono card-no', String(i + 1).padStart(2, '0')), el('h3', 'card-name', c.name), sub);
    a.append(media, meta);
    li.append(a);
    q('.gallery-rail').append(li);
  });
  q('.gp-total').textContent = String(featured.length).padStart(2, '0');
}

if (PAGE === 'climbs') {
  climbs.forEach((c, i) => {
    const li = el('li', 'row');
    li.id = c.id;
    const thumb = el('div', 'row-thumb');
    mediaPair(thumb, c, C.climbsPage.thumbLabel);
    const main = el('div', 'row-main');
    const name = el('h2', 'row-name', c.name);
    name.dataset.wipe = '';
    const sub = el('p', 'mono row-sub');
    sub.append(el('span', '', c.grade), el('span', '', c.crag), el('span', '', String(c.year)));
    main.append(name, el('p', 'row-note', c.note), sub);
    li.append(el('span', 'mono row-no', String(i + 1).padStart(2, '0')), thumb, main, el('span', 'row-grade', c.grade),
      el('span', 'row-crag', `${c.crag}, ${c.country}`), el('span', 'mono row-year', String(c.year)));
    q('.rows').append(li);
  });
}

// ---------------- fonts, then everything that measures text ----------------
await Promise.all([
  ...['400', '500', '600', '700', '800'].map((w) => document.fonts.load(`${w} 1em "Inter Tight"`)),
  document.fonts.load('500 1em "JetBrains Mono"'),
]).catch(() => {});
await document.fonts.ready;
ScrollTrigger.config({ignoreMobileResize: true});

let lenis = null;
if (C.motion.smoothScrollOnDesktop && FINE && !CAPTURE && !RM) {
  const {default: Lenis} = await import('lenis');
  lenis = new Lenis({lerp: SCROLL.lenisLerp, smoothWheel: true, syncTouch: false, autoRaf: false});
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  if (covered) lenis.stop();
}

rollButtons(qa('[data-roll]'));
const menu = createMenu({btn: q('.menu-btn'), menu: q('#menu'), U: UI, rm: RM, labels: {open: C.nav.menu, close: C.nav.close},
  onOpen: () => lenis?.stop(), onClose: () => lenis?.start()});

// Same-page anchors scroll (through Lenis when it runs). Page links are handled by the brand threshold.
document.addEventListener('click', (e) => {
  const a = e.target.closest?.('a[href*="#"]');
  if (!a || e.defaultPrevented) return;
  const u = new URL(a.href, location.href);
  if (u.pathname !== location.pathname || !u.hash) return;
  const t = document.getElementById(decodeURIComponent(u.hash.slice(1)));
  if (!t) return;
  e.preventDefault();
  if (lenis) lenis.scrollTo(t, {offset: 0});
  else t.scrollIntoView({behavior: RM ? 'auto' : 'smooth'});
  history.replaceState(null, '', u.hash);
});

bindPageTransitions(th, {T: THRESHOLD, beforeLeave: () => {
  menu.hide({focus: false, instant: true});
  lenis?.stop();
}, afterReturn: () => lenis?.start()});

// ---------------- procedural images (hidden under the brand screen) ----------------
const artPalette = {ground: P.ground, bone: P.bone, accent: P.accent};
const fieldCache = new Map();
async function paintArt() {
  for (const [a, b, seed, climb] of artJobs) {
    const tall = PAGE === 'home';
    const [w, h] = tall ? [300, 396] : [264, 186];
    a.width = b.width = w;
    a.height = b.height = h;
    const key = `${seed}:${w}x${h}`;
    if (!fieldCache.has(key)) fieldCache.set(key, rockField(seed, Math.round(w / 2), Math.round(h / 2)));
    const f = fieldCache.get(key);
    paintRock(a, f, artPalette, {...(MOODS[climb?.light] || MOODS.noon), climber: climb?.climber});
    paintTopo(b, f, artPalette);
    await sleep(0); // let the brand mark keep breathing
  }
}
const topoJobs = [
  ['.about-topo', {seed: 5, color: P.accent, alpha: 0.2, levels: 18, index: P.accent}],
  ['.contact-topo', {seed: 9, color: P.accent, alpha: 0.32, levels: 16}],
  ['.index-topo', {seed: 13, color: P.accent, alpha: 0.22, levels: 18}],
];
const paintTopos = () => {
  for (const [sel, o] of topoJobs) {
    const c = q(sel);
    if (c) drawTopo(c, o);
  }
};

// ---------------- 1. hero: the 3D rock, sticky 1 vh, full bleed to card ----------------
let hero = null;
const heroGeom = () => {
  const frameEl = q('.hero-frame');
  const vw = frameEl.clientWidth;
  const vh = frameEl.clientHeight;
  const ph = isPhone();
  const [cwF, chF] = ph ? HERO.card.phone : HERO.card.desktop;
  const cw = cwF * vw;
  const ch = chF * vh;
  const cy = (ph ? HERO.centerY.phone : HERO.centerY.desktop) * vh;
  const d0 = ph ? HERO.fill.phone * vw : HERO.fill.desktop * Math.min(vw, vh);
  return {vw, vh, cw, ch, cy, d0, d1: HERO.fill.card * Math.min(cw, ch)};
};
let heroP = 0;
const heroEase = gsap.parseEase(HERO.scrubEase);
function applyHero(p) {
  heroP = p;
  const e = heroEase(p);
  const g = heroGeom();
  const top = (g.cy - g.ch / 2) * e;
  const bottom = (g.vh - g.cy - g.ch / 2) * e;
  const side = ((g.vw - g.cw) / 2) * e;
  q('.hero-frame').style.clipPath = `inset(${top.toFixed(1)}px ${side.toFixed(1)}px ${bottom.toFixed(1)}px ${side.toFixed(1)}px round ${(HERO.radius * e).toFixed(1)}px)`;
  hero?.setProgress(e);
}

async function setupHero() {
  const canvas = q('.hero-canvas');
  const mode = RM ? 'still' : CAPTURE ? 'capture' : 'live';
  try {
    hero = createHeroRock(canvas, {palette: P, H: HERO, mode, phone: isPhone() || !FINE});
  } catch (err) {
    console.warn('hero: WebGL unavailable, using the drawn fallback', err);
    hero = null;
  }
  if (!hero) {
    q('.hero').classList.add('no-gl');
    drawTopo(q('.hero-fallback'), {seed: 2, color: P.accent, alpha: 0.5, levels: 20});
    return;
  }
  const g = heroGeom();
  hero.layout({cy: g.cy, d0: g.d0, d1: g.d1});
  hero.warm();
  await frame();
}

// ---------------- build ----------------
if (PAGE === 'home') await setupHero();
await paintArt();
paintTopos();

const wipes = createWipes(qa('[data-wipe]'), {W: WIPE, mode: RM ? 'still' : CAPTURE ? 'capture' : 'live', afterReveal});

const reads = []; // [element, sticky track]: text that must hold still while read (data-read, checked by the studio)

if (PAGE === 'home' && !RM) {
  // Hero shrink: progress straight from scroll (the pin is CSS sticky; nothing lags).
  ScrollTrigger.create({trigger: '.hero', start: 'top top', end: 'bottom bottom', onUpdate: (s) => applyHero(s.progress), onRefresh: (s) => applyHero(s.progress)});
  if (hero && !CAPTURE) {
    ScrollTrigger.create({trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? hero.start() : hero.stop())});
  }
  reads.push([q('.hero-name'), q('.hero')]);

  // About: half a viewport of hold; the contour layer behind drifts so the frame never freezes.
  q('.about').style.height = `calc(100svh + ${SCROLL.bioHold * 100}svh)`;
  gsap.fromTo('.about-topo', {yPercent: SCROLL.drift / 2}, {yPercent: -SCROLL.drift / 2, ease: 'none',
    scrollTrigger: {trigger: '.about', start: 'top bottom', end: 'bottom top', scrub: true}});
  reads.push([q('.about-lede'), q('.about')]);

  // Gallery: the track is one screen plus the rail's overflow, so the rail moves exactly 1 px per 1 px scrolled.
  const track = q('.gallery');
  const rail = q('.gallery-rail');
  const bg = q('.gallery-bg');
  const bar = q('.gp-bar i');
  const num = q('.gp-n');
  const n = rail.children.length;
  let travel = 0;
  const measure = () => {
    travel = Math.max(0, rail.scrollWidth - innerWidth);
    track.style.height = `calc(100svh + ${travel}px)`;
  };
  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);
  const colorEase = gsap.parseEase(GALLERY.colorEase);
  const [f0, f1] = GALLERY.textFlip;
  const mixHex = (a, b, t) => {
    const pa = a.match(/\w\w/g).map((x) => parseInt(x, 16));
    const pb = b.match(/\w\w/g).map((x) => parseInt(x, 16));
    return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
  };
  const nav = q('.nav');
  let lastIdx = -1;
  const paint = (p) => {
    rail.style.transform = `translate3d(${(-p * travel).toFixed(2)}px,0,0)`;
    const c = colorEase(p);
    bg.style.opacity = c.toFixed(4);
    // Snap, never mix: a half-way text colour on a half-way background is grey on grey.
    const t = c > (f0 + f1) / 2 ? 1 : 0;
    track.style.setProperty('--g-ink', mixHex(P.bone, P.ground, t));
    track.style.setProperty('--g-sub', mixHex(P.muted, '#5D6168', t));
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
    const idx = Math.min(n - 1, Math.round(p * (n - 1)));
    if (idx !== lastIdx) {
      num.textContent = String(idx + 1).padStart(2, '0');
      lastIdx = idx;
    }
    return c;
  };
  ScrollTrigger.create({trigger: track, start: 'top top', end: 'bottom bottom', invalidateOnRefresh: true,
    onToggle: (s) => { if (!s.isActive) nav.style.removeProperty('--nav-bg'); },
    onUpdate: (s) => {
      const c = paint(s.progress);
      if (s.isActive) nav.dataset.theme = c > (f0 + f1) / 2 ? 'light' : 'dark';
      if (s.isActive) nav.style.setProperty('--nav-bg', mixHex(P.ground, P.bone, c));
    },
    onRefresh: (s) => paint(s.progress)});
  reads.push([q('.gallery-title'), track]);

}
if (PAGE === 'home' && RM) applyHero(0);

// Nav colour follows the section under it (the gallery sets it from its own colour shift).
for (const s of qa('[data-theme]:not(.nav)')) {
  ScrollTrigger.create({trigger: s, start: 'top 40px', end: 'bottom 40px', onToggle: (st) => st.isActive && (q('.nav').dataset.theme = s.dataset.theme)});
}

function markReads() {
  const max = ScrollTrigger.maxScroll(window) || 1;
  for (const [n, track] of reads) {
    const top = track.getBoundingClientRect().top + scrollY;
    const s = top;
    const e = top + track.offsetHeight - innerHeight;
    const pad = (e - s) * 0.02;
    n.dataset.read = `${((s + pad) / max).toFixed(4)},${((e - pad) / max).toFixed(4)}`;
  }
}
ScrollTrigger.addEventListener('refresh', markReads);

let lastW = innerWidth;
addEventListener('resize', () => {
  clearTimeout(window.__rz);
  window.__rz = setTimeout(() => {
    if (hero) {
      const g = heroGeom();
      hero.layout({cy: g.cy, d0: g.d0, d1: g.d1});
      applyHero(heroP);
    }
    if (innerWidth !== lastW) {
      lastW = innerWidth;
      paintTopos();
    }
  }, 160);
});

ScrollTrigger.refresh();
wipes.settleAboveFold();
if (location.hash) {
  const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (t) {
    window.scrollTo(0, t.getBoundingClientRect().top + scrollY - q('.nav').offsetHeight);
    ScrollTrigger.update();
  }
}
addEventListener('pageshow', (e) => e.persisted && ScrollTrigger.refresh());

// ---------------- ready: open the brand threshold ----------------
if (covered && !arriving && !RM) {
  const rest = THRESHOLD.introMinHold * 1000 - performance.now();
  if (rest > 0) await sleep(rest);
}
await frame();
window.__ready = true;
clearTimeout(hardFailsafe);
if (covered) {
  // Headings above the fold start their wipe while the hole is opening (expo.in puts most of the opening at the
  // end), so the new page is readable as the threshold finishes instead of ~0.6 s after it.
  const dur = arriving ? THRESHOLD.reveal : THRESHOLD.introReveal;
  const early = setTimeout(revealed, dur * 0.2 * 1000);
  await th.reveal(dur);
  clearTimeout(early);
}
lenis?.start();
revealed();
// No pointer yet (phones, still visitors): one autonomous stroke, so the painted layer is seen once.
if (hero && !CAPTURE && !RM) setTimeout(() => hero.sweep(), 250);
