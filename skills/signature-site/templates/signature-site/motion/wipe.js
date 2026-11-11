// The highlight wipe: the brand threshold in miniature, on every heading, eyebrow and label marked [data-wipe].
// GSAP SplitText splits each element into its real lines (and re-splits when fonts load or the width changes,
// autoSplit). Each line clips open left to right, then a block of brand colour over it retracts and leaves the words.
// The block is the line's ::after, sized to the font's full ascent and descent (styles.css), so no dot, accent or
// descender ever shows outside it. data-wipe="ink" uses the text colour for the block; data-wipe="clip" has no block.
//   live:     starts when the element's top reaches WIPE.start of the viewport, plays once, after the intro reveal;
//             wipes that start together play in reading order, WIPE.queueGap apart
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
      const b = trigger(rec.el, W.captureEnd);
      rec.st = ScrollTrigger.create({...a, end: b.start, scrub: true, animation: tl});
      return tl;
    }
    if (rec.played) {
      tl.progress(1);
      return tl;
    }
    // Already on screen when the threshold opens: the mask was its reveal, so the wipe is a quicker echo.
    if (rec.el.getBoundingClientRect().top < innerHeight * W.start) tl.timeScale(W.foldSpeed);
    rec.st = ScrollTrigger.create({...a, end: 'max', once: true, onEnter: () => afterReveal.then(() => {
      rec.played = true;
      const now = performance.now() / 1000;
      const wait = Math.max(0, nextFree - now);
      nextFree = now + wait + (block ? W.queueGap : W.queueGap * 0.5);
      gsap.delayedCall(wait, () => tl.play());
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
