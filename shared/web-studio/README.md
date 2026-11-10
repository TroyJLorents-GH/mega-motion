# The mega-motion web studio

The website sibling of the video studio (`skills/code-film/studio/`): it serves a motion page, captures review evidence and runs automatic checks. It is used by the `scroll-story`, `web-3d` and `ui-motion` templates. It runs on macOS, Windows and Linux.

## Start a page

```
node <plugin>/shared/web-studio/new_page.mjs my-page --template scroll-story/product-story
cd my-page
npm install
```

Templates live in each skill's `templates/` folder; `new_page.mjs` lists them when run without one. `npm install` brings Playwright, GSAP, Lenis, three.js and the fonts. Playwright's Chromium is used if downloaded, otherwise Chrome, otherwise Edge.

## Commands

```
node studio/web.mjs preview    serve the page and print a URL
node studio/web.mjs shots      labelled contact sheets down the page at 390 px (phone) and 1440 px (desktop)
node studio/web.mjs check      automatic checks; writes out/review/checks.json and exits 1 on a fail
node studio/web.mjs film       a recorded scripted run at both widths (out/run-phone.mp4, out/run-desktop.mp4)
node studio/web.mjs moments    timed strips of the gestures a contact sheet can't show (intro, page change, hover, menu, pointer)
```

Options: `--step 0.5` (viewport heights between shots), `--cols N`, `--seconds N` (film length), `--port N`.

## The page contract

`page.json`: `{"entry": "index.html", "kind": "scroll" | "interface", "readable": "[data-read]", "maxPinned": 0.6}`.

- Set `window.__ready = true` once fonts, models and layout are ready.
- With `?capture` in the URL, drop scroll smoothing and any lerped catch-up (`scrub: true`, no Lenis), so a scroll position always shows the same frame.
- Expose `window.ScrollTrigger = ScrollTrigger` when you use it, so the pin budget can be measured.
- Mark text that must hold still while read with `data-read="a,b"`: the page-scroll fractions (0 to 1) during which it is read.
- Interface pages expose `window.__tour` (an array of `{label, hold}`) and `window.__tourStep(i)`, which performs step `i` (a click, a drag, a toggle) the way a person would.
- Respect `prefers-reduced-motion`: same content, no travel, no parallax, no scrubbed camera.
- Declare `"moments"` in page.json for every gesture that matters: `{"label", "click" | "hover" | "move" | "load", "scrollTo", "ms", "frames", "at"}` (`move` is a list of `[x, y]` viewport fractions; `load` captures from navigation start; `at` limits viewports). `moments` records each one live, in real time, as a labelled strip (`out/review/moment-<label>-<width>.png`). A critic can't rate a page transition or a hover it never saw, so a template without moments caps its own review.

## The checks

| Check | Pass when |
|---|---|
| No horizontal scroll | the page is never wider than the screen, at 390 and 1440 px |
| Text still while read | every `data-read` element keeps its box (within 1.5 px) and full opacity across its range |
| Pin budget | pinned scroll is under `maxPinned` (default 60%) of the page |
| Frame pacing | p95 frame interval at most 20 ms during a scripted scroll at 4x CPU throttle (a regression signal, not a phone) |
| Feedback under 100 ms | (interface) each tour step changes something visible within 100 ms |
| Survives fast repeats | (interface) five rapid repeats of every step cause no errors |
| No page errors | no uncaught errors or console errors |
| Reduced motion keeps content | with reduced motion, every word on the page becomes visible somewhere down the page |

Then the `motion-critic` agent reviews `out/review/shots-phone.png`, `shots-desktop.png`, the `moment-*.png` strips and strips from the recordings. The checks prove it works; only the review says whether it is good.
