// mega-motion studio kit: everything a composition needs to be a pure function of time.
// No clocks, timers or Math.random: every value below is computed from t, so any frame renders on its own.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
/** Progress of t through [a, b], clamped to 0..1. */
export const span = (t, a, b) => clamp((t - a) / (b - a));
export const mix = (from, to, u) => from + (to - from) * u;

// Cubic-bezier easing, solved by Newton steps (the CSS definition).
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    return sy(clamp(u));
  };
}

// The house easing set (shared/defaults.md): enter, move, exit, pop.
export const ease = {
  linear: (u) => u,
  enter: bezier(0.16, 1, 0.3, 1),
  move: bezier(0.76, 0, 0.24, 1),
  exit: bezier(0.7, 0, 0.84, 0),
  pop: bezier(0.34, 1.56, 0.64, 1),
  inOut: bezier(0.65, 0, 0.35, 1),
  smooth: (u) => u * u * u * (u * (u * 6 - 15) + 10),
};

/** Tween helper: value at t of a move from `from` to `to` between a and b with an easing. */
export const tween = (t, a, b, from, to, e = ease.enter) => mix(from, to, e(span(t, a, b)));

/**
 * Closed-form damped spring step response, 0 -> 1, starting at t0.
 * zeta: damping ratio (1 = no overshoot, 0.8 premium product, 0.5 playful). omega: stiffness in rad/s.
 */
export function spring(t, t0, {zeta = 0.8, omega = 14} = {}) {
  const x = t - t0;
  if (x <= 0) return 0;
  if (zeta >= 1) return 1 - (1 + omega * x) * Math.exp(-omega * x);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * x) * (Math.cos(wd * x) + ((zeta * omega) / wd) * Math.sin(wd * x));
}

/** Stack one spring per target change, so frame N never needs frames 0..N-1. keys: [[t, value], ...] */
export function springTrack(t, keys, opts) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t, keys[i][0], opts);
  return v;
}

// Seeded hash noise: smooth 1D value noise for drift, and a deterministic random for layouts.
const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};
export const rand = (seed, i = 0) => hash(seed * 1013 + i * 7.13);
export function noise(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 97), hash(i + 1 + seed * 97), u) * 2 - 1;
}

/** Estimated speed of a function of time, in units per second (for motion blur on fast moves). */
export const speed = (fn, t, dt = 1 / 120) => (fn(t + dt) - fn(t - dt)) / (2 * dt);

/** Largest font size (px) at which every line of `el` fits `maxWidth`, measured once at setup. */
export function fitFont(el, maxWidth, {min = 40, max = 600} = {}) {
  el.style.fontSize = '100px';
  el.style.whiteSpace = 'nowrap';
  // .line-inner is inline-block, so offsetWidth is the text's own width (and ignores preview scaling).
  const inners = [...el.querySelectorAll('.line-inner')];
  const w = Math.max(1, ...(inners.length ? inners : [el]).map((n) => n.offsetWidth));
  const size = clamp((100 * maxWidth) / w, min, max);
  el.style.fontSize = `${size}px`;
  return size;
}

/** Build masked lines: <div class="line"><div class="line-inner">text</div></div> per line. */
export function lines(parent, texts, cls = '') {
  const box = document.createElement('div');
  box.className = `lines ${cls}`;
  for (const text of texts) {
    const line = document.createElement('div');
    line.className = 'line';
    const inner = document.createElement('div');
    inner.className = 'line-inner';
    inner.textContent = text;
    line.appendChild(inner);
    box.appendChild(line);
  }
  parent.appendChild(box);
  return box;
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Boot a composition. setup(film) returns draw(t). Exposes window.seek(t) and window.__ready for the renderer;
 * without ?render it also plays live in the browser (space pause, arrows seek, r restart).
 */
export async function boot(setup) {
  const film = await (await fetch('film.json')).json();
  const root = document.documentElement;
  root.style.setProperty('--w', `${film.width}px`);
  root.style.setProperty('--h', `${film.height}px`);
  for (const [k, v] of Object.entries(film.palette || {})) root.style.setProperty(`--${k}`, v);
  await document.fonts.ready;
  const draw = await setup(film);
  let cur = 0;
  window.seek = (t) => {
    cur = t;
    draw(t);
  };
  window.FILM = film;
  window.seek(0);
  window.__ready = true;
  if (new URLSearchParams(location.search).has('render')) return;

  // Live preview: scale the stage to the window and loop in real time.
  const fit = () => {
    const s = Math.min(innerWidth / film.width, innerHeight / film.height);
    root.style.setProperty('--fit', s);
  };
  addEventListener('resize', fit);
  fit();
  let paused = false;
  let start = performance.now();
  const go = (t) => {
    cur = ((t % film.duration) + film.duration) % film.duration;
    start = performance.now() - cur * 1000;
  };
  addEventListener('keydown', (e) => {
    if (e.key === ' ') {
      paused = !paused;
      if (!paused) go(cur);
    } else if (e.key === 'ArrowRight') go(cur + 1);
    else if (e.key === 'ArrowLeft') go(cur - 1);
    else if (e.key === 'r') go(0);
    else return;
    e.preventDefault();
  });
  const loop = (now) => {
    if (!paused) cur = ((now - start) / 1000) % film.duration;
    draw(cur);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
