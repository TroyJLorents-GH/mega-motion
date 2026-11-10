// The highlight wipe: the brand threshold in miniature, on every heading, eyebrow and label marked [data-wipe].
// Each line (split by measured layout, re-split on resize) clips open left to right, then a block of brand colour
// over it retracts and leaves the words. data-wipe="ink" uses the text colour for the block instead of the accent.
//   live:     starts when the element's top reaches WIPE.start of the viewport, plays once, after the intro reveal
//   capture:  scrubbed by scroll over the same entry, so a scroll position is always one frame
//   reduced:  the final state, nothing moves
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger.js';

const SHUT = 'inset(-25% 100% -25% 0%)';
const OPEN = 'inset(-25% -4% -25% 0%)';

export function createWipes(els, {W, mode, afterReveal}) {
  let nextFree = 0;
  const recs = els.map((el) => ({el, text: el.textContent.replace(/\s+/g, ' ').trim(), played: false, tl: null, st: null}));

  function split(rec) {
    const {el, text} = rec;
    el.textContent = '';
    const words = text.split(' ').filter(Boolean).map((w, i, all) => {
      const s = document.createElement('span');
      s.textContent = w;
      el.append(s);
      if (i < all.length - 1) el.append(' ');
      return s;
    });
    const lines = [];
    let top = null;
    for (const s of words) {
      const t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 3) {
        lines.push([]);
        top = t;
      }
      lines[lines.length - 1].push(s.textContent);
    }
    el.textContent = '';
    return lines.map((ws) => {
      const line = document.createElement('span');
      line.className = 'wl';
      const inner = document.createElement('span');
      inner.className = 'wl-in';
      inner.textContent = ws.join(' ');
      let block = null;
      if (rec.el.dataset.wipe !== 'clip') {
        block = document.createElement('span');
        block.className = 'wl-block';
        block.setAttribute('aria-hidden', 'true');
        inner.append(block);
      }
      line.append(inner);
      el.append(line);
      return {inner, block};
    });
  }

  // Elements inside a CSS-sticky frame are triggered from the frame's track, at their offset inside the frame,
  // because their own box moves with the sticky offset.
  function trigger(el, at) {
    const sticky = el.closest('[data-sticky]');
    if (!sticky) return {trigger: el, start: `top ${at * 100}%`};
    const off = Math.round(el.getBoundingClientRect().top - sticky.getBoundingClientRect().top);
    return {trigger: sticky.parentElement, start: `top+=${off} ${at * 100}%`};
  }

  function build(rec) {
    const lines = split(rec);
    if (mode === 'still') return;
    const tl = gsap.timeline({paused: true});
    lines.forEach(({inner, block}, i) => {
      const at = i * W.lineStagger;
      tl.fromTo(inner, {clipPath: SHUT}, {clipPath: OPEN, duration: W.line, ease: W.lineEase}, at);
      if (block) tl.fromTo(block, {scaleX: 1}, {scaleX: 0, duration: W.block, ease: W.blockEase}, at + W.blockDelay);
    });
    tl.eventCallback('onComplete', () => gsap.set(lines.map((l) => l.inner), {clearProps: 'clipPath'}));
    rec.tl = tl;
    const a = trigger(rec.el, W.start);
    if (mode === 'capture') {
      const b = trigger(rec.el, W.captureEnd);
      rec.st = ScrollTrigger.create({...a, end: b.start, scrub: true, animation: tl});
      return;
    }
    if (rec.played) {
      tl.progress(1);
      return;
    }
    if (rec.el.getBoundingClientRect().top < innerHeight * W.start) tl.timeScale(W.foldSpeed);
    rec.st = ScrollTrigger.create({...a, end: 'max', once: true, onEnter: () => afterReveal.then(() => {
      rec.played = true;
      const now = performance.now() / 1000;
      const wait = Math.max(0, nextFree - now);
      nextFree = now + wait + (rec.el.dataset.wipe === 'clip' ? W.queueGap * 0.5 : W.queueGap);
      gsap.delayedCall(wait, () => tl.play());
    })});
  }

  // Capture: anything already inside the viewport at the top of the page shows complete, like the live page after
  // its intro, instead of a half-wiped first frame.
  function settleAboveFold() {
    if (mode !== 'capture') return;
    for (const r of recs) {
      if (r.st && r.st.start <= 1) {
        r.st.kill();
        r.st = null;
        r.tl.progress(1);
      }
    }
  }

  recs.forEach(build);
  let width = innerWidth;
  let timer = 0;
  addEventListener('resize', () => {
    if (innerWidth === width) return;
    width = innerWidth;
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const r of recs) {
        if (r.tl && r.tl.progress() === 1) r.played = true;
        r.st?.kill();
        r.tl?.kill();
        r.st = null;
        r.tl = null;
        build(r);
      }
      ScrollTrigger.refresh();
      settleAboveFold();
    }, 180);
  });
  return {settleAboveFold};
}
