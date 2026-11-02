# QA automation: what an agent can measure, and how

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


Synthesised 2026-10-30 from three independent model reviews (Fable 5.1, GPT-6 ASTRA, Gemini 4 Argon; raw answers kept in the research folder, not shipped). Thresholds are **proposed release gates**, chosen where the reviews agreed; they are not published perceptual limits. API names are standard Playwright, CDP and Performance APIs. None of this code has been run against a real project yet.

## 1. Result vocabulary (use it in qa.md)

Every check reports exactly one of: **measured pass**, **measured fail**, **critic judgment**, **needs human evidence**, **not tested**, **not applicable**. Each result names its evidence file, build, environment and coverage. "Not applicable" never means "the agent could not test it". An unsupported API reports **not measured**, never an empty pass.

## 2. The manifest comes first

Checks compare the build against an **independently authored** manifest exported at build time (for example `window.__beats` or `beats.json`): readable text ranges and selectors, camera holds, expected pin start and end, required facts and actions, the reduced-motion alternative. If the implementation reports its own behaviour as the expectation, nothing can fail.

## 3. Gates

| Check | Pass | How |
|---|---|---|
| Frame cadence, 4x CPU throttle | p95 rAF interval ≤ 20 ms; max ≤ 50 ms during any beat | rAF interval collector during a scripted sweep. A regression signal only: CPU throttling is host-relative and does not emulate a phone GPU |
| Long animation frames | none over 50 ms in warm steady-state scroll (50 ms is the API's own definition) | `PerformanceObserver` on `long-animation-frame`, else `longtask`; record cold start separately |
| Presented frames | dropped plus partial ≤ 1%, never three in a row | Chrome performance trace (rAF counting alone cannot see compositor drops) |
| Scrub layout shift | sum ≤ 0.01, no single shift > 0.005, keep every entry including `hadRecentInput` | `layout-shift` observer. Call it a scrub shift score, not CLS |
| Text still while readable | inside each declared reading range: line rects move ≤ 1 CSS px, opacity ≥ 0.98, not clipped or occluded | sample text `Range.getClientRects()` at interior stops and both boundaries, approaching from both directions |
| Camera still while readable | projected landmarks move ≤ 1 CSS px across the hold, including after scrolling stops for longer than the scrub catch-up | expose the camera or landmark projections through a dev-only adapter |
| Pins | start and end within 2 px of the manifest; total pinned scroll within the brief's budget; union of overlapping intervals | `ScrollTrigger.getAll().filter(t => t.pin)` |
| Progress affordance | inside each pin an element marked `[data-progress]` changes monotonically | sample at 20, 50, 80% of the pin |
| Scroll ownership | ten 100 px wheel ticks move `scrollY` by 1000 px ± 5%; no non-passive `wheel` or `touchmove` listener on window or document | `page.mouse.wheel`; CDP `DOMDebugger.getEventListeners` |
| Determinism | screenshot at a position reached from above equals one reached from below (≤ 0.5% pixels differ) | catches scroll-position hysteresis, timer-driven state and reveals that replay on reverse |
| Reduced motion | same required facts and actions reachable; zero narrative pins, parallax or automatic camera travel; remaining animations opacity or colour only | `page.emulateMedia({ reducedMotion: 'reduce' })`, then the same task script; also flip the preference mid-session |
| Text contrast over canvas or video | ≥ 4.5:1 (3:1 for large text) from **composited pixels** at 360 and 1440 px | crop each text box in a screenshot, compare glyph colour to the 20th and 80th percentile background. axe-core cannot see canvas or video pixels behind DOM text |
| Memory and cleanup | app-owned GPU resources released; repeated route changes show no unexplained growth against a documented baseline | `renderer.info.memory` before and after five navigations. three.js keeps some internal resources, so "returns to zero" is too strict |

## 4. Harness traps

- Playwright screenshot assertions disable CSS animations by default; for motion evidence set `animations: 'allow'`.
- `page.mouse.wheel()` resolves before scrolling finishes; record the actual `scrollY`, and never treat synthetic wheel input as trackpad or touch momentum.
- Reject runs where the tab was hidden; rAF pauses.
- Do not take screenshots or force layout reads during the performance pass; they add the work you are measuring. Run performance, geometry and visual passes separately.
- `document.getAnimations()` sees CSS and Web Animations only, not GSAP-on-objects or WebGL; an empty list proves nothing.
- Physical-phone results come from a human or a device farm. Without one, write "needs human evidence: physical device" and never pass it from desktop emulation.

## 5. Collector sketch

```js
// Inject after an explicit ready signal; returns cadence, shifts and long frames.
await page.evaluate(() => {
  const r = { dt: [], shifts: [], long: [], unsupported: [], hidden: document.visibilityState !== 'visible' };
  const obs = [];
  for (const [type, key] of [['layout-shift', 'shifts'], ['long-animation-frame', 'long']]) {
    if (!PerformanceObserver.supportedEntryTypes.includes(type)) { r.unsupported.push(type); continue; }
    const o = new PerformanceObserver(l => l.getEntries().forEach(e =>
      r[key].push({ t: e.startTime, d: e.duration, v: e.value, input: e.hadRecentInput })));
    o.observe({ type }); obs.push(o);
  }
  let prev, raf;
  const tick = t => { if (prev !== undefined) r.dt.push(t - prev); prev = t; raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', () => { r.hidden ||= document.visibilityState !== 'visible'; });
  window.__stopProbe = () => { cancelAnimationFrame(raf); obs.forEach(o => { o.takeRecords(); o.disconnect(); }); return r; };
});
// ...replay a fixed input trajectory: slow, fast, reverse, stop...
const result = await page.evaluate(() => window.__stopProbe());
```

## 6. Critic evidence for rendered video

Gate first: run `skills/code-film/scripts/freeze_check.py out/anim.mp4 --json` and record its result in `qa/checks.json` as check `video-freeze`. It fails any full-frame freeze over 0.5 s except an end card of at most 1 s, and more than 10% frozen in total. A fail stops review: the film goes back to the animator, and the critic is not run on a film that froze.

Fix the evidence before judging it:
- Contact sheets carry burned-in frame numbers and cover the **whole** film (one sheet covers 12 tiles; render as many sheets as needed). Tiles at least 640 px wide so text is legible.

```bash
ffmpeg -framerate 24 -i out/frames/%04d.png -vf "select='not(mod(n\,12))',scale=640:-1,drawtext=text='F%{eif\:t*24\:d}':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=6,tile=4x3" -fps_mode vfr reviews/contact_%02d.png
```

- Strips of 12 consecutive frames around the fastest move **and** around every boundary, reversal and suspicious event, not only one.
- A 1:1 native-resolution crop of any resting text across its hold.

## 7. Critic prompt (fresh context, Read-only tools)

```
You did not build this. You get: contact sheets with burned-in frame numbers, 12-frame strips,
360 px phone frames, the beat table and the brief's one sentence. Never the builder's description.
Judge only what is in the pixels.

1. EVIDENCE AUDIT. Do the sheets cover the whole piece? Do the strips include entry, peak and
   settle? List what cannot be judged from this evidence.
2. BLIND READ. Before reading the beat table, write one sentence: what is this about? Compare the
   hero noun and claim with the brief's sentence.
3. MEASURE. For each frame: the element the eye lands on first, with position as fractions of width
   and height; count elements that moved since the previous tile. For each strip: the hero's
   displacement between consecutive frames, as 11 numbers.
4. TEST against the beat table: two heroes moving at once; text moving or partly transparent during
   its read time (words × 0.3 s + 0.5 s, converted to frames); a label not touching its part; a
   cursor, highlight or object over glyphs; a crossed vector at a cut with no occluder; text unreadable
   at 360 px. Constant speed, a cut, a freeze or simultaneous motion is a defect only when it conflicts
   with the approved intent; say which.
5. CONFIRM. For each candidate, name the crop region; it is re-checked on a zoomed crop. Unconfirmed
   candidates are dropped.

Report every blocker (content loss, accessibility, broken function), then at most three other defects:
FRAME / SEE (positions as fractions) / WHY / STATUS (observed, hypothesis, not assessable) /
CONFIDENCE / FIX (smallest change) / PRESERVE / RECHECK.
If you find nothing you can point at, say so and list the missing evidence.
Do not certify smoothness, comprehension, comfort, audio, contrast or flash safety from stills.
```

## 8. What the critic cannot see, and the script that covers it

| Gap | Cover |
|---|---|
| One-frame pops between sampled tiles | frame-to-frame difference over every frame; flag a frame whose difference to both neighbours spikes above 3x their median, then auto-build a strip around it |
| Easing outside the strip | per-move speed graph from tracked positions; flag moves whose final 10% of travel still carries more than 30% of peak step |
| Text shimmer | 1:1 crop of resting text; zero pixel difference across the hold |
| Loop seam | position **and** velocity continuity: step size across N-1 to 0 within 15% of interior steps |
| Sound sync | decode the final file, detect onsets, pair each with its visual event from the beat table |
| Colour accuracy | render a swatch under the scene's tone mapping; ΔE2000 < 3 against the brand hex |
| Real product screens | asset manifest: each screen region resolves to an approved capture file by hash |
| Spec audit | expose live scene state through `renderAt`, then assert every number in the brief on every frame (one lab ran 71 checks over 480 frames; 6 failed the first time) |
| Frame excursions | project every moving element's bounding box per frame; flag anything within a margin of the frame edge or a keep-out block |
| Hit placement | the largest decoded peak per hit within about 1.5 ms of its target; report limiter gain reduction per hit |
| Taste and comprehension | a human at the approval gates. The skill keeps saying so |
