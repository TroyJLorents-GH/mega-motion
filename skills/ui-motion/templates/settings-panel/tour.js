// The interface tour the web studio drives: window.__tour = [{label, hold}], window.__tourStep(i).
// Each step performs one real interaction the way a person would: pointer events on the real elements,
// keyboard events on the focused control. Nothing here calls component internals, so a passing check means
// the input path works. A faint touch marker shows where the "finger" is, for the recordings.
// Not needed in an app: delete this file and the installTour() call in main.js.
import {EASE, prop, spring} from './kit/motion.js';

let nextId = 20;
const kind = () => (innerWidth < 720 ? 'touch' : 'mouse');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function fire(el, type, x, y, id) {
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: id, pointerType: kind(),
    isPrimary: true, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
  }));
}

// ---- touch marker ----
const dot = document.createElement('div');
dot.className = 'tour-touch';
dot.setAttribute('aria-hidden', 'true');
document.body.appendChild(dot);
let mx = 0;
let my = 0;
let ms = 1;
const paint = () => { dot.style.transform = `translate3d(${mx.toFixed(1)}px,${my.toFixed(1)}px,0) scale(${ms.toFixed(3)})`; };
const mo = prop(0, (v) => { dot.style.opacity = v.toFixed(3); });
const msc = spring(1, {response: 0.18, onUpdate: (v) => { ms = v; paint(); }});
const marker = {
  at(x, y) { mx = x; my = y; paint(); },
  down() { mo.to(1, 90, EASE.enter); msc.to(0.82); },
  up() { msc.to(1); mo.to(0, 260, EASE.exit, 120); },
};

const center = (el, fx = 0.5, fy = 0.5) => {
  const r = el.getBoundingClientRect();
  return [r.left + r.width * fx, r.top + r.height * fy];
};

// A tap: down, a short hold, up, click (and focus, as a real click on a button gives).
function tap(el, {fx = 0.5, fy = 0.5, hold = 90} = {}) {
  const [x, y] = center(el, fx, fy);
  const id = nextId++;
  marker.at(x, y);
  marker.down();
  fire(el, 'pointerdown', x, y, id);
  el.focus?.({preventScroll: true});
  setTimeout(() => {
    fire(el, 'pointerup', x, y, id);
    el.click();
    marker.up();
  }, hold);
}

// A drag from (x0, y) to (x1, y) over ms, eased like a hand (accelerate, then settle onto the target).
let dragToken = 0;
async function drag(el, x0, x1, y, ms, ease = EASE.move) {
  const token = ++dragToken;
  const id = nextId++;
  marker.at(x0, y);
  marker.down();
  fire(el, 'pointerdown', x0, y, id);
  await wait(40);
  const t0 = performance.now();
  for (;;) {
    await new Promise((r) => requestAnimationFrame(r));
    if (token !== dragToken) return fire(el, 'pointercancel', x0, y, id);
    const u = Math.min(1, (performance.now() - t0) / ms);
    const x = x0 + (x1 - x0) * ease(u);
    marker.at(x, y);
    fire(el, 'pointermove', x, y, id);
    if (u >= 1) break;
  }
  await wait(40);
  fire(el, 'pointerup', x1, y, id);
  marker.up();
}

function key(el, k) {
  document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true})); // keyboard modality, as Tab would set it
  el.focus({preventScroll: true});
  el.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true, cancelable: true}));
  setTimeout(() => {
    el.dispatchEvent(new KeyboardEvent('keyup', {key: k, bubbles: true}));
    if (el.tagName === 'BUTTON' && (k === ' ' || k === 'Enter')) el.click(); // what the browser does for a real key
  }, 90);
}

export function installTour({toggles, slider, save, toaster}) {
  const knob = () => slider.el.querySelector('.mm-slider__thumb');
  const xFor = (v) => {
    const r = slider.el.getBoundingClientRect();
    const k = knob().offsetWidth;
    return r.left + k / 2 + ((v - 0) / 100) * (r.width - k);
  };
  const steps = [
    {label: 'tap: Notifications off', hold: 900, run: () => tap(toggles[0].el)},
    {label: 'keyboard: Space on Open at login', hold: 1000, run: () => key(toggles[1].el, ' ')},
    {label: 'tap: Automatic updates on', hold: 900, run: () => tap(toggles[2].el)},
    {label: 'tap: Analytics off', hold: 900, run: () => tap(toggles[3].el)},
    {label: 'double tap: Analytics reverses mid-slide', hold: 1000, run: () => { tap(toggles[3].el, {hold: 60}); setTimeout(() => tap(toggles[3].el, {hold: 60}), 45); }},
    {label: 'drag: Alert volume to 30%', hold: 1200, run: () => {
      const [, y] = center(slider.el);
      drag(slider.el, xFor(slider.value), xFor(30), y, 340);
    }},
    {label: 'tap track: Alert volume jumps to 82%', hold: 1000, run: () => {
      const r = slider.el.getBoundingClientRect();
      const x = xFor(82);
      tap(slider.el, {fx: (x - r.left) / r.width, hold: 110});
    }},
    {label: 'tap: Save changes', hold: 480, run: () => tap(save.el)},
    {label: 'tap: Save again while saving (ignored)', hold: 2100, run: () => tap(save.el)},
    {label: 'swipe: dismiss the toast', hold: 1300, run: async () => {
      // like a person, wait for the toast to be there (up to 1.5 s) before swiping it
      for (let i = 0; i < 90 && !toaster.items[0]; i++) await new Promise((r) => requestAnimationFrame(r));
      const t = toaster.items[0];
      if (!t) return;
      const r = t.el.getBoundingClientRect();
      const y = r.top + r.height / 2;
      drag(t.el, r.left + 24, r.left + 24 + Math.min(220, r.width * 0.6), y, 200, EASE.linear);
    }},
  ];
  window.__tour = steps.map(({label, hold}) => ({label, hold}));
  window.__tourStep = (i) => { steps[i]?.run(); }; // returns nothing: the studio never waits on a step
}
