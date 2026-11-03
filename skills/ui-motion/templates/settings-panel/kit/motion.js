// The motion core of the kit: one shared frame loop, one spring, a tween, three easings, reduced motion.
// No dependencies. Every component in ./ imports from here, so the whole interface is one material.
//
//   const s = spring(0, {response: 0.24, damping: 1, onUpdate: (v) => el.style.transform = `translateX(${v}px)`});
//   s.to(20);                 // animate; calling again mid-flight retargets from the current value and velocity
//   s.to(0, {velocity: 900}); // hand over a throw velocity (units per second)
//   s.set(0);                 // jump, no animation
//
//   const p = prop(1, (v) => el.style.opacity = v);
//   p.to(0, T.exit, EASE.exit); // a tween that always starts from where the value is now

// ---- timing tokens: the only place durations live (ms; springs in seconds of response) ----
export const T = {
  press: 80,      // press acknowledgement
  feedback: 140,  // colour / opacity feedback
  enter: 240,     // small element arrives
  exit: 100,      // the same element leaves (about 45% shorter, ease-in)
  swap: 160,      // label or text swap, incoming half
  labelOut: 70,   // a label leaving (state swaps in buttons and status text)
  overlap: 70,    // the incoming label starts as the outgoing one finishes: never two labels on one surface
  showAfter: 300, // loading indicator waits this long before it appears (no spinner flash)
  minShown: 400,  // and once visible stays at least this long
  successHold: 1400,
  toast: 4000,    // toast lifetime when nobody is looking at it
};

// One spring for the product. response = period in seconds; damping 1 = critically damped (no overshoot).
export const SPRING = {response: 0.24, damping: 1};
export const SPRING_SOFT = {response: 0.34, damping: 1}; // larger moves: toast stack, slider jumps
export const SPRING_DRAG = {response: 0.07, damping: 1}; // follows a finger; reads as 1:1 but never steps

// ---- easings ----
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (sx(t) - x) / d;
    }
    t = Math.min(1, Math.max(0, t));
    return sy(t);
  };
}
export const EASE = {
  enter: bezier(0.16, 1, 0.3, 1), // arrivals
  move: bezier(0.76, 0, 0.24, 1), // repositions
  exit: bezier(0.7, 0, 0.84, 0),  // departures
  linear: (x) => x,
};

// ---- reduced motion: read live, so a system change applies without a reload ----
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
export const reducedMotion = () => !!(mq && mq.matches);

// ---- one frame loop for everything ----
const subs = new Set();
let raf = 0;
let last = 0;
function frame(now) {
  let dt = (now - last) / 1000;
  if (!(dt > 0)) dt = 1 / 60;
  dt = Math.min(dt, 1 / 20); // a dropped frame or a background tab never makes a spring jump
  last = now;
  for (const fn of [...subs]) if (fn(dt, now) === false) subs.delete(fn);
  raf = subs.size ? requestAnimationFrame(frame) : 0;
}
export function onFrame(fn) {
  subs.add(fn);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return () => subs.delete(fn);
}

// ---- spring: interruptible by construction (it only ever has a target, a value and a velocity) ----
export function spring(initial, {response = SPRING.response, damping = SPRING.damping, precision = 0.001, onUpdate, onRest} = {}) {
  let x = initial;
  let v = 0;
  let target = initial;
  let resp = response;
  let damp = damping;
  let running = false;
  const step = (dt) => {
    const w = (2 * Math.PI) / resp;
    const k = w * w;
    const c = 2 * damp * w;
    let left = dt;
    while (left > 1e-9) {
      const h = Math.min(1 / 240, left);
      v += (-k * (x - target) - c * v) * h;
      x += v * h;
      left -= h;
    }
    if (Math.abs(x - target) < precision && Math.abs(v) < precision * 10) {
      x = target;
      v = 0;
      running = false;
      onUpdate?.(x, v);
      onRest?.(x);
      return false;
    }
    onUpdate?.(x, v);
    return true;
  };
  return {
    get value() { return x; },
    get velocity() { return v; },
    get target() { return target; },
    get moving() { return running; },
    to(t, o = {}) {
      target = t;
      if (o.response) resp = o.response;
      if (o.damping) damp = o.damping;
      if (o.velocity != null) v = o.velocity;
      if (!running && (x !== target || v !== 0)) {
        running = true;
        onFrame(step);
      }
      return this;
    },
    set(val) {
      x = target = val;
      v = 0;
      onUpdate?.(x, v);
      return this;
    },
  };
}

// ---- prop: a value with a tween that always starts from where it is (so it can be reversed mid-way) ----
export function prop(initial, onUpdate) {
  let value = initial;
  let token = 0;
  onUpdate?.(value);
  return {
    get value() { return value; },
    set(v) {
      token++;
      value = v;
      onUpdate?.(value);
    },
    to(to, ms, ease = EASE.enter, delay = 0) {
      const id = ++token;
      const from = value;
      if (ms <= 0 || from === to) {
        value = to;
        onUpdate?.(value);
        return Promise.resolve(true);
      }
      return new Promise((resolve) => {
        let t = -delay / 1000;
        onFrame((dt) => {
          if (id !== token) return resolve(false), false;
          t += dt;
          if (t < 0) return true;
          const u = Math.min(1, t / (ms / 1000));
          value = from + (to - from) * ease(u);
          onUpdate?.(value);
          if (u >= 1) return resolve(true), false;
          return true;
        });
      });
    },
  };
}

// ---- press: the shared press acknowledgement (scale on a compositor layer, within one frame) ----
// Returns a spring 0..1; the caller maps it to its own transform.
export function pressable(el, onPress) {
  const p = spring(0, {response: 0.16, damping: 1, onUpdate: onPress});
  let down = false;
  const release = () => {
    if (!down) return;
    down = false;
    p.to(0, {response: 0.26});
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    down = true;
    p.to(1, {response: 0.1});
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, release);
  // keyboard activation gets the same acknowledgement
  el.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      down = true;
      p.to(1, {response: 0.16});
    }
  });
  el.addEventListener('keyup', release);
  el.addEventListener('blur', release);
  return {spring: p, flash() { p.to(1, {response: 0.12}); setTimeout(() => { down = true; release(); }, T.press); }};
}

// ---- input modality: focus rings for keyboard users, none after a click ----
export function trackInputModality(root = document.documentElement) {
  root.dataset.input = 'pointer';
  addEventListener('keydown', (e) => {
    if (!e.metaKey && !e.ctrlKey && !e.altKey) root.dataset.input = 'keyboard';
  }, true);
  addEventListener('pointerdown', () => { root.dataset.input = 'pointer'; }, true);
}
