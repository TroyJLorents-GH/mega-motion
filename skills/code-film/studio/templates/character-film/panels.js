// panels.js: 3D app windows. A rounded slab with depth and a bevel the light can catch, a screen face, and live
// overlays (a chat thread typing, a terminal log, an editor's viewer and timeline) drawn into canvas textures.
//
// A panel's screen is either a real capture (film.json "capture": "assets/x.png") or a generic, clearly unbranded
// UI drawn here in code (kinds: chat, doc, terminal, editor). A capture listed in film.json that is missing stops
// the render with the list of missing files: the film never ships a stand-in card.
import * as THREE from 'three';
import {clamp, ease, span} from './studio/kit.js';
import {drawSprite} from './mascot.js';

const SANS = '"Inter Tight", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const PPU = 440; // canvas pixels per world unit

/** Throw (and so stop the render) when any capture listed in film.json is missing. */
export async function preflight(film) {
  const missing = [];
  for (const [i, p] of (film.panels || []).entries()) {
    if (!p.capture) continue;
    const r = await fetch(p.capture, {cache: 'no-store'}).catch(() => null);
    if (!r || !r.ok) missing.push(`  - panels[${i}] "${p.id}": ${p.capture}`);
  }
  for (const [id, c] of Object.entries(film.content || {})) {
    const seq = c?.viewer?.sequence;
    if (!seq) continue;
    const files = sequenceFiles(seq);
    const gone = [];
    for (const src of files) {
      const r = await fetch(src, {cache: 'no-store'}).catch(() => null);
      if (!r || !r.ok) gone.push(src);
    }
    if (gone.length) missing.push(`  - content.${id}.viewer.sequence: ${gone.length} of ${files.length} frames missing (first: ${gone[0]})`);
  }
  if (missing.length) {
    throw new Error(`Missing screen captures, so the film will not render (it never ships stand-in cards):\n${missing.join('\n')}\n` +
      'Put each file at that path (relative to the film folder), or delete the panel\'s "capture" key to use the drawn generic UI.');
  }
}

/** File names of an image sequence {pattern: "assets/f_%04d.png", from: 1, count: 48}. */
export function sequenceFiles(seq) {
  const out = [];
  for (let i = 0; i < seq.count; i++) {
    const n = (seq.from ?? 1) + i * (seq.step ?? 1);
    out.push(seq.pattern.replace(/%0(\d)d/, (_, w) => String(n).padStart(Number(w), '0')));
  }
  return out;
}

const loadImage = (src) => new Promise((res, rej) => {
  const im = new Image();
  im.onload = () => res(im);
  im.onerror = () => rej(new Error(`could not decode ${src}`));
  im.src = src;
});

// ---------------------------------------------------------------- 2D helpers
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const fillRR = (ctx, x, y, w, h, r, color) => {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
};
const strokeRR = (ctx, x, y, w, h, r, color, lw = 1) => {
  rr(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
};
const text = (ctx, s, x, y, {size = 20, weight = 500, color = '#111', font = SANS, align = 'left', base = 'alphabetic', track = 0} = {}) => {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${track}px`;
  ctx.fillText(s, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  return ctx.measureText(s).width;
};
/** Word-wrap s into lines no wider than maxW (with the current font). */
const wrapLines = (ctx, s, maxW, font) => {
  ctx.font = font;
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = test;
    }
    out.push(line);
  }
  return out;
};
const bars = (ctx, x, y, w, h, color, widths, gap) => {
  // Grey text lines standing in for secondary copy (a real UI's dense small print reads as texture at film scale).
  let yy = y;
  for (const f of widths) {
    fillRR(ctx, x, yy, w * f, h, h / 2, color);
    yy += h + gap;
  }
  return yy;
};
const dots = (ctx, x, y, r, colors) => colors.forEach((c, i) => {
  ctx.beginPath();
  ctx.arc(x + i * r * 3.2, y, r, 0, Math.PI * 2);
  ctx.fillStyle = c;
  ctx.fill();
});
const hexA = (h, a) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// ---------------------------------------------------------------- the four generic UIs (static chrome)
const CHROME = {
  chat(ctx, W, H, c, P) {
    const u = W / 100;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    // title bar
    ctx.fillStyle = '#F3F2EF';
    ctx.fillRect(0, 0, W, 6.2 * u);
    dots(ctx, 3.2 * u, 3.1 * u, 0.9 * u, ['#D9D6D0', '#D9D6D0', '#D9D6D0']);
    text(ctx, c.app || 'Assistant', W / 2, 3.9 * u, {size: 2.2 * u, weight: 600, color: '#55534E', align: 'center'});
    // sidebar
    const sw = 25 * u;
    ctx.fillStyle = '#F7F6F3';
    ctx.fillRect(0, 6.2 * u, sw, H);
    ctx.fillStyle = '#E8E6E1';
    ctx.fillRect(sw, 6.2 * u, 0.25 * u, H);
    fillRR(ctx, 2 * u, 9 * u, sw - 4 * u, 6 * u, 1.5 * u, '#FFFFFF');
    strokeRR(ctx, 2 * u, 9 * u, sw - 4 * u, 6 * u, 1.5 * u, '#E4E1DB', 0.25 * u);
    text(ctx, '+  New chat', 4 * u, 12.9 * u, {size: 2.2 * u, weight: 600, color: '#2A2925'});
    text(ctx, 'RECENT', 3 * u, 21 * u, {size: 1.5 * u, weight: 600, color: '#9A978F', track: 0.25 * u});
    const items = c.history || ['Weekly sync', 'Pitch outline', 'Q3 launch', 'Hiring plan', 'Bug triage'];
    items.forEach((s, i) => {
      const y = 24 * u + i * 5.4 * u;
      if (i === (c.activeIndex ?? 2)) fillRR(ctx, 1.5 * u, y - 1.2 * u, sw - 3 * u, 4.8 * u, 1.2 * u, hexA(P.accent, 0.12));
      text(ctx, s, 3.4 * u, y + 2.2 * u, {size: 2.1 * u, weight: i === (c.activeIndex ?? 2) ? 600 : 500, color: i === (c.activeIndex ?? 2) ? P.accent : '#4A4844'});
    });
    // profile chip
    fillRR(ctx, 2 * u, H - 9 * u, 5 * u, 5 * u, 2.5 * u, '#E4E1DB');
    text(ctx, c.user || 'You', 8.6 * u, H - 5.6 * u, {size: 2.1 * u, weight: 600, color: '#3A3935'});
    // header of the conversation
    text(ctx, c.thread || 'Q3 launch', sw + 4 * u, 12.6 * u, {size: 2.8 * u, weight: 700, color: '#1D1C19'});
    fillRR(ctx, W - 21 * u, 9.4 * u, 17 * u, 4.4 * u, 2.2 * u, '#F3F2EF');
    text(ctx, c.model || 'Auto  ▾', W - 12.5 * u, 12.4 * u, {size: 1.9 * u, weight: 600, color: '#5E5B55', align: 'center'});
    ctx.fillStyle = '#EFEDE9';
    ctx.fillRect(sw, 16.5 * u, W - sw, 0.2 * u);
    // composer
    const iy = H - 15 * u;
    fillRR(ctx, sw + 3 * u, iy, W - sw - 6 * u, 10 * u, 2.6 * u, '#FFFFFF');
    strokeRR(ctx, sw + 3 * u, iy, W - sw - 6 * u, 10 * u, 2.6 * u, '#E1DED8', 0.3 * u);
    text(ctx, c.placeholder || 'Ask anything…', sw + 6 * u, iy + 6.1 * u, {size: 2.3 * u, weight: 500, color: '#A7A49D'});
    ctx.beginPath();
    ctx.arc(W - 9.5 * u, iy + 5 * u, 3 * u, 0, Math.PI * 2);
    ctx.fillStyle = P.accent;
    ctx.fill();
    text(ctx, '↑', W - 9.5 * u, iy + 6.2 * u, {size: 3.2 * u, weight: 700, color: '#fff', align: 'center'});
  },

  doc(ctx, W, H, c, P) {
    const u = W / 100;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    // tab strip + address bar
    ctx.fillStyle = '#EFEEEA';
    ctx.fillRect(0, 0, W, 11 * u);
    dots(ctx, 3.2 * u, 3.2 * u, 0.9 * u, ['#D6D3CC', '#D6D3CC', '#D6D3CC']);
    fillRR(ctx, 12 * u, 1 * u, 30 * u, 4.6 * u, 1.2 * u, '#FFFFFF');
    text(ctx, c.tab || 'Q3 launch — notes', 14.5 * u, 4.1 * u, {size: 1.8 * u, weight: 600, color: '#2E2D29'});
    text(ctx, 'Roadmap', 47 * u, 4.1 * u, {size: 1.8 * u, weight: 500, color: '#8C8981'});
    fillRR(ctx, 3 * u, 6.2 * u, W - 6 * u, 4 * u, 2 * u, '#FFFFFF');
    text(ctx, '🔒', 5 * u, 9.1 * u, {size: 1.8 * u, color: '#8C8981'});
    text(ctx, c.url || 'notes.example/team/q3-launch', 8.2 * u, 9.1 * u, {size: 1.9 * u, weight: 500, color: '#4B4944'});
    // left outline
    const nx = 4 * u;
    text(ctx, 'ON THIS PAGE', nx, 18 * u, {size: 1.5 * u, weight: 600, color: '#A19E96', track: 0.25 * u});
    (c.outline || ['Goals', 'Audience', 'Story', 'Assets', 'Timeline']).forEach((s, i) => {
      if (i === 0) fillRR(ctx, nx - 1 * u, 20.4 * u, 0.5 * u, 3.4 * u, 0.25 * u, P.accent);
      text(ctx, s, nx + 0.8 * u, 23 * u + i * 4.6 * u, {size: 2 * u, weight: i === 0 ? 600 : 500, color: i === 0 ? '#1F1E1B' : '#77746D'});
    });
    // main column
    const mx = 26 * u;
    const mw = W - mx - 5 * u;
    text(ctx, (c.kicker || 'NOTES · Q3').toUpperCase(), mx, 19 * u, {size: 1.7 * u, weight: 700, color: P.accent, track: 0.3 * u});
    const tl = wrapLines(ctx, c.title || 'Launch notes', mw, `800 ${6 * u}px ${SANS}`);
    tl.forEach((s, i) => text(ctx, s, mx, 26 * u + i * 6.4 * u, {size: 6 * u, weight: 800, color: '#141310', track: -0.15 * u}));
    let y = 26 * u + tl.length * 6.4 * u + 1 * u;
    fillRR(ctx, mx, y - 1.6 * u, 3.4 * u, 3.4 * u, 1.7 * u, '#D8D4CC');
    text(ctx, c.byline || 'Edited by the team · 4 min read', mx + 4.6 * u, y + 0.8 * u, {size: 1.8 * u, weight: 500, color: '#8A877F'});
    y += 6 * u;
    const body = wrapLines(ctx, c.body || '', mw, `400 ${2.25 * u}px ${SANS}`);
    body.forEach((s, i) => text(ctx, s, mx, y + i * 3.5 * u, {size: 2.25 * u, weight: 400, color: '#3C3A35'}));
    y += body.length * 3.5 * u + 2 * u;
    (c.bullets || []).forEach((s, i) => {
      ctx.beginPath();
      ctx.arc(mx + 0.8 * u, y + i * 3.6 * u - 0.75 * u, 0.5 * u, 0, Math.PI * 2);
      ctx.fillStyle = P.accent;
      ctx.fill();
      text(ctx, s, mx + 2.6 * u, y + i * 3.6 * u, {size: 2.15 * u, weight: 500, color: '#2D2B27'});
    });
    y += (c.bullets || []).length * 3.6 * u + 2 * u;
    // the attachment slot: the 3D file card sits flush here until the page breaks
    c.__slotY = y;
    // chart under it
    const cy = H - 26 * u;
    text(ctx, 'Sign-ups by week', mx, cy, {size: 2 * u, weight: 700, color: '#1F1E1B'});
    const vals = [0.32, 0.4, 0.38, 0.55, 0.5, 0.68, 0.74, 0.9];
    vals.forEach((v, i) => {
      const bw = (mw / vals.length) * 0.62;
      const bx = mx + i * (mw / vals.length);
      const bh = v * 14 * u;
      fillRR(ctx, bx, cy + 18 * u - bh, bw, bh, 0.6 * u, i === vals.length - 1 ? P.accent : '#DCD8D0');
    });
    ctx.fillStyle = '#E7E4DE';
    ctx.fillRect(mx, cy + 18.2 * u, mw, 0.2 * u);
  },

  terminal(ctx, W, H, c, P) {
    const u = W / 100;
    ctx.fillStyle = '#121419';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1B1E24';
    ctx.fillRect(0, 0, W, 7 * u);
    dots(ctx, 3.4 * u, 3.5 * u, 1 * u, ['#3A3F48', '#3A3F48', '#3A3F48']);
    text(ctx, c.title || '~/launch — zsh — 96×28', W / 2, 4.4 * u, {size: 2.2 * u, weight: 500, color: '#8C93A0', align: 'center', font: MONO});
    (c.history || []).forEach((s, i) => text(ctx, s, 3.5 * u, 13 * u + i * 4 * u, {size: 2.5 * u, weight: 400, color: '#4B5260', font: MONO}));
  },

  editor(ctx, W, H, c, P) {
    const u = W / 100;
    ctx.fillStyle = '#17191E';
    ctx.fillRect(0, 0, W, H);
    // top bar
    ctx.fillStyle = '#1F2228';
    ctx.fillRect(0, 0, W, 7 * u);
    dots(ctx, 2.4 * u, 3.5 * u, 0.75 * u, ['#3A3F48', '#3A3F48', '#3A3F48']);
    text(ctx, c.project || 'launch-q3.film', 10 * u, 4.4 * u, {size: 1.9 * u, weight: 600, color: '#C9CED8'});
    ['Edit', 'Color', 'Audio', 'Deliver'].forEach((s, i) => text(ctx, s, 38 * u + i * 7 * u, 4.4 * u, {size: 1.7 * u, weight: i ? 500 : 700, color: i ? '#7F8796' : '#E8ECF2', align: 'center'}));
    fillRR(ctx, W - 13 * u, 1.6 * u, 11 * u, 3.8 * u, 1 * u, P.accent);
    text(ctx, 'Export', W - 7.5 * u, 4.2 * u, {size: 1.8 * u, weight: 700, color: '#fff', align: 'center'});
    // media bin (left)
    const bx = 1.5 * u;
    text(ctx, 'MEDIA', bx + 0.5 * u, 11 * u, {size: 1.3 * u, weight: 700, color: '#6E7685', track: 0.25 * u});
    const tones = [['#2B3A67', '#5C7CFA'], ['#3B2B52', '#B07CFA'], ['#24443F', '#4FD1B5'], ['#4A3424', '#F7A35C'], ['#2D2F36', '#8A93A6'], ['#40263A', '#F06EA9']];
    tones.forEach(([a, b], i) => {
      const x = bx + (i % 2) * 11 * u;
      const y = 13 * u + Math.floor(i / 2) * 9.5 * u;
      const gr = ctx.createLinearGradient(x, y, x + 10 * u, y + 6 * u);
      gr.addColorStop(0, a);
      gr.addColorStop(1, b);
      fillRR(ctx, x, y, 10 * u, 6 * u, 0.7 * u, gr);
      bars(ctx, x, y + 6.8 * u, 10 * u, 0.7 * u, '#3A3F4A', [0.8], 0);
    });
    // inspector (right)
    const ix = 77 * u;
    text(ctx, 'INSPECTOR', ix, 11 * u, {size: 1.3 * u, weight: 700, color: '#6E7685', track: 0.25 * u});
    ['Scale', 'Position', 'Opacity', 'Speed', 'Volume'].forEach((s, i) => {
      const y = 15.5 * u + i * 6 * u;
      text(ctx, s, ix, y, {size: 1.6 * u, weight: 500, color: '#AEB5C2'});
      fillRR(ctx, ix, y + 1.4 * u, 20 * u, 0.6 * u, 0.3 * u, '#2B2F37');
      fillRR(ctx, ix, y + 1.4 * u, 20 * u * (0.35 + 0.1 * i), 0.6 * u, 0.3 * u, '#5A6272');
      ctx.beginPath();
      ctx.arc(ix + 20 * u * (0.35 + 0.1 * i), y + 1.7 * u, 1 * u, 0, Math.PI * 2);
      ctx.fillStyle = '#D5DAE3';
      ctx.fill();
    });
    // viewer frame (the overlay draws inside it)
    const r = c.__viewer;
    fillRR(ctx, r.x * W - 0.5 * u, r.y * H - 0.5 * u, r.w * W + 1 * u, r.h * H + 1 * u, 0.8 * u, '#0C0D10');
    // transport under the viewer
    const ty = (r.y + r.h) * H + 3.2 * u;
    text(ctx, '⏮   ▶   ⏭', (r.x + r.w / 2) * W, ty, {size: 2 * u, weight: 500, color: '#AEB5C2', align: 'center'});
    text(ctx, '00:00:00:00', r.x * W, ty, {size: 1.6 * u, weight: 500, color: '#7F8796', font: MONO});
    text(ctx, c.fpsLabel || '1080×1920 · 30p', (r.x + r.w) * W, ty, {size: 1.5 * u, weight: 500, color: '#7F8796', align: 'right'});
    // timeline frame
    const T = c.__timeline;
    ctx.fillStyle = '#121418';
    ctx.fillRect(0, T.y * H - 1.2 * u, W, H);
    ctx.fillStyle = '#262A31';
    ctx.fillRect(0, T.y * H - 1.2 * u, W, 0.25 * u);
  },
};

// Default overlay rectangles per kind ([x, y, w, h] as fractions of the screen, top-left origin).
const OVERLAYS = {
  chat: {thread: [0.255, 0.175, 0.725, 0.63]},
  doc: {crack: [0, 0, 1, 1]},
  terminal: {log: [0.03, 0.09, 0.94, 0.88]},
  editor: {viewer: [0.25, 0.1, 0.5, 0.47], timeline: [0, 0.655, 1, 0.345]},
};

// ---------------------------------------------------------------- live overlays
function drawProgress(ctx, W, H, u, prog, v) {
  // render progress, then the file: big enough to read on a phone, it is the proof the film exists
  const bh = 15 * u;
  fillRR(ctx, 0, H - bh, W, bh, 0, 'rgba(8,9,12,0.66)');
  const base = H - bh / 2 + 2.2 * u;
  if (prog < 1) {
    text(ctx, `Rendering ${String(Math.floor(prog * 100)).padStart(2, ' ')}%`, 3 * u, base, {size: 6.2 * u, weight: 700, color: '#fff', font: MONO});
    fillRR(ctx, W * 0.56, H - bh / 2 - 1.2 * u, W * 0.4, 2.4 * u, 1.2 * u, 'rgba(255,255,255,0.25)');
    fillRR(ctx, W * 0.56, H - bh / 2 - 1.2 * u, W * 0.4 * prog, 2.4 * u, 1.2 * u, '#FFFFFF');
  } else {
    // the file name shrinks to fit beside the duration (long names never collide)
    const name = `✓ ${v.file || 'launch.mp4'}`;
    ctx.font = `800 ${6.6 * u}px ${MONO}`;
    const fs = 6.6 * u * Math.min(1, (W * 0.74) / ctx.measureText(name).width);
    text(ctx, name, 3 * u, base, {size: fs, weight: 800, color: '#7DF0B4', font: MONO});
    text(ctx, v.length || '0:15', W - 3 * u, base, {size: 6 * u, weight: 700, color: '#fff', font: MONO, align: 'right'});
  }
}

/** Timeline geometry (overlay pixels); slot = where the dropped file docks (fractions of the overlay). */
export function timelineLayout(o) {
  const {W, H} = o;
  const u = W / 100;
  const v = H / 100;
  const hx = 9 * u;
  const tw = W - hx - 1 * u;
  const top = 18 * v;
  const th = (H - top - 2 * v) / 3;
  const lane = (i) => top + i * th + th * 0.08;
  const ch = th * 0.8;
  // the drop slot sits mid-timeline (where the camera can frame the landing), on V1
  const slot = o.capture ? {x: 0.35, y: 0.12, w: 0.3, h: 0.76} : {x: (hx + 0.37 * tw) / W, y: lane(1) / H, w: (0.26 * tw) / W, h: ch / H};
  return {u, v, hx, tw, top, th, lane, ch, slot};
}
function typed(s, t, at, cps) {
  if (t < at) return '';
  return s.slice(0, Math.floor((t - at) * cps));
}

const DRAW = {
  // The conversation: the question types into a bubble, then the character's reply.
  thread(o, t, k) {
    const {ctx, W, H} = o;
    const c = k.content;
    const P = k.palette;
    const u = W / 100;
    const q = c.question;
    const qs = typed(q.text, t, q.at, q.cps ?? 26);
    const rp = c.reply;
    const rs = rp ? typed(rp.text, t, rp.at, rp.cps ?? 30) : '';
    const typingDots = rp && t > (rp.typingAt ?? rp.at - 0.5) && t < rp.at;
    const caret = qs.length < q.text.length && t >= q.at;
    const key = `${qs.length}|${rs.length}|${typingDots ? Math.floor(t * 6) % 3 : -1}|${caret ? Math.floor(t * 3) % 2 : 2}`;
    if (key === o.key) return false;
    o.key = key;
    ctx.clearRect(0, 0, W, H);
    // earlier turns, dimmed: there is a real history above the question
    const hist = c.historyTurns || [];
    let y = 4 * u;
    for (const h of hist) {
      const left = h.who !== 'user';
      const lines = wrapLines(ctx, h.text, W * 0.6, `500 ${3.1 * u}px ${SANS}`);
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 6 * u;
      const bh = lines.length * 4.6 * u + 4 * u;
      const x = left ? 11 * u : W - bw - 2 * u;
      fillRR(ctx, x, y, bw, bh, 3 * u, left ? '#F3F2EF' : hexA(P.accent, 0.14));
      lines.forEach((l, i) => text(ctx, l, x + 3 * u, y + 5.4 * u + i * 4.6 * u, {size: 3.1 * u, weight: 500, color: left ? '#4A4843' : '#3D4FA8'}));
      y += bh + 3.5 * u;
    }
    // the question: big, right-aligned, accent
    if (t >= q.at - 0.15) {
      const fs = 5.6 * u;
      const lines = wrapLines(ctx, q.text, W * 0.74, `600 ${fs}px ${SANS}`);
      const shown = [];
      let left = qs.length;
      for (const l of lines) {
        // one continuous character count across the wrapped lines (never a negative slice)
        const n = Math.max(0, Math.min(left, l.length));
        shown.push(l.slice(0, n));
        left -= n + 1;
      }
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 8 * u;
      const bh = lines.length * fs * 1.22 + 6 * u;
      const pop = ease.pop(span(t, q.at - 0.15, q.at + 0.15));
      const x = W - bw - 2 * u;
      ctx.save();
      ctx.globalAlpha = clamp(pop * 1.5);
      ctx.translate(x + bw, y + bh);
      ctx.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop);
      ctx.translate(-(x + bw), -(y + bh));
      fillRR(ctx, x, y, bw, bh, 4 * u, P.accent);
      shown.forEach((l, i) => text(ctx, l, x + 4 * u, y + 3 * u + fs * 0.95 + i * fs * 1.22, {size: fs, weight: 600, color: '#FFFFFF', track: -0.05 * u}));
      if (caret && Math.floor(t * 3) % 2 === 0) {
        let li = 0;
        shown.forEach((l, i) => l.length && (li = i));
        ctx.font = `600 ${fs}px ${SANS}`;
        const cx = x + 4 * u + ctx.measureText(shown[li]).width + 0.6 * u;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx, y + 3 * u + li * fs * 1.22 + fs * 0.12, 0.5 * u, fs * 0.98);
      }
      ctx.restore();
      text(ctx, 'You · now', W - 3 * u, y + bh + 3.6 * u, {size: 2 * u, weight: 500, color: '#A29F98', align: 'right'});
      y += bh + 7 * u;
    }
    // the reply, from the character: avatar is the sprite itself
    if (typingDots || rs.length) {
      const px = 0.42 * u;
      fillRR(ctx, 0.5 * u, y, 8 * u, 8 * u, 2.4 * u, '#F3F2EF');
      drawSprite(ctx, k.mascot, 0.5 * u + (8 * u - k.mascot.grid[0].length * px) / 2, y + (8 * u - k.mascot.grid.length * px) / 2, px);
      const fs = 4.4 * u;
      if (typingDots) {
        fillRR(ctx, 11 * u, y, 16 * u, 8 * u, 4 * u, '#F3F2EF');
        for (let i = 0; i < 3; i++) {
          const on = Math.floor(t * 6) % 3 === i;
          ctx.beginPath();
          ctx.arc(15 * u + i * 4 * u, y + 4 * u, (on ? 1.1 : 0.8) * u, 0, Math.PI * 2);
          ctx.fillStyle = on ? '#6F6C66' : '#B4B1AA';
          ctx.fill();
        }
      } else {
        const lines = wrapLines(ctx, rp.text, W * 0.7, `600 ${fs}px ${SANS}`);
        const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 7 * u;
        const bh = lines.length * fs * 1.22 + 5 * u;
        fillRR(ctx, 11 * u, y, bw, bh, 4 * u, '#F3F2EF');
        let left = rs.length;
        lines.forEach((l, i) => {
          const n = Math.max(0, Math.min(left, l.length));
          left -= n + 1;
          text(ctx, l.slice(0, n), 14.5 * u, y + 2.5 * u + fs * 0.95 + i * fs * 1.22, {size: fs, weight: 600, color: '#1E1D1A'});
        });
      }
    }
    return true;
  },

  // A terminal: lines type in at their times; a block caret blinks on the newest line.
  log(o, t, k) {
    const {ctx, W, H} = o;
    const u = W / 100;
    const lines = k.content.lines || [];
    const shown = lines.map((l) => typed(l.text, t, l.at, l.cps ?? 60));
    const key = shown.map((s) => s.length).join(',') + (Math.floor(t * 2.5) % 2);
    if (key === o.key) return false;
    o.key = key;
    ctx.clearRect(0, 0, W, H);
    const lh = 6.4 * u;
    const y0 = (k.content.history?.length || 0) * 4.2 * u * (100 / 94) + 6 * u;
    let last = -1;
    shown.forEach((s, i) => {
      if (!s.length && t < lines[i].at) return;
      last = i;
      const col = lines[i].color === 'ok' ? '#5BE0A0' : lines[i].color === 'dim' ? '#6B7383' : lines[i].color === 'accent' ? k.palette.accentLight || '#8EA2FF' : '#E6E9EF';
      text(ctx, s, 1.5 * u, y0 + i * lh, {size: 3.7 * u, weight: lines[i].color === 'ok' ? 500 : 400, color: col, font: MONO});
    });
    if (last >= 0 && Math.floor(t * 2.5) % 2 === 0) {
      ctx.font = `400 ${3.7 * u}px ${MONO}`;
      const cx = 1.5 * u + ctx.measureText(shown[last]).width + 0.6 * u;
      ctx.fillStyle = '#E6E9EF';
      ctx.fillRect(cx, y0 + last * lh - 3.1 * u, 2 * u, 3.9 * u);
    }
    return true;
  },

  // The editor's viewer: the film the character just made, playing (the result is shown, not described).
  viewer(o, t, k) {
    const {ctx, W, H} = o;
    const u = W / 100;
    const P = k.palette;
    const cu = k.cues;
    const v = k.content.viewer || {};
    const playing = cu.play !== undefined && t >= cu.play;
    const key = playing ? `p${Math.round(t * 30)}` : cu.dock !== undefined && t >= cu.dock ? 'd' : `w${Math.floor(t * 2) % 2}`;
    if (key === o.key) return false;
    o.key = key;
    ctx.clearRect(0, 0, W, H);
    if (!playing) {
      ctx.fillStyle = '#0C0D10';
      ctx.fillRect(0, 0, W, H);
      ctx.setLineDash([2 * u, 1.5 * u]);
      strokeRR(ctx, W * 0.2, H * 0.3, W * 0.6, H * 0.4, 2 * u, '#3C424E', 0.5 * u);
      ctx.setLineDash([]);
      text(ctx, v.empty || 'Drop notes to start', W / 2, H * 0.52, {size: 4 * u, weight: 600, color: '#6B7383', align: 'center'});
      return true;
    }
    const lt = t - cu.play;
    const prog = clamp((t - cu.play) / Math.max(0.1, (cu.done ?? cu.play + 2) - cu.play));
    if (o.frames?.length) {
      // the real result, playing: an image sequence from film.json, cover-fit
      const seq = v.sequence;
      const n = Math.floor(lt * (seq.fps ?? 24));
      const im = o.frames[seq.loop === false ? Math.min(n, o.frames.length - 1) : n % o.frames.length];
      const sc = Math.max(W / im.width, H / im.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(im, (W - im.width * sc) / 2, (H - im.height * sc) / 2, im.width * sc, im.height * sc);
      drawProgress(ctx, W, H, u, prog, v);
      return true;
    }
    // the made film cuts between shots built from the notes, so the result visibly plays
    const shotLen = v.shotLength ?? 0.65;
    const shot = Math.floor(lt / shotLen) % 4;
    const st = lt - Math.floor(lt / shotLen) * shotLen;
    if (shot === 1 || shot === 2) {
      ctx.fillStyle = shot === 1 ? '#101218' : '#F4F2EE';
      ctx.fillRect(0, 0, W, H);
      if (shot === 1) {
        const vals = v.bars || [0.32, 0.4, 0.38, 0.55, 0.5, 0.68, 0.74, 0.9];
        vals.forEach((b, i) => {
          const g = ease.enter(clamp((st - i * 0.03) / 0.35));
          const bw = (W * 0.8) / vals.length;
          fillRR(ctx, W * 0.1 + i * bw + bw * 0.15, H * 0.8 - b * H * 0.55 * g, bw * 0.7, b * H * 0.55 * g, 1 * u, i === vals.length - 1 ? P.accent : '#3A3F4C');
        });
        text(ctx, v.barsTitle || 'Sign-ups by week', W * 0.1, H * 0.16, {size: 5.5 * u, weight: 700, color: '#fff'});
      } else {
        const lines = v.lines || ['One feature.', 'One promise.'];
        lines.forEach((l, i) => {
          const g = ease.enter(clamp((st - i * 0.12) / 0.3));
          ctx.save();
          ctx.globalAlpha = g;
          text(ctx, l, W * 0.08, H * (0.38 + i * 0.2) + (1 - g) * 4 * u, {size: 10 * u, weight: 800, color: '#15161A', track: -0.3 * u});
          ctx.restore();
        });
      }
      drawProgress(ctx, W, H, u, prog, v);
      return true;
    }
    // background: the accent, moving
    const gr = ctx.createLinearGradient(0, 0, W, H);
    gr.addColorStop(0, P.accent);
    gr.addColorStop(1, v.second || '#9A5CFF');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 0.23 + lt * 0.12) % 1.3 - 0.15) * W;
      ctx.beginPath();
      ctx.arc(x, H * (0.2 + 0.13 * i), W * (0.07 + 0.02 * (i % 3)), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
    }
    // the character, in the film it made, hopping across
    const px = 1.35 * u;
    const sw = k.mascot.grid[0].length * px;
    const hop = Math.abs(Math.sin(lt * 5.2)) * H * 0.12;
    const sx = W * 0.5 - sw / 2 + Math.sin(lt * 1.3) * W * 0.18;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(sx + sw / 2, H * 0.74, sw * 0.42 * (1 - hop / H), H * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSprite(ctx, {...k.mascot, colors: {...k.mascot.colors, body: '#FFFFFF', limb: '#E8ECFF'}}, sx, H * 0.74 - k.mascot.grid.length * px - hop, px, {blink: Math.floor(lt * 1.7) % 5 === 4});
    // the title from the notes
    const a = ease.enter(span(lt, 0.2, 0.7));
    ctx.save();
    ctx.globalAlpha = a;
    text(ctx, v.title || 'Q3 LAUNCH', W / 2, H * 0.22 + (1 - a) * 3 * u, {size: 9 * u, weight: 800, color: '#FFFFFF', align: 'center', track: -0.2 * u});
    text(ctx, v.subtitle || 'from 12 notes', W / 2, H * 0.31, {size: 3.6 * u, weight: 600, color: 'rgba(255,255,255,0.85)', align: 'center'});
    ctx.restore();
    drawProgress(ctx, W, H, u, prog, v);
    return true;
  },

  // The timeline: a lit drop slot until the clip docks; then clips cascade in and the playhead runs.
  timeline(o, t, k) {
    const {ctx, W, H} = o;
    const u = W / 100;
    const P = k.palette;
    const cu = k.cues;
    const L = timelineLayout(o);
    const docked = cu.dock !== undefined && t >= cu.dock;
    const clips = k.content.clips || [];
    const nIn = docked ? clips.filter((c, i) => t >= cu.dock + 0.14 + i * 0.09).length : 0;
    const ph = cu.play !== undefined && t >= cu.play ? (t - cu.play) * 0.085 : 0;
    const key = `${docked}|${nIn}|${Math.round(ph * 400)}|${docked ? Math.round(clamp((t - cu.dock) / 0.4) * 20) : Math.floor(t * 3) % 2}`;
    if (key === o.key) return false;
    o.key = key;
    ctx.clearRect(0, 0, W, H);
    if (o.capture) {
      // over a real app's own timeline: only the drop slot, the docked clip and a playhead are added
      const S = {x: 0.35, y: 0.12, w: 0.3, h: 0.76};
      if (!docked) {
        const on = Math.floor(t * 3) % 2 === 0;
        ctx.setLineDash([1.2 * u, 0.8 * u]);
        fillRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 0.8 * u, hexA(P.accent, on ? 0.22 : 0.12));
        strokeRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 0.8 * u, P.accent, 0.35 * u);
        ctx.setLineDash([]);
      } else {
        const f = 1 - clamp((t - cu.dock) / 0.4);
        fillRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 0.8 * u, P.accent);
        if (f > 0) fillRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 0.8 * u, `rgba(255,255,255,${0.75 * f})`);
        text(ctx, k.card?.name || 'notes.md', S.x * W + 1.2 * u, S.y * H + S.h * H * 0.66, {size: S.h * H * 0.42, weight: 700, color: '#fff'});
      }
      const px = W * clamp(0.02 + ph);
      ctx.fillStyle = '#FF5D5D';
      ctx.fillRect(px - 0.12 * u, 0, 0.24 * u, H);
      return true;
    }
    // ruler
    for (let i = 0; i <= 60; i++) {
      const x = L.hx + (i / 60) * L.tw;
      ctx.fillStyle = '#3A3F49';
      ctx.fillRect(x, L.v * 2, Math.max(1, 0.12 * u), i % 5 ? L.v * 4 : L.v * 7);
      if (i % 10 === 0) text(ctx, `00:${String(i / 4).padStart(2, '0')}`, x + 0.5 * u, L.v * 13, {size: L.v * 5.5, weight: 500, color: '#6E7685', font: MONO});
    }
    ['V2', 'V1', 'A1'].forEach((s, i) => {
      const y = L.top + i * L.th;
      ctx.fillStyle = i % 2 ? '#1A1D22' : '#16181D';
      ctx.fillRect(0, y, W, L.th - L.v * 0.8);
      fillRR(ctx, 0.8 * u, y + L.th * 0.2, 6 * u, L.th * 0.5, 0.8 * u, '#252931');
      text(ctx, s, 3.8 * u, y + L.th * 0.56, {size: L.th * 0.26, weight: 700, color: '#8C93A1', align: 'center'});
    });
    const S = L.slot;
    if (!docked) {
      const on = Math.floor(t * 3) % 2 === 0;
      ctx.setLineDash([1.4 * u, 1 * u]);
      fillRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 1 * u, hexA(P.accent, on ? 0.2 : 0.1));
      strokeRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 1 * u, on ? P.accent : hexA(P.accent, 0.6), 0.45 * u);
      ctx.setLineDash([]);
      text(ctx, 'drop here', S.x * W + S.w * W / 2, S.y * H + S.h * H * 0.62, {size: S.h * H * 0.36, weight: 600, color: hexA(P.accent, 0.9), align: 'center'});
    } else {
      const f = 1 - clamp((t - cu.dock) / 0.4);
      clips.slice(0, nIn).forEach((c) => {
        const x = L.hx + c.from * L.tw;
        const w = (c.to - c.from) * L.tw - 0.4 * u;
        const y = L.lane(c.track);
        fillRR(ctx, x, y, w, L.ch, 1 * u, c.color || '#3A4A7A');
        if (c.track === 2) {
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          for (let j = 0; j < w / (0.8 * u); j++) {
            const a = 0.2 + 0.8 * Math.abs(Math.sin(j * 0.7) * Math.sin(j * 0.23 + c.from * 9));
            ctx.fillRect(x + j * 0.8 * u, y + L.ch / 2 - a * L.ch * 0.35, 0.4 * u, a * L.ch * 0.7);
          }
        } else text(ctx, c.name, x + 1.5 * u, y + L.ch * 0.64, {size: L.ch * 0.38, weight: 600, color: 'rgba(255,255,255,0.92)'});
      });
      fillRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 1 * u, P.accent);
      if (f > 0) fillRR(ctx, S.x * W, S.y * H, S.w * W, S.h * H, 1 * u, `rgba(255,255,255,${0.75 * f})`);
      text(ctx, k.card?.name || 'notes.md', S.x * W + 1.5 * u, S.y * H + S.h * H * 0.72, {size: S.h * H * 0.62, weight: 800, color: '#fff'});
    }
    const px = L.hx + clamp(0.03 + ph) * L.tw;
    ctx.fillStyle = '#FF5D5D';
    ctx.fillRect(px - 0.15 * u, 0, 0.3 * u, H);
    ctx.beginPath();
    ctx.moveTo(px - 1.2 * u, 0);
    ctx.lineTo(px + 1.2 * u, 0);
    ctx.lineTo(px, L.v * 6);
    ctx.fill();
    return true;
  },

  // Cracks spreading from the impact point just before the page breaks (drawn on the page's own face).
  crack(o, t, k) {
    const {ctx, W, H} = o;
    const s = k.cues?.smash;
    if (!s) return false;
    const g = clamp((t - (s.t - 0.16)) / 0.16);
    const key = `${Math.round(g * 24)}`;
    if (key === o.key) return false;
    o.key = key;
    ctx.clearRect(0, 0, W, H);
    if (g <= 0) return true;
    const cx = s.uv[0] * W;
    const cy = (1 - s.uv[1]) * H;
    const R = Math.min(W, H);
    // the dent: the page bows in around the impact
    const dent = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.32 * ease.enter(g));
    dent.addColorStop(0, `rgba(40,38,34,${0.38 * g})`);
    dent.addColorStop(0.5, `rgba(40,38,34,${0.12 * g})`);
    dent.addColorStop(1, 'rgba(40,38,34,0)');
    ctx.fillStyle = dent;
    ctx.fillRect(0, 0, W, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + Math.sin(i * 7.3) * 0.25;
      const len = (0.1 + 0.26 * Math.abs(Math.sin(i * 3.1))) * R * ease.enter(g);
      const pts = [[cx, cy]];
      for (let j = 1; j <= 5; j++) pts.push([cx + Math.cos(a + Math.sin(i * 5 + j) * 0.2) * (len * j) / 5, cy + Math.sin(a + Math.sin(i * 5 + j) * 0.2) * (len * j) / 5]);
      for (let j = 1; j < pts.length; j++) {
        const w = R * 0.006 * (1 - j / pts.length) + R * 0.0015;
        // lit lip, then the dark crease beside it: reads as a fold in the surface, not a pen line
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = w * 1.8;
        ctx.beginPath();
        ctx.moveTo(pts[j - 1][0] - w * 0.6, pts[j - 1][1] - w * 0.6);
        ctx.lineTo(pts[j][0] - w * 0.6, pts[j][1] - w * 0.6);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(70,66,60,0.6)';
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(pts[j - 1][0], pts[j - 1][1]);
        ctx.lineTo(pts[j][0], pts[j][1]);
        ctx.stroke();
      }
    }
    // a ring fracture around the dent
    ctx.strokeStyle = `rgba(28,27,25,${0.7 * g})`;
    ctx.lineWidth = R * 0.004;
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      const r = R * 0.09 * ease.enter(g) * (1 + 0.12 * Math.sin(a * 5 + 1));
      k ? ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : ctx.moveTo(cx + r, cy);
    }
    ctx.stroke();
    return true;
  },
};

// ---------------------------------------------------------------- geometry
function roundedRectShape(w, h, r, cy = 0) {
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = cy - h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h);
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

/** The outline of the slab as a convex polygon (page-local x, y): used to clip shards to the window's shape. */
export function slabOutline(w, h, r, n = 6) {
  const pts = [];
  const corners = [[w / 2 - r, h - r, 0], [-w / 2 + r, h - r, Math.PI / 2], [-w / 2 + r, r, Math.PI], [w / 2 - r, r, Math.PI * 1.5]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI / 2);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function canvasTex(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export async function createPanels(film, scene, opts = {}) {
  const P = film.palette;
  const list = [];
  const byId = {};
  for (const spec of film.panels) {
    const [w, h] = spec.size;
    const kind = spec.kind;
    const light = !['terminal', 'editor'].includes(kind) || spec.light;
    const bez = spec.bezel ?? 0.045;
    const bt = 0.03;
    const D = spec.depth ?? 0.09;
    const r = spec.radius ?? 0.12;
    const sw = w - 2 * bez;
    const sh = h - 2 * bez;
    const group = new THREE.Group();
    group.rotation.order = 'YXZ';
    group.position.set(spec.pos[0], spec.pos[1] ?? 0, spec.pos[2]);
    group.rotation.y = ((spec.yaw ?? 0) * Math.PI) / 180;
    group.rotation.x = (-(spec.tilt ?? 0) * Math.PI) / 180;
    scene.add(group);

    // slab: extruded rounded rectangle with a bevel
    const shape = roundedRectShape(w - 2 * bt, h - 2 * bt, Math.max(0.01, r - bt), h / 2);
    const slabGeo = new THREE.ExtrudeGeometry(shape, {depth: D, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 4, curveSegments: 12});
    slabGeo.translate(0, 0, bt);
    const slabMat = new THREE.MeshPhysicalMaterial({color: new THREE.Color(spec.frame || (light ? '#F7F6F3' : '#23262D')), roughness: light ? 0.38 : 0.32, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2});
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);
    const frontZ = D + 2 * bt;

    // screen: base canvas (capture or drawn chrome)
    const cw = Math.min(2048, Math.round(sw * PPU));
    const chh = Math.min(2048, Math.round(sh * PPU * (cw / (sw * PPU))));
    const base = document.createElement('canvas');
    base.width = cw;
    base.height = chh;
    const bctx = base.getContext('2d');
    const ov = {...(OVERLAYS[kind] || {}), ...(spec.overlays || {})};
    const content = {...(film.content?.[spec.id] || {}), ...(spec.content || {})};
    const rect = (a) => ({x: a[0], y: a[1], w: a[2], h: a[3]});
    if (spec.capture) {
      const im = await loadImage(spec.capture);
      // cover-fit, anchored where the film.json says (default: top-left, where app chrome lives)
      const s = Math.max(cw / im.width, chh / im.height) * (spec.captureZoom ?? 1);
      const [ax, ay] = spec.captureAnchor || [0, 0];
      const dw = im.width * s, dh = im.height * s;
      bctx.fillStyle = '#fff';
      bctx.fillRect(0, 0, cw, chh);
      bctx.drawImage(im, (cw - dw) * ax, (chh - dh) * ay, dw, dh);
      // a capture's own UI already shows its chrome; only overlays named in film.json (or the role's) are added
    } else {
      if (kind === 'editor') {
        content.__viewer = rect(ov.viewer);
        content.__timeline = rect(ov.timeline);
      }
      (CHROME[kind] || CHROME.doc)(bctx, cw, chh, content, P);
    }
    const baseTex = canvasTex(base);
    const screenGeo = new THREE.ShapeGeometry(roundedRectShape(sw, sh, Math.max(0.01, r - bez), h / 2), 12);
    const uv = screenGeo.attributes.uv;
    const pos = screenGeo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + sw / 2) / sw, (pos.getY(i) - (h / 2 - sh / 2)) / sh);
    const screenMat = new THREE.MeshStandardMaterial({color: 0x000000, emissive: 0xffffff, emissiveMap: baseTex, emissiveIntensity: spec.glow ?? 1.22, roughness: 0.24, metalness: 0, toneMapped: false});
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.z = frontZ + 0.002;
    screen.receiveShadow = true;
    group.add(screen);

    // overlays
    const overlays = {};
    let zi = 0;
    for (const [name, a] of Object.entries(ov)) {
      if (!DRAW[name]) continue;
      if (spec.capture && !(spec.overlays && spec.overlays[name]) && !['crack', 'viewer', 'timeline'].includes(name)) continue;
      const rc = rect(a);
      const oc = document.createElement('canvas');
      oc.width = Math.max(8, Math.round(rc.w * cw));
      oc.height = Math.max(8, Math.round(rc.h * chh));
      const tex = canvasTex(oc);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(rc.w * sw, rc.h * sh), new THREE.MeshBasicMaterial({map: tex, transparent: true, toneMapped: false, depthWrite: false}));
      m.position.set(-sw / 2 + (rc.x + rc.w / 2) * sw, h / 2 + sh / 2 - (rc.y + rc.h / 2) * sh, frontZ + 0.004 + 0.001 * zi++);
      m.renderOrder = 2;
      group.add(m);
      overlays[name] = {name, mesh: m, canvas: oc, ctx: oc.getContext('2d'), tex, W: oc.width, H: oc.height, rect: rc, key: null, capture: !!spec.capture};
      if (name === 'viewer' && content.viewer?.sequence) overlays[name].frames = await Promise.all(sequenceFiles(content.viewer.sequence).map(loadImage));
    }

    const panel = {
      id: spec.id, kind, spec, group, slab, screen, overlays, w, h, sw, sh, bez, frontZ, base, baseTex, content, light, radius: r,
      /** World point of a screen location (u from left, v from bottom, 0..1), dz in front of the face. */
      at(u, v, dz = 0) {
        group.updateMatrixWorld(true);
        return new THREE.Vector3(-sw / 2 + u * sw, h / 2 - sh / 2 + v * sh, frontZ + dz).applyMatrix4(group.matrixWorld);
      },
      normal() {
        group.updateMatrixWorld(true);
        return new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld);
      },
      quaternion() {
        group.updateMatrixWorld(true);
        return new THREE.Quaternion().setFromRotationMatrix(group.matrixWorld);
      },
    };
    list.push(panel);
    byId[spec.id] = panel;
  }

  function update(t, k) {
    for (const p of list) {
      for (const o of Object.values(p.overlays)) {
        const changed = DRAW[o.name](o, t, {...k, content: p.content, palette: P});
        if (changed) o.tex.needsUpdate = true;
      }
    }
  }
  return {list, byId, update};
}

/** The file card: a thick card with an icon, a name and a few lines of its contents. */
export function createCard(film, spec) {
  const P = film.palette;
  const [w, h] = spec.size || [1.3, 0.8];
  const cw = 1024;
  const ch = Math.round((cw * h) / w);
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext('2d');
  const u = cw / 100;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, cw, ch);
  // icon: a page with a folded corner
  const ix = 6 * u, iy = 8 * u, iw = 18 * u, ih = 24 * u;
  ctx.fillStyle = P.accent;
  ctx.beginPath();
  ctx.moveTo(ix, iy);
  ctx.lineTo(ix + iw - 6 * u, iy);
  ctx.lineTo(ix + iw, iy + 6 * u);
  ctx.lineTo(ix + iw, iy + ih);
  ctx.lineTo(ix, iy + ih);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(ix + iw - 6 * u, iy);
  ctx.lineTo(ix + iw - 6 * u, iy + 6 * u);
  ctx.lineTo(ix + iw, iy + 6 * u);
  ctx.closePath();
  ctx.fill();
  text(ctx, spec.ext || 'MD', ix + iw / 2, iy + ih - 5 * u, {size: 6 * u, weight: 800, color: '#fff', align: 'center'});
  text(ctx, spec.name || 'notes.md', 30 * u, 19 * u, {size: 11 * u, weight: 800, color: '#141310', track: -0.3 * u});
  text(ctx, spec.meta || '12 notes · 2.1 KB', 30 * u, 29 * u, {size: 5.4 * u, weight: 500, color: '#8A877F'});
  ctx.fillStyle = '#ECEAE5';
  ctx.fillRect(6 * u, 39 * u, cw - 12 * u, 0.4 * u);
  (spec.lines || ['# Q3 launch', '- one hero feature, one promise', '- 15 s vertical cut for socials']).forEach((s, i) =>
    text(ctx, s, 6 * u, 49 * u + i * 8.4 * u, {size: 5.2 * u, weight: i ? 500 : 700, color: i ? '#55524C' : '#1F1E1B', font: i ? SANS : MONO}));
  const tex = canvasTex(c);
  const bt = 0.012;
  const D = spec.depth ?? 0.035;
  const shape = roundedRectShape(w - 2 * bt, h - 2 * bt, 0.06, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {depth: D, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 3, curveSegments: 8});
  geo.translate(0, 0, -D / 2);
  const body = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({color: '#FBFAF8', roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.15}));
  body.castShadow = true;
  body.receiveShadow = true;
  const faceGeo = new THREE.ShapeGeometry(roundedRectShape(w - 0.03, h - 0.03, 0.05, 0), 8);
  const uv = faceGeo.attributes.uv;
  const pos = faceGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (w - 0.03) + 0.5, pos.getY(i) / (h - 0.03) + 0.5);
  const face = new THREE.Mesh(faceGeo, new THREE.MeshStandardMaterial({color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.2, roughness: 0.75, toneMapped: false}));
  face.position.z = D / 2 + bt + 0.002;
  const g = new THREE.Group();
  g.add(body, face);
  return {group: g, w, h, depth: D + 2 * bt};
}
