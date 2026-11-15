// Card sphere page: words, colours, cards and tuning from content.json; the sphere itself is sphere.js
// (lift it out as it is); the studio's scripted tour is tour.js.
import {createSphere} from './sphere.js';
import {installTour} from './tour.js';

const C = await (await fetch('./content.json')).json();
const root = document.documentElement.style;
for (const [k, v] of Object.entries(C.colors || {})) root.setProperty(`--${k}`, v);
document.title = C.title;
document.getElementById('title').textContent = C.title;
document.getElementById('hint').textContent = C.hint;
const label = document.getElementById('front');
const stage = document.getElementById('sphere');
stage.setAttribute('aria-label', `${C.title}: ${C.cards.length} cards`);

const sphere = createSphere(stage, {
  cards: C.cards, sphere: C.sphere, motion: C.motion,
  onFront: (card) => { label.textContent = card.title || ''; },
});
window.__sphere = sphere;

// ?demo: alternating throws on a loop, for the studio's moments and for sharing
if (new URLSearchParams(location.search).has('demo')) {
  const throws = [[1300, -700], [-1100, 950]];
  let i = 0;
  const go = () => { sphere.fling(...throws[i++ % throws.length]); };
  setTimeout(go, 300);
  setInterval(go, 3600);
}

installTour(stage, sphere);
requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
