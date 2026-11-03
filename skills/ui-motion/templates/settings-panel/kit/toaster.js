// Toast stack. Polite live region, swipe to dismiss, pauses while you look at it.
//
//   const toaster = createToaster(document.querySelector('#toaster'));   // {side: 'right'} for a corner stack on desktop
//   const id = toaster.toast({title: 'Settings saved', description: 'Applied to this device.', tone: 'success'});
//   toaster.dismiss(id);
//
// Motion: a toast rises 20 px into place on the product spring while it fades in (240 ms); older toasts step
// back (up 10 px, 5% smaller each) on the same spring, at most three visible. Leaving is shorter than
// arriving: 130 ms fade, ease-in. Pointing at or focusing the stack fans it out and pauses every timer
// (so does touching it, or the tab being hidden). Drag sideways to dismiss: the toast follows the finger 1:1,
// and a release past 35% of its width or faster than 0.45 px/ms flings it out with the release velocity;
// otherwise it springs home. Reduced motion: no travel, fades only.
import {EASE, SPRING, SPRING_SOFT, T, onFrame, prop, reducedMotion, spring} from './motion.js';

const ICONS = {
  success: `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M6 10.3l2.6 2.6L14.2 7" fill="none" stroke="var(--mm-on-success, #08130d)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  info: `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M10 9v5M10 6.2v.1" fill="none" stroke="#0b0b0d" stroke-width="2" stroke-linecap="round"/></svg>`,
  error: `<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="currentColor"/><path d="M10 5.5v5.5M10 14v.1" fill="none" stroke="#0b0b0d" stroke-width="2" stroke-linecap="round"/></svg>`,
};
const CLOSE = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

export function createToaster(region, {duration = T.toast, max = 3, gap = 10, peek = 10, side = 'center', dismissLabel = 'Dismiss notification'} = {}) {
  region.classList.add('mm-toaster');
  if (side === 'right') region.classList.add('mm-toaster--right');
  region.innerHTML = '<ol class="mm-toaster__list" aria-live="polite" aria-relevant="additions"></ol>';
  const list = region.querySelector('ol');
  const items = [];
  let seq = 0;
  let hovered = false;
  let focused = false;
  let touching = 0;
  let expanded = false;

  const paused = () => hovered || focused || touching > 0 || document.hidden;
  const live = () => items.filter((t) => !t.leaving).sort((a, b) => b.id - a.id);

  function relayout() {
    const rm = reducedMotion();
    const open = expanded || hovered || focused;
    let acc = 0;
    live().forEach((t, i) => {
      let y, s, o;
      if (open) {
        y = -acc;
        acc += t.h + gap;
        s = 1;
        o = 1;
      } else {
        y = -i * peek;
        s = 1 - i * 0.05;
        o = i < max ? 1 : 0;
      }
      t.el.style.zIndex = String(100 - i);
      t.el.toggleAttribute('inert', i >= max && !open);
      if (rm) {
        t.y.set(y);
        t.s.set(s);
      } else {
        t.y.to(y);
        t.s.to(s);
      }
      if (!t.dragging) t.o.to(o, T.enter, EASE.enter);
    });
  }

  function remove(t) {
    const i = items.indexOf(t);
    if (i !== -1) items.splice(i, 1);
    t.el.remove();
    if (!items.length) expanded = false;
  }

  function dismiss(id, {fling = 0} = {}) {
    const t = items.find((x) => x.id === id && !x.leaving);
    if (!t) return;
    t.leaving = true;
    t.el.setAttribute('aria-hidden', 'true');
    const rm = reducedMotion();
    if (fling && !rm) {
      t.x.to(Math.sign(fling) * (t.el.offsetWidth + 48), {velocity: fling, response: 0.3});
      t.o.to(0, 170, EASE.linear).then(() => remove(t));
    } else {
      if (!rm) {
        t.y.to(t.y.value + 8);
        t.s.to(t.s.value * 0.97);
      }
      t.o.to(0, T.exit, EASE.exit).then(() => remove(t));
    }
    relayout();
  }

  function toast({title, description = '', tone = 'success', action = null} = {}) {
    const id = ++seq;
    const el = document.createElement('li');
    el.className = `mm-toast mm-toast--${tone}`;
    el.tabIndex = 0;
    el.innerHTML = `<span class="mm-toast__icon">${ICONS[tone] || ICONS.info}</span><div class="mm-toast__body"><p class="mm-toast__title">${esc(title)}</p>${description ? `<p class="mm-toast__desc">${esc(description)}</p>` : ''}</div>${action ? `<button type="button" class="mm-toast__action">${esc(action.label)}</button>` : ''}<button type="button" class="mm-toast__close" aria-label="${esc(dismissLabel)}">${CLOSE}</button>`;
    list.appendChild(el);
    const st = {x: 0, y: 0, s: 1, o: 0};
    const paint = () => {
      el.style.transform = `translate3d(${st.x.toFixed(2)}px,${st.y.toFixed(2)}px,0) scale(${st.s.toFixed(4)})`;
      el.style.opacity = st.o.toFixed(3);
    };
    const t = {
      id, el, h: el.offsetHeight, left: duration, leaving: false, dragging: false,
      x: spring(0, {...SPRING_SOFT, precision: 0.05, onUpdate: (v) => { st.x = v; paint(); }}),
      y: spring(0, {...SPRING, precision: 0.05, onUpdate: (v) => { st.y = v; paint(); }}),
      s: spring(1, {...SPRING_SOFT, onUpdate: (v) => { st.s = v; paint(); }}),
      o: prop(0, (v) => { st.o = v; paint(); }),
    };
    items.push(t);
    if (!reducedMotion()) {
      t.y.set(20);
      t.s.set(0.98);
    }
    el.querySelector('.mm-toast__close').addEventListener('click', () => dismiss(id));
    if (action) el.querySelector('.mm-toast__action').addEventListener('click', () => { action.onClick?.(); dismiss(id); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(id); });
    swipe(t);
    relayout();
    tick();
    return id;
  }

  // ---- swipe to dismiss ----
  const allowed = () => (side === 'right' && innerWidth >= 720 ? 1 : 0); // 1: rightward only (corner stack), 0: either way
  function swipe(t) {
    let d = null;
    t.el.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || t.leaving || e.target.closest('button')) return;
      d = {id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), v: 0, axis: null};
      touching++;
      try { t.el.setPointerCapture(e.pointerId); } catch {}
      addEventListener('pointermove', move);
      addEventListener('pointerup', up);
      addEventListener('pointercancel', up);
    });
    const move = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (!d.axis && Math.hypot(dx, dy) > 4) d.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (d.axis !== 'x') return;
      const now = performance.now();
      const inst = (e.clientX - d.lx) / Math.max(1, now - d.lt);
      d.v = d.v * 0.4 + inst * 0.6;
      d.lx = e.clientX;
      d.lt = now;
      t.dragging = true;
      // the wrong direction is allowed a little, with resistance
      const wrong = allowed() === 1 && dx < 0;
      const x = wrong ? -12 * (1 - Math.exp(dx / 40)) : dx;
      t.x.set(x);
      t.o.set(1 - Math.min(1, Math.abs(x) / (t.el.offsetWidth * 0.9)) * 0.65);
    };
    const up = (e) => {
      if (!d || (e && e.pointerId !== d.id)) return;
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      removeEventListener('pointercancel', up);
      touching = Math.max(0, touching - 1);
      const dx = t.x.value;
      const v = d.v;
      const wasX = d.axis === 'x';
      d = null;
      t.dragging = false;
      if (!wasX) return;
      const w = t.el.offsetWidth;
      const dir = allowed() === 1 ? 1 : Math.sign(dx || v);
      const far = dx * dir > w * 0.35;
      const fast = v * dir > 0.45;
      if ((far || fast) && Math.sign(dx || v) === dir) dismiss(t.id, {fling: (v ? v * 1000 : 0) || dir * 900});
      else {
        t.x.to(0, {velocity: v * 1000});
        t.o.to(1, T.feedback, EASE.enter);
      }
    };
  }

  // ---- timers: one loop while any toast is up ----
  let ticking = false;
  function tick() {
    if (ticking) return;
    ticking = true;
    onFrame((dt) => {
      if (!paused()) for (const t of live()) if ((t.left -= dt * 1000) <= 0) dismiss(t.id);
      if (!items.length) return (ticking = false);
      return true;
    });
  }

  region.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { hovered = true; relayout(); } });
  region.addEventListener('pointerleave', () => { if (hovered) { hovered = false; relayout(); } });
  region.addEventListener('focusin', () => { focused = true; relayout(); });
  region.addEventListener('focusout', (e) => { if (!region.contains(e.relatedTarget)) { focused = false; relayout(); } });
  // touch has no hover: a tap on a stacked toast fans the stack out, a tap elsewhere folds it
  list.addEventListener('click', (e) => { if (!e.target.closest('button') && live().length > 1) { expanded = !expanded; relayout(); } });
  document.addEventListener('pointerdown', (e) => { if (expanded && !region.contains(e.target)) { expanded = false; relayout(); } });

  return {toast, dismiss, get count() { return live().length; }, get items() { return live().map((t) => ({id: t.id, el: t.el})); }};
}
