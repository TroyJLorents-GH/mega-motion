# Review checklist (gate for workflow step 7)

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


Mark each line **measured pass, measured fail, critic judgment, needs human evidence, not tested** or **not applicable**, with its evidence file. Machine-checkable gates and their thresholds live in `qa-automation.md`; this list is the reviewer's index to them. A reviewer who did not build the piece runs it against the brief and the references. Output: every blocker found, then the three other fixes that would improve the work most.

## Intent
- [ ] Blind read: a fresh-context critic, shown only the rendered frames, names the brief's hero noun and claim (critic judgment); first-time human viewers recorded separately (needs human evidence)
- [ ] Every beat names one hero, and that hero is visually dominant in its beat
- [ ] Every movement can be assigned one job: orient, reveal, respond, persuade
- [ ] The references' borrowed qualities are present; the rejected ones are absent

## Timing and easing
- [ ] UI feedback 100-200 ms; moves 200-500 ms; hero reveals 600-900 ms, or deliberate documented exceptions
- [ ] Exits shorter than entrances
- [ ] Three or fewer easing personalities, assigned by role, named in code
- [ ] At most one overshoot per screen
- [ ] Staggers follow reading order and overlap
- [ ] Hero text holds for read time with nothing moving over it

## Fast tests anyone can run
- [ ] One primary actor per beat: at most one element moves more than 10% of viewport width in the beat's main window; followers start later and travel less
- [ ] Settle check: sampled hero property shows the final 10% of travel carrying under 30% of peak step (arrivals ease out, nothing stops dead unless intended)
- [ ] One owner per animated value; no duplicate render loops (search `requestAnimationFrame`, `setAnimationLoop`, then confirm ownership)
- [ ] `renderer.info`: draw calls under budget; app-owned GPU resources released after unmount against a documented baseline
- [ ] Poster frame under 50 KB shows while heavy assets stream
- [ ] Router test: navigate to the page and away five times; memory is flat

## Composition, depth, camera
- [ ] One accent color, reserved for the hero
- [ ] Depth cues consistent: parallax ratios, contrast falloff, contact shadows
- [ ] Camera moves are motivated by content and settle before text
- [ ] Vector law holds across every section boundary
- [ ] Every hold is intended: stillness for reading or inspection is correct; an unintended dead beat with nothing to read is a defect

## 3D (if present)
- [ ] One key light plus environment map; roughness contrast visible
- [ ] Contact shadow present
- [ ] No pure black or pure white as 3D material albedo (CSS page backgrounds are exempt)
- [ ] Exposure calibrated with an 18% grey card; brand swatch under the scene's tone mapping within ΔE2000 3 of the CSS hex

## Scroll (if present)
- [ ] Scroll ownership: ten 100 px wheel ticks move 1000 px ± 5%; no non-passive wheel or touchmove listeners
- [ ] Readable at any stopping point: text inside declared reading ranges is opaque and still at boundaries and interior stops, approached from both directions
- [ ] Pins: within the brief's pin budget (default under about 60% of page length); every pin shows progress and has a readable stop point at least once per viewport height
- [ ] Progress visible in any scrub longer than two viewport heights
- [ ] Scroll ranges in viewport units; tested at 360 px and 1440 px widths

## Interaction (if present)
- [ ] Input acknowledged under 100 ms
- [ ] Focus states equal to hover states, plus visible outline
- [ ] Nothing depends on hover alone
- [ ] One spring for the product

## Accessibility
- [ ] `prefers-reduced-motion: reduce` variant exists, conveys the same information and affordances (task-based parity check, including switching the preference mid-session)
- [ ] Autoplay content over five seconds beside other content has pause/stop/hide (WCAG 2.2.2 A)
- [ ] Keyboard-only path through every animated interactive element
- [ ] Works with sound off

## Performance and loading
- [ ] 60 fps during the heaviest beat with 4x CPU throttle; number recorded
- [ ] Physical mid-range phone: device, OS, browser, build and a trace or recording attached; otherwise marked "needs human evidence", never passed from emulation
- [ ] Per-frame motion uses compositor-friendly properties (transform, opacity, clip-path, mask, shader uniforms); Performance panel shows no recurring layout or paint storms
- [ ] First content paints before heavy assets; placeholder is a finished composition
- [ ] 3D first-frame payload under budget after gltf-transform; sizes recorded
- [ ] No long animation frame over 50 ms during warm scroll; p95 frame interval under 20 ms at 4x CPU throttle

## Code-rendered video (if present)
- [ ] Hook lands within the first 2 seconds
- [ ] Contact sheet, strip and 360 px phone test reviewed for every format separately
- [ ] Determinism: one frame rendered twice gives identical hashes
- [ ] Loop check played three times: no seam, no audio click
- [ ] Muted: every claim in the beat table is carried by on-screen text or a visible state change. Audio shape: dynamic contrast measured; the blindfold listen is needs human evidence
- [ ] Sound sync measured from the decoded final file against each cue's intended relationship (house default for impacts: about one frame after picture)
- [ ] Integrated loudness and true peak measured on the final encode
- [ ] Text contrast from composited pixels: 4.5:1, or 3:1 for large text, on every sampled frame (axe-core cannot see canvas or video behind text); no more than three flashes in any second (WCAG 2.3.1)
- [ ] Poster frame is a finished composition
- [ ] Every product screen resolves by hash to an approved capture in the asset manifest
- [ ] Delivery checked against the platform spec with `check.py final.mp4 --platform X --content` (adds black-frame, frozen-frame, silence and dropout rows; map its `format` rows to measured results and `judgement` rows to critic judgment)
- [ ] Captions checked against the platform's UI with `look.py --safe <platform>`

## Maintainability
- [ ] All durations and easings in one tokens file
- [ ] One timeline per section; sections independently removable
- [ ] Beat table matches the build; nothing moves that is not in it
- [ ] qa.md lists device, numbers, known gaps

## Honest reporting
- [ ] Everything claimed as tested has a recorded result
- [ ] Everything not tested is listed as not tested
