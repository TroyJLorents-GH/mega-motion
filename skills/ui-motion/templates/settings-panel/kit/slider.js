// Slider. A <div role="slider" tabindex="0"> with pointer, touch and keyboard input.
//
//   const s = createSlider(el, {min: 0, max: 100, step: 1, value: 64, format: (v) => `${v}%`,
//                               onDisplay: (v) => readout.textContent = `${v}%`,  // follows the knob
//                               onInput: (v) => markDirty(), onChange: (v) => save(v)});
//   s.value; s.set(30); s.set(30, {animate: false});
//
// Motion: grabbing the knob never jumps it (the grab offset is kept); while dragging it follows the finger on
// the finger 1:1 (a stiff spring only hands over if a track-tap glide is still in flight). Tapping the track or using the keyboard glides the
// knob on the product spring. Pulling past either end gives a little resistance (at most 6 px) and springs
// back on release. The fill is a clipped layer that translates, so only transforms change per frame.
// Reduced motion: the knob jumps to keyboard and tap targets; dragging still follows the finger.
import {SPRING_DRAG, SPRING_SOFT, reducedMotion, spring} from './motion.js';

const BAND_MAX = 6;

export function createSlider(el, {min = 0, max = 100, step = 1, value = min, format = (v) => String(v), onInput, onChange, onDisplay} = {}) {
  el.classList.add('mm-slider');
  el.setAttribute('role', 'slider');
  el.tabIndex = 0;
  el.setAttribute('aria-valuemin', min);
  el.setAttribute('aria-valuemax', max);
  el.innerHTML = `<span class="mm-slider__track" aria-hidden="true"><span class="mm-slider__fill"></span></span><span class="mm-slider__thumb" aria-hidden="true"><span class="mm-slider__halo"></span><span class="mm-slider__knob"></span></span>`;
  const fill = el.querySelector('.mm-slider__fill');
  const thumb = el.querySelector('.mm-slider__thumb');
  const knob = el.querySelector('.mm-slider__knob');

  const snap = (v) => Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));
  const frac = (v) => (v - min) / (max - min);
  let current = snap(value);
  let geo = null;
  const measure = () => {
    const r = el.getBoundingClientRect();
    geo = {left: r.left, w: r.width, k: thumb.offsetWidth};
  };
  let f = frac(current);
  let band = 0;
  let pressAmt = 0;
  const paint = () => {
    if (!geo) measure();
    const cx = geo.k / 2 + f * (geo.w - geo.k);
    thumb.style.transform = `translate3d(${(cx - geo.k / 2 + band).toFixed(2)}px,0,0)`;
    fill.style.transform = `translate3d(${(cx - geo.w).toFixed(2)}px,0,0)`;
    knob.style.transform = `scale(${(1 + 0.1 * pressAmt).toFixed(4)})`;
  };
  let shownValue = null;
  const pos = spring(f, {...SPRING_SOFT, precision: 0.0005, onUpdate: (v) => {
    f = v;
    paint();
    // a read-out driven from here stays with the knob as it glides (it never runs ahead of it)
    const d = snap(min + Math.min(1, Math.max(0, v)) * (max - min));
    if (d !== shownValue) onDisplay?.((shownValue = d));
  }});
  const bandS = spring(0, {...SPRING_SOFT, precision: 0.05, onUpdate: (v) => { band = v; paint(); }});
  const press = spring(0, {response: 0.16, damping: 1, onUpdate: (v) => { pressAmt = reducedMotion() ? 0 : v; paint(); }});

  const commit = (v, animate, response) => {
    const next = snap(v);
    const changed = next !== current;
    current = next;
    el.setAttribute('aria-valuenow', current);
    el.setAttribute('aria-valuetext', format(current));
    if (changed) onInput?.(current);
    if (animate === 'none') return changed; // the caller moves the knob itself (dragging)
    if (!animate || reducedMotion()) pos.set(frac(current));
    else pos.to(frac(current), {response});
    return changed;
  };

  // ---- pointer and touch ----
  let drag = null;
  const fromX = (x) => {
    const u = (x - geo.left - geo.k / 2) / (geo.w - geo.k);
    return {u: Math.min(1, Math.max(0, u)), over: u < 0 ? u * (geo.w - geo.k) : u > 1 ? (u - 1) * (geo.w - geo.k) : 0};
  };
  const onMove = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const {u, over} = fromX(e.clientX - drag.offset);
    const v = min + u * (max - min);
    // the knob follows the finger continuously; the value itself snaps to the step
    if (Math.abs(e.clientX - drag.x0) > 3) drag.moved = true;
    commit(v, 'none');
    // locked to the finger; only while a track-tap glide is still in flight does a stiff spring hand over
    if (reducedMotion() || !pos.moving) pos.set(u);
    else pos.to(u, SPRING_DRAG);
    const b = Math.sign(over) * BAND_MAX * (1 - Math.exp(-Math.abs(over) / 40));
    bandS.set(b);
  };
  const end = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const moved = drag.moved;
    drag = null;
    el.classList.remove('is-dragging');
    removeEventListener('pointermove', onMove);
    removeEventListener('pointerup', end);
    removeEventListener('pointercancel', end);
    press.to(0, {response: 0.26});
    bandS.to(0);
    // settle exactly on the stepped value; a plain tap leaves its glide alone (retargeting it would kink it)
    if (reducedMotion()) pos.set(frac(current));
    else if (moved) pos.to(frac(current), SPRING_DRAG);
    onChange?.(current);
  };
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || el.getAttribute('aria-disabled') === 'true') return;
    if (drag) end();
    measure();
    e.preventDefault();
    el.focus({preventScroll: true});
    try { el.setPointerCapture(e.pointerId); } catch {} // synthetic pointers cannot be captured; window listeners cover it
    const cx = geo.left + geo.k / 2 + f * (geo.w - geo.k);
    const onKnob = Math.abs(e.clientX - cx) <= geo.k * 0.75;
    drag = {id: e.pointerId, offset: onKnob ? e.clientX - cx : 0, x0: e.clientX, moved: false};
    el.classList.add('is-dragging');
    press.to(1, {response: 0.16});
    if (!onKnob) {
      const {u} = fromX(e.clientX);
      commit(min + u * (max - min), true, SPRING_SOFT.response); // a tap on the track glides there
    }
    addEventListener('pointermove', onMove);
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);
  });

  // ---- keyboard ----
  el.addEventListener('keydown', (e) => {
    const big = Math.max(step, (max - min) / 10);
    const keys = {ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big};
    let next = null;
    if (e.key in keys) next = current + keys[e.key] * (e.shiftKey ? 10 : 1);
    else if (e.key === 'Home') next = min;
    else if (e.key === 'End') next = max;
    if (next === null) return;
    e.preventDefault();
    if (commit(next, true, SPRING_SOFT.response)) onChange?.(current);
  });

  addEventListener('resize', () => { geo = null; paint(); });
  commit(current, false);
  paint();

  return {
    el,
    get value() { return current; },
    set(v, {animate = true} = {}) { commit(v, animate, SPRING_SOFT.response); },
    disable(off = true) { el.setAttribute('aria-disabled', String(off)); },
  };
}
