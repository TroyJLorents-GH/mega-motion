# product-story

A scroll-told product page in the manner of an Apple product page. It has a hero, then one pinned proof per claim, alternating with normal-flow reading. It ends on a summary and a buy button. Each claim is proved by motion, not just stated. The default content is the field-test brief: Aura One wireless headphones, adaptive noise cancelling, a 40-hour battery and 250 g.

```
node <plugin>/shared/web-studio/new_page.mjs my-page --template scroll-story/product-story
cd my-page && npm install
node studio/web.mjs shots | check | film
```

## The beats

| # | Section | Scroll | Hero | Motion | Text | Reduced motion |
|---|---|---|---|---|---|---|
| 1 | Hero (flow) | load + 1 vh | product | Product lands (rise 24 px and fade, 0.9 s, enter ease). The headline's lines unmask 250 ms after it settles, then the sub line fades in. On scroll-out the product trails slightly and scales to 0.94 (the page's one parallax). | eyebrow, headline, sub | opacity only, 200 ms |
| 2 | Quiet (pin 1.6 vh) | p 0.08-0.5 | noise field | 11 restless sound lines are drawn into the product and flattened, starting at the product and spreading outward. They end as one still accent line through the cups: the stillness is the proof. | Claim from p 0. The body arrives at p 0.54 and is still from p 0.6. | still end pose |
| 3 | Bridge (flow) | ~1 vh | sentence | Words go from grey to ink in reading order and finish by mid-screen. | one sentence | all ink |
| 4 | Battery (pin 1.6 vh) | p 0.06-0.6 | numeral | Numeral counts 0 to N (tabular figures) while an hour timeline fills and ticks light, centred in the frame. It then rises to make room. | Kicker from p 0. Headline and body arrive at p 0.6 and are still from p 0.66. | still at N |
| 5 | Weight (pin 1.4 vh) | p 0.05-0.6 | beam balance | The product hangs on the left pan, which is down. A weight held above the right pan drops (it accelerates) onto it. The beam settles level with one small damped overshoot. | Claim from p 0. The body arrives at p 0.63 and is still from p 0.69. | still, level |
| 6 | Summary (flow) | ~1 vh | spec row | The spec cells reveal once, in reading order. | title, tagline, specs, CTA | no motion |

House rules held throughout:

- **Pins.** Pins take about 45% of the page, under the 60% budget. Every pin has a progress rail.
- **Text.** Text inside a pin is marked `data-read` from the moment it is settled to the end of the pin. The studio checks that range is an exact plateau.
- **Accent.** One accent colour, used for the proof marks (line, fill, beam), the kickers and the buy buttons.
- **Vector.** Content enters from below and leaves upward with the scroll. Horizontal processes run left to right. Only the dropped weight moves down, because gravity does.
- **Smoothing.** Desktop wheel input gets 0.5 s of scrub catch-up. Touch gets none, and neither does `?capture`. Lenis is off by default (`motion.smoothScrollOnDesktop`) and never runs on touch.

## What to edit

- **`content.json`**: every word, number and colour.
  - `palette`: ground, paper, ink, muted, rule and the one accent.
  - `product`: the name, the drawn product's `shell`, `cushion` and `metal` colours, and `image`.
  - Per section: `kicker`, `headline` (an array of lines) and `body`.
  - `battery.hours`, `tickEvery` and `unit` (the unit word stays fixed while the count runs, so the group never shifts).
  - `weight.weightLabel`.
  - `summary.specs` and `cta`.
  - `motion.pins`: pin lengths in viewport heights. Keep their total under about 0.6 of the page.
- **`tokens.js`**: easings, durations and the beat ranges inside each pin (`BEATS`). Move the proof and text thresholds here, not in code.
- **`main.js`**: the choreography. Each chapter is `chapter(name, render)`. `render(p)` is a pure function of the scrubbed playhead, so one scroll position always gives one pose.
- **`art/`**: the drawn product (`headphones.js`), the noise field (`wavefield.js`) and the balance (`balance.js`). For another product category, replace `headphones.js` with a drawing of that category that keeps the same `headphones(parent, {x, y, w, colors, image})` signature and 400 x 460 box. Then re-aim the three proofs at that product's real claims. Invent no facts the brief does not give.

## Adding a real product image

1. Export a transparent cutout (PNG or WebP), front view, roughly 400:460 portrait, at least 1200 px tall.
2. Put it next to `index.html`, for example `product.webp`.
3. Set `"image": "product.webp"` and `"imageAlt"` in `content.json`. The cutout replaces the drawing everywhere: hero, quiet stage, the balance pan and the summary.
4. Centre the cups at about 74% of the image height, so the quiet line runs through them. Otherwise change the `342 / 500` in `main.js`.
5. Keep the background transparent. The contact shadow is drawn by the page.

## Studio notes

- **Pins.** Pins use ScrollTrigger `pin: true`, so the studio's pin budget can measure them. CSS `sticky` is not counted by the check.
- **Reduced-motion check and the last half screen.** The check samples every half viewport and can stop up to half a viewport short of the page end. Text in that last strip, such as a footer line, is reported as never visible. This template ends on the buy button for that reason. If you add a footer, re-run `check`.
