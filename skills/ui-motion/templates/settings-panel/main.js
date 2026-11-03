// Settings panel: four switches, a slider, a save button with loading and success, a confirmation toast.
// The words, colours and demo latency come from content.json; the components come from ./kit (lift them out
// as they are); the scripted tour for the studio's checks and recordings is in tour.js.
import {EASE, T, prop, trackInputModality} from './kit/motion.js';
import {createToggle} from './kit/toggle.js';
import {createSlider} from './kit/slider.js';
import {createAsyncButton} from './kit/async-button.js';
import {createToaster} from './kit/toaster.js';
import {installTour} from './tour.js';

const C = await (await fetch('./content.json')).json();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);

// ---- theme from content.json ----
const root = document.documentElement.style;
const map = {ground: '--mm-ground', ink: '--mm-ink', muted: '--mm-muted', accent: '--mm-accent', ring: '--mm-ring', success: '--mm-success',
  track: '--mm-track', trackHover: '--mm-track-hover', surface: '--mm-surface', line: '--mm-line', panel: '--panel'};
for (const [k, v] of Object.entries(C.colors || {})) if (map[k]) root.setProperty(map[k], v);
root.setProperty('--mm-on-ink', C.colors?.ground || '#0b0b0d');
trackInputModality();

// ---- markup ----
const ICON_LOW = `<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2l3-2.5v9L4.5 10h-2z" fill="currentColor"/></svg>`;
const ICON_HIGH = `<svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true"><path d="M2.5 6h2l3-2.5v9L4.5 10h-2z" fill="currentColor"/><path d="M10.2 5.6a3.4 3.4 0 0 1 0 4.8M12.3 3.6a6.2 6.2 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const panel = document.getElementById('panel');
const S = C.slider;
panel.innerHTML = `
  <header class="panel__head">
    <p class="eyebrow">${esc(C.eyebrow)}</p>
    <h1 class="panel__title" id="panel-title">${esc(C.title)}</h1>
    <p class="panel__intro">${esc(C.intro)}</p>
  </header>
  <ul class="rows">
    ${C.toggles.map((t) => `
    <li class="row">
      <div class="row__text" data-for="sw-${t.id}">
        <label class="row__title" id="lbl-${t.id}" for="sw-${t.id}">${esc(t.label)}</label>
        <p class="row__desc" id="desc-${t.id}">${esc(t.description)}</p>
      </div>
      <button id="sw-${t.id}" aria-labelledby="lbl-${t.id}" aria-describedby="desc-${t.id}"></button>
    </li>`).join('')}
    <li class="row row--slider">
      <div class="row__head">
        <span class="row__title" id="lbl-${S.id}">${esc(S.label)}</span>
        <span class="readout" id="out-${S.id}" aria-hidden="true">${S.value}${esc(S.unit)}</span>
      </div>
      <div class="slider-line">${ICON_LOW}<div id="sl-${S.id}" aria-labelledby="lbl-${S.id}"></div>${ICON_HIGH}</div>
    </li>
  </ul>
  <footer class="panel__foot">
    <p class="status" id="status" data-tone="clean"><span class="status__dot" aria-hidden="true"></span><span class="status__text" role="status">${esc(C.status.clean)}</span></p>
    <button id="save"></button>
  </footer>`;
panel.classList.add('is-built');

// ---- components ----
const values = () => ({...Object.fromEntries(toggles.map((t, i) => [C.toggles[i].id, t.checked])), [S.id]: slider.value});
let saved = null;
const dirtyCount = () => {
  const now = values();
  return Object.keys(now).filter((k) => now[k] !== saved[k]).length;
};

const toggles = C.toggles.map((t) => createToggle(document.getElementById(`sw-${t.id}`), {checked: t.on, onChange: refresh}));
// the whole text column is part of the hit area, and pressing it presses the switch
for (const [i, row] of [...panel.querySelectorAll('.row__text')].entries()) {
  const tg = toggles[i];
  row.addEventListener('click', (e) => { if (!e.target.closest('label')) tg.el.click(); });
  row.addEventListener('pointerdown', (e) => { if (e.button === 0) tg.press.to(1, {response: 0.16}); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) row.addEventListener(ev, () => tg.press.to(0, {response: 0.26}));
}

const readout = document.getElementById(`out-${S.id}`);
const slider = createSlider(document.getElementById(`sl-${S.id}`), {
  min: S.min, max: S.max, step: S.step, value: S.value,
  format: (v) => `${v}${S.unit}`,
  onDisplay: (v) => { readout.textContent = `${v}${S.unit}`; },
  onInput: () => refresh(),
});

const save = createAsyncButton(document.getElementById('save'), {
  labels: C.save,
  onLoading: () => setStatus(C.status.saving, 'clean'),
  onResult: (result) => {
    if (result === 'done') {
      saved = pendingSnapshot;
      const n = dirtyCount();
      setStatus(n ? (n === 1 ? C.status.one : C.status.many.replace('{n}', n)) : C.status.saved, n ? 'dirty' : 'saved');
      // the toast follows the button's Saved by a beat (180 ms), so the eye goes button, then toast
      setTimeout(() => toaster.toast({title: C.toast.title, description: C.toast.description, tone: C.toast.tone || 'success'}), 180);
    } else setStatus(C.status.many.replace('{n}', dirtyCount()), 'dirty');
  },
  onSettle: () => { save.disabled = dirtyCount() === 0; },
});
let pendingSnapshot = null;
const toaster = createToaster(document.getElementById('toaster'));
saved = values();

// ---- status line: one text node, crossfaded; rapid changes collapse into the latest ----
const statusEl = document.getElementById('status');
const statusText = statusEl.querySelector('.status__text');
const statusFade = prop(1, (v) => { statusText.style.opacity = v.toFixed(3); });
let shown = C.status.clean;
let wanted = shown;
let swapping = false;
async function setStatus(text, tone) {
  wanted = text;
  statusEl.dataset.tone = tone;
  if (swapping || wanted === shown) return;
  swapping = true;
  while (wanted !== shown) {
    await statusFade.to(0, T.labelOut, EASE.exit);
    shown = wanted;
    statusText.textContent = shown;
    await statusFade.to(1, T.swap, EASE.enter);
  }
  swapping = false;
}

function refresh() {
  const n = saved ? dirtyCount() : 0;
  if (save.state === 'idle') save.disabled = n === 0;
  if (save.state === 'pending' || save.state === 'loading') return;
  if (n) setStatus(n === 1 ? C.status.one : C.status.many.replace('{n}', n), 'dirty');
  else if (statusEl.dataset.tone !== 'saved') setStatus(C.status.clean, 'clean');
}
refresh();

// ---- save: press, "Saving…" at once, spinner only past 300 ms, Saved, then the toast (see onResult above) ----
const request = () => new Promise((r) => setTimeout(r, C.demo?.saveLatencyMs ?? 650)); // replace with your fetch
save.el.addEventListener('click', () => {
  if (save.state !== 'idle' || save.disabled) return; // busy: the press shows, nothing queues
  pendingSnapshot = values();
  save.run(request);
});

// ---- tour for the studio (shots, check, film); delete tour.js and this call in your app ----
installTour({toggles, slider, save, toaster});

await document.fonts.ready;
requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
