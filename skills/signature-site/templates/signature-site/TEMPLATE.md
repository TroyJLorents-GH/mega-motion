# signature-site

A personality site in the award-site manner: one brand gesture, repeated. The brand mark opens as a mask on the intro, covers every page change and, in miniature, a block of brand colour wipes off every heading. Between thresholds everything is calm and scrubbed: CSS-sticky chapters, a 1:1 horizontal gallery and a pointer-reactive 3D hero. Two pages (`index.html` and `works.html`, the list of works) share `main.js`, `styles.css` and `content.json`, so the page transition is real.

The template is brand-neutral: every word, colour, link, the mark, the list of works, the hero shape and the art style come from `content.json`, plus any photos or a `.glb` you drop into the folder. No code edit is needed for a new brand (see **Make it yours**). The demo brand is fictional and wholly original: Kai Moreno, a sport climber. The KM monogram is one SVG path. The palette is near-black, bone and electric blue. Every image is drawn in code: a displaced-icosphere boulder, stratified stone panels with route topos, and contour-line backgrounds. A second brand made from content alone (Ilse Varga, a cellist: an IV mark, espresso and vermilion, a record for the hero, wood-grain cards, ring backgrounds) is the proof that it carries over.

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
| 1 | Hero (sticky 1 vh in a 2 vh track) | 0 to 1 vh | The full-bleed GL view clips to a card while the camera dollies back and the image desaturates. The object follows the pointer with lag, and the pointer trail reveals the painted layer under the survey lines. If no pointer moves, one autonomous stroke plays. | card 31 vw x 38 vh (phone 74 vw x 40 vh); scrub, power1.inOut; follow 0.03 per frame; trail fades over 600 ms; DPR 1.25 desktop, 2 phone | full-bleed still with the painted layer showing; not sticky |
| 2 | About (sticky 0.65 vh) | about 2 to 2.65 vh | The heading wipes in, then the bio holds still (`data-read`) while the contour layer behind drifts 5%. | wipe 0.6 + 0.6 s | not sticky, no drift |
| 3 | Numbers (flow) | on enter | The figures arrive with the house wipe, final values only (no counting: a figure is a fact, and a count is a second gesture). The labels wipe after. | wipe timings | final values |
| 4 | Quote (flow) | on enter | The quote wipes line by line in the accent. | line stagger 80 ms | final state |
| 5 | Gallery (sticky; track = 1 screen + overflow) | about 4.4 to 5.6 vh | The rail moves exactly 1 px across per 1 px scrolled. The ground shifts to bone, and the text colour flips to stay readable. The progress bar and the counter follow. On hover, the overlay fades in, the image scales from 1 to 1.1 and the second image (survey drawing or duotone photo) opens in a growing ellipse. | linear 1:1; colour power2.out; hover 0.75 s house curve | stacked grid on bone; hover is opacity only |
| 6 | Contact (flow, bone) | on enter | The heading wipes with an ink block. Buttons roll their letters. | roll 0.6 s, 15 ms stagger | no roll; underline on hover |
| - | Menu | button | A dark panel drops with a convex bottom curve, then the links line-reveal. Escape, a click outside and the button close it. Focus is trapped inside and returns to the button. | 320 ms expo.out; links 0.6 s, 50 ms stagger | 200 ms fade |
| - | works.html | load or transition | The hero heading and the column labels wipe in, and each row's title wipes as it enters. On hover, a row's thumbnail opens its second image. | as above | final state, grid untouched |

## House rules

- **One gesture.** The threshold, the page change and the heading wipes are one brand-colour event. Do not add a second threshold style (a slide, a crossfade). The hold is the real load time, bounded at 250 to 900 ms, never a fixed long wait.
- **Never stuck.** The inline head script lifts the cover after 6 s if `main.js` never runs, and `main.js` lifts it after 8 s if anything throws. A cover that has not navigated in 4 s reveals again. A back/forward or bfcache restore plays the short reveal.
- **One house curve.** Hovers and state changes use `cubic-bezier(0.65, 0.05, 0, 1)`. The brand mask uses expo.in. Anything scrubbed is linear or power1.inOut.
- **Sticky pins only.** Pins are CSS `position: sticky`; ScrollTriggers only read progress. Elements inside a sticky frame carry `data-sticky` on the frame, so their wipes are triggered from the track.
- **Hidden cost.** GL compile, fonts and the procedural images run under the brand screen. Images yield between cards so the mark keeps breathing.
- **Smoothing.** Lenis (lerp 0.1) runs on desktop wheel input only (`motion.smoothScrollOnDesktop`). It is off on touch, under reduced motion and under `?capture`.
- **`?capture`.** There is no intro and no Lenis. Wipes are scrubbed by scroll position. The hero has a fixed painted stroke and a scroll-driven pose. Anything already above the fold at load shows complete.
- **Accessibility.** Pages use real links and a skip link, with a focus ring on everything. Canvases carry `role="img"` and an aria-label, or are `aria-hidden`. Rolled button text is kept in a visually hidden span. The menu is a modal dialog with focus trapped inside, and the page behind it is `inert`.

## Make it yours

Edit `content.json` and drop your files into the folder. Nothing else needs to change. Then run `node studio/web.mjs check`, `shots` and `moments`, and look at every sheet.

### Every content key

- **`meta`**: `title` (the home page's tab title), `description`, `lang`.
- **`palette`**: six-digit hex values only (`#RRGGBB`). `ground` is the page; `bone` is the light ground and light text; `accent` is the brand colour (the threshold, the wipes and the buttons); `muted` is secondary text; `raise` is panels, the menu and the hero stage; `rule` is hairlines. Text on the accent is drawn in `ground`, so pick an accent that the ground colour reads on. The `<head>` reads this palette before the first paint, so the very first frame is already your colour.
- **`mark`**: the brand monogram that opens and covers every page.
  - `path` is one SVG path (it may hold several subpaths) in a box of `viewBox: [width, height]`. Use a heavy, simple, closed shape that reads at 30 px and at full screen.
  - `cores` lists rectangles (`[x, y, w, h]` in mark units) lying fully inside the solid shape: its thickest stems. The opening hole grows around whichever core needs the least scale. Without cores it still works but grows much further.
  - `introHeight` is the mark's height in px on the brand screen. `label` is for your own reference.
- **`nav`**: `skip` (the skip link), `homeLabel` (the aria-label of the mark link), `primaryLabel` (the aria-label of the link row), `links` (`[{label, href}]`, shown on desktop), `contact` and `contactHref` (the pill button), and `menu` and `close` (the menu button's two labels).
- **`menu`**: `label` (the dialog's aria-label), `links` (`[{label, href}]`), `note` and `email`.
- **`home.hero`**: `eyebrow`, `name` (the huge title), `coords` (the small top-right line), `canvasLabel` (the 3D view's aria-label), and the object:
  - `shape` is `"rock"` (a boulder), `"disc"` (a record or coin), `"orb"` (a sphere with relief), `"ring"` (a torus) or `"model"`.
  - `seed` changes the relief of the rock, orb and ring.
  - `model` is the path to your `.glb` when `shape` is `"model"`.
  - `fallback` is the shape shown if the model will not load (default `"orb"`). The failure is also logged as a console error, so `check` fails and tells you.
  - `rotation` is an optional resting pose, `[x, y, z]` in radians.
- **`home.about`**: `eyebrow`, `heading`, `body`, `facts` (`[{label, value}]`, any count).
- **`home.stats`**: `eyebrow`, `items` (`[{value, suffix, label}]`, any count). Long figures shrink to fit, all at one size.
- **`home.quote`**: `text`, `by`, `where`.
- **`art.photoGrade`**: `"duotone"` (default) maps every photo to the palette, shadows to the ground colour and highlights to bone, so the accent stays the only colour and a card's hover returns the photo in its own colour. `"none"` keeps photos as shot (the hover then shows an accent duotone).
- **`worksPage.lead`** (a work id; default the first work with a photo) and **`worksPage.leadCaption`** (two `{field}` strings): the second page opens onto that photograph beside its heading.
- **`menu.now`**: one line in the menu about what the person is doing now. With any photos in the content, the menu shows a preview photo per link (`menu.links[].image`, else the About portrait and the works' photos in turn) that swaps on hover.
- **`home.about.image`** (optional): a portrait of the person, revealed by the house gesture (a brand block retracting off it). `imageAlt` is its alt text, `imageFocus` its CSS object-position (for example `"40% 35%"`). A personality site with no image of the person reads as a template, so add one when you can.
- **`home.gallery`**: `eyebrow`, `heading`, `cardMeta` (the line under each card: a list of strings using `{field}` placeholders, for example `["{kind}", "{where}", "{year}"]`), `cardCta` (the hover overlay) and `cardLabel` (the aria-label prefix of drawn images).
- **`home.contact`**: `eyebrow`, `heading`, `body`, `primary` and `secondary` (`{label, href}`).
- **`works`**: the list, in order. Each work has:
  - `id` (its anchor on the works page; generated if missing), `title`, `year` and `note`.
  - Any fields of your own (`grade`, `venue`, `client`, `role` and so on), which `cardMeta`, `worksPage.fields` and `worksPage.rowMeta` show through `{field}`.
  - `featured: true` puts it in the home gallery (with none featured, the first six are used).
  - `image`: a path to your photo. With it, the card shows the photo and its hover reveals the same photo as a duotone in your colours, or `image2` if you give one. `imageAlt` is its alt text.
  - Without an image, the card is drawn in code: `seed` shapes it, and `light` grades it (`noon`, `dusk`, `blue`, `cave`, `moon`, `sea`, `dawn` or `lamp`). Give every card a different light so the gallery reads as different places.
  - `climber: [x, y, facing]` adds a small figure on a drawn card. It is opt-in, for brands where a person on a wall makes sense.
- **`worksPage`**: the second page.
  - `file` is its file name (default `works.html`).
  - `title` is its tab title. `eyebrow`, `heading` and `intro` are the page head.
  - `columns.no` and `columns.title` label the first columns.
  - `fields` lists the further columns, as `[{label, value, style}]`: `value` uses `{field}` placeholders, and `style` is `accent` (big, in the brand colour), `text` or `mono` (small caps, for years and codes).
  - `rowMeta` is the line that replaces those columns on phones.
  - `thumbLabel` is the aria-label prefix of drawn thumbnails. `outro` holds the closing heading and two buttons.
- **`art`**: `surface` is `"stone"` (strata and cracks) or `"grain"` (long fibres: wood, brushed metal, combed sand), for every drawn card. `pattern` is the section backgrounds: `"contours"`, `"rings"` or `"none"`. `route: true` draws a line with stops on each card's hover image (a climbing topo); leave it `false` otherwise.
- **`footer`**: `note`, `copy`, `top`.
- **`motion.smoothScrollOnDesktop`**: Lenis on desktop wheels.

**Links.** Any `href` may be `"@home"` or `"@works"`, with an optional anchor (`"@home#contact"`), instead of a file name. Those resolve to `index.html` and `worksPage.file`, so renaming the second page is one edit. Links to whole pages get the brand threshold automatically.

### Photos

Put them anywhere in the folder (for example `images/`) and set `image` (and optionally `image2` and `imageAlt`) on each work. Cards are 3:4 portrait and thumbnails are wide, both cropped with `object-fit: cover`, so about 1200 x 1600 px JPG or WebP is plenty. Photos decode under the brand screen, like the fonts and the GL. A missing file is a console error, so `check` catches it.

### A 3D model

Put a `.glb` in the folder (for example `models/thing.glb`) and set `home.hero.shape` to `"model"` and `home.hero.model` to its path. It is centred and scaled to the same size as the procedural shapes and gets the same two layers. Its own materials (lit by a soft room environment) are the painted layer the pointer trail reveals. Over them sits the survey layer: the model in the ground colour with accent contour lines and an accent rim, desaturating into the card like the procedural shapes. Draco and meshopt compression are supported. Not supported: KTX2 textures, animation (the model is shown in its rest pose), and the survey layer on skinned, morphing or instanced meshes (those show their own material only). Keep the file under about 5 MB, because it loads under the brand screen.

### Renaming the second page

Rename `works.html` to anything ending in `.html`, then set `worksPage.file` to the new name. Links written `@works` follow automatically, and the studio's page-change moment finds the link by role (`a[data-to='works']`), not by file name. If `worksPage.file` names a file that is not there, `check` fails with that message.

### What still needs code

- **Fonts.** Inter Tight and JetBrains Mono are linked in both HTML heads and named in `styles.css` (`--sans`, `--mono`). A different face needs a package (or files), the links and those two variables changed.
- **A new section or a third page.** Copy `works.html`, keep the threshold SVG, the head script, the nav and the menu, give `body` a new `data-page`, and build its content in `main.js`.
- **New light moods, surface styles or hero shapes**: `art/card-art.js` (`MOODS`, `surfaceField`) and `art/hero-object.js` (`SHAPES`).

## The code, for when you do need it

- **`tokens.js`**: every duration, easing and distance: `THRESHOLD`, `WIPE`, `HERO` (card size, centre, fill, desaturation, follow, brush, DPR caps), `GALLERY`, `UI` and `SCROLL`. Change numbers here, not in code.
- **`art/`**: the drawings.
  - `hero-object.js` holds the hero shapes, the GLB loader and the two shader layers.
  - `card-art.js` draws the surfaces, the survey images and the section patterns.
  - `noise.js` is seeded gradient noise.
- **`motion/`**: `threshold.js` (the brand mask and page transitions), `wipe.js` (the line split and highlight wipe) and `ui.js` (rolling buttons and the menu).
- **`main.js`**: reads `content.json` and builds both pages from it. Nothing brand-specific lives there.
- **`styles.css`**: the colour values at its top are only used if `content.json` cannot be read. Every derived colour (the hero stage, overlays, the scrim) is mixed from the palette.

## Studio notes

- `page.json` points the harness at `index.html` only; the page-change moment does show the works page arriving. Check the works page itself too: open it at 390 px and 1440 px for errors and horizontal scroll.
- The text-still check reads `data-read`, which is set at runtime on the hero name, the about bio and the gallery title (each inside its sticky frame). Text in normal flow cannot be `data-read`, because it moves.
- Real phone GPU cost and touch inertia are not measured headless. Test the hero on a device before shipping.
