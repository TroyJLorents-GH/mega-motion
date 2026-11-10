// Procedural imagery, used wherever a work has no "image" of its own. Everything is drawn from seeded noise.
//   surfaceField(seed, gw, gh)        a height field (0..1): warped fbm, strata, ridges and cracks
//   paintSurface(canvas, field, pal)  the field as a lit, textured panel graded by a light mood (a card's first image)
//   paintTopo(canvas, field, pal)     the same field as a contour survey, optionally with a route (the second image)
//   drawPattern(canvas, opts)         section backgrounds: "contours" or "rings" (vector strokes, crisp at any size)
import {makeNoise} from './noise.js';

const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

// style (content.json art.surface): "stone" (strata, ledges, cracks) or "grain" (long wavy fibres, like the
// spruce top of an instrument, brushed metal or combed sand).
export function surfaceField(seed, gw, gh, {style = 'stone', scale = 2.6} = {}) {
  if (style === 'grain') return grainField(seed, gw, gh, scale);
  const N = makeNoise(seed);
  const f = new Float32Array(gw * gh);
  const k = scale / Math.max(gw, gh);
  const ang = -0.35 + ((seed * 0.6180339) % 1) * 0.7; // bedding planes: near horizontal, a little different per seed
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const steps = 7 + (seed % 5);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = i * k + seed * 3.7;
      const y = j * k - seed * 1.9;
      const w = N.fbm2(x * 0.5 + 5.2, y * 0.5 + 1.3, 3);
      const px = x + w * 0.45;
      const py = y + w * 0.45;
      // Bedding: height rises across the layers, broken into ledges (flat treads, steep risers).
      const along = (px * sa + py * ca) * 1.35 + N.fbm2(px * 0.8, py * 0.8, 3) * 0.9;
      const t = along * steps * 0.5;
      const fr = t - Math.floor(t);
      const ledge = (Math.floor(t) + Math.pow(fr, 5)) / steps;
      let h = ledge * 0.55 + N.fbm2(px * 1.6, py * 1.6, 5) * 0.38;
      const r = 1 - Math.abs(N.n2(px * 2.4 + 2, py * 2.4));
      h += 0.07 * r * r * r; // edges and flakes
      const c = Math.max(0, 1 - Math.abs(N.n2(px * 1.1 - 7, py * 0.7 + 3)) * 12);
      h -= 0.12 * c * c; // vertical cracks
      h += 0.025 * N.n2(px * 9, py * 9); // grit
      f[j * gw + i] = h;
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
  }
  const d = hi - lo || 1;
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) / d;
  return {f, gw, gh, seed};
}

function grainField(seed, gw, gh, scale) {
  const N = makeNoise(seed);
  const f = new Float32Array(gw * gh);
  const k = scale / Math.max(gw, gh);
  const ang = (((seed * 0.6180339) % 1) - 0.5) * 0.5; // the fibres run near vertical, a little different per seed
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const freq = 2.6 + (seed % 4) * 0.35;
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x0 = i * k + seed * 3.7;
      const y0 = j * k - seed * 1.9;
      const x = x0 * ca - y0 * sa;
      const y = x0 * sa + y0 * ca;
      // Warp stretched along the fibres, so the lines wander slowly and bunch up in places.
      const w = N.fbm2(x * 0.7 + 4.1, y * 0.16 - 2.3, 4) * 2.4 + N.fbm2(x * 1.9, y * 0.5 + 7, 3) * 0.35;
      // Smooth growth lines (no hard edges, so the lighting stays soft): narrow late wood, wide early wood.
      const ring = Math.pow(0.5 + 0.5 * Math.cos((x + w * 0.55) * freq * Math.PI * 2), 2.2);
      let h = ring * 0.16 + N.fbm2(x * 0.9, y * 0.9, 4) * 0.42;
      h += 0.035 * N.n2(x * 16, y * 1.1); // fine streaks along the fibres
      h += 0.012 * N.n2(x * 9, y * 9);
      f[j * gw + i] = h;
      if (h < lo) lo = h;
      if (h > hi) hi = h;
    }
  }
  const d = hi - lo || 1;
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) / d;
  return {f, gw, gh, seed, relief: 0.22, tint: 0.62, soft: true}; // a polished surface: colour from the grain, little relief
}

// Surface tints for works without a light mood: the seed picks one, so the cards read as different places.
const STONES = [[168, 156, 138], [140, 142, 146], [176, 140, 100], [120, 128, 142], [158, 150, 128], [132, 120, 112]];

function sampler({f, gw, gh}) {
  return (u, v) => {
    u = clamp(u, 0, gw - 1.001);
    v = clamp(v, 0, gh - 1.001);
    const i = Math.floor(u);
    const j = Math.floor(v);
    const fu = u - i;
    const fv = v - j;
    const a = f[j * gw + i];
    const b = f[j * gw + i + 1];
    const c = f[(j + 1) * gw + i];
    const e = f[(j + 1) * gw + i + 1];
    return (a + (b - a) * fu) * (1 - fv) + (c + (e - c) * fu) * fv;
  };
}

// A lit surface. Light from the upper left; the deepest cracks pick up a little of the accent, like cold shade.
// opts: a light mood from MOODS, plus figure: [x, y, facing] to draw the small figure (opt-in, content "climber").
export function paintSurface(canvas, field, pal, mood = MOODS.noon, figure = null) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const S = sampler(field);
  const {gw, gh, relief = 1, tint = 0.35, soft = false} = field;
  const ground = rgb(pal.ground);
  const accent = rgb(pal.accent);
  const bone = rgb(pal.bone);
  const stone = mood.stone || STONES[field.seed % STONES.length];
  const deep = mixc(ground, accent, 0.12);
  const mid = mixc(stone, ground, 0.45);
  const light = mixc(stone, bone, 0.55);
  const sx = (gw - 1) / (W - 1);
  const sy = (gh - 1) / (H - 1);
  let seed = field.seed * 7919;
  const grain = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff - 0.5;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x * sx;
      const v = y * sy;
      const h = S(u, v);
      const dx = S(u + 0.8, v) - S(u - 0.8, v);
      const dy = S(u, v + 0.8) - S(u, v - 0.8);
      // relief: how much the slope lights the surface (stone 1); tint: how much the height itself colours it.
      const shade = clamp(0.52 + (dx * 0.8 + dy) * 13 * relief);
      const tone = clamp(h * tint + shade * (1.2 - tint) - 0.12);
      let c = tone < 0.5 ? mixc(deep, mid, tone / 0.5) : mixc(mid, light, (tone - 0.5) / 0.5);
      // The light of the day: lit faces take the key colour, shadows take the fill colour.
      // Stone switches hard between key and fill (crisp ledges); a polished surface crossfades.
      const lit = soft ? clamp((tone - 0.3) / 0.4) : tone > 0.5 ? 1 : 0;
      c = mixc(c, mixc(mixc(c, mood.fill, 0.9), mixc(c, mood.key, 0.9), lit), mood.grade);
      if (mood.spot) {
        const sx2 = x / W - mood.spot[0];
        const sy2 = (y / H - mood.spot[1]) * (H / W);
        const s = Math.exp(-(sx2 * sx2 + sy2 * sy2) / (2 * mood.spot[2] * mood.spot[2]));
        c = mixc(mixc(c, [8, 10, 16], 0.78), c, s);
      }
      const vx = x / W - 0.5;
      const vy = y / H - 0.42;
      const vig = 1 - clamp((vx * vx + vy * vy) * 1.15) * 0.55;
      const g = grain() * 16;
      const o = (y * W + x) * 4;
      d[o] = c[0] * vig + g;
      d[o + 1] = c[1] * vig + g;
      d[o + 2] = c[2] * vig + g;
      d[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (mood.sky) {
    const g = ctx.createLinearGradient(0, 0, 0, H * mood.sky[2]);
    g.addColorStop(0, mood.sky[0]);
    g.addColorStop(1, mood.sky[1]);
    ctx.fillStyle = g;
    ctx.globalCompositeOperation = 'screen';
    ctx.fillRect(0, 0, W, H * mood.sky[2]);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (mood.moon) {
    const [mx, my, mr] = mood.moon;
    const g = ctx.createRadialGradient(mx * W, my * H, 0, mx * W, my * H, mr * W * 5);
    g.addColorStop(0, 'rgba(240,238,230,0.55)');
    g.addColorStop(1, 'rgba(240,238,230,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal.bone;
    ctx.beginPath();
    ctx.arc(mx * W, my * H, mr * W, 0, Math.PI * 2);
    ctx.fill();
  }
  if (mood.water) {
    const top = H * (1 - mood.water[2]);
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, mood.water[0]);
    g.addColorStop(1, mood.water[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, H - top);
    ctx.strokeStyle = 'rgba(242,239,232,0.35)';
    ctx.lineWidth = Math.max(1, W / 300);
    for (let i = 0; i < 9; i++) {
      const yy = top + (H - top) * (0.08 + i * 0.1) ;
      const x0 = W * ((i * 0.37) % 1) * 0.6;
      ctx.beginPath();
      ctx.moveTo(x0, yy);
      ctx.lineTo(x0 + W * (0.12 + ((i * 0.23) % 0.2)), yy);
      ctx.stroke();
    }
  }
  if (figure) drawFigure(ctx, W, H, figure, mood.spot ? pal.bone : '#0B0C10');
}

// Light per work (content.json "light"): what the hour and the place looked like. Colours are RGB.
export const MOODS = {
  noon: {stone: [190, 182, 166], key: [255, 246, 228], fill: [96, 104, 120], grade: 0.25},
  dusk: {stone: [186, 128, 84], key: [255, 176, 110], fill: [92, 52, 70], grade: 0.5, sky: ['#FF9A5C', 'rgba(0,0,0,0)', 0.35]},
  blue: {stone: [112, 128, 158], key: [150, 180, 255], fill: [24, 34, 74], grade: 0.6},
  cave: {stone: [96, 98, 102], key: [210, 216, 220], fill: [16, 18, 22], grade: 0.45, sky: ['#9AA6AE', 'rgba(0,0,0,0)', 0.25]},
  moon: {stone: [92, 100, 126], key: [200, 210, 240], fill: [10, 14, 30], grade: 0.7, moon: [0.74, 0.16, 0.05]},
  sea: {stone: [214, 176, 128], key: [255, 220, 170], fill: [70, 90, 110], grade: 0.4, water: ['#1F9AA8', '#0B4E66', 0.24]},
  dawn: {stone: [214, 132, 92], key: [255, 190, 170], fill: [90, 70, 120], grade: 0.5, sky: ['#FFC6B0', 'rgba(0,0,0,0)', 0.3]},
  lamp: {stone: [170, 150, 126], key: [255, 236, 200], fill: [20, 20, 28], grade: 0.5, spot: [0.46, 0.4, 0.2]},
};

// A small figure on the surface (opt-in per work with "climber": [x, y, facing]): arms reach up-left, one foot
// high, a rope trailing down. Proof that a person did this.
function drawFigure(ctx, W, H, [u, v, lean = 1], color) {
  const s = H * 0.085;
  const x = u * W;
  const y = v * H;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(lean, 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const limb = (pts, w) => {
    ctx.lineWidth = w * s;
    ctx.beginPath();
    ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
    for (const [a, b] of pts.slice(1)) ctx.lineTo(a * s, b * s);
    ctx.stroke();
  };
  limb([[0, 0], [0.12, 0.62]], 0.3); // torso
  ctx.beginPath();
  ctx.arc(-0.05 * s, -0.26 * s, 0.15 * s, 0, Math.PI * 2);
  ctx.fill(); // head
  limb([[0.02, 0.08], [-0.28, -0.3], [-0.36, -0.72]], 0.12); // reaching arm
  limb([[0.04, 0.12], [0.34, -0.12], [0.42, -0.42]], 0.12); // other arm
  limb([[0.12, 0.6], [-0.22, 0.86], [-0.16, 1.22]], 0.15); // high foot
  limb([[0.14, 0.6], [0.44, 0.98], [0.4, 1.4]], 0.15); // trailing leg
  ctx.globalAlpha = 0.7;
  limb([[0.14, 0.55], [0.3, 2.6], [0.1, 12]], 0.035); // rope to the ground
  ctx.restore();
}

// Marching squares over a height field: calls seg(x1, y1, x2, y2) in grid units for each contour piece at `level`.
export function march(f, gw, gh, level, seg) {
  for (let j = 0; j < gh - 1; j++) {
    for (let i = 0; i < gw - 1; i++) {
      const a = f[j * gw + i];
      const b = f[j * gw + i + 1];
      const c = f[(j + 1) * gw + i + 1];
      const e = f[(j + 1) * gw + i];
      const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (e > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = () => [i + (level - a) / (b - a), j];
      const R = () => [i + 1, j + (level - b) / (c - b)];
      const B = () => [i + (level - e) / (c - e), j + 1];
      const L = () => [i, j + (level - a) / (e - a)];
      const out = (p, q) => seg(p[0], p[1], q[0], q[1]);
      switch (idx) {
        case 1: case 14: out(L(), B()); break;
        case 2: case 13: out(B(), R()); break;
        case 3: case 12: out(L(), R()); break;
        case 4: case 11: out(T(), R()); break;
        case 6: case 9: out(T(), B()); break;
        case 7: case 8: out(L(), T()); break;
        case 5: out(L(), T()); out(B(), R()); break;
        case 10: out(T(), R()); out(L(), B()); break;
        default: break;
      }
    }
  }
}

function strokeContours(ctx, field, W, H, {levels, line, index, lw, every = 5}) {
  const {f, gw, gh} = field;
  const kx = W / (gw - 1);
  const ky = H / (gh - 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let l = 1; l < levels; l++) {
    const major = l % every === 0;
    ctx.strokeStyle = major ? index : line;
    ctx.lineWidth = major ? lw * 2.1 : lw;
    ctx.beginPath();
    march(f, gw, gh, l / levels, (x1, y1, x2, y2) => {
      ctx.moveTo(x1 * kx, y1 * ky);
      ctx.lineTo(x2 * kx, y2 * ky);
    });
    ctx.stroke();
  }
}

// The same field as a survey: bone paper, accent contours and, if route is set, a line in ink with its stops.
export function paintTopo(canvas, field, pal, {route = false} = {}) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = pal.bone;
  ctx.fillRect(0, 0, W, H);
  const s = Math.max(1, W / 300);
  strokeContours(ctx, field, W, H, {levels: 22, line: pal.accent, index: pal.accent, lw: 1.1 * s});
  if (!route) return;
  // The route: a seeded line that wanders up the face.
  const N = makeNoise(field.seed + 101);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push([W * (0.5 + 0.22 * N.fbm2(t * 2.2, 0.5, 3) * 2.2), H * (0.94 - t * 0.86)]);
  }
  ctx.strokeStyle = pal.ground;
  ctx.lineWidth = 2.6 * s;
  ctx.setLineDash([]);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.fillStyle = pal.ground;
  for (let i = 2; i < pts.length - 1; i += 3) {
    ctx.beginPath();
    ctx.arc(pts[i][0], pts[i][1], 3.4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Anchor at the top: a small ring.
  const [ax, ay] = pts[pts.length - 1];
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.arc(ax, ay, 7 * s, 0, Math.PI * 2);
  ctx.stroke();
}

// A section background, sized to the canvas's CSS box. pattern: "contours" (a contour map), "rings" (concentric,
// slightly wavering circles from a seeded centre: ripples, grooves, sound) or "none".
export function drawPattern(canvas, {pattern = 'contours', ...o}) {
  const r = canvas.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  if (pattern === 'rings') drawRings(canvas, r, dpr, o);
  else if (pattern !== 'none') drawTopo(canvas, r, dpr, o);
}

function drawRings(canvas, r, dpr, {seed = 3, color, alpha = 1, levels = 16, lw = 1, index}) {
  const W = canvas.width;
  const H = canvas.height;
  const N = makeNoise(seed);
  const ctx = canvas.getContext('2d');
  // The centre sits off to one side (seeded), so the rings sweep across the section rather than target it.
  const cx = W * (0.5 + 0.62 * (N.rand() < 0.5 ? -1 : 1) * (0.6 + 0.4 * N.rand()));
  const cy = H * (0.25 + 0.5 * N.rand());
  const far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy));
  const step = far / (levels * 2.2);
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (let k = 1; k * step < far; k++) {
    const major = k % 4 === 0;
    ctx.strokeStyle = major ? index || color : color;
    ctx.lineWidth = (major ? 2.1 : 1) * lw * dpr;
    ctx.beginPath();
    const R = k * step;
    const seg = Math.max(48, Math.round(R / (6 * dpr)));
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const w = 1 + 0.035 * N.fbm2(Math.cos(a) * 1.4 + k * 0.08, Math.sin(a) * 1.4 + k * 0.05, 3);
      const x = cx + Math.cos(a) * R * w;
      const y = cy + Math.sin(a) * R * w;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawTopo(canvas, r, dpr, {seed = 3, color, alpha = 1, levels = 16, cell = 16, scale = 2.4, lw = 1, index}) {
  const W = canvas.width;
  const H = canvas.height;
  const gw = Math.max(8, Math.ceil(r.width / cell));
  const gh = Math.max(8, Math.ceil(r.height / cell));
  const N = makeNoise(seed);
  const f = new Float32Array(gw * gh);
  const k = scale / Math.max(gw, gh);
  let lo = Infinity;
  let hi = -Infinity;
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const x = i * k;
      const y = j * k;
      const w = N.fbm2(x * 0.6 + 9, y * 0.6 - 4, 2);
      const h = N.fbm2(x + w * 0.8, y + w * 0.8, 4);
      f[j * gw + i] = h;
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
    }
  }
  for (let i = 0; i < f.length; i++) f[i] = (f[i] - lo) / (hi - lo || 1);
  const ctx = canvas.getContext('2d');
  ctx.globalAlpha = alpha;
  strokeContours(ctx, {f, gw, gh}, W, H, {levels, line: color, index: index || color, lw: lw * dpr, every: 4});
  ctx.globalAlpha = 1;
}
