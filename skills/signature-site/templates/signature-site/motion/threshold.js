// The brand threshold: the one gesture this site repeats.
//   Intro       solid accent with the mark breathing; when the page is ready, a mark-shaped hole opens past the viewport.
//   Page change the mark slab grows from the click point until the screen is solid accent, holds while the next page
//               loads (at least holdMin, at most holdMax), navigates; the new page opens the mirrored hole.
// The overlay is an SVG the size of the viewport (user units = CSS px): an accent rect masked by the hole path, the
// slab path, and the badge (the mark drawn in the ground colour while the screen waits).
// Reduced motion: every threshold is a 200 ms fade of the same screen.
import {gsap} from 'gsap';

const lerp = (a, b, t) => a + (b - a) * t;
const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

export function createThreshold(root, {mark, rm, T}) {
  const hole = root.querySelector('.th-hole');
  const slab = root.querySelector('.th-slab');
  const badge = root.querySelector('.th-badge');
  const ground = root.querySelector('.th-ground');
  for (const p of [hole, slab, badge]) p.setAttribute('d', mark.path);
  const [MW, MH] = mark.viewBox;
  const s0 = () => mark.introHeight / MH;
  const html = document.documentElement;
  const breath = {b: 0};
  let idle = null;
  let anim = null;
  let covered = false;

  const show = (el, on) => (el.style.visibility = on ? 'visible' : 'hidden');
  const put = (el, x, y, s, ax, ay) => el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${s.toFixed(5)}) translate(${(-ax).toFixed(3)} ${(-ay).toFixed(3)})`);

  // How far the mark must grow to cover the screen: pick the solid core rectangle (mark.cores, in mark units)
  // that needs the least scale to contain the whole viewport, and grow around its centre.
  function plan() {
    const W = innerWidth;
    const H = innerHeight;
    let best = null;
    for (const [x, y, w, h] of mark.cores || []) {
      const s = Math.max(W / w, H / h) * 1.06;
      if (!best || s < best.s) best = {s, ax: x + w / 2, ay: y + h / 2};
    }
    return best || {s: (Math.hypot(W, H) / Math.min(MW, MH)) * 6, ax: MW / 2, ay: MH / 2};
  }

  const drawBadge = () => put(badge, innerWidth / 2, innerHeight / 2 - 2 * breath.b, s0() * (1 + T.idleBreath * breath.b), MW / 2, MH / 2);
  function startIdle() {
    show(badge, true);
    breath.b = 0;
    drawBadge();
    if (rm) return;
    idle?.kill();
    idle = gsap.to(breath, {b: 1, duration: T.idlePeriod, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: drawBadge});
  }
  const stopIdle = () => {
    idle?.kill();
    idle = null;
  };
  addEventListener('resize', () => covered && drawBadge());

  function on() {
    covered = true;
    root.classList.add('is-on');
    html.classList.add('th-covered');
  }
  function off() {
    covered = false;
    stopIdle();
    root.classList.remove('is-on');
    html.classList.remove('th-on', 'th-covered');
    root.style.opacity = '';
    for (const el of [hole, slab, badge]) show(el, false);
  }

  return {
    get covered() {
      return covered;
    },
    // Take over the first-paint cover (html.th-on): solid accent, the mark waiting in the middle.
    hold() {
      on();
      html.classList.remove('th-on');
      show(ground, true);
      show(hole, false);
      show(slab, false);
      startIdle();
    },
    // Open the mark-shaped hole until it is past the viewport, then remove the overlay.
    reveal(duration) {
      anim?.kill();
      stopIdle();
      return new Promise((resolve) => {
        if (!covered) return resolve();
        if (rm) {
          anim = gsap.to(root, {opacity: 0, duration: T.rmFade, ease: 'none', onComplete: () => (off(), resolve())});
          return;
        }
        const p = plan();
        const cx = innerWidth / 2;
        const cy = innerHeight / 2;
        const from = {s: s0() * (1 + T.idleBreath * breath.b), y: cy - 2 * breath.b};
        show(badge, false);
        show(slab, false);
        show(ground, true);
        show(hole, true);
        const st = {t: 0};
        const draw = () => put(hole, cx, lerp(from.y, cy, st.t), lerp(from.s, p.s, st.t), lerp(MW / 2, p.ax, st.t), lerp(MH / 2, p.ay, st.t));
        draw();
        anim = gsap.to(st, {t: 1, duration, ease: T.ease, onUpdate: draw, onComplete: () => (off(), resolve())});
      });
    },
    // Grow the mark slab from (x, y) until the screen is solid, then wait with the mark breathing.
    cover(x, y, duration) {
      anim?.kill();
      on();
      return new Promise((resolve) => {
        if (rm) {
          show(ground, true);
          show(hole, false);
          show(slab, false);
          startIdle();
          anim = gsap.fromTo(root, {opacity: 0}, {opacity: 1, duration: T.rmFade, ease: 'none', onComplete: resolve});
          return;
        }
        root.style.opacity = '';
        const p = plan();
        const cx = innerWidth / 2;
        const cy = innerHeight / 2;
        show(ground, false);
        show(hole, false);
        show(badge, false);
        show(slab, true);
        const st = {t: 0};
        const draw = () => put(slab, lerp(x, cx, st.t), lerp(y, cy, st.t), lerp(s0(), p.s, st.t), lerp(MW / 2, p.ax, st.t), lerp(MH / 2, p.ay, st.t));
        draw();
        anim = gsap.to(st, {t: 1, duration, ease: T.ease, onUpdate: draw, onComplete: () => {
          show(ground, true);
          show(slab, false);
          startIdle();
          resolve();
        }});
      });
    },
    forceOff: off,
  };
}

// Page changes: intercept same-origin page links, cover, hold for the real load (bounded), navigate.
// The next page reads the sessionStorage flag and plays the mirrored reveal. Back/forward and bfcache restores reveal
// too, and every covered state has a timeout, so the screen is never left solid.
export const ARRIVE_KEY = 'signature:arrive';

export function bindPageTransitions(th, {T, beforeLeave, afterReturn}) {
  const fetched = new Map();
  const prefetch = (href) => {
    if (!fetched.has(href)) fetched.set(href, fetch(href, {credentials: 'same-origin'}).then((r) => (r.ok ? r.text() : null)).catch(() => null));
    return fetched.get(href);
  };
  const target = (a, e) => {
    if (!a || !a.hasAttribute('href')) return null;
    if (e && (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return null;
    if ((a.target && a.target !== '_self') || a.hasAttribute('download') || a.dataset.noTransition != null) return null;
    let url;
    try {
      url = new URL(a.href, location.href);
    } catch {
      return null;
    }
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return null;
    if (!/(\.html?|\/)$/.test(url.pathname)) return null;
    if (url.pathname === location.pathname && url.search === location.search) return null; // same page: let hash links scroll
    return url;
  };
  const warm = (e) => {
    const url = target(e.target.closest?.('a'));
    if (url) prefetch(url.href);
  };
  document.addEventListener('pointerover', warm, {passive: true});
  document.addEventListener('focusin', warm);
  document.addEventListener('touchstart', warm, {passive: true});

  let busy = false;
  let failsafe = 0;
  document.addEventListener('click', async (e) => {
    const a = e.target.closest?.('a');
    const url = target(a, e);
    if (!url) return;
    e.preventDefault();
    if (busy) return;
    busy = true;
    let x = e.clientX;
    let y = e.clientY;
    if (!x && !y) {
      // Keyboard activation: grow from the link itself.
      const r = a.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
    beforeLeave?.();
    const page = prefetch(url.href);
    await th.cover(x, y, T.cover);
    await Promise.race([Promise.all([page, wait(T.holdMin)]), wait(T.holdMax)]);
    try {
      sessionStorage.setItem(ARRIVE_KEY, '1');
    } catch {}
    location.assign(url.href);
    clearTimeout(failsafe);
    failsafe = setTimeout(() => {
      // Navigation never happened (offline, blocked): give the page back.
      try {
        sessionStorage.removeItem(ARRIVE_KEY);
      } catch {}
      busy = false;
      th.reveal(T.reveal).then(() => afterReturn?.());
    }, T.navFailsafe * 1000);
  });

  // Restored from the back/forward cache while still covered: open it.
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    clearTimeout(failsafe);
    busy = false;
    try {
      sessionStorage.removeItem(ARRIVE_KEY);
    } catch {}
    if (th.covered) th.reveal(T.reveal).then(() => afterReturn?.());
    else afterReturn?.();
  });
}

// Was this load the end of a page change (or a history step)? Consumes the flag.
export function arrivedByTransition() {
  let flag = false;
  try {
    flag = sessionStorage.getItem(ARRIVE_KEY) === '1';
    sessionStorage.removeItem(ARRIVE_KEY);
  } catch {}
  const nav = performance.getEntriesByType('navigation')[0];
  return flag || nav?.type === 'back_forward';
}
