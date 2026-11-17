// The highlight wipe: the brand threshold in miniature, on every heading, eyebrow and label marked [data-wipe].
// GSAP SplitText splits each element into its real lines (and re-splits when fonts load or the width changes,
// autoSplit). Each line clips open left to right, then a block of brand colour over it retracts and leaves the words.
// The block is the line's ::after, sized to the font's full ascent and descent (styles.css), so no dot, accent or
// descender ever shows outside it. Above WIPE.blockMaxPx (display headings) the block is a thin accent rule under
// the line instead (.wipe-rule): a full-height block on a 150 px heading reads as a slab, not an accent.
// data-wipe="ink" uses the text colour for the block; data-wipe="clip" has no block; data-wipe="block" forces it.
//   live:     anything on screen when the brand threshold opens is already finished (the mask is its reveal);
//             below the fold, starts when the element's top reaches WIPE.start, plays once; wipes that start
//             together play in reading order, WIPE.queueGap apart; one already scrolled past just shows finished
//   capture:  scrubbed by scroll over the same entry, so a scroll position is always one frame
//   still:    reduced motion; nothing is split and nothing moves
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger.js';
import {SplitText} from 'gsap/SplitText.js';

gsap.registerPlugin(SplitText);

// The clip box reaches past the line box by the same amount as the block, so ascenders and descenders are inside it.
const SHUT = 'inset(-0.32em 100% -0.36em -0.08em)';
const OPEN = 'inset(-0.32em -0.08em -0.36em -0.08em)';

export function createWipes(els, {W, mode, afterReveal}) {
  let nextFree = 0;
  let arriving = true; // true while the first splits run, before the threshold opens
  const recs = els.map((el) => ({el, played: false, tl: null, st: null, split: null}));
  if (mode === 'still') return {settleAboveFold() {}};

  // Elements inside a CSS-sticky frame are triggered from the frame's track, at their offset inside the frame,
  // because their own box moves with the sticky offset.
  function trigger(el, at) {
    const sticky = el.closest('[data-sticky]');
    if (!sticky) return {trigger: el, start: `top ${at * 100}%`};
    const off = Math.round(el.getBoundingClientRect().top - sticky.getBoundingClientRect().top);
    return {trigger: sticky.parentElement, start: `top+=${off} ${at * 100}%`};
  }

  // Called by SplitText on the first split and on every re-split; the returned timeline is reverted and time-synced
  // by SplitText, so a re-split mid-wipe continues from the same point.
  function build(rec, lines) {
    rec.st?.kill();
    rec.st = null;
    const block = rec.el.dataset.wipe !== 'clip';
    const big = rec.el.dataset.wipe !== 'block' && parseFloat(getComputedStyle(rec.el).fontSize) > W.blockMaxPx;
    rec.el.classList.toggle('wipe-rule', big);
    const tl = gsap.timeline({paused: true});
    lines.forEach((line, i) => {
      const at = i * W.lineStagger;
      tl.fromTo(line, {clipPath: SHUT}, {clipPath: OPEN, duration: W.line, ease: W.lineEase}, at);
      if (block) tl.fromTo(line, {'--wb': 1}, {'--wb': 0, duration: W.block, ease: W.blockEase}, at + W.blockDelay);
    });
    tl.eventCallback('onComplete', () => gsap.set(lines, {clearProps: 'clipPath'}));
    rec.tl = tl;
    const a = trigger(rec.el, W.start);
    if (mode === 'capture') {
      // Deterministic and never part-way: a scroll position shows the line finished (past its start) or not begun.
      tl.progress(0);
      rec.st = ScrollTrigger.create({...a, end: 'max', onUpdate: (st) => tl.progress(st.progress > 0 ? 1 : 0), onRefresh: (st) => tl.progress(st.progress > 0 ? 1 : 0)});
      return tl;
    }
    // On screen when the threshold opens: the brand mask is its reveal, so it shows finished (no second gesture
    // under the first).
    if (arriving && rec.el.getBoundingClientRect().top < innerHeight * W.start) rec.played = true;
    if (rec.played) {
      tl.progress(1);
      return tl;
    }
    const past = () => rec.el.getBoundingClientRect().bottom < 0;
    rec.st = ScrollTrigger.create({...a, end: 'max', once: true, onEnter: () => afterReveal.then(() => {
      rec.played = true;
      if (past()) return tl.progress(1); // a fast scroll jumped over it: no queue, no late wipe off screen
      const now = performance.now() / 1000;
      const wait = Math.max(0, nextFree - now);
      nextFree = now + wait + W.queueGap;
      gsap.delayedCall(wait, () => (past() ? tl.progress(1) : tl.play()));
    })});
    return tl;
  }

  for (const rec of recs) {
    rec.split = SplitText.create(rec.el, {
      type: 'lines',
      linesClass: 'wl',
      aria: 'auto', // the element keeps its full text as a label; the line wrappers are hidden from screen readers
      autoSplit: true,
      onSplit: (self) => build(rec, self.lines),
    });
  }
  arriving = false;

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

  return {settleAboveFold};
}
