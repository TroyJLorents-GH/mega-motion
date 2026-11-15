# card-sphere: a draggable gallery of cards on a sphere

Cards spread evenly over a sphere. Drag to spin it in any direction; let go and it keeps turning, slows down, and
settles with the nearest card facing you, upright. Arrow keys step to the neighbouring card. Plain HTML, CSS and
one dependency-free ES module (`sphere.js`); no GSAP or three.js.

```
node <plugin>/shared/web-studio/new_page.mjs my-gallery --template ui-motion/card-sphere
cd my-gallery && npm install
node studio/web.mjs check     # feedback < 100 ms, fast repeats, no errors, reduced motion
node studio/web.mjs shots     # a tile per tour step, phone and desktop
node studio/web.mjs moments   # load and throw-and-settle strips (uses ?demo)
```

Edit `content.json`: the title, hint, colours, sphere proportions, motion tuning and the cards. A card is
`{"title", "bg", "fg"}` for drawn artwork or `{"title", "image", "bg"}` for a photo (cover-cropped, `bg` shows
while it loads). 18 to 30 cards read best; fewer leaves holes, more crowds the front.

## Provenance (clean-room)

Behaviour measured from the public preview video of Motion's paid "Gallery: Sphere" example (Motion+), with
ffmpeg frame analysis; the live demo was not unlocked and no Motion+ code was read. The spec, with sources and
confidence for every value, is in the mega-motion research notes (`rea/gallery-sphere/references.md`). The
maths (Fibonacci placement, quaternion rotation, momentum, settle) and artwork here are original.

## Timing

| Behaviour | Value | Notes |
|---|---|---|
| Drag | the sphere follows the pointer 1:1; dragging across the diameter turns it half a revolution | `motion.dragTurnsPerDiameter` |
| Momentum | speed decays exponentially, time constant **0.8 s** | `motion.momentumTau`; measured 0.77-0.83 s on the reference |
| Settle | below **0.7 rad/s** it eases onto the card nearest the front, upright, time constant **0.16 s** | `motion.snapSpeed`, `motion.settleTau` |
| Let go while still | no throw (held still more than 80 ms before release) | settles in place |
| Arrow keys | settle on the nearest visible card in that screen direction | the front card's title is announced (`aria-live`) |
| Reduced motion | no spin: a throw jumps straight to where its momentum would have ended, then shows that card | same destination, no travel |

## Proportions (defaults)

| | Value |
|---|---|
| Sphere | 40% of the viewport width (max 64% of height, 640 px); 78% of the width under 600 px |
| Card | 25% of the sphere's diameter wide, aspect 0.7 (portrait), corner radius 4.5% of its width |
| Perspective | 3 x the diameter |
| Ground | `#09120f` |

Only `transform` changes per frame (one `matrix3d` per card); back faces are hidden, so cards vanish as they
turn away and show edge-on at the rim.

## Reuse in plain JS

```js
import {createSphere} from './sphere.js';
const sphere = createSphere(document.querySelector('#gallery'), {
  cards: [{title: 'One', image: '/img/1.jpg'}, /* ... */],
  sphere: {diameter: 0.4, cardWidth: 0.25, cardAspect: 0.7},
  motion: {momentumTau: 0.8},
  onFront: (card, index) => { caption.textContent = card.title; },
});
sphere.fling(1200, -400); // throw it as if released at that pointer velocity (px/s)
sphere.step(1, 0);        // next card to the right
```

The element needs `width`/`height` from the `--d` variable and the card styles in `styles.css`.
In React, create it in an effect on a ref and call `destroy()` in the cleanup.

## Not checked yet
- Real touch devices and Safari (the studio checks run in Chromium with synthetic touch).
- Large photo sets (hundreds of KB per card); keep card images near their display size.
