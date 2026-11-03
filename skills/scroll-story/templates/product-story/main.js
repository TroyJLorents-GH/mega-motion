// Product story: a scroll-told product page. Hero, then three pinned proofs (one per claim) alternating
// with normal-flow reading, then a summary and the call to action.
//
// Rules this file keeps (skills/scroll-story, shared/defaults.md):
// - The user owns the scrollbar. Scroll maps linearly to each pin's progress; properties inside it ease and plateau.
//   No smooth-scroll library on touch; Lenis only if content.json opts in, desktop pointer only.
// - Each pin: the claim is on screen from the first frame, the proof plays, then the explanation arrives on a
//   threshold (with hysteresis) and holds still and fully opaque to the end of the pin (marked data-read).
// - Every pin shows progress (the rail) and is under the page's pin budget.
// - ?capture: no catch-up smoothing and no timed reveals, so a scroll position always shows the same frame.
// - Reduced motion: no pins, no scrub, no travel; each chapter is a still at its key pose with all its words.
// Words, numbers and colours: content.json. Timings and easings: tokens.js.
import {gsap} from './node_modules/gsap/index.js';
import {ScrollTrigger} from './node_modules/gsap/ScrollTrigger.js';
import {CustomEase} from './node_modules/gsap/CustomEase.js';
import {BEATS, DUR, EASE, HYSTERESIS, SCRUB_DESKTOP} from './tokens.js';
import {headphones, node} from './art/headphones.js';
import {createField} from './art/wavefield.js';
import {createBalance} from './art/balance.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);
window.ScrollTrigger = ScrollTrigger;
for (const [name, path] of Object.entries(EASE)) CustomEase.create(name, path);
const ease = Object.fromEntries(Object.keys(EASE).map((k) => [k, gsap.parseEase(k)]));

const CAPTURE = new URLSearchParams(location.search).has('capture');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const SCRUB = CAPTURE || !FINE ? true : SCRUB_DESKTOP;
const DPR = Math.min(window.devicePixelRatio || 1, 2); // chosen once, never toggled during scroll

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const span = (x, [a, b]) => clamp((x - a) / (b - a));
const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];

// ---------------- content ----------------
const C = await fetch('./content.json').then((r) => r.json());
const get = (path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), C);
const P = C.palette;
document.title = C.meta.title;
document.documentElement.lang = C.meta.lang || 'en';
for (const [k, v] of Object.entries(P)) document.documentElement.style.setProperty(`--${k}`, v);
if (RM) document.body.classList.add('rm');

for (const el of qa('[data-c]')) {
  const v = get(el.dataset.c);
  if (v != null) el.textContent = v;
}
for (const el of qa('[data-lines]')) {
  el.textContent = '';
  get(el.dataset.lines).forEach((t, i, all) => {
    const line = document.createElement('span');
    line.className = 'line';
    const inner = document.createElement('span');
    inner.className = 'line-in';
    inner.textContent = t;
    line.append(inner);
    el.append(line);
    if (i < all.length - 1) el.append(' ');
  });
}
// The bridge sentence, one span per word, so it can light up as it passes.
for (const el of qa('[data-words]')) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.textContent = w;
    el.append(s);
    if (i < words.length - 1) el.append(' ');
  });
}
q('.cta').href = C.summary.ctaHref || '#';
for (const s of C.summary.specs) {
  const li = document.createElement('li');
  li.innerHTML = '<span class="v"></span><span class="l"></span>';
  li.firstChild.textContent = s.value;
  li.lastChild.textContent = s.label;
  q('.specs').append(li);
}

// The product, everywhere it appears: drawn, or the cutout from content.product.image.
qa('svg[data-product]').forEach((svg, i) => {
  const defs = node(svg, 'defs');
  const g = node(defs, 'radialGradient', {id: `shadow${i}`, cx: 0.5, cy: 0.5, r: 0.5});
  node(g, 'stop', {offset: 0, 'stop-color': P.ink, 'stop-opacity': 0.24});
  node(g, 'stop', {offset: 0.55, 'stop-color': P.ink, 'stop-opacity': 0.08});
  node(g, 'stop', {offset: 1, 'stop-color': P.ink, 'stop-opacity': 0});
  node(svg, 'ellipse', {cx: 200, cy: 470, rx: 176, ry: 16, fill: `url(#shadow${i})`});
  headphones(svg, {x: 0, y: 0, w: 400, colors: C.product, image: C.product.image, alt: C.product.imageAlt, id: `p${i}`});
});
const heroProduct = q('.hero-product');
heroProduct.removeAttribute('aria-hidden');
heroProduct.setAttribute('role', 'img');
heroProduct.setAttribute('aria-label', C.product.imageAlt || C.product.name);

await document.fonts.ready;
ScrollTrigger.config({ignoreMobileResize: true});

// Optional, desktop pointer only: Lenis keeps native scroll and lerps toward it. Off by default.
if (C.motion.smoothScrollOnDesktop && FINE && !CAPTURE && !RM) {
  const {default: Lenis} = await import('./node_modules/lenis/dist/lenis.mjs');
  const lenis = new Lenis({autoRaf: false});
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ---------------- pinned chapters ----------------
// chapter(name, render): pins the section for content.motion.pins[name] viewport heights and calls render(p)
// with the scrubbed playhead p in 0..1 (so labels follow the animated playhead, never raw scroll).
const pins = [];
function chapter(name, render, {settled = 0} = {}) {
  const sec = q(`[data-pin="${name}"]`);
  const B = BEATS[name];
  const after = qa('[data-after]', sec);
  const hold = qa('[data-hold]', sec);
  const extra = qa('[data-settled]', sec);
  const bar = q('.rail-bar i', sec);
  if (RM) {
    render(1);
    return;
  }
  const reveal = gsap.timeline({paused: true}).fromTo(after, {autoAlpha: 0, y: 14}, {autoAlpha: 1, y: 0, duration: DUR.reveal, ease: 'enter', stagger: 0.08});
  let shown = false;
  const apply = (p) => {
    render(p);
    if (bar) bar.style.transform = `scaleX(${p.toFixed(4)})`;
    if (CAPTURE) reveal.progress(clamp((p - B.th) / (B.read - 0.01 - B.th)));
    else if (!shown && p >= B.th) {
      shown = true;
      reveal.timeScale(1).play();
    } else if (shown && p < B.th - HYSTERESIS) {
      shown = false;
      reveal.timeScale(1.8).reverse(); // exits run faster than entrances
    }
  };
  const state = {p: 0};
  const tl = gsap.timeline({paused: true}).to(state, {p: 1, duration: 1, ease: 'none', onUpdate: () => apply(state.p)});
  const st = ScrollTrigger.create({trigger: sec, start: 'top top', end: () => `+=${innerHeight * C.motion.pins[name]}`, pin: true, scrub: SCRUB,
    animation: tl, anticipatePin: 1, invalidateOnRefresh: true});
  apply(0);
  pins.push({st, B, after, hold, extra, settled});
  return sec;
}

// Mark what must hold still while read, in page-scroll fractions (the studio's text-still check reads these).
function markReads() {
  const max = ScrollTrigger.maxScroll(window) || 1;
  for (const {st, B, after, hold, extra, settled} of pins) {
    const f = (p) => ((st.start + p * (st.end - st.start)) / max).toFixed(4);
    const end = f(0.995);
    for (const el of hold) el.dataset.read = `${f(0.01)},${end}`;
    for (const el of after) el.dataset.read = `${f(B.read)},${end}`;
    for (const el of extra) el.dataset.read = `${f(settled)},${end}`;
  }
}

// ---- 2. Quiet: the noise field calms into one line through the product ----
{
  const sec = q('[data-pin="quiet"]');
  const stage = q('.stage', sec);
  const product = q('.quiet-product', sec);
  const glow = q('.quiet-glow', sec);
  const field = createField(q('.field', sec), {ink: P.ink, accent: P.accent, dpr: DPR});
  const B = BEATS.quiet;
  let calm = RM ? 1 : 0;
  let t = 0;
  let running = false;
  let inView = false;
  const layout = () => {
    const s = stage.getBoundingClientRect();
    const r = product.getBoundingClientRect();
    const copy = q('.copy-top', sec).getBoundingClientRect();
    field.layout({width: s.width, height: s.height, centerX: r.left - s.left + r.width / 2, centerY: r.top - s.top + (r.height * 342) / 500,
      top: copy.bottom - s.top + 24, bottom: q('.rail', sec).getBoundingClientRect().top - s.top - 16});
    field.draw(calm, t);
  };
  const tick = (_time, dt) => {
    t += (Math.min(dt, 50) / 1000) * (1 - calm);
    field.draw(calm, t);
  };
  const sync = () => {
    const want = inView && calm < 0.999 && !RM && !CAPTURE;
    if (want !== running) {
      running = want;
      running ? gsap.ticker.add(tick) : gsap.ticker.remove(tick);
    }
  };
  chapter('quiet', (p) => {
    calm = ease.move(span(p, B.calm));
    if (CAPTURE) t = p * 5; // deterministic: the noise moves with scroll, not with the clock
    glow.style.opacity = calm.toFixed(3);
    if (!running) field.draw(calm, t);
    sync();
  });
  if (RM) glow.style.opacity = 1;
  if (!RM) {
    ScrollTrigger.create({trigger: sec.parentElement, start: 'top bottom', end: 'bottom top', onToggle: (s) => {
      inView = s.isActive;
      sync();
    }});
  }
  ScrollTrigger.addEventListener('refresh', layout);
  layout();
}

// ---- 4. Battery: the clock runs to the figure; ticks light as it passes them ----
{
  const sec = q('[data-pin="battery"]');
  const hours = C.battery.hours;
  const every = C.battery.tickEvery || 10;
  const ticks = q('.ticks', sec);
  const labels = q('.tick-labels', sec);
  const tickEls = [];
  for (let i = 0; i <= hours; i++) {
    const b = document.createElement('b');
    b.style.left = `${(100 * i) / hours}%`;
    if (i % every === 0) {
      b.className = 'major';
      const s = document.createElement('span');
      s.style.left = `${(100 * i) / hours}%`;
      s.textContent = i === hours ? `${i} ${C.battery.tickUnit}` : `${i}`;
      labels.append(s);
    }
    ticks.append(b);
    tickEls.push(b);
  }
  const num = q('.num', sec);
  const fill = q('.fill', sec);
  const dot = q('.dot', sec);
  const track = q('.track', sec);
  const stage = q('.stage', sec);
  const group = [q('.readout', sec), q('.timeline', sec)];
  let w = track.offsetWidth;
  let drop = stage.offsetHeight * 0.13; // how far below its final place the count sits while it runs (centred in the frame)
  ScrollTrigger.addEventListener('refresh', () => {
    w = track.offsetWidth;
    drop = stage.offsetHeight * 0.13;
  });
  let last = -1;
  const B = BEATS.battery;
  chapter('battery', (p) => {
    const f = ease.move(span(p, B.fill));
    const y = RM ? 0 : (1 - ease.move(span(p, B.lift))) * drop;
    for (const el of group) el.style.translate = `0 ${y.toFixed(2)}px`;
    fill.style.transform = `scaleX(${f.toFixed(4)})`;
    dot.style.transform = `translateX(${(f * w).toFixed(2)}px)`;
    const n = Math.round(f * hours);
    if (n !== last) {
      num.textContent = n;
      tickEls.forEach((b, i) => b.classList.toggle('lit', i <= n && f > 0));
      last = n;
    }
  }, {settled: B.lift[1] + 0.02});
}

// ---- 5. Weight: a weight drops onto the scale; the beam settles level ----
{
  const sec = q('[data-pin="weight"]');
  const balance = createBalance(q('.balance', sec), {ink: P.ink, accent: P.accent, rule: P.rule, colors: C.product,
    image: C.product.image, alt: C.product.imageAlt, label: C.weight.weightLabel});
  const B = BEATS.weight;
  // Damped settle (ratio 0.62): the beam passes level once, slightly, then comes to a dead stop at exactly 0.
  const settle = (u) => {
    if (u <= 0) return 1;
    if (u >= 1) return 0;
    const z = 0.62;
    const w0 = 14;
    const wd = w0 * Math.sqrt(1 - z * z);
    return Math.exp(-z * w0 * u) * (Math.cos(wd * u) + ((z * w0) / wd) * Math.sin(wd * u));
  };
  chapter('weight', (p) => {
    const d = span(p, B.drop);
    balance.update({drop: d * d, theta: B.tilt * settle(span(p, B.settle))}); // d*d: a dropped object accelerates
  });
}

// ---------------- normal-flow sections ----------------
// Hero intro: the product lands, then the headline 250 ms after it settles. Nothing else moves.
const heroLines = qa('.hero-title .line-in');
const heroSub = q('.hero-sub');
const aura = q('.aura');
const intro = gsap.timeline({paused: true});
if (RM) {
  intro.fromTo([heroProduct, aura, ...heroLines, heroSub], {autoAlpha: 0}, {autoAlpha: 1, duration: 0.2, ease: 'none'});
} else {
  intro
    .fromTo(aura, {autoAlpha: 0, scale: 0.9}, {autoAlpha: 1, scale: 1, duration: 1.6, ease: 'enter'}, 0)
    .fromTo(heroProduct, {autoAlpha: 0, y: 24}, {autoAlpha: 1, y: 0, duration: DUR.heroProduct, ease: 'enter'}, 0.05)
    .fromTo(heroLines, {autoAlpha: 1, yPercent: 135}, {yPercent: 0, duration: DUR.heroLine, ease: 'enter', stagger: DUR.lineStagger},
      0.05 + DUR.heroProduct * 0.55 + DUR.heroGap)
    // The supporting line follows the headline (opacity only), so the reading order is product, headline, sub.
    .fromTo(heroSub, {autoAlpha: 0}, {autoAlpha: 1, duration: 0.4, ease: 'none'}, '>-0.45');
  // One parallax moment: as the hero leaves, the product trails the page slightly and the light dims.
  gsap.timeline({scrollTrigger: {trigger: '.hero', start: 'top top', end: 'bottom top', scrub: SCRUB}})
    .to('.hero-stage', {yPercent: 14, scale: 0.94, ease: 'none'}, 0)
    .to(aura, {opacity: 0.35, ease: 'none'}, 0);
}

// Bridge: words light from grey to ink in reading order as the sentence crosses the screen.
const words = qa('.bridge .w');
if (RM) gsap.set(words, {color: P.ink});
else {
  gsap.timeline({scrollTrigger: {trigger: '.bridge-text', start: 'top 85%', end: 'center 55%', scrub: SCRUB}})
    .to(words, {color: P.ink, duration: 0.4, stagger: 0.12, ease: 'none'});
}

// Summary: only the spec row moves, once, in reading order.
const specs = qa('.specs li');
if (!RM) {
  if (CAPTURE) {
    gsap.fromTo(specs, {autoAlpha: 0, y: 18}, {autoAlpha: 1, y: 0, ease: 'enter', stagger: 0.15,
      scrollTrigger: {trigger: '.specs', start: 'top 94%', end: 'top 76%', scrub: true}});
  } else {
    gsap.set(specs, {autoAlpha: 0, y: 18});
    ScrollTrigger.create({trigger: '.specs', start: 'top 88%', once: true,
      onEnter: () => gsap.to(specs, {autoAlpha: 1, y: 0, duration: DUR.reveal, ease: 'enter', stagger: DUR.specStagger})});
  }
}

ScrollTrigger.addEventListener('refresh', markReads);
ScrollTrigger.refresh();
addEventListener('pageshow', (e) => e.persisted && ScrollTrigger.refresh());

document.body.classList.remove('loading');
intro.eventCallback('onComplete', () => (window.__ready = true));
intro.play(0);
