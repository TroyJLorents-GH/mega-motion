// Interface motion that is not scroll-driven: rolling button letters and the menu.
import {gsap} from 'gsap';

// Buttons: each letter is two stacked copies in a one-line window; on hover or focus they roll up one line,
// per character (UI.roll, UI.rollStagger, the roll curve; all in CSS so it is cheap and interruptible).
// The readable text stays in a visually hidden span for screen readers.
export function rollButtons(els) {
  for (const el of els) {
    const text = el.textContent.trim();
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = text;
    const roll = document.createElement('span');
    roll.className = 'roll';
    roll.setAttribute('aria-hidden', 'true');
    [...text].forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = 'roll-ch';
      c.style.setProperty('--i', i);
      const a = document.createElement('span');
      a.textContent = ch === ' ' ? ' ' : ch;
      c.append(a, a.cloneNode(true));
      roll.append(c);
    });
    el.append(sr, roll);
  }
}

// The menu: a dark panel drops from the top with a convex curved bottom edge, then its links line-reveal.
// Escape and a click outside close it; focus is trapped while it is open and returns to the button.
export function createMenu({btn, menu, U, rm, labels, onOpen, onClose}) {
  const panel = menu.querySelector('.menu-panel');
  const scrim = menu.querySelector('.menu-scrim');
  const curve = menu.querySelector('.menu-curve');
  const path = curve.querySelector('path');
  const lines = [...menu.querySelectorAll('.ml-in')];
  const label = btn.querySelector('.menu-btn-label');
  const inertEls = [...document.querySelectorAll('main, footer, .skip')];
  const bulge = {b: U.menuRestBulge};
  const draw = () => path.setAttribute('d', `M0 0 H100 Q50 ${(bulge.b * 200).toFixed(2)} 0 0 Z`);
  draw();
  let open = false;
  let tl = null;

  const focusables = () => [btn, ...menu.querySelectorAll('a[href], button:not([disabled])')];
  function setOpenState(v) {
    open = v;
    btn.setAttribute('aria-expanded', String(v));
    label.textContent = v ? labels.close : labels.open;
    document.documentElement.classList.toggle('menu-open', v);
    for (const el of inertEls) el.inert = v;
  }

  function show() {
    if (open) return;
    setOpenState(true);
    menu.hidden = false;
    onOpen?.();
    tl?.kill();
    if (rm) {
      gsap.set([panel, scrim], {clearProps: 'transform,opacity'});
      gsap.set(lines, {yPercent: 0});
      tl = gsap.fromTo(menu, {opacity: 0}, {opacity: 1, duration: 0.2, ease: 'none'});
    } else {
      const lift = () => -(panel.offsetHeight + curve.offsetHeight + 4);
      gsap.set(menu, {opacity: 1});
      tl = gsap.timeline()
        .fromTo(scrim, {opacity: 0}, {opacity: 1, duration: U.menuDrop, ease: 'none'}, 0)
        .fromTo(panel, {y: lift}, {y: 0, duration: U.menuDrop, ease: U.menuEase}, 0)
        .fromTo(bulge, {b: 1}, {b: U.menuRestBulge, duration: U.menuCurve, ease: 'power3.out', onUpdate: draw}, 0)
        .fromTo(lines, {yPercent: 112}, {yPercent: 0, duration: U.menuLinks, ease: 'power3.out', stagger: U.menuLinkStagger}, U.menuDrop * 0.55);
    }
    requestAnimationFrame(() => menu.querySelector('.menu-link')?.focus({preventScroll: true}));
  }

  function hide({focus = true, instant = false} = {}) {
    if (!open) return;
    setOpenState(false);
    tl?.kill();
    const done = () => {
      menu.hidden = true;
      onClose?.();
    };
    if (instant) done();
    else if (rm) tl = gsap.to(menu, {opacity: 0, duration: 0.2, ease: 'none', onComplete: done});
    else {
      tl = gsap.timeline({onComplete: done})
        .to(lines, {yPercent: -112, duration: 0.2, ease: 'power2.in', stagger: 0.02}, 0)
        .to(panel, {y: () => -(panel.offsetHeight + curve.offsetHeight + 4), duration: U.menuClose, ease: 'power3.in'}, 0.06)
        .to(bulge, {b: 0.6, duration: U.menuClose, ease: 'power2.in', onUpdate: draw}, 0.06)
        .to(scrim, {opacity: 0, duration: U.menuClose, ease: 'none'}, 0.06);
    }
    if (focus) btn.focus({preventScroll: true});
  }

  btn.addEventListener('click', () => (open ? hide() : show()));
  scrim.addEventListener('click', () => hide());
  menu.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    // Same-page anchors close the menu and scroll; page links are covered by the brand threshold.
    if (a && new URL(a.href, location.href).pathname === location.pathname) hide({focus: false});
  });
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
    } else if (e.key === 'Tab') {
      const f = focusables();
      const i = f.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === -1 || i === f.length - 1 ? 0 : i + 1);
      e.preventDefault();
      f[next].focus();
    }
  });
  return {hide, get open() {
    return open;
  }};
}
