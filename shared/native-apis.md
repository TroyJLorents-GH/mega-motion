# Native browser APIs before libraries

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


| Feature | Chrome | Safari | Firefox | Source |
|---|---|---|---|---|
| CSS scroll-driven animations (`animation-timeline`, `scroll()`, `view()`) | 115 | 26 | 159 | MDN browser-compat-data, verified 2026-10-30 |
| View Transitions, same document | 111 | 18 | 144 | MDN data as cited by two reviews, not re-checked |
| View Transitions, cross document | 126 | 18.2 | none | same |

- **CSS scroll-driven animations** for progress bars, header changes and single-element reveals or parallax tied to visibility. Feature-detect with `@supports (animation-timeline: view())`; declare `animation-timeline` after the `animation` shorthand, which resets it.
- **View Transitions** for route changes and card-to-detail morphs on supporting browsers. They snapshot pixels, so a live WebGL canvas freezes during one; keep the canvas outside the transition.
- **GSAP stays** for pins that add scroll distance, anything that drives three.js or canvas, catch-up smoothing, labels and callbacks, interruptible layout morphs (Flip) and the plugins.
