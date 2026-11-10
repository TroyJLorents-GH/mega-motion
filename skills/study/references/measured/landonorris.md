# landonorris.com (personal site of the F1 driver, 2025, https://landonorris.com/)

Clean-room measurement: behaviour and numbers only. The brand (lime #d2ff00, the "4" monogram, helmet art, photos, Rive files) belongs to its owners; borrow the technique, never the identity. Built into `skills/signature-site`.

## Stack (read from the shipped bundle at runtime; nothing saved)
Webflow + one agency bundle: GSAP 3.13 (ScrollTrigger, MotionPathPlugin), Lenis 1.1 (lerp 0.1), three.js (custom scene engine), Rive canvas-lite (monogram, icons, signature), Taxi.js page transitions. 21 canvases: 1 full-screen WebGL, 1 full-screen Rive transition layer, 19 small Rive icons. GL pixel ratio capped at 1.25 desktop, 2 phone. Home page 5.46 MB (about 2.1 MB models, lighting maps, wasm).

## Moments
| Moment | Trigger or scroll range | Duration | Easing | Source | Confidence |
|---|---|---|---|---|---|
| Loader: solid brand colour, small monogram animating in the centre | first paint 336 ms to 2450 ms | ~2.1 s | Rive | measured | high |
| GL init long tasks (369 + 55 ms), hidden inside the loader | 1390 to 1815 ms | 424 ms | n/a | measured | high |
| Intro reveal: a monogram-shaped hole scales from ~30 px to past the viewport | 2495 to 2879 ms | ~380 ms | accelerating in (expo.in family): under 2% open for 180 ms, 85% in the last 200 ms | measured | med |
| Page transition cover: monogram slab scales up until the screen is solid brand colour | click +100 to +471 ms | ~370 ms | expo.in family | measured | high |
| Page transition hold: brand screen, mark animating, smooth scroll stopped, URL swaps at +1250 ms | +471 to +1670 ms | ~1.2 s | n/a | measured | high |
| Page transition reveal: mirrored hole opens on the new page | +1670 to +2005 ms | ~335 ms | expo.in family | measured | high |
| Hero pin (CSS sticky, 1 vh inside a 2 vh track) | 0 to 1 vh | 1 vh | n/a | measured | high |
| Hero shrink: full-bleed GL view scales to a ~31 vw x 38 vh card; camera dollies, image desaturates | 0 to 1 vh, scrub true | 1 vh | power1.inOut | code + measured | high |
| Pointer-reactive 3D head: follows the pointer, a cursor trail reveals a painted layer under a wireframe | pointer move | 50% at ~400 ms, 90% at ~1030 ms | exponential follow (~0.03 per frame) | measured | low-med |
| Horizontal gallery: sticky pin 2.49 vh; track moves exactly 1 px across per 1 px scrolled | 3.49 vh, scrub 1 | 3.49 vh | linear | code + measured | high |
| Background dark to off-white while the gallery is pinned | 2.49 vh, scrub | 2.49 vh | power2.out | measured | high |
| Text highlight wipe (about 40 headings and labels): line clip opens, then a colour block over it retracts | element top at 90% of viewport, once | 0.6 s line; block 0.6 s after 0.3 s | line power3.out; block power3.inOut | measured per frame | high |
| Button hover: letters roll up one line, per character | pointer enter | 0.6 s, ~15 ms stagger | power4.out / cubic-bezier(0.19, 1, 0.22, 1) | measured | high |
| Card hover: overlay fades in, image scales 1 to 1.1, second image revealed by a growing ellipse clip | pointer enter | 0.75 s | cubic-bezier(0.65, 0.05, 0, 1), the house curve (98 CSS rules use it) | CSS + measured | high |
| Menu: dark panel drops with a convex curved edge | click | ~320 ms | expo/power3.out | measured | med |
| Lenis wheel notch (100 px) | wheel | 50% at 150 ms, 90% at 416 ms, settled ~950 ms | exponential, lerp 0.1 | measured | high |
| Scroll frame pacing (desktop, M5 Pro, optimistic) | 3 s scroll | p50 16.7 ms, p95 17.8 ms | n/a | measured | med |

All pins are CSS `position: sticky`; there are no GSAP pins. 94 scroll triggers on desktop, 32 on phone.

The one decision that makes it work: every threshold is the same brand gesture. The intro, every page change and, in miniature, every text reveal are one brand-colour event (the monogram mask, or a colour block wiping off a line). Everything continuous between them is scrubbed with linear or power1.inOut. Loading and route waits hide inside the brand hold, so the visitor never sees a spinner.

What to borrow: one brand mask for intro and page changes; hiding loads inside it; the two-step line wipe; CSS sticky pins driven by scroll triggers; 1:1 horizontal travel; one house curve for all hovers; a capped GL pixel ratio; fewer triggers on phones (32 against 94).

What not to borrow: reduced motion is ignored (with `prefers-reduced-motion: reduce` the intro, smooth scroll and all 94 triggers are unchanged); a 2 s page transition on every click is slow for repeat visits (shorten the hold to the real load time); 5.5 MB first load; the brand itself.

Not measurable headless: head rotation in degrees, whether bloom runs, Rive internal timing, parallax amplitudes, real touch inertia, real phone GPU cost.

Measured on: 2026-11-09, headless Chrome 157 (GPU via ANGLE Metal), 1440x900 and 390x844 (DPR 3, touch). Evidence kept outside the repo.
