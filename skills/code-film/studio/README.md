# The mega-motion studio

A harness that turns a seekable HTML composition into a finished video with sound, plus the checks and review evidence that prove it is done. It runs on macOS, Windows and Linux.

## Start a film

```
node <code-film skill>/scripts/new_film.mjs my-film --template launch-reel
cd my-film
npm install
```

`npm install` brings Playwright and the fonts (Inter Tight and JetBrains Mono, both OFL). The renderer uses Playwright's Chromium if it was downloaded (`npx playwright install chromium`), otherwise installed Google Chrome, otherwise Microsoft Edge, which every Windows machine has.

Needs: Node 18+ and ffmpeg on PATH. Python 3 is optional and adds the score and the freeze check.

## What is in a film folder

| File | What it is |
|---|---|
| `film.json` | Everything a non-coder changes: size, fps, duration, palette, the words, beat times, tempo and chords |
| `index.html`, `film.js` | The composition: a pure function of time, drawn by `draw(t)` |
| `glass.js` | (launch-reel) a drawn glass of a dark drink that pours, fills and settles; a category stand-in, never a brand's packaging |
| `score.py` | The sound: cues placed on the events the composition reports |
| `studio/render.mjs` | Preview, stills, contact sheets, the film, and the checks |
| `studio/kit.js` | Motion kit: easings, closed-form springs, seeded noise, text fitting, live and render loop |
| `studio/freeze_check.py` | Fails a film whose frame freezes |
| `sfx/`, `run_sfx.py` | Procedural sound engine, pure-stdlib Python |
| `out/` | Renders, `timeline.json`, `review/contact.png`, `review/checks.json` |

## Commands

```
node studio/render.mjs preview                     watch it live in a browser (space, arrows, r)
node studio/render.mjs still 4.3                   one frame
node studio/render.mjs stills                      contact sheet, one tile per beat (+0.35 s)
node studio/render.mjs stills every:0.5            whole film, every half second
node studio/render.mjs stills every:0.04 --from 5.4 --to 5.9 --out out/review/strip-zoom.png
node studio/render.mjs film                        score, MP4, freeze check, determinism, contact sheet
node studio/render.mjs film --reduced              the reduced-motion version, rendered on purpose
node studio/render.mjs check                       re-run the checks on the last film
```

Options: `--fps 60`, `--crf 18` (lower is larger and sharper; default 20), `--from`/`--to`, `--no-audio`, `--cols`.

## The page contract

A composition calls `boot(setup)` from `studio/kit.js`. `setup(film)` builds the DOM once and returns `draw(t)`. `boot` exposes `window.seek(t)` and sets `window.__ready` after fonts and setup. With `?render` in the URL nothing runs on a clock; without it, the page plays live.

- `draw(t)` sets every visible property from `t` alone. No `Date`, timers, `requestAnimationFrame` or `Math.random` (use `rand` and `noise` from the kit).
- Hide scenes with `display: none`, never `visibility: hidden`: a child set back to `visible` still shows inside a hidden parent, and only an out-of-order render reveals it.
- No `will-change: transform` in a composition: Chrome caches the layer's pixels at one scale, so text goes soft during a camera push and frames depend on render order.
- Push sound cues to `window.EVENTS` as `{t, kind}`. The renderer writes them to `out/timeline.json` and `score.py` places a sound on each, so sound and picture share one clock.
- Respect `prefers-reduced-motion`: the kit's `reducedMotion()` tells you; replace movement with opacity. The main render forces full motion explicitly.

## The checks

`film` fails, with exit code 1, when any automatic check fails:

| Check | Pass when |
|---|---|
| Freeze | no full-frame freeze over 0.5 s except an end card of at most 1 s; under 10% frozen in total |
| Rhythm | something visibly new (a reveal, cut or hit) at least every 2.5 s; grain and drift do not count, so a held card fails |
| Determinism | three frames reached in two different orders look the same (identical, or PSNR at least 60 dB) |
| Safe zone | no settled text inside the margins in `film.json` "safe" (default TikTok: top 10%, right 14%, bottom 22%); text in motion is exempt |

Then the `motion-critic` agent reviews `out/review/contact.png` and 12-frame strips around each transition. The automatic checks prove the film works; only the review says whether it is good.

## Credits

The capture loop follows `sims/capture.mjs` from [elvarofficial/teardown](https://github.com/elvarofficial/teardown) (MIT). The sound engine in `sfx/` is vendored from teardown, which took it from [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) (MIT); its notice is in `LICENSES/`. Changes: ffmpeg is found on PATH instead of a fixed Windows path, output goes to `out/`, no recorded samples are shipped.
