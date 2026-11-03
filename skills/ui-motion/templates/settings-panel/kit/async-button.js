// Button with press, loading, success and error states, for anything that waits on the network.
//
//   const save = createAsyncButton(el, {labels: {idle: 'Save changes', loading: 'Saving…', done: 'Saved', error: 'Try again'}});
//   const result = await save.run(() => fetch('/api/settings', {method: 'PATCH', body}));  // 'done' | 'error' | 'busy'
//   save.disabled = true;
//   onLoading() runs as the label turns to 'Saving…'; onResult(result) in the frame the button turns to Saved or
//   error (drive the status line and the toast from these, so every read-out changes together).
//   onSettle(result) runs as the success or error face starts to leave (set disabled there, not later).
//
// Timing (motion.js T): press acknowledged in one frame (scale 0.96 and a darker fill). The label rolls to
// 'Saving…' at once; the spinner glyph appears only if the task is still running at 300 ms, and once visible it stays at least 400 ms, so it never flashes. Success holds 1.4 s and returns to idle.
// Pressing again while busy gives the press feedback and does nothing else: no second request, no queue.
// The width never changes (every face is stacked in the same box). Reduced motion: faces crossfade in place,
// the spinner does not spin, the press does not scale.
import {EASE, T, pressable, prop, reducedMotion, spring} from './motion.js';

const SPINNER = `<svg class="mm-btn__spinner" viewBox="0 0 16 16" width="16" height="16"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-opacity=".22" stroke-width="1.75"/><path d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`;
const CHECK = `<svg class="mm-btn__check" viewBox="0 0 16 16" width="16" height="16"><path d="M3.5 8.4l2.9 2.9 6.1-6.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createAsyncButton(button, {labels = {}, onLoading, onResult, onSettle} = {}) {
  const L = {idle: 'Save', loading: 'Saving…', done: 'Saved', error: 'Try again', ...labels};
  button.type = button.type || 'button';
  button.classList.add('mm-btn');
  button.innerHTML = `<span class="mm-btn__tone mm-btn__tone--done" aria-hidden="true"></span><span class="mm-btn__tone mm-btn__tone--error" aria-hidden="true"></span><span class="mm-btn__tone mm-btn__tone--press" aria-hidden="true"></span><span class="mm-btn__face mm-btn__face--idle" aria-hidden="true">${L.idle}</span><span class="mm-btn__face mm-btn__face--loading" aria-hidden="true"><span class="mm-btn__spin">${SPINNER}</span><span>${L.loading}</span></span><span class="mm-btn__face mm-btn__face--done" aria-hidden="true">${CHECK}<span>${L.done}</span></span><span class="mm-btn__face mm-btn__face--error" aria-hidden="true"><span>${L.error}</span></span><span class="mm-sr">${L.idle}</span>`;
  const sr = button.querySelector('.mm-sr');
  const q = (s) => button.querySelector(s);

  const face = (sel, visible) => {
    const el = q(sel);
    let o = visible ? 1 : 0;
    let y = 0;
    let sc = 1;
    const paint = () => {
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0,${y.toFixed(2)}px,0) scale(${sc.toFixed(4)})`;
    };
    const op = prop(o, (v) => { o = v; paint(); });
    const yp = prop(0, (v) => { y = v; paint(); });
    const icon = el.querySelector('.mm-btn__check');
    const pop = spring(1, {response: 0.28, damping: 1, onUpdate: (v) => { if (icon) icon.style.transform = `scale(${v.toFixed(4)})`; }});
    paint();
    return {
      show(delay = 0) {
        const rm = reducedMotion();
        yp.set(rm ? 0 : 9);
        yp.to(0, T.enter, EASE.enter, delay);
        op.to(1, rm ? T.feedback : T.swap, EASE.enter, delay);
        if (icon && !rm) {
          pop.set(0.55);
          setTimeout(() => pop.to(1), delay);
        }
      },
      hide() {
        yp.to(reducedMotion() ? 0 : -9, T.labelOut, EASE.exit);
        return op.to(0, T.labelOut, EASE.exit);
      },
      dim(v) { op.to(v, T.feedback, EASE.enter); },
      set visible(v) { op.set(v ? 1 : 0); yp.set(0); },
    };
  };
  const faces = {idle: face('.mm-btn__face--idle', true), loading: face('.mm-btn__face--loading'), done: face('.mm-btn__face--done'), error: face('.mm-btn__face--error')};
  const tone = {done: prop(0, (v) => { q('.mm-btn__tone--done').style.opacity = v.toFixed(3); }), error: prop(0, (v) => { q('.mm-btn__tone--error').style.opacity = v.toFixed(3); })};

  const spin = prop(0, (v) => { q('.mm-btn__spin').style.opacity = v.toFixed(3); });
  const pressTone = q('.mm-btn__tone--press');
  const {spring: press} = pressable(button, (v) => {
    if (disabled) v = 0;
    button.style.transform = reducedMotion() ? '' : `scale(${(1 - 0.04 * v).toFixed(4)})`;
    pressTone.style.opacity = (v * 0.16).toFixed(3); // a darker fill: the press reads even with reduced motion
  });

  let state = 'idle';
  let disabled = false;
  const setDisabled = (v) => {
    disabled = !!v;
    button.setAttribute('aria-disabled', String(disabled));
    button.classList.toggle('is-disabled', disabled);
  };
  // aria-disabled (not the disabled attribute) keeps the button focusable and its press visible
  button.addEventListener('click', (e) => { if (disabled) e.stopImmediatePropagation(); }, true);

  async function run(task) {
    if (state !== 'idle' || disabled) return 'busy';
    state = 'loading';
    button.setAttribute('aria-busy', 'true');
    // the words change at once (the press is answered and says what is happening); only the spinner glyph
    // waits for 300 ms, so a fast save never flashes one
    faces.idle.hide();
    faces.loading.show(T.overlap);
    sr.textContent = L.loading;
    onLoading?.();
    let shownAt = 0;
    const timer = setTimeout(() => {
      shownAt = performance.now();
      spin.to(1, T.swap, EASE.enter);
    }, T.showAfter);
    let ok = true;
    try {
      await task();
    } catch (err) {
      ok = false;
      console.warn('[async-button] task failed:', err);
    }
    clearTimeout(timer);
    if (shownAt) await wait(Math.max(0, T.minShown - (performance.now() - shownAt)));
    faces.loading.hide();
    const result = ok ? 'done' : 'error';
    state = result;
    tone[result].to(1, T.feedback, EASE.enter, T.overlap);
    faces[result].show(T.overlap);
    sr.textContent = L[result];
    onResult?.(result); // same frame as the button's own change: drive the status line and toast from here
    (async () => {
      await wait(T.successHold);
      onSettle?.(result); // e.g. set .disabled now, so the colour change rides the same swap
      faces[result].hide();
      tone[result].to(0, T.enter, EASE.move);
      faces.idle.show(T.overlap);
      spin.set(0);
      await wait(T.enter + T.exit);
      state = 'idle';
      button.removeAttribute('aria-busy');
      sr.textContent = L.idle;
    })();
    return result;
  }

  return {
    el: button,
    run,
    get state() { return state; },
    get disabled() { return disabled; },
    set disabled(v) { setDisabled(v); },
    press,
  };
}
