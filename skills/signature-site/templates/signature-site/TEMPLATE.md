# signature-site

A personality site in the award-site manner: one brand gesture, repeated. The brand mark opens as a mask on the intro, covers every page change and, in miniature, a block of brand colour wipes off every heading. Between thresholds everything is calm and scrubbed: CSS-sticky chapters, a 1:1 horizontal gallery and a pointer-reactive 3D hero. Two pages (`index.html`, `climbs.html`) share `main.js`, `styles.css` and `content.json`, so the page transition is real.

The demo brand is fictional and wholly original: Kai Moreno, a sport climber. The KM monogram is one SVG path. The palette is near-black, bone and electric blue. Every image is drawn in code: a displaced-icosphere boulder, stratified rock panels with route topos, and contour-line backgrounds. There are no photographs.

```
node <plugin>/shared/web-studio/new_page.mjs my-site --template signature-site/signature-site
cd my-site && npm install
node studio/web.mjs shots | check | film
```

## The beats

Scroll ranges are measured at 1440 x 900; the page is about 8.6 viewport heights. Pinned scroll is 35% of the page on desktop and 40% on phone (the budget is 60%).

| # | Beat | Trigger or scroll | Motion | Numbers | Reduced motion |
|---|---|---|---|---|---|
| 0 | Brand threshold: intro | first paint until ready | The screen is solid accent with the mark breathing (5%) at 30 px. Fonts, GL compile and the procedural images all load under it. Then a mark-shaped hole opens past the viewport. | min hold 600 ms; reveal 380 ms expo.in | 200 ms fade |
| 0 | Brand threshold: page change | click on a same-origin page link | The mark slab grows from the click point (or from the link's centre on keyboard activation) until the screen is solid. It holds while the next page is fetched, then navigates. The new page opens the mirrored hole. | cover 370 ms expo.in; hold 250 to 900 ms; reveal 335 ms | 200 ms fade in, hold, 200 ms fade out |
| 1 | Hero (sticky 1 vh in a 2 vh track) | 0 to 1 vh | The full-bleed GL view clips to a card while the camera dollies back and the image desaturates. The rock follows the pointer with lag, and the pointer trail reveals the painted layer under the survey lines. If no pointer moves, one autonomous stroke plays. | card 31 vw x 38 vh (phone 74 vw x 40 vh); scrub, power1.inOut; follow 0.03 per frame; trail fades over 600 ms; DPR 1.25 desktop, 2 phone | full-bleed still with the painted layer showing; not sticky |
| 2 | About (sticky 0.65 vh) | about 2 to 2.65 vh | The heading wipes in, then the bio holds still (`data-read`) while the contour layer behind drifts 5%. | wipe 0.6 + 0.6 s | not sticky, no drift |
| 3 | Numbers (flow) | on enter | The three figures arrive with the house wipe, final values only (no counting: a grade is a fact, and a count is a second gesture). The labels wipe after. | wipe timings | final values |
| 4 | Quote (flow) | on enter | The quote wipes line by line in the accent. | line stagger 80 ms | final state |
| 5 | Gallery (sticky; track = 1 screen + overflow) | about 4.4 to 5.6 vh | The rail moves exactly 1 px across per 1 px scrolled. The ground shifts to bone, and the text colour flips to stay readable. The progress bar and the counter follow. On hover, the overlay fades in, the image scales from 1 to 1.1 and the route topo opens in a growing ellipse. | linear 1:1; colour power2.out; hover 0.75 s house curve | stacked grid on bone; hover is opacity only |
| 6 | Contact (flow, bone) | on enter | The heading wipes with an ink block. Buttons roll their letters. | roll 0.6 s, 15 ms stagger | no roll; underline on hover |
| - | Menu | button | A dark panel drops with a convex bottom curve, then the links line-reveal. Escape, a click outside and the button close it. Focus is trapped inside and returns to the button. | 320 ms expo.out; links 0.6 s, 50 ms stagger | 200 ms fade |
| - | climbs.html | load or transition | The hero heading and the column labels wipe in, and each row's name wipes as it enters. On hover, a row's thumbnail opens its topo. | as above | final state, grid untouched |

## House rules

- **One gesture.** The threshold, the page change and the heading wipes are one brand-colour event. Do not add a second threshold style (a slide, a crossfade). The hold is the real load time, bounded at 250 to 900 ms, never a fixed long wait.
- **Never stuck.** The inline head script lifts the cover after 6 s if `main.js` never runs, and `main.js` lifts it after 8 s if anything throws. A cover that has not navigated in 4 s reveals again. A back/forward or bfcache restore plays the short reveal.
- **One house curve.** Hovers and state changes use `cubic-bezier(0.65, 0.05, 0, 1)`. The brand mask uses expo.in. Anything scrubbed is linear or power1.inOut.
- **Sticky pins only.** Pins are CSS `position: sticky`; ScrollTriggers only read progress. Elements inside a sticky frame carry `data-sticky` on the frame, so their wipes are triggered from the track.
- **Hidden cost.** GL compile, fonts and the procedural images run under the brand screen. Images yield between cards so the mark keeps breathing.
- **Smoothing.** Lenis (lerp 0.1) runs on desktop wheel input only (`motion.smoothScrollOnDesktop`). It is off on touch, under reduced motion and under `?capture`.
- **`?capture`.** There is no intro and no Lenis. Wipes are scrubbed by scroll position. The hero has a fixed painted stroke and a scroll-driven pose. Anything already above the fold at load shows complete.
- **Accessibility.** Pages use real links and a skip link, with a focus ring on everything. Canvases carry `role="img"` and an aria-label, or are `aria-hidden`. Rolled button text is kept in a visually hidden span. The menu is a modal dialog with focus trapped inside, and the page behind it is `inert`.

## What to edit

- **Card light**: each climb's `light` (noon, dusk, blue, cave, moon, sea, dawn, lamp) grades its stone, and `climber` ([x, y, facing]) puts a figure on the wall. Give every card a different light so the gallery reads as different places.


- **`content.json`**: every word, link, number and colour.
  - `palette`: `ground`, `bone`, `accent`, `muted`, `raise` (panels), `rule`. Keep the fallbacks at the top of `styles.css` in step with these, because they paint before the JSON arrives. Text on the accent uses the ground colour, which passes contrast where white does not.
  - `mark`: the brand monogram.
    - `path` is one SVG path in a `viewBox` of `[width, height]`. Use a heavy, simple, closed shape that reads at 30 px and at full screen.
    - `cores` lists rectangles (`[x, y, w, h]` in mark units) lying fully inside the solid shape. The hole grows around whichever core needs the least scale to cover the screen. For a new mark, list its thickest stems; without cores the threshold still works but grows much further.
    - `introHeight` is the mark's height on the brand screen, in px.
  - `nav`, `menu`, `footer`: chrome text and links.
  - `home.hero`, `home.about` (`facts`), `home.stats.items` (`value`, `suffix`, `label`), `home.quote`, `home.gallery`, `home.contact`.
  - `climbs`: the list. Entries with `featured: true` appear in the gallery. Each entry's `seed` draws its rock and topo, and `id` is the anchor its card links to.
  - `climbsPage`: the second page.
- **`tokens.js`**: every duration, easing and distance: `THRESHOLD`, `WIPE`, `HERO` (card size, centre, fill, desaturation, follow, brush, DPR caps), `GALLERY`, `UI` and `SCROLL` (the about hold length). Change numbers here, not in code.
- **`art/`**: the drawings.
  - `hero-rock.js` holds the boulder and its two shader layers; `seed` changes its shape.
  - `rock-art.js` draws the rock panels, the route topos and the contour backgrounds; the `STONES` tints live there.
  - `noise.js` is seeded gradient noise.
  - To use a real 3D model, keep `createHeroRock`'s API (`layout`, `setProgress`, `start`, `stop`, `sweep`, `warm`) and swap the geometry.
- **`motion/`**: `threshold.js` (the brand mask and page transitions), `wipe.js` (the line split and highlight wipe) and `ui.js` (rolling buttons and the menu).
- **Adding a page**: copy `climbs.html`, keep the threshold SVG, the head script, the nav and the menu, then give `body` a new `data-page` and build its content in `main.js`. Links to it get the transition automatically.

## Studio notes

- `page.json` points the harness at `index.html` only. Check `climbs.html` yourself: open it at 390 px and 1440 px for errors and horizontal scroll.
- The text-still check reads `data-read`, which is set at runtime on the hero name, the about bio and the gallery title (each inside its sticky frame). Text in normal flow cannot be `data-read`, because it moves.
- Real phone GPU cost and touch inertia are not measured headless. Test the hero on a device before shipping.
