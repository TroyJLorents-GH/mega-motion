// Launch reel: hook, claim proved by motion, product, facts, call to action. 9:16, about 15 s.
// One accent "carrier" travels through every beat (block wipe, dot, ring, marker, progress rail, underline),
// the camera never stops, and the ground keeps drifting, so no read hold is ever a frozen frame.
// Everything is a pure function of t. Edit film.json for words, colours and beat times; edit this file for motion.
import {boot, clamp, ease, fitFont, lines, mix, noise, rand, reducedMotion, span, spring, tween} from './studio/kit.js';
import {createGlass} from './glass.js';

boot((film) => {
  const {width: W, height: H, duration: D, fps: FPS, content: C, palette: P} = film;
  const B = film.beats;
  const RM = reducedMotion();
  const M = (v) => (RM ? 0 : v); // movement that reduced motion drops
  const S = (s) => (RM ? 1 : s); // scale that reduced motion drops
  const events = [];
  const cue = (t, kind) => events.push({t: Number(t.toFixed(3)), kind});

  const camera = document.getElementById('camera');
  const scene = (id) => {
    const el = document.createElement('div');
    el.className = 'scene';
    el.id = id;
    camera.appendChild(el);
    return el;
  };
  const el = (parent, cls, text = '') => {
    const n = document.createElement('div');
    n.className = cls;
    n.textContent = text;
    parent.appendChild(n);
    return n;
  };

  // Layout: a left editorial column inside the stricter (TikTok) safe zone: 7.5% left, 14% right, 10% top, 22% bottom.
  // The column stops at 81%, not 86%: the camera push (up to 5%, anchored at the column's left edge) and glyph
  // overhang (1-2%) must never carry ink into the right-hand button rail.
  const ML = Math.round(W * 0.075);
  const CW = Math.round(W * 0.81) - ML;
  const PUSH = 0.05;
  const CX = W / 2;

  // Motion blur filters (x and y, 8 strengths).
  const defs = document.getElementById('blur-defs');
  for (let k = 1; k <= 8; k++) {
    defs.insertAdjacentHTML('beforeend', `<filter id="bx${k}" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="${k * 2.6} 0"/></filter>`);
    defs.insertAdjacentHTML('beforeend', `<filter id="by${k}" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="0 ${k * 2.6}"/></filter>`);
  }
  const blur = (v, axis) => {
    const k = RM ? 0 : clamp(Math.round(Math.abs(v) / 1300), 0, 8);
    return k ? `url(#b${axis}${k})` : 'none';
  };
  const vel = (fn, t) => (fn(t + 1 / 240) - fn(t - 1 / 240)) * 120;

  // ---------------- ground: light sweep, warm floor, drifting dot grid, grain ----------------
  const gc = document.getElementById('ground');
  gc.width = W;
  gc.height = H;
  const g = gc.getContext('2d');
  const hex = (h, a) => {
    const n = parseInt(h.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const pulses = []; // [t, strength]: the floor glow flares on hero hits
  const bands = []; // [t0, t1]: a soft light band crosses the frame behind the type during a hold
  const drawGround = (t) => {
    g.fillStyle = P.ground;
    g.fillRect(0, 0, W, H);
    const u = RM ? 0.5 : t / D;
    const sx = W * (0.1 + 0.8 * ease.smooth(u));
    const sy = H * (0.28 + (RM ? 0 : 0.1 * Math.sin(t * 0.45)));
    const sweep = g.createRadialGradient(sx, sy, 0, sx, sy, H * 0.8);
    sweep.addColorStop(0, hex(P.ink, 0.085));
    sweep.addColorStop(0.45, hex(P.ink, 0.03));
    sweep.addColorStop(1, hex(P.ink, 0));
    g.fillStyle = sweep;
    g.fillRect(0, 0, W, H);
    let flare = 0;
    for (const [pt, s] of pulses) if (t >= pt) flare += s * Math.exp(-(t - pt) / 0.55);
    const floor = g.createRadialGradient(W * 0.5, H * 1.08, 0, W * 0.5, H * 1.08, W * 1.15);
    floor.addColorStop(0, hex(P.accent, 0.16 + flare));
    floor.addColorStop(1, hex(P.accent, 0));
    g.fillStyle = floor;
    g.fillRect(0, 0, W, H);
    for (const [a, b] of bands) {
      const u = span(t, a, b);
      if (RM || u <= 0 || u >= 1) continue;
      const bx = mix(-0.4 * W, 1.4 * W, ease.inOut(u));
      const band = g.createLinearGradient(bx - W * 0.35, 0, bx + W * 0.35, 0);
      band.addColorStop(0, hex(P.ink, 0));
      band.addColorStop(0.5, hex(P.ink, 0.07 * Math.sin(Math.PI * u)));
      band.addColorStop(1, hex(P.ink, 0));
      g.fillStyle = band;
      g.fillRect(0, 0, W, H);
    }
    // Dot grid drifting up and slightly left: the frame always moves, even under a read hold.
    const step = 54;
    const oy = RM ? 0 : (((-t * 22) % step) + step) % step;
    const ox = RM ? 0 : (((-t * 7) % step) + step) % step;
    for (let y = oy - step; y < H + step; y += step) {
      for (let x = ox - step; x < W + step; x += step) {
        const d = Math.hypot((x - W / 2) / W, (y - H * 0.45) / H);
        const a = 0.13 * clamp(1.15 - d * 1.6);
        if (a <= 0.005) continue;
        g.fillStyle = hex(P.ink, a);
        g.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
  };
  const grain = document.getElementById('grain');
  grain.width = W;
  grain.height = H;
  const gr = grain.getContext('2d');
  const tiles = [0, 1, 2, 3].map((s) => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d');
    const img = x.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const v = 128 + (rand(s + 1, i) - 0.5) * 80;
      img.data.set([v, v, v, 255], i * 4);
    }
    x.putImageData(img, 0, 0);
    return gr.createPattern(c, 'repeat');
  });
  const drawGrain = (t) => {
    gr.fillStyle = tiles[RM ? 0 : Math.round(t * FPS) % 4];
    gr.fillRect(0, 0, W, H);
  };

  // ---------------- beat 1: hook, written by accent block wipes ----------------
  const sHook = scene('s-hook');
  const hook = lines(sHook, C.hook, 'display abs');
  hook.style.left = `${ML}px`;
  fitFont(hook, CW, {max: 260});
  hook.style.top = `${Math.round(H * 0.47 - hook.offsetHeight / 2)}px`;
  const hookLines = [...hook.querySelectorAll('.line')];
  const hookBlocks = hookLines.map((ln) => {
    const inner = ln.firstChild;
    const b = el(sHook, 'block');
    b.style.left = `${ML + inner.offsetLeft}px`;
    b.style.top = `${hook.offsetTop + ln.offsetTop + ln.offsetHeight * 0.14}px`;
    b.style.width = `${inner.offsetWidth}px`;
    b.style.height = `${ln.offsetHeight * 0.74}px`;
    return b;
  });
  const hookStart = (i) => B.hook - 0.36 + i * 0.28; // frame 0 already shows words: it is often the thumbnail
  hookLines.forEach((_, i) => cue(Math.max(0, hookStart(i)), 'swipe'));
  const hookExit = B.claim - 0.32;
  cue(hookExit, 'whoosh-up');
  // The accent underlines the emphasis (content.hookEmphasis, default: the last line after its first word).
  const lastHook = hookLines[hookLines.length - 1];
  const lastText = lastHook.firstChild.textContent;
  const emph = C.hookEmphasis && lastText.includes(C.hookEmphasis) ? C.hookEmphasis : lastText.split(' ').slice(1).join(' ') || lastText;
  const range = document.createRange();
  const at = lastText.indexOf(emph);
  range.setStart(lastHook.firstChild.firstChild, at);
  range.setEnd(lastHook.firstChild.firstChild, at + emph.replace(/[.!?]+$/, '').length);
  const er = range.getBoundingClientRect();
  const vr = document.getElementById('viewport').getBoundingClientRect();
  const hookSize = parseFloat(hook.style.fontSize);
  const underline = {x: er.left - vr.left, y: er.bottom - vr.top - hookSize * 0.06, w: er.width, h: Math.max(12, hookSize * 0.07)};

  // ---------------- beat 2: claim, proved by motion: two laps of a ring, or a glass poured to 1x then 2x ----------------
  const sClaim = scene('s-claim');
  const R = Math.round(W * 0.31);
  const CY = Math.round(H * 0.41);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'rings');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  sClaim.appendChild(svg);
  const ring = (r, color, width) => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', CX);
    c.setAttribute('cy', CY);
    c.setAttribute('r', r);
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', color);
    c.setAttribute('stroke-width', width);
    c.setAttribute('stroke-linecap', 'round');
    c.setAttribute('transform', `rotate(-90 ${CX} ${CY})`);
    svg.appendChild(c);
    return c;
  };
  const ticks = document.createElementNS(NS, 'g');
  svg.appendChild(ticks);
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const r0 = R + 70;
    const r1 = r0 + (k % 6 === 0 ? 26 : 12);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', CX + r0 * Math.cos(a));
    l.setAttribute('y1', CY + r0 * Math.sin(a));
    l.setAttribute('x2', CX + r1 * Math.cos(a));
    l.setAttribute('y2', CY + r1 * Math.sin(a));
    l.setAttribute('stroke', P.ink);
    l.setAttribute('stroke-width', k % 6 === 0 ? 3 : 2);
    ticks.appendChild(l);
  }
  const ring1 = ring(R, hex(P.ink, 0.32), 18);
  const ring2 = ring(R + 36, P.accent, 18);
  const numBox = el(sClaim, 'abs display center');
  numBox.style.left = '0px';
  numBox.style.width = `${W}px`;
  const numA = el(numBox, 'line-inner', `${C.claim.from}${C.claim.suffix}`);
  const numB = el(numBox, 'line-inner abs', `${C.claim.to}${C.claim.suffix}`);
  numBox.style.fontSize = '100px';
  numBox.style.overflow = 'hidden';
  numBox.style.padding = '0.14em 0';
  const numSize = Math.min(560, (100 * R * 1.2) / Math.max(numA.offsetWidth, numB.offsetWidth));
  numBox.style.fontSize = `${numSize}px`;
  numBox.style.top = `${CY - numBox.offsetHeight / 2 + numSize * 0.03}px`;
  numB.style.left = `${(W - numB.offsetWidth) / 2}px`;
  numB.style.top = `${numA.offsetTop}px`;
  const label = lines(sClaim, C.claim.label, 'semi abs center');
  label.style.left = '0px';
  label.style.width = `${W}px`;
  label.style.fontSize = '66px';
  label.style.top = `${CY + R + 150}px`;
  const labelLines = [...label.querySelectorAll('.line')];
  const GLASS = C.claim.visual === 'glass';
  let glass = null;
  let gBox = null;
  let pourTop = 0;
  let zoomX = CX;
  let zoomY = CY;
  const gTicks = [];
  if (GLASS) {
    // The drink proves the claim: the glass fills to the 1x line, keeps pouring, and stops at 2x.
    ring1.style.display = ring2.style.display = ticks.style.display = 'none';
    gBox = {w: Math.round(W * 0.42), h: Math.round(H * 0.34)};
    gBox.x = Math.round(W * 0.81) - gBox.w;
    gBox.y = Math.round(H * 0.25);
    glass = createGlass(svg, {...gBox, ink: P.ink, accent: P.accent, id: 'claim', liquidTop: C.claim.liquidTop, liquidBottom: C.claim.liquidBottom});
    pourTop = Math.round(H * 0.1);
    zoomX = gBox.x + gBox.w / 2;
    zoomY = glass.levelY(0.5);
    for (const [lv, text] of [[0.45, `${C.claim.from}${C.claim.suffix}`], [0.9, `${C.claim.to}${C.claim.suffix}`]]) {
      const yy = glass.levelY(lv);
      const ln = document.createElementNS(NS, 'line');
      Object.entries({x1: gBox.x - 46, y1: yy, x2: gBox.x - 8, y2: yy, stroke: P.ink, 'stroke-width': 3, 'stroke-opacity': 0.5}).forEach(([k, v]) => ln.setAttribute(k, v));
      svg.appendChild(ln);
      const lab = el(sClaim, 'abs mono', text);
      lab.style.fontSize = '40px';
      lab.style.left = `${gBox.x - 58}px`;
      lab.style.top = `${yy - 58}px`;
      gTicks.push({ln, lab, lv});
    }
    numBox.classList.remove('center');
    numBox.style.left = `${ML}px`;
    numBox.style.width = `${gBox.x - ML - 60}px`;
    numBox.style.fontSize = '100px';
    const nw = Math.max(numA.offsetWidth, numB.offsetWidth);
    const ns = Math.min(330, (100 * (gBox.x - ML - 70)) / nw);
    numBox.style.fontSize = `${ns}px`;
    numBox.style.top = `${gBox.y + gBox.h * 0.42 - numBox.offsetHeight / 2}px`;
    numB.style.left = '0px';
    numB.style.top = `${numA.offsetTop}px`;
    label.classList.remove('center');
    label.style.left = `${ML}px`;
    label.style.width = `${CW}px`;
    label.style.top = `${gBox.y + gBox.h + 70}px`;
  }
  const ringIn = B.claim + 0.15;
  const lap1 = GLASS ? [B.claim + 0.4, B.claim + 1.3] : [B.claim + 0.25, B.claim + 0.95];
  const lap2 = GLASS ? [B.claim + 1.45, B.claim + 2.05] : [B.claim + 1.0, B.claim + 1.6];
  const hit = lap2[1];
  const dropAt = [hit + 0.9, hit + 1.7];
  const claimExit = B.product - 0.38;
  pulses.push([hit, 0.22]);
  bands.push([hit + 0.3, claimExit + 0.3]);
  cue(ringIn, 'ring');
  if (GLASS) {
    cue(lap1[0], 'pour');
    cue(lap2[0], 'pour');
    cue(hit + 0.04, 'clink');
    for (const k of [0, 1, 2]) cue(lap1[1] + 0.25 + k * 0.2, 'clink');
    cue(dropAt[0] + 0.5, 'drip');
  } else {
    for (let k = 1; k <= 12; k++) {
      cue(lap1[0] + ((lap1[1] - lap1[0]) * k) / 12, 'tick');
      cue(lap2[0] + ((lap2[1] - lap2[0]) * k) / 12, 'tick-hi');
    }
  }
  cue(lap2[0], 'riser');
  cue(hit, 'impact');
  cue(hit + 0.12, 'label');
  cue(claimExit, 'zoom');

  // ---------------- beat 3: product ----------------
  const sProd = scene('s-product');
  let prodGlass = null;
  let wash = null;
  if (GLASS) {
    // The zoom ends inside the drink: its dark amber body is the ground the name appears on, then it clears
    // to a large glass bleeding off the bottom right, so the product stays on screen while it is named.
    wash = el(sProd, 'abs');
    Object.assign(wash.style, {inset: '0', background: `radial-gradient(120% 80% at 55% 45%, ${C.claim.liquidTop || '#7a3a12'} 0%, ${C.claim.liquidBottom || '#140803'} 70%)`});
    const psvg = document.createElementNS(NS, 'svg');
    psvg.setAttribute('class', 'rings');
    psvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    psvg.setAttribute('width', W);
    psvg.setAttribute('height', H);
    sProd.appendChild(psvg);
    prodGlass = createGlass(psvg, {x: Math.round(W * 0.42), y: Math.round(H * 0.58), w: Math.round(W * 0.8), h: Math.round(H * 0.62), ink: P.ink, accent: P.accent, id: 'prod', liquidTop: C.claim.liquidTop, liquidBottom: C.claim.liquidBottom});
  }
  const kicker = el(sProd, 'abs mono', C.product.kicker);
  kicker.style.left = `${ML + 84}px`;
  kicker.style.fontSize = '34px';
  const name = lines(sProd, C.product.name, 'display abs');
  name.style.left = `${ML}px`;
  fitFont(name, CW, {max: 330});
  const prodTop = Math.round((GLASS ? H * 0.37 : H * 0.46) - (name.offsetHeight + 140) / 2);
  name.style.top = `${prodTop}px`;
  kicker.style.top = `${prodTop - 64}px`;
  const nameLines = [...name.querySelectorAll('.line')];
  const sub = lines(sProd, [C.product.sub || ''], 'semi abs');
  sub.style.left = `${ML}px`;
  sub.style.fontSize = '50px';
  sub.style.color = hex(P.ink, 0.78);
  sub.style.top = `${name.offsetTop + name.offsetHeight + 40}px`;
  const prodIn = B.product - 0.08;
  // Facts are optional: with none, the product hands straight to the call to action.
  const factsAt = C.facts.length ? B.facts : B.cta;
  const prodExit = factsAt - 0.34;
  bands.push([prodIn + 0.7, prodExit + 0.2]);
  cue(prodIn + 0.1, 'land');
  cue(prodIn + 0.32, 'click');
  cue(prodExit, 'whoosh-left');

  // ---------------- beat 4: facts on a progress rail ----------------
  const sFacts = scene('s-facts');
  const N = C.facts.length;
  const counter = el(sFacts, 'abs mono');
  counter.style.left = `${ML}px`;
  counter.style.top = `${Math.round(H * 0.27)}px`;
  counter.style.fontSize = '32px';
  // Two-line facts read bigger on a phone: split at the word break nearest the middle.
  const twoLines = (text) => {
    const w = text.split(' ');
    if (w.length < 2) return [text];
    let best = 1;
    for (let k = 1; k < w.length; k++) if (Math.abs(w.slice(0, k).join(' ').length - text.length / 2) < Math.abs(w.slice(0, best).join(' ').length - text.length / 2)) best = k;
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  };
  const factEls = C.facts.map((f) => {
    const box = lines(sFacts, twoLines(f), 'display abs');
    box.style.left = `${ML}px`;
    fitFont(box, CW, {max: 250});
    box.style.top = `${Math.round(H * 0.45 - box.offsetHeight / 2)}px`;
    return box;
  });
  const railY = Math.round(H * 0.64);
  const rail = el(sFacts, 'abs');
  Object.assign(rail.style, {left: `${ML}px`, top: `${railY}px`, width: `${CW}px`, height: '6px', background: hex(P.ink, 0.14)});
  const factsIn = N ? B.facts + 0.02 : B.cta - 0.1;
  const factsEnd = B.cta - 0.1;
  const factWin = N ? (factsEnd - factsIn) / N : 0;
  if (N) bands.push([factsIn + 0.3, factsEnd + 0.2]);
  for (let i = 0; i < C.brand.length; i++) cue(B.cta + 0.85 + 0.045 * i, 'type');
  for (let i = 0; i < N; i++) {
    cue(factsIn + i * factWin, 'whoosh-right');
    cue(factsIn + i * factWin + 0.2, 'click');
  }
  if (N) cue(factsEnd - 0.12, 'whoosh-up');

  // ---------------- beat 5: call to action ----------------
  const sCta = scene('s-cta');
  const cta = lines(sCta, C.cta, 'display abs');
  cta.style.left = `${ML}px`;
  fitFont(cta, CW, {max: 380});
  // A product on the end card: a supplied cutout photo (content.product.image), else the drawn glass when the claim uses one.
  const endBox = {w: Math.round(W * 0.44), h: Math.round(H * 0.3)};
  endBox.x = Math.round(W * 0.81) - endBox.w;
  endBox.y = Math.round(H * 0.1);
  let endProduct = null;
  if (C.product.image) {
    const img = document.createElement('img');
    img.src = C.product.image;
    Object.assign(img.style, {position: 'absolute', left: `${endBox.x}px`, top: `${endBox.y}px`, width: `${endBox.w}px`, height: `${endBox.h}px`, objectFit: 'contain'});
    sCta.appendChild(img);
    endProduct = {el: img, glass: null};
  } else if (GLASS) {
    const esvg = document.createElementNS(NS, 'svg');
    esvg.setAttribute('class', 'rings');
    esvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    esvg.setAttribute('width', W);
    esvg.setAttribute('height', H);
    sCta.appendChild(esvg);
    endProduct = {el: esvg, glass: createGlass(esvg, {...endBox, ink: P.ink, accent: P.accent, id: 'end', liquidTop: C.claim.liquidTop, liquidBottom: C.claim.liquidBottom})};
  }
  if (endProduct) fitFont(cta, CW, {max: 230});
  cta.style.top = `${Math.round((endProduct ? H * 0.545 : H * 0.47) - cta.offsetHeight / 2)}px`;
  const ctaLines = [...cta.querySelectorAll('.line')];
  const lastCta = ctaLines[ctaLines.length - 1].firstChild;
  const ctaSize = parseFloat(cta.style.fontSize);
  const ctaRange = document.createRange();
  ctaRange.selectNodeContents(lastCta);
  const cr = ctaRange.getBoundingClientRect();
  const vr2 = document.getElementById('viewport').getBoundingClientRect();
  // Below the descenders (the y of "Friday" hangs about 0.22 em under the baseline), never through them.
  const ctaUnder = {x: ML, y: cr.bottom - vr2.top + ctaSize * 0.08, w: lastCta.offsetWidth, h: Math.max(14, ctaSize * 0.055)};
  const brand = el(sCta, 'abs mono');
  brand.textContent = C.brand;
  brand.style.left = `${ML}px`;
  brand.style.fontSize = '36px';
  brand.style.letterSpacing = '0.22em';
  brand.style.top = `${Math.round(Math.max(H * 0.64, ctaUnder.y + 90))}px`;
  const signoff = el(sCta, 'abs semi', C.signoff || '');
  signoff.style.left = `${ML}px`;
  signoff.style.fontSize = '40px';
  signoff.style.color = hex(P.ink, 0.6);
  signoff.style.top = `${parseFloat(brand.style.top) + 62}px`;
  const ctaIn = B.cta;
  const productDrop = ctaIn + 1.5;
  if (endProduct) {
    cue(productDrop + 0.32, 'land');
    if (endProduct.glass) cue(productDrop + 0.36, 'clink');
  }
  bands.push([ctaIn + 1.2, D + 0.3]);
  cue(ctaIn + 0.05, 'land');
  cue(ctaIn + 0.5, 'chime');
  cue(ctaIn + 0.85, 'click');
  pulses.push([ctaIn + 0.5, 0.14]);

  // ---------------- the carrier: one accent shape that travels through every beat ----------------
  const carrier = el(camera, '');
  carrier.id = 'carrier';
  const railState = (u) => ({x: ML, y: railY, w: Math.max(1, CW * u), h: 6, r: 3});
  const markerState = {x: ML, y: kicker.offsetTop + 16, w: 60, h: 12, r: 6};
  const dotState = GLASS ? {x: zoomX - 22, y: pourTop - 22, w: 44, h: 44, r: 22} : {x: CX - 22, y: CY - 22, w: 44, h: 44, r: 22};
  const lerpState = (a, b, u) => ({x: mix(a.x, b.x, u), y: mix(a.y, b.y, u), w: mix(a.w, b.w, u), h: mix(a.h, b.h, u), r: mix(a.r ?? 0, b.r ?? 0, u)});
  const carrierAt = (t) => {
    const ul = {...underline, r: 8};
    if (t < B.hook + 1.0) return {...ul, w: 0, o: 0};
    if (t < hookExit) return {...ul, w: underline.w * ease.enter(span(t, B.hook + 1.0, B.hook + 1.45)), o: 1};
    const dotAtUl = {x: ul.x + ul.w / 2 - 22, y: ul.y + ul.h / 2 - 22, w: 44, h: 44, r: 22};
    if (t < hookExit + 0.3) return {...lerpState(ul, dotAtUl, ease.inOut(span(t, hookExit, hookExit + 0.3))), o: 1};
    const travelEnd = GLASS ? lap1[0] : ringIn;
    if (t < travelEnd) return {...lerpState(dotAtUl, dotState, ease.move(span(t, hookExit + 0.3, travelEnd))), o: RM ? 0 : 1};
    // The dot becomes the ring: it shrinks away as the ring grows out of it, before the number appears.
    // The dot becomes the ring, or the head of the pour.
    if (GLASS && t < lap1[0] + 0.1) return {...dotState, o: RM ? 0 : 1};
    if (t < ringIn + 0.15) return {...lerpState(dotState, {x: dotState.x + 22, y: dotState.y + 22, w: 0, h: 0, r: 0}, ease.exit(span(t, ringIn, ringIn + 0.15))), o: RM || GLASS ? 0 : 1};
    if (t < prodIn + 0.25) return {...dotState, w: 0, h: 0, o: 0};
    if (t < prodExit) return {...markerState, w: markerState.w * ease.enter(span(t, prodIn + 0.25, prodIn + 0.6)), o: 1};
    if (!N) {
      const ctaU0 = {...ctaUnder, r: 10};
      if (t < ctaIn + 0.55) return {...lerpState(markerState, {...ctaU0, w: 0}, ease.move(span(t, prodExit, ctaIn + 0.55))), o: RM ? 0 : 1};
      return {...ctaU0, w: ctaU0.w * ease.enter(span(t, ctaIn + 0.55, ctaIn + 1.0)), o: 1};
    }
    if (t < factsIn + 0.2) return {...lerpState(markerState, railState(0), ease.move(span(t, prodExit, factsIn + 0.2))), o: RM ? 0 : 1};
    const ctaU = {...ctaUnder, r: 10};
    if (t < factsEnd) return {...railState(span(t, factsIn + 0.2, factsEnd)), o: 1};
    if (t < ctaIn + 0.55) return {...lerpState(railState(1), {...ctaU, w: 0}, ease.move(span(t, factsEnd, ctaIn + 0.55))), o: RM ? 0 : 1};
    return {...ctaU, w: ctaU.w * ease.enter(span(t, ctaIn + 0.55, ctaIn + 1.0)), o: 1};
  };

  const holds = [[B.hook + 0.9, hookExit], [hit, claimExit], [prodIn + 0.6, prodExit], ...(N ? [[factsIn + 0.42, factsEnd - 0.1]] : []), [ctaIn + 0.6, D + 1]];

  window.EVENTS = events.sort((a, b) => a.t - b.t);

  // ---------------- draw(t) ----------------
  // display, not visibility: a child set to visibility:visible would still show inside a hidden parent.
  const show = (node, on) => (node.style.display = on ? '' : 'none');
  const reveal = (inner, t, a, dur = 0.7, from = 1.1) => {
    const u = span(t, a, a + dur);
    inner.style.transform = `translateY(${M((1 - ease.enter(u)) * from * 100)}%)`;
    inner.style.opacity = RM ? ease.smooth(span(t, a, a + 0.5)) : u > 0 ? 1 : 0;
  };

  return (t) => {
    drawGround(t);
    drawGrain(t);
    // Camera: a slow continuous push across the whole film, plus a gentle drift that never jitters.
    let k = 0;
    for (const [a, b] of holds) k = Math.max(k, ease.smooth(span(t, a, b)) * (1 - ease.inOut(span(t, b, b + 0.45))));
    camera.style.transformOrigin = `${ML}px ${H * 0.46}px`;
    camera.style.transform = `translate(${M(noise(t * 0.22, 3) * 3)}px, ${M(noise(t * 0.19, 7) * 8)}px) scale(${S(1 + PUSH * k)})`;

    // Beat 1: hook
    const hookOn = t < B.claim + 0.05;
    show(sHook, hookOn);
    if (hookOn) {
      hookLines.forEach((ln, i) => {
        const s = hookStart(i);
        const inner = ln.firstChild;
        const grow = ease.inOut(span(t, s, s + 0.3));
        const shrink = ease.inOut(span(t, s + 0.34, s + 0.64));
        const b = hookBlocks[i];
        if (RM) {
          b.style.opacity = 0;
          inner.style.opacity = ease.smooth(span(t, s, s + 0.5));
        } else {
          b.style.opacity = 1;
          b.style.transformOrigin = t < s + 0.32 ? '0 50%' : '100% 50%';
          b.style.transform = `scaleX(${t < s + 0.32 ? grow : 1 - shrink})`;
          inner.style.opacity = t >= s + 0.32 ? 1 : 0;
        }
        const ex = (tt) => -H * 0.55 * ease.exit(span(tt, hookExit + i * 0.05, hookExit + 0.3 + i * 0.05));
        inner.style.transform = `translateY(${M(ex(t))}px)`;
        ln.style.filter = blur(vel(ex, t), 'y');
        if (RM && t > hookExit) inner.style.opacity = 1 - span(t, hookExit, hookExit + 0.3);
      });
    }

    // Beat 2: claim
    const claimOn = t > hookExit && t < B.product + 0.05;
    show(sClaim, claimOn);
    if (claimOn) {
      const grow = ease.enter(span(t, ringIn, ringIn + 0.5));
      const zoom = (tt) => (GLASS ? 1 + 9 * ease.inOut(span(tt, claimExit - 0.1, claimExit + 0.5)) : 1 + 4.5 * ease.exit(span(tt, claimExit, claimExit + 0.42)));
      sClaim.style.transformOrigin = `${zoomX}px ${zoomY}px`;
      sClaim.style.transform = `scale(${S(zoom(t))})`;
      sClaim.style.opacity = RM ? 1 - span(t, claimExit, claimExit + 0.35) : GLASS ? 1 : 1 - span(t, claimExit + 0.22, claimExit + 0.4);
      const zb = RM ? 0 : span(t, claimExit + 0.1, claimExit + 0.4);
      sClaim.style.filter = zb > 0 ? `blur(${10 * zb}px)` : 'none';
      if (GLASS) {
        const gin = RM ? span(t, ringIn, ringIn + 0.4) : ease.enter(span(t, ringIn, ringIn + 0.55));
        glass.group.setAttribute('opacity', gin);
        glass.group.setAttribute('transform', `translate(0 ${M((1 - gin) * 60)})`);
        const f1 = RM ? (t >= lap1[0] ? 1 : 0) : ease.inOut(span(t, lap1[0], lap1[1]));
        const f2 = RM ? (t >= hit ? 1 : 0) : ease.inOut(span(t, lap2[0], lap2[1]));
        const pouring = !RM && ((t > lap1[0] && t < lap1[1]) || (t > lap2[0] && t < lap2[1]));
        const lastStop = t >= lap2[1] ? lap2[1] : t >= lap1[1] ? lap1[1] : lap1[0];
        const bob = t > hit && !RM ? -12 * Math.exp(-(t - hit) * 3.2) * Math.cos((t - hit) * 8) : 0;
        glass.update({level: 0.45 * f1 + 0.45 * f2, pour: pouring ? 1 : 0, pourTop, t: RM ? 0 : t,
          ripple: pouring ? 1 : RM ? 0 : Math.exp(-(t - lastStop) * 3.5), glow: 0.3 + 0.5 * (0.45 * f1 + 0.45 * f2),
          iceBob: bob, drop: RM ? 0 : span(t, dropAt[0], dropAt[1]), iceIn: RM ? (t >= lap1[1] ? 1 : 0) : span(t, lap1[1] - 0.05, lap1[1] + 0.6), ground: 0.8});
        gTicks.forEach(({ln, lab, lv}) => {
          const on = ease.smooth(span(t, ringIn + 0.3, ringIn + 0.7));
          const reached = 0.45 * f1 + 0.45 * f2 >= lv - 0.005;
          ln.setAttribute('stroke', reached && lv > 0.5 ? P.accent : P.ink);
          ln.setAttribute('stroke-opacity', on * (reached ? 0.9 : 0.4));
          lab.style.opacity = on * (reached ? 1 : 0.45);
          lab.style.color = reached && lv > 0.5 ? P.accent : P.ink;
        });
      }
      const r1 = mix(22, R, grow);
      ring1.setAttribute('r', RM ? R : r1);
      ring2.setAttribute('r', RM ? R + 36 : mix(22, R + 36, grow));
      const c1 = 2 * Math.PI * R;
      const c2 = 2 * Math.PI * (R + 36);
      const l1 = RM ? span(t, lap1[0], lap1[0] + 0.01) : ease.inOut(span(t, lap1[0], lap1[1]));
      const l2 = RM ? span(t, hit, hit + 0.01) : ease.inOut(span(t, lap2[0], lap2[1]));
      ring1.setAttribute('stroke-dasharray', `${c1 * l1} ${c1}`);
      ring2.setAttribute('stroke-dasharray', `${c2 * l2} ${c2}`);
      ring1.style.opacity = RM ? span(t, ringIn, ringIn + 0.5) : 1;
      ring2.style.opacity = l2 > 0 ? 1 : 0;
      ticks.setAttribute('transform', `rotate(${M((t - ringIn) * 14)} ${CX} ${CY})`);
      ticks.style.opacity = 0.24 * ease.smooth(span(t, ringIn + 0.2, ringIn + 0.8));
      // The number: "1x" during the first lap, flips to the claim on the hit, with a spring pop.
      const flip = ease.move(span(t, hit - 0.12, hit + 0.12));
      numA.style.opacity = RM ? span(t, ringIn, ringIn + 0.5) * (1 - span(t, hit - 0.2, hit)) : t < ringIn + 0.2 || t > hit - 0.03 ? 0 : 1;
      numA.style.color = hex(P.ink, 0.88);
      numA.style.transform = `translateY(${M(-flip * 135)}%) scale(${S(mix(0.86, 1, ease.enter(span(t, ringIn + 0.1, ringIn + 0.7))))})`;
      const pop = 1 + (RM ? 0 : 0.16 * (1 - spring(t, hit, {zeta: 0.42, omega: 16})));
      numB.style.color = P.accent;
      numB.style.opacity = RM ? span(t, hit - 0.2, hit) : t >= hit - 0.12 ? 1 : 0;
      numB.style.transform = `translateY(${M((1 - flip) * 135)}%) scale(${t >= hit ? pop : 1})`;
      labelLines.forEach((ln, i) => reveal(ln.firstChild, t, hit - 0.06 + i * 0.07, 0.5));
    }

    // Beat 3: product
    const prodOn = t > prodIn - 0.02 && t < factsAt + 0.05;
    show(sProd, prodOn);
    if (prodOn) {
      const arrive = ease.enter(span(t, prodIn, prodIn + 0.8));
      sProd.style.transformOrigin = `${ML}px ${H * 0.46}px`;
      sProd.style.transform = `scale(${S(mix(0.8, 1, arrive))})`;
      sProd.style.opacity = span(t, prodIn, prodIn + 0.16);
      if (prodGlass) {
        wash.style.opacity = 1 - ease.inOut(span(t, prodIn + 0.2, prodIn + 1.0));
        const rise = RM ? 1 : ease.enter(span(t, prodIn + 0.35, prodIn + 1.3));
        const leave = ease.exit(span(t, prodExit, prodExit + 0.35));
        prodGlass.group.setAttribute('opacity', 0.62 * (RM ? span(t, prodIn, prodIn + 0.5) : rise) * (1 - leave));
        prodGlass.group.setAttribute('transform', `translate(0 ${M((1 - rise) * 260 + leave * 420)})`);
        prodGlass.update({level: 0.9, t: RM ? 0 : t, ripple: 0.15, glow: 0.8, iceBob: RM ? 0 : 6 * Math.sin(t * 1.3), drop: RM ? 0 : span(t, prodIn + 1.4, prodIn + 2.4)});
      }
      kicker.style.opacity = ease.smooth(span(t, prodIn + 0.3, prodIn + 0.6));
      kicker.style.transform = `translateX(${M((1 - ease.enter(span(t, prodIn + 0.3, prodIn + 0.8))) * -24)}px)`;
      nameLines.forEach((ln, i) => {
        reveal(ln.firstChild, t, prodIn + 0.08 + i * 0.1, 0.75);
        const ex = (tt) => -W * 0.8 * ease.exit(span(tt, prodExit + i * 0.05, prodExit + 0.3 + i * 0.05));
        ln.style.transform = `translateX(${M(ex(t))}px)`;
        ln.style.filter = blur(vel(ex, t), 'x');
        ln.firstChild.style.letterSpacing = `${-0.035 - 0.012 * ease.smooth(span(t, prodIn + 0.8, prodExit))}em`;
      });
      reveal(sub.firstChild.firstChild, t, prodIn + 0.7, 0.6);
      const fade = 1 - span(t, prodExit, prodExit + 0.25);
      kicker.style.opacity *= fade;
      sub.style.opacity = fade;
    }

    // Beat 4: facts
    const factsOn = N > 0 && t > factsIn - 0.02 && t < B.cta + 0.15;
    show(sFacts, factsOn);
    if (factsOn) {
      const i = clamp(Math.floor((t - factsIn) / factWin), 0, N - 1);
      counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
      const head = span(t, factsIn, factsIn + 0.3) * (1 - span(t, factsEnd - 0.15, factsEnd + 0.1));
      counter.style.opacity = N > 1 ? head : 0;
      rail.style.opacity = head;
      factEls.forEach((box, k) => {
        const a = factsIn + k * factWin;
        const z = a + factWin;
        const last = k === N - 1;
        const fx = (tt) =>
          M(W * 0.7 * (1 - ease.enter(span(tt, a, a + 0.42)))) -
          M(last ? 0 : W * 0.75 * ease.exit(span(tt, z - 0.24, z))) -
          M(16 * ease.smooth(span(tt, a + 0.4, z - 0.24)));
        const fy = (tt) => (last ? -H * 0.45 * ease.exit(span(tt, factsEnd - 0.14, factsEnd + 0.16)) : 0);
        const on = t >= a - 0.01 && (last ? t < factsEnd + 0.2 : t < z + 0.01);
        show(box, on);
        box.style.opacity = RM ? span(t, a, a + 0.3) * (1 - span(t, z - 0.25, z)) : 1;
        box.style.transform = `translate(${fx(t)}px, ${M(fy(t))}px)`;
        const vx = vel(fx, t);
        const vy = vel((tt) => M(fy(tt)), t);
        box.style.filter = Math.abs(vy) > Math.abs(vx) ? blur(vy, 'y') : blur(vx, 'x');
      });
    }

    // Beat 5: call to action
    const ctaOn = t > ctaIn - 0.02;
    show(sCta, ctaOn);
    if (ctaOn) {
      ctaLines.forEach((ln, i) => reveal(ln.firstChild, t, ctaIn + 0.05 + i * 0.1, 0.8));
      if (endProduct) {
        // The product drops into the end card on a spring: the last new thing on screen, then it settles.
        const land = RM ? ease.smooth(span(t, productDrop, productDrop + 0.4)) : spring(t, productDrop, {zeta: 0.62, omega: 13});
        endProduct.el.style.opacity = RM ? land : span(t, productDrop, productDrop + 0.12);
        endProduct.el.style.transform = `translateY(${M((1 - land) * -420)}px)`;
        if (endProduct.glass) {
          const bob = t > productDrop + 0.3 && !RM ? -10 * Math.exp(-(t - productDrop - 0.3) * 3) * Math.cos((t - productDrop) * 9) : 0;
          endProduct.glass.update({level: 0.9, t: RM ? 0 : t, ripple: RM ? 0 : Math.exp(-Math.max(0, t - productDrop - 0.3) * 3), glow: 0.75, iceBob: bob, drop: RM ? 0 : span(t, productDrop + 1.2, productDrop + 2.0), ground: span(t, productDrop + 0.2, productDrop + 0.45)});
        }
      }
      // The brand types on letter by letter, so the end card keeps moving while it is read.
      const typed = RM ? C.brand.length : Math.floor(C.brand.length * span(t, ctaIn + 0.85, ctaIn + 0.85 + 0.045 * C.brand.length));
      brand.textContent = C.brand.slice(0, typed);
      brand.style.opacity = RM ? ease.smooth(span(t, ctaIn + 0.85, ctaIn + 1.3)) : 1;
      reveal(signoff, t, ctaIn + 1.05, 0.6, 0.4);
    }

    // The carrier
    const c = carrierAt(t);
    carrier.style.opacity = c.o;
    carrier.style.borderRadius = `${c.r}px`;
    carrier.style.transform = `translate(${c.x}px, ${c.y}px)`;
    carrier.style.width = `${Math.max(0, c.w)}px`;
    carrier.style.height = `${Math.max(0, c.h)}px`;
  };
});
