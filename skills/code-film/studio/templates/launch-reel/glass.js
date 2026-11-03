// A drawn glass of a dark drink (cold brew, coffee, cola, tea), built from SVG so it renders crisply at any size.
// It shows the category, never a brand's packaging: pass a real cutout photo in film.json when there is one.
// glass.update(state) is a pure function of state, so it obeys the render contract.
import {clamp, mix, rand} from './studio/kit.js';

const NS = 'http://www.w3.org/2000/svg';
const node = (parent, tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent.appendChild(n);
  return n;
};

/**
 * createGlass(svg, {x, y, w, h, ink, accent, liquidTop, liquidBottom, id})
 * x, y: top-left of the glass box in the SVG's units; w, h: its size.
 * Returns {update(state), levelY(level), rimY, interior, group} where state is
 * {level 0..1, pour 0..1 (stream visible), pourTop (y the stream falls from), ripple (0..1 energy),
 *  t (seconds, for ripples and drops), glow 0..1, ice (bob offset in px), drop 0..1 (one drop running down)}.
 */
export function createGlass(svg, o) {
  const {x, y, w, h, ink, accent, id = 'g'} = o;
  const liquidTop = o.liquidTop || '#7a3a12';
  const liquidBottom = o.liquidBottom || '#140803';
  const taper = 0.1; // the bottom is 80% of the top width
  const wall = Math.max(6, w * 0.035);
  const base = h * 0.075;
  const left = (yy) => x + w * taper * (yy - y) / h;
  const right = (yy) => x + w - w * taper * (yy - y) / h;
  const inTop = y + h * 0.035;
  const inBottom = y + h - base;
  const levelY = (level) => mix(inBottom, inTop + h * 0.02, clamp(level));

  const defs = node(svg, 'defs');
  const grad = (gid, stops, x2 = 0, y2 = 1) => {
    const g = node(defs, 'linearGradient', {id: gid, x1: 0, y1: 0, x2, y2});
    for (const [off, color, op = 1] of stops) node(g, 'stop', {offset: off, 'stop-color': color, 'stop-opacity': op});
    return g;
  };
  grad(`${id}-liq`, [[0, liquidTop], [0.18, mix2(liquidTop, liquidBottom, 0.45)], [1, liquidBottom]]);
  grad(`${id}-body`, [[0, ink, 0.1], [0.12, ink, 0.03], [0.5, ink, 0.015], [0.88, ink, 0.03], [1, ink, 0.12]], 1, 0);
  grad(`${id}-hl`, [[0, '#ffffff', 0], [0.5, '#ffffff', 0.55], [1, '#ffffff', 0]], 1, 0);
  grad(`${id}-ice`, [[0, '#ffffff', 0.55], [1, '#ffffff', 0.12]]);
  // Light passing through the thin edges of the drink: amber at the walls, deep in the middle.
  grad(`${id}-vol`, [[0, '#e08a3c', 0.55], [0.16, '#c06a2a', 0.18], [0.5, '#000000', 0], [0.84, '#c06a2a', 0.14], [1, '#e08a3c', 0.42]], 1, 0);
  grad(`${id}-crema`, [[0, '#f0b27a', 0.95], [0.35, '#b8692e', 0.85], [1, '#6a3412', 0]]);
  const rg = node(defs, 'radialGradient', {id: `${id}-glow`, cx: 0.5, cy: 0.55, r: 0.5});
  node(rg, 'stop', {offset: 0, 'stop-color': accent, 'stop-opacity': 0.55});
  node(rg, 'stop', {offset: 0.6, 'stop-color': accent, 'stop-opacity': 0.12});
  node(rg, 'stop', {offset: 1, 'stop-color': accent, 'stop-opacity': 0});
  const interiorPts = `${left(inTop) + wall},${inTop} ${right(inTop) - wall},${inTop} ${right(inBottom) - wall},${inBottom} ${left(inBottom) + wall},${inBottom}`;
  const clip = node(defs, 'clipPath', {id: `${id}-in`});
  node(clip, 'polygon', {points: interiorPts});

  const group = node(svg, 'g');
  // Backlight: the drink glows amber against the dark ground, the way premium drink shots are lit.
  const glow = node(group, 'ellipse', {cx: x + w / 2, cy: y + h * 0.55, rx: w * 0.95, ry: h * 0.62, fill: `url(#${id}-glow)`});
  // Contact shadow and a faint surface line: the glass stands on something.
  const shadow = node(group, 'ellipse', {cx: x + w / 2, cy: y + h + 4, rx: w * 0.62, ry: w * 0.05, fill: '#000000', 'fill-opacity': 0});
  const floor = node(group, 'line', {x1: x - w * 0.5, y1: y + h + 4, x2: x + w * 1.5, y2: y + h + 4, stroke: ink, 'stroke-opacity': 0, 'stroke-width': 1.5});
  grad(`${id}-stream`, [[0, liquidTop, 0], [0.35, liquidTop, 0.85], [1, mix2(liquidTop, '#ffffff', 0.12), 1]]);
  // The pour: thin and fading where it starts, thicker and wavering where it meets the drink.
  const stream = node(group, 'path', {fill: `url(#${id}-stream)`});
  const splash = [...Array(9)].map((_, i) => node(group, 'circle', {r: 2 + 3 * rand(21, i), fill: '#e7a46b', 'fill-opacity': 0.8}));
  node(group, 'polygon', {points: `${x},${y} ${x + w},${y} ${right(y + h)},${y + h} ${left(y + h)},${y + h}`, fill: `url(#${id}-body)`, stroke: ink, 'stroke-opacity': 0.28, 'stroke-width': 2});
  const inner = node(group, 'g', {'clip-path': `url(#${id}-in)`});
  const liquid = node(inner, 'rect', {x: x, width: w, fill: `url(#${id}-liq)`});
  const volume = node(inner, 'rect', {x: x, width: w, fill: `url(#${id}-vol)`});
  const bubbles = [...Array(18)].map((_, i) => node(inner, 'circle', {r: 1.5 + rand(3, i) * 3.5, fill: '#ffd9b0', 'fill-opacity': 0.35}));
  const surface = node(inner, 'path', {fill: `url(#${id}-crema)`});
  const surfaceHi = node(inner, 'path', {fill: 'none', stroke: '#ffe2c4', 'stroke-opacity': 0.7, 'stroke-width': 2.5});
  const ice = [0, 1, 2].map((i) => {
    const s = w * [0.25, 0.19, 0.15][i];
    const g = node(group, 'g'); // outside the clip, so a cube is visible while it falls in
    node(g, 'rect', {x: -s / 2, y: -s / 2, width: s, height: s, rx: s * 0.18, fill: `url(#${id}-ice)`, stroke: '#ffffff', 'stroke-opacity': 0.35, 'stroke-width': 1.5});
    node(g, 'rect', {x: -s * 0.32, y: -s * 0.36, width: s * 0.2, height: s * 0.5, rx: s * 0.08, fill: '#ffffff', 'fill-opacity': 0.35});
    return {g, s};
  });
  // Glass highlights and rim sit over the drink.
  node(group, 'path', {d: `M${left(y) + w * 0.06},${y + h * 0.06} L${left(y + h) + w * 0.06},${y + h * 0.9}`, stroke: `url(#${id}-hl)`, 'stroke-width': w * 0.05, 'stroke-linecap': 'round', opacity: 0.55});
  node(group, 'path', {d: `M${right(y) - w * 0.07},${y + h * 0.1} L${right(y + h) - w * 0.06},${y + h * 0.55}`, stroke: '#ffffff', 'stroke-opacity': 0.22, 'stroke-width': w * 0.014, 'stroke-linecap': 'round'});
  node(group, 'ellipse', {cx: x + w / 2, cy: y, rx: w / 2, ry: w * 0.045, fill: 'none', stroke: ink, 'stroke-opacity': 0.5, 'stroke-width': 2.5});
  node(group, 'rect', {x: left(y + h - base), y: y + h - base, width: right(y + h - base) - left(y + h - base), height: base, rx: base * 0.3, fill: ink, 'fill-opacity': 0.07, stroke: ink, 'stroke-opacity': 0.25, 'stroke-width': 1.5});
  // Condensation: seeded beads on the cold glass, and one drop that runs.
  const beads = node(group, 'g');
  for (let i = 0; i < 46; i++) {
    const yy = y + h * (0.12 + 0.75 * rand(11, i));
    const xx = mix(left(yy) + wall * 1.5, right(yy) - wall * 1.5, rand(12, i));
    node(beads, 'circle', {cx: xx, cy: yy, r: 1.2 + 3.2 * rand(13, i) ** 2, fill: '#ffffff', 'fill-opacity': 0.18 + 0.25 * rand(14, i)});
  }
  const dropX = mix(left(y + h * 0.3), right(y + h * 0.3), 0.72);
  const drop = node(group, 'path', {fill: '#ffffff', 'fill-opacity': 0.5});

  const surfacePath = (yy, amp, t) => {
    const l = left(yy) + wall;
    const r = right(yy) - wall;
    const n = 24;
    let d = `M${l},${yy}`;
    for (let i = 1; i <= n; i++) {
      const xx = mix(l, r, i / n);
      d += ` L${xx},${yy + amp * Math.sin(i * 0.9 + t * 9) * Math.sin((Math.PI * i) / n)}`;
    }
    return d;
  };

  return {
    group,
    rimY: y,
    levelY,
    update({level = 0, pour = 0, pourTop = 0, ripple = 0, t = 0, glow: gl = 0.6, iceBob = 0, drop: dr = 0, iceIn = 1, ground = 0}) {
      shadow.setAttribute('fill-opacity', 0.55 * ground);
      floor.setAttribute('stroke-opacity', 0.16 * ground);
      const ly = levelY(level);
      liquid.setAttribute('y', ly);
      liquid.setAttribute('height', Math.max(0, y + h - ly));
      liquid.style.display = volume.style.display = level > 0.002 ? '' : 'none';
      volume.setAttribute('y', ly);
      volume.setAttribute('height', Math.max(0, y + h - ly));
      const amp = 3 + 9 * ripple;
      const top = surfacePath(ly, amp, t);
      const l = left(ly) + wall;
      const r = right(ly) - wall;
      surface.setAttribute('d', `${top} L${r},${ly + 26} L${l},${ly + 26} Z`);
      surfaceHi.setAttribute('d', top);
      surface.style.display = surfaceHi.style.display = level > 0.01 ? '' : 'none';
      glow.setAttribute('opacity', gl);
      // The stream falls from pourTop to the surface while pouring.
      stream.style.display = pour > 0.01 ? '' : 'none';
      const sx = x + w / 2;
      const steps = 14;
      const pts = [];
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const yy = mix(pourTop, ly, u);
        const half = mix(wall * 0.25, wall * 1.15, u * u) * (0.6 + 0.4 * pour);
        const wob = 2.5 * u * Math.sin(t * 23 + u * 9);
        pts.push([sx + wob, yy, half]);
      }
      stream.setAttribute('d', `M${pts.map(([px, py, hw]) => `${px - hw},${py}`).join(' L')} L${pts.reverse().map(([px, py, hw]) => `${px + hw},${py}`).join(' L')} Z`);
      stream.setAttribute('opacity', clamp(pour * 1.4));
      // A small crown where the pour lands.
      splash.forEach((c, i) => {
        const ph = (t * 3.1 + rand(22, i)) % 1;
        const ang = Math.PI * (0.15 + 0.7 * rand(23, i));
        const rad = 10 + 46 * ph;
        c.setAttribute('cx', sx + Math.cos(ang) * rad * (i % 2 ? 1 : -1));
        c.setAttribute('cy', ly - Math.sin(ang) * rad * 0.9 * (1 - ph) - 4);
        c.setAttribute('fill-opacity', 0.75 * (1 - ph));
        c.style.display = pour > 0.5 && level > 0.03 ? '' : 'none';
      });
      bubbles.forEach((b, i) => {
        const speed = 40 + 70 * rand(4, i);
        const span = y + h - base - ly;
        const yy = y + h - base - ((t * speed + rand(5, i) * 500) % Math.max(1, span));
        b.setAttribute('cx', mix(l + 8, r - 8, rand(6, i)) + 4 * Math.sin(t * 3 + i));
        b.setAttribute('cy', yy);
        // Cold brew is still, not fizzy: air only shows while it is being poured, then clears.
        b.style.display = level > 0.08 && ripple > 0.15 ? '' : 'none';
        b.setAttribute('fill-opacity', 0.35 * clamp(ripple));
      });
      // Ice falls in one cube at a time (iceIn 0..1), floats at the surface and bobs on the hit.
      ice.forEach(({g, s}, i) => {
        const u = clamp(iceIn * 1.7 - i * 0.35);
        const fall = u * u;
        const cx = mix(l + s * 0.75, r - s * 0.75, [0.2, 0.66, 0.95][i]);
        const rest = ly + s * [0.08, 0.3, 0.42][i] + iceBob * [1, 0.6, 0.8][i];
        const cy = mix(y - s * 2.2, rest, fall);
        g.setAttribute('transform', `translate(${cx} ${cy}) rotate(${[14, -23, 38][i] + iceBob * 0.6 + (1 - u) * 50 * (i % 2 ? -1 : 1)})`);
        g.style.display = u > 0 ? '' : 'none';
      });
      if (dr > 0 && dr < 1) {
        const dy = y + h * mix(0.3, 0.86, dr * dr);
        drop.setAttribute('d', `M${dropX},${y + h * 0.3} Q${dropX + 3},${(dy + y + h * 0.3) / 2} ${dropX},${dy} a4 4 0 1 0 0.1 0 Z`);
        drop.style.display = '';
      } else drop.style.display = 'none';
    },
  };
}

function mix2(a, b, u) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - u) + ((pb >> s) & 255) * u));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
