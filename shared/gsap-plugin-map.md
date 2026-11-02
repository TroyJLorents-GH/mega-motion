# GSAP plugins by job

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


| Job | Plugin |
|---|---|
| Scroll trigger, scrub, pin | ScrollTrigger |
| Text split for line or word reveals | SplitText (use the `aria-hidden` plus `.sr-only` duplicate pattern when text contains links) |
| Layout change without a jump | Flip |
| Line-art drawing on | DrawSVG |
| Shape transitions | MorphSVG |
| Movement along a curve, orbiting labels | MotionPath, MotionPathHelper to author |
| Hand-drawn easing curves from a reference | CustomEase |
| Scroll or pointer intent without scrolling | Observer |
| Drag with momentum | Draggable plus Inertia |
| Inertial page scroll and parallax effects | ScrollSmoother, with the same caveats as any smooth-scroll library |
| Timeline scrubber while developing | GSDevTools |

For API detail, use the installed official gsap-skills or gsap.com/docs. (The author's local GSAP notes are machine-specific and must not ship in a plugin.)

### More jobs, and when not to

Pin one GSAP version for the core and every plugin (mixing 3.14.1 and 3.15.0 in one project is a common slip).

| Job | Plugin | Not for |
|---|---|---|
| Jump-to-section navigation | ScrollTo, `offsetY` = measured sticky-header height | changing how the wheel feels |
| Decode or "hacker" text on short labels | ScrambleText | body copy; keep the real string in the DOM and scramble an `aria-hidden` copy |
| One-off bursts (confetti, sparks) | Physics2D | UI layout; in films precompute seeded values |
| Filters on an existing Pixi scene | PixiPlugin | adding Pixi just to get a filter |
| Recolour a theme | tween one CSS custom property on `:root` | per-element colour tweens (CSSRulePlugin is rarely needed now) |
| Drawing a motion path while authoring | MotionPathHelper `editPath` | shipping; copy the path out and remove the helper |
| EaselJS / CreateJS canvas | EaselPlugin | new work |

### SplitText settings (checked against the official gsap-plugins skill)

- Split after `document.fonts.ready`, or use `autoSplit: true` and build the tween inside `onSplit(self)`, returning it, so SplitText re-splits on resize or font load and keeps the animation in sync (3.13+).
- Hide the block with `visibility: hidden` until split, so it does not flash.
- Split only what you animate; chars are expensive. For line reveals use `mask: "lines"`.
- `aria` is `"auto"` (default: label on the parent, pieces hidden), `"hidden"` or `"none"`. When the text contains links or emphasis, use `"none"` plus a screen-reader-only duplicate.
- Avoid `text-wrap: balance` on split text; set `font-kerning: none` if splitting chars shifts kerning. SplitText does not support SVG `<text>`. `revert()` on teardown.

### SVG prep

- **DrawSVG:** needs a visible stroke and usually `fill: none`. A path with several `M` segments draws them all at once; split into one path per segment and sequence with `ease: "none"` and durations proportional to `getTotalLength()` for constant drawing speed.
- **MorphSVG:** convert primitives with `MorphSVGPlugin.convertToPath()`; fix twisting with `shapeIndex` (`"log"` once to find a value); targets can be hidden paths in `<defs>`.
- **MotionPath:** `align: path` with `alignOrigin: [0.5, 0.5]` centres the element on the line; `autoRotate` (or a degree offset for upward-pointing art); `curviness` 0 to 2.
- **Transforms:** GSAP makes SVG `transformOrigin` relative to the element's own box; keep `smoothOrigin` on; animate geometry (`cx`, `r`) with `attr: {}`, movement with x, y and scale.

### Utils that solve motion problems

`clamp` for pointer-driven values; `distribute({ base, amount, from })` to spread a value (heights, offsets) across many targets; `wrap` for looping indexes in carousels and steppers, `wrapYoyo` for ping-pong; `"random(a, b)"` string values give each target its own value but are unseeded, so never in films; `toArray` and `getProperty` for live values; in React use `useGSAP`'s `scope` instead of `selector`.
