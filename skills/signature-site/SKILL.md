---
name: signature-site
description: Use for a personality or brand site (athlete, creator, artist, studio, launch) in the award-site style where every threshold is one brand gesture - a brand-mark mask that opens the intro and covers page changes, line highlight wipes, CSS-sticky scrubbed chapters, a 1:1 horizontal gallery, a pointer-reactive 3D hero and one house easing curve. Stack: GSAP + ScrollTrigger, Lenis, three.js. Not for product launch stories (use scroll-story) or app interface motion (use ui-motion).
---

# Signature site

A signature site feels expensive because it has one gesture and repeats it. The intro, every page change and, in miniature, every heading reveal are the same brand event: the brand mark opening as a mask, or a block of brand colour wiping off a line. Everything between thresholds is calm and scrubbed. Loading hides inside the brand moment, so nobody sees a spinner.

The pattern is measured from landonorris.com (`../study/references/measured/landonorris.md`). Borrow the system, never the identity: the user's own mark, colour and imagery go in. A demo brand that looks like a famous site's brand is a defect.

## The system (measured values; keep them unless the brand asks otherwise)

| Piece | Behaviour | Numbers |
|---|---|---|
| Brand threshold: intro | Solid brand colour with the mark; when the page is ready, a mark-shaped hole scales from ~30 px to past the viewport | reveal ~380 ms, accelerating in (expo.in): almost nothing for the first half, most of the opening at the end |
| Brand threshold: page change | Mark slab scales up to cover the screen, holds while the next page loads, then the mirrored hole opens on the new page | cover ~370 ms expo.in; hold = real load time, at least 250 ms, at most 900 ms (the reference holds 1.2 s on every click; too slow on repeat visits); reveal ~335 ms expo.in |
| Highlight wipe (headings, eyebrows, labels) | Each line clips open, then a brand-colour block over the line retracts | line 0.6 s power3.out; block 0.6 s power3.inOut after 0.3 s; starts when the element's top reaches 90% of the viewport; plays once |
| Hero | CSS-sticky 1 vh inside a 2 vh track; the full-bleed 3D view shrinks to a card while the camera dollies and the image desaturates | 1 vh, scrub, power1.inOut |
| Pointer-reactive 3D | The object follows the pointer with exponential lag; a pointer trail reveals a painted layer under a wireframe or line layer | follow 50% at ~400 ms, 90% at ~1 s (lerp ~0.03 per frame at 60 fps); trail fades over ~600 ms |
| Horizontal gallery | CSS-sticky pin; the track moves exactly 1 px across per 1 px scrolled; background shifts dark to light while pinned | 1:1, linear; colour power2.out across the pin |
| Hover, buttons | Letters roll up one line, per character | 0.6 s, ~15 ms stagger, cubic-bezier(0.19, 1, 0.22, 1) |
| Hover, cards | Overlay fades in, image scales 1 to 1.1, second image revealed by a growing ellipse clip | 0.75 s cubic-bezier(0.65, 0.05, 0, 1), the house curve |
| Menu | Dark panel drops with a convex curved bottom edge, then links line-reveal | ~320 ms strong ease-out, links staggered after |
| Smooth scroll | Lenis on desktop wheels only | lerp 0.1 (100 px notch: 50% at 150 ms, 90% at 416 ms); off on touch and under reduced motion |

Rules that come with it:
1. One house curve for hovers and state changes (cubic-bezier(0.65, 0.05, 0, 1)); expo.in only for the brand mask; power1.inOut or linear for anything scrubbed.
2. Pins are CSS `position: sticky` driven by scroll triggers, never GSAP pins: cheaper, no pin-spacer jumps, works with Lenis. Keep total pinned scroll inside the budget in `../../shared/defaults.md`.
3. Hide the cost: GL init, model and font loading run under the intro brand screen; page fetches run under the page-change hold.
4. Cap the GL pixel ratio (1.25 desktop, 2 phone) and run fewer triggers on phones (the reference runs 32 on phone against 94 on desktop).
5. Reduced motion is part of the design, not an afterthought (the reference ignores it entirely; do better): the brand threshold becomes a 200 ms fade, no smooth scroll, no scrubbed travel or parallax, wipes show the final state, the 3D hero becomes a still with the painted layer visible.
6. The mark mask must read as the brand at 30 px and at full screen: a simple, heavy, closed shape. Test it before building around it.

## Start from the template

```
node <plugin>/shared/web-studio/new_page.mjs <folder> --template signature-site/signature-site
cd <folder> && npm install
```

A new brand is a new `content.json`, with no code edits. It holds the name and every word (aria labels included), the mark (an SVG path plus its solid `cores`), the palette, and the list of `works` with fields of the user's own shown through `{field}` placeholders. It also sets the second page's file name and columns (`worksPage`), the hero object (`home.hero.shape`: `rock`, `disc`, `orb`, `ring`, or `model` with a `.glb` path), and the art style (`art.surface`, `art.pattern`). Photos go in the folder and are named by each work's `image`; without one, a card is drawn in code under its `light` mood. `TEMPLATE.md` ("Make it yours") lists every key, how to add photos and a model, and how to rename the second page.

Then run `node studio/web.mjs check`, `shots` and `moments`, look at every sheet and strip yourself, and have the `motion-critic` agent review the evidence. Pick content that fits the brand rather than the demo's: a record is not a boulder, and a cellist's cards are not rock. Read `<plugin>/shared/web-studio/README.md` for the page contract (`?capture`, `window.__ready`, `window.ScrollTrigger`, `data-read`).

## Red flags

- The demo or the build wears someone else's brand (their colour, mark, number, imagery)
- A spinner, skeleton or blank flash anywhere a brand threshold should be
- A second threshold gesture (a slide here, a fade there): one gesture, repeated
- A page-change hold longer than the real load, on every click
- GSAP pins, or scrubbed text that is moving while it should be read
- Reduced motion that still runs the mask, smooth scroll or scrubbed travel

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.
