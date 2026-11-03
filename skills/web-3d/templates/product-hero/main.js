// Product hero: a three.js product that turns as you scroll, with callouts projected from the model.
// Beats (see TEMPLATE.md): hero lockup, then one pinned stage with three chapters (move, settle, annotate, hold
// still while read), then an outro lockup in normal flow. The whole picture is a pure function of the scroll
// position s, so a scroll position always shows the same frame, from either direction.
// Edit content.json for words, numbers, colours and the optional .glb; edit POSES / CALLOUT_OFFSETS here for motion.
import * as THREE from 'three';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger.js';
import {createStage} from './stage.js';
import {stillSVG} from './fallback.js';

gsap.registerPlugin(ScrollTrigger);
window.ScrollTrigger = ScrollTrigger;
ScrollTrigger.config({ignoreMobileResize: true});

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
const root = document.documentElement;
const C = await fetch('./content.json').then((r) => r.json());
const COL = C.colors;
for (const [k, v] of Object.entries(COL)) root.style.setProperty(`--${k}`, v);
const FONTS = {display: '"Inter Tight", system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace'};

// ---------------------------------------------------------------- motion constants
// Poses: yaw (rad, turntable), tilt (deg, camera elevation), lift (model units), target (model-space point the
// camera frames), size (model units that span FILL of the constraining screen dimension), frame (where the target
// sits on screen, as fractions; "wide" for landscape, "tall" for portrait).
const POSES = {
  hero: {yaw: -0.62, tilt: 9, lift: 0, target: [0.05, -0.1, -0.32], size: {wide: 2.0, tall: 1.7}, frame: {wide: [0.67, 0.54], tall: [0.5, 0.6]}},
  case: {yaw: -1.22, tilt: 6, lift: 0, target: [0.42, -0.06, -0.08], size: 1.3, frame: {wide: [0.63, 0.5], tall: [0.5, 0.37]}},
  battery: {yaw: -0.1, tilt: 3, lift: 0, target: [0, 0.0, 0.17], size: {wide: 1.3, tall: 1.38}, frame: {wide: [0.64, 0.5], tall: [0.5, 0.36]}},
  weight: {yaw: 0.6, tilt: 17, lift: 0.5, target: [0, -0.25, -0.36], size: {wide: 2.35, tall: 1.8}, frame: {wide: [0.66, 0.5], tall: [0.5, 0.4]}},
  outro: {yaw: -0.42, tilt: 8, lift: 0, target: [0.05, -0.1, -0.32], size: {wide: 2.0, tall: 1.65}, frame: {wide: [0.68, 0.47], tall: [0.5, 0.38]}},
};
const FILL = {wide: 0.74, tall: 0.84};
const FOV = 26;
// Where each callout's label sits relative to its projected anchor, in CSS px.
const CALLOUT_OFFSETS = {
  case: {wide: [120, 96], tall: [-150, 120]},
  battery: {wide: [130, -60], tall: [-40, -120]},
  weight: {wide: [-70, 150], tall: [30, 120]},
};
const CHAPTER = {move: 0.34}; // share of each chapter spent moving; the rest is the read plateau
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // in-out cubic, for camera moves
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (s, a, b) => clamp((s - a) / Math.max(1e-6, b - a));

// ---------------------------------------------------------------- DOM from content.json
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
document.title = `${C.product} — ${C.hero.kicker}`;
const nav = document.querySelector('.nav');
nav.append(el('span', 'mark', C.product));
const hero = document.querySelector('.hero');
hero.append(el('p', 'kicker', C.hero.kicker), el('h1', 'title', C.hero.title), el('p', 'cue', C.hero.cue));
const stageEl = document.querySelector('.stage');
const rail = el('div', 'rail');
rail.setAttribute('aria-hidden', 'true');
const railFill = el('span', 'rail-fill');
const railTrack = el('span', 'rail-track');
railTrack.append(railFill);
const railList = el('ol');
C.callouts.forEach((c, i) => railList.append(el('li', '', `${String(i + 1).padStart(2, '0')} ${c.short}`)));
rail.append(railTrack, railList);
const chaptersEl = el('div', 'chapters');
const chapters = C.callouts.map((c, i) => {
  const a = el('article', 'chapter');
  a.dataset.i = i;
  const k = el('p', 'kicker', `${String(i + 1).padStart(2, '0')} — ${c.short}`);
  const h = el('h2', 'headline', c.headline);
  a.append(k, h);
  if (c.line) a.append(el('p', 'line', c.line));
  chaptersEl.append(a);
  return a;
});
stageEl.append(rail, chaptersEl);
const calloutLayer = document.querySelector('.callouts');
const svgNS = 'http://www.w3.org/2000/svg';
const leaders = document.createElementNS(svgNS, 'svg');
leaders.setAttribute('class', 'leaders');
leaders.setAttribute('aria-hidden', 'true');
calloutLayer.append(leaders);
const callouts = C.callouts.map((c) => {
  const line = document.createElementNS(svgNS, 'line');
  leaders.append(line);
  const dot = el('span', 'dot');
  dot.setAttribute('aria-hidden', 'true');
  const label = el('div', 'label');
  label.append(el('span', 'k', c.label), el('span', 'v', c.value));
  const ring = c.proof === 'ring' ? document.createElementNS(svgNS, 'circle') : null;
  if (ring) {
    ring.setAttribute('r', 30);
    ring.setAttribute('class', 'ring');
    leaders.append(ring);
  }
  calloutLayer.append(dot, label);
  return {c, line, dot, label, ring, w: 0, h: 0};
});
const outro = document.querySelector('.outro');
const outroInner = el('div', 'outro-inner');
outroInner.append(el('p', 'kicker', C.outro.kicker), el('h2', 'title', C.outro.title));
const specs = el('ul', 'specs');
for (const s of C.outro.specs) specs.append(el('li', '', s));
outroInner.append(specs);
outro.append(outroInner);
const still = document.querySelector('.still-img');
const maxHours = C.callouts.find((c) => c.proof === 'ring')?.number || 18;
still.innerHTML = stillSVG(COL, maxHours, maxHours);

await Promise.all([
  document.fonts.load(`700 100px "Inter Tight"`),
  document.fonts.load(`600 100px "Inter Tight"`),
  document.fonts.load(`400 20px "Inter Tight"`),
  document.fonts.load(`500 20px "JetBrains Mono"`),
]).catch(() => {});
await document.fonts.ready;

// ---------------------------------------------------------------- WebGL or the still
const canvas = document.getElementById('gl');
let stage = null;
const glOK = !Q.has('nowebgl') && (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
})();
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || !glOK;
root.classList.add(RM ? 'is-still' : 'is-motion');
if (!glOK) root.classList.add('no-gl');
// Pixel ratio by device tier, set once: 1.5 on phones, up to 2 on desktop.
const PHONE = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 768;
const DPR = Math.min(devicePixelRatio || 1, PHONE ? 1.5 : 2);
if (glOK) {
  try {
    stage = await createStage(canvas, {colors: COL, fonts: FONTS, content: C, capture: CAPTURE, dpr: DPR});
  } catch (e) {
    console.warn('WebGL stage failed, showing the still:', e.message);
    root.classList.add('no-gl');
  }
}

// ---------------------------------------------------------------- scroll map
let keys = []; // [s, poseName]
let chapterWin = []; // per chapter {inA, inB, outA, outB, moveA}
let envKeys = [];
let faceKeys = {};
let layoutName = 'wide';
let maxS = 1;
let pinST = null;

function buildTriggers() {
  if (RM) return;
  pinST = ScrollTrigger.create({trigger: stageEl, pin: true, start: 'top top', end: () => `+=${innerHeight * C.pinLength}`, pinSpacing: true, anticipatePin: 1});
  // The pin is linear in the user's hand; every eased value is computed from s below.
}
function layout() {
  layoutName = innerWidth / innerHeight < 0.85 ? 'tall' : 'wide';
  maxS = Math.max(1, ScrollTrigger.maxScroll(window));
  const vh = innerHeight;
  for (const k of callouts) {
    k.w = k.label.offsetWidth;
    k.h = k.label.offsetHeight;
  }
  if (RM) return;
  const a = pinST.start;
  const b = pinST.end;
  const ch = (b - a) / C.callouts.length;
  const mv = ch * CHAPTER.move;
  const names = C.callouts.map((c) => c.id);
  keys = [[0, 'hero'], [0.1 * vh, 'hero']];
  chapterWin = [];
  let prevEnd = 0.1 * vh;
  names.forEach((n, i) => {
    const moveA = i === 0 ? prevEnd : a + i * ch;
    const moveB = a + i * ch + mv;
    const holdB = a + (i + 1) * ch;
    keys.push([moveB, n], [holdB, n]);
    chapterWin.push({moveA, inA: moveA + (moveB - moveA) * 0.62, inB: moveB, outA: holdB, outB: 0});
    prevEnd = holdB;
  });
  const outroB = maxS - 0.2 * vh;
  keys.push([outroB, 'outro'], [maxS + 1, 'outro']);
  chapterWin.forEach((w, i) => {
    const next = chapterWin[i + 1];
    w.outB = w.outA + ((next ? next.inB - next.moveA : outroB - w.outA) * 0.3);
  });
  // Reading ranges for the checker: the exact plateau, as page fractions.
  chapters.forEach((node, i) => (node.dataset.read = `${((chapterWin[i].inB + 2) / maxS).toFixed(4)},${((chapterWin[i].outA - 2) / maxS).toFixed(4)}`));
  callouts.forEach((k, i) => (k.label.dataset.read = chapters[i].dataset.read));
  // The highlight sweeps along the case edge through the whole case chapter (moving light, still product).
  const cw = chapterWin[0];
  const ww = chapterWin.at(-1);
  envKeys = [[0, 0.15], [cw.moveA, 0.15], [cw.outA, 1.55], [ww.outA, 1.55], [outroB, 0.15], [maxS + 1, 0.15]];
  const bi = C.callouts.findIndex((c) => c.proof === 'ring');
  const bw = chapterWin[bi] || chapterWin[1];
  faceKeys = {modeA: bw.moveA, modeB: bw.moveA + (bw.inB - bw.moveA) * 0.45, fillA: bw.moveA + (bw.inB - bw.moveA) * 0.55,
    fillB: bw.inB + (bw.outA - bw.inB) * 0.35, backA: chapterWin.at(-1).moveA, backB: chapterWin.at(-1).moveA + (chapterWin.at(-1).inB - chapterWin.at(-1).moveA) * 0.6}; // time face returns for the weight beat
}

// ---------------------------------------------------------------- pose at s
const P = {yaw: 0, tilt: 0, lift: 0, size: 1, tx: 0, ty: 0, tz: 0, fx: 0.5, fy: 0.5};
function poseAt(s) {
  let i = 0;
  while (i < keys.length - 2 && s > keys[i + 1][0]) i++;
  const [s0, n0] = keys[i];
  const [s1, n1] = keys[i + 1];
  const t = n0 === n1 ? 0 : ease(ramp(s, s0, s1));
  const A = POSES[n0];
  const B = POSES[n1];
  setPose(A, B, t);
}
function setPose(A, B, t) {
  P.yaw = lerp(A.yaw, B.yaw, t);
  P.tilt = lerp(A.tilt, B.tilt, t);
  P.lift = lerp(A.lift, B.lift, t);
  const sz = (X) => (typeof X.size === 'number' ? X.size : X.size[layoutName]);
  P.size = lerp(sz(A), sz(B), t);
  P.tx = lerp(A.target[0], B.target[0], t);
  P.ty = lerp(A.target[1], B.target[1], t);
  P.tz = lerp(A.target[2], B.target[2], t);
  P.fx = lerp(A.frame[layoutName][0], B.frame[layoutName][0], t);
  P.fy = lerp(A.frame[layoutName][1], B.frame[layoutName][1], t);
}
const piecewise = (ks, s) => {
  if (s <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) if (s <= ks[i + 1][0]) return lerp(ks[i][1], ks[i + 1][1], ramp(s, ks[i][0], ks[i + 1][0]));
  return ks.at(-1)[1];
};

// ---------------------------------------------------------------- apply pose to the scene
const tmp = new THREE.Vector3();
const tgt = new THREE.Vector3();
function applyScene(envY, face) {
  const {camera, turntable, lift, shadow, baseShadow, product, scene} = stage;
  const w = innerWidth;
  const h = innerHeight;
  turntable.rotation.y = P.yaw;
  lift.position.y = P.lift;
  scene.environmentRotation.y = envY;
  // Lift reads as weightlessness: the shadow stays on the floor, spreads and fades.
  const l = clamp(P.lift / 0.5);
  shadow.scale.set(baseShadow.x * (1 + 0.7 * l), baseShadow.z * (1 + 0.9 * l), 1);
  shadow.material.opacity = 1 - 0.3 * l;
  scene.updateMatrixWorld();
  product.group.localToWorld(tgt.set(P.tx, P.ty, P.tz));
  tgt.y -= P.lift * 0.75; // the camera does not follow the lift, so the product visibly rises off its shadow
  // Framing: dolly so `size` spans FILL of whichever screen dimension is tighter (narrow phones dolly out
  // instead of cropping the sides), then shift the lens so the product sits where the layout wants it.
  camera.fov = FOV;
  camera.aspect = w / h;
  const tv = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const tEff = Math.min(tv, tv * camera.aspect);
  const d = P.size / (2 * FILL[layoutName] * tEff);
  const el2 = THREE.MathUtils.degToRad(P.tilt);
  camera.position.set(tgt.x, tgt.y + Math.sin(el2) * d, tgt.z + Math.cos(el2) * d);
  camera.lookAt(tgt);
  camera.setViewOffset(w, h, Math.round(-(P.fx - 0.5) * w), Math.round(-(P.fy - 0.5) * h), w, h);
  camera.updateProjectionMatrix();
  if (face && product.face) product.face.draw(face);
}
const project = (v) => {
  tmp.copy(v);
  stage.product.group.localToWorld(tmp);
  tmp.project(stage.camera);
  return [(tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight];
};

// ---------------------------------------------------------------- callouts (projected every frame)
const setAttr = (n, k, v) => {
  const s = typeof v === 'number' ? v.toFixed(1) : v;
  if (n.getAttribute(k) !== s) n.setAttribute(k, s);
};
function drawCallout(k, vis, draw, fill = 1) {
  const {label, dot, line, ring} = k;
  if (vis <= 0.001 || !stage) {
    if (label.style.visibility !== 'hidden') {
      label.style.visibility = dot.style.visibility = 'hidden';
      line.style.strokeOpacity = '0';
      if (ring) ring.style.strokeOpacity = '0';
    }
    return;
  }
  label.style.visibility = dot.style.visibility = 'visible';
  const [ax, ay] = project(stage.product.anchors[k.c.id] || stage.product.anchors.center);
  const [ox, oy] = CALLOUT_OFFSETS[k.c.id]?.[layoutName] || [120, -80];
  const m = 16;
  const top = layoutName === 'tall' ? 100 : 80;
  const lx = Math.round(clamp(ax + ox - (ox < 0 ? k.w : 0), m, innerWidth - k.w - m));
  const ly = Math.round(clamp(ay + oy - k.h / 2, top, innerHeight - k.h - m));
  // Leader: from the dot to the nearest point of the label box, drawn out as the camera settles.
  let ex = clamp(ax, lx - 8, lx + k.w + 8);
  let ey = clamp(ay, ly - 6, ly + k.h + 6);
  const dx = ex - ax;
  const dy = ey - ay;
  const len = Math.hypot(dx, dy) || 1;
  const sx = ax + (dx / len) * 7;
  const sy = ay + (dy / len) * 7;
  ex = sx + (ex - sx) * draw;
  ey = sy + (ey - sy) * draw;
  setAttr(line, 'x1', sx);
  setAttr(line, 'y1', sy);
  setAttr(line, 'x2', ex);
  setAttr(line, 'y2', ey);
  line.style.strokeOpacity = (0.6 * vis).toFixed(3);
  dot.style.transform = `translate3d(${ax.toFixed(1)}px, ${ay.toFixed(1)}px, 0) scale(${(0.4 + 0.6 * clamp(draw * 2)).toFixed(3)})`;
  dot.style.opacity = vis;
  const lv = clamp((draw - 0.55) / 0.45) * vis;
  label.style.opacity = lv >= 0.999 ? '1' : lv.toFixed(3);
  label.style.transform = `translate3d(${lx}px, ${ly + Math.round((1 - clamp((draw - 0.55) / 0.45)) * 8)}px, 0)`;
  // Without a procedural face (a real .glb) the battery proof is a DOM ring that fills around the anchor.
  if (ring) {
    const show = !stage.product.face;
    const c = 2 * Math.PI * 30;
    setAttr(ring, 'cx', ax);
    setAttr(ring, 'cy', ay);
    setAttr(ring, 'stroke-dasharray', `${(c * fill).toFixed(1)} ${c.toFixed(1)}`);
    ring.style.strokeOpacity = show ? vis.toFixed(3) : '0';
  }
}

// ---------------------------------------------------------------- the one ticker
let lastSig = '';
let dirty = true;
let stillIndex = 0;
let stillShown = -1;
const stillOrder = ['hero', ...C.callouts.map((c) => c.id), 'outro'];

function frameMotion(s) {
  poseAt(s);
  const envY = piecewise(envKeys, s);
  const fk = faceKeys;
  const mode = clamp(ramp(s, fk.modeA, fk.modeB) - ramp(s, fk.backA, fk.backB));
  const hours = maxHours * easeOut(ramp(s, fk.fillA, fk.fillB));
  const sig = `${s.toFixed(1)}|${innerWidth}x${innerHeight}`;
  if (sig === lastSig && !dirty) return;
  lastSig = sig;
  dirty = false;
  if (stage) {
    applyScene(envY, {mode, hours});
    stage.render();
  }
  // Chapter copy: rises in over the last part of the move, holds exactly still and opaque, leaves upward.
  chapterWin.forEach((w, i) => {
    const e = ramp(s, w.inA, w.inB);
    const x = ramp(s, w.outA, w.outB);
    const node = chapters[i];
    const op = e * (1 - x);
    node.style.opacity = op >= 0.999 ? '1' : op.toFixed(3);
    node.style.visibility = op <= 0.001 ? 'hidden' : 'visible';
    node.style.transform = e >= 1 && x <= 0 ? 'none' : `translate3d(0, ${Math.round((1 - easeOut(e)) * 22 - x * 16)}px, 0)`;
    const draw = easeOut(ramp(s, w.inA, w.inB)); // leader and label arrive with the chapter copy, not before
    const fill = C.callouts[i].proof === 'ring' ? easeOut(ramp(s, fk.fillA, fk.fillB)) : 1;
    drawCallout(callouts[i], 1 - x, draw, fill);
  });
  // Progress rail: which chapter, and how far through the pin.
  if (pinST) {
    const pr = clamp((s - pinST.start) / (pinST.end - pinST.start));
    railFill.style.transform = `scaleX(${pr.toFixed(4)})`;
    const vh = innerHeight;
    rail.style.opacity = (ramp(s, pinST.start, pinST.start + 0.1 * vh) * (1 - ramp(s, pinST.end, pinST.end + 0.15 * vh))).toFixed(3);
    const active = chapterWin.findIndex((w) => s < w.outB);
    [...railList.children].forEach((li, i) => li.classList.toggle('on', i === (active < 0 ? chapterWin.length - 1 : active)));
  }
  const cue = hero.querySelector('.cue');
  cue.style.opacity = (1 - ramp(s, 0, innerHeight * 0.12)).toFixed(3);
}

// Reduced motion (and no WebGL): normal-flow chapters, one key pose per chapter, cross-faded, no travel.
function frameStill() {
  if (stillShown === stillIndex && !dirty) return;
  const first = stillShown === -1;
  const show = () => {
    const name = stillOrder[stillIndex];
    const A = POSES[name];
    setPose(A, A, 0);
    const isRing = C.callouts.find((c) => c.id === name)?.proof === 'ring';
    if (stage) {
      applyScene(name === 'case' ? 0.9 : 1.6, {mode: isRing ? 1 : 0, hours: isRing ? maxHours : 0});
      stage.render();
    }
    callouts.forEach((k, i) => drawCallout(k, C.callouts[i].id === name ? 1 : 0, 1, 1));
  };
  stillShown = stillIndex;
  dirty = false;
  if (first || CAPTURE || !stage) return show();
  gsap.to(canvas, {opacity: 0, duration: 0.18, ease: 'power1.in', overwrite: 'auto', onComplete: () => {
    show();
    gsap.to(canvas, {opacity: 1, duration: 0.32, ease: 'power1.out'});
  }});
  gsap.to(calloutLayer, {opacity: 0, duration: 0.18, overwrite: 'auto', onComplete: () => gsap.to(calloutLayer, {opacity: 1, duration: 0.32})});
}

const cueEl = hero.querySelector('.cue');
const tick = () => {
  const s = CAPTURE ? scrollY : smooth.s;
  if (RM) cueEl.style.opacity = (1 - ramp(scrollY, 0, innerHeight * 0.08)).toFixed(3); // opacity only
  if (RM) frameStill();
  else frameMotion(s);
};

// Desktop wheel gets a 0.6 s catch-up; ?capture (and the checker) gets raw scroll so a position is a frame.
const smooth = {s: scrollY};
buildTriggers();
if (!RM && !CAPTURE) {
  const proxy = {p: 0};
  gsap.to(proxy, {p: 1, ease: 'none', scrollTrigger: {start: 0, end: 'max', scrub: 0.6}, onUpdate: () => (smooth.s = proxy.p * maxS)});
}
if (RM) {
  const sections = [hero, ...chapters, outro];
  sections.forEach((node, i) => ScrollTrigger.create({trigger: node, start: 'top 50%', end: 'bottom 50%', onToggle: (st) => st.isActive && (stillIndex = i)}));
}
const onResize = () => {
  if (stage) stage.setSize(innerWidth, innerHeight);
  dirty = true;
};
ScrollTrigger.addEventListener('refreshInit', onResize);
ScrollTrigger.addEventListener('refresh', () => {
  layout();
  dirty = true;
});
onResize();
ScrollTrigger.refresh();
layout();

// First frame: seeded at the current scroll position, shaders compiled, then the canvas fades in over the still.
if (stage) {
  RM ? frameStill() : frameMotion(CAPTURE ? scrollY : (smooth.s = scrollY));
  await stage.compile();
  dirty = true;
  RM ? ((stillShown = -1), frameStill()) : frameMotion(CAPTURE ? scrollY : smooth.s);
  const calls = stage.renderer.info.render.calls;
  window.__drawCalls = calls;
  console.log(`[product-hero] ${innerWidth}px: ${calls} draw calls, ${stage.renderer.info.render.triangles} triangles, DPR ${DPR}`);
  gsap.to(canvas, {opacity: 1, duration: CAPTURE ? 0 : 0.45, ease: 'power1.out'});
  gsap.to(still, {opacity: 0, duration: CAPTURE ? 0 : 0.45, ease: 'power1.out'});
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    root.classList.add('gl-lost');
  });
  canvas.addEventListener('webglcontextrestored', () => {
    root.classList.remove('gl-lost');
    if (stage.product.face) stage.product.face.tex.needsUpdate = true;
    dirty = true;
  });
} else {
  callouts.forEach((k) => drawCallout(k, 0, 0));
}
gsap.ticker.add(tick);

// Cleanup: one call frees the ticker, triggers, GPU resources and listeners (pagehide, or a host SPA's unmount).
window.__dispose = () => {
  gsap.ticker.remove(tick);
  ScrollTrigger.getAll().forEach((t) => t.kill());
  if (stage) {
    stage.dispose();
    stage = null;
  }
};
window.__memory = () => stage?.renderer.info.memory;
window.__stage = () => stage; // debugging handle (scene, camera, renderer)
addEventListener('pagehide', window.__dispose, {once: true});
requestAnimationFrame(() => requestAnimationFrame(() => (window.__ready = true)));
