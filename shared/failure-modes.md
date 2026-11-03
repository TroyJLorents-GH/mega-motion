# Failure modes and fixes

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


Ordered by how often they appear in otherwise competent work.

| # | Domain | Failure | How to recognise it | Fix |
|---|---||---|---|---|
| 1 | direction | Everything moves, nothing matters | Every element fades up on scroll; no hero | Subtraction pass. Layout arrives instantly; spend motion on one element per section. |
| 2 | direction | One easing for everything | All tweens use the library default | Three named easings by role (enter, move, exit), in a tokens file. |
| 3 | scroll | Scroll hijacking | Wheel intercepted, speed changed, snap without affordance | Remove. If inertia is the brief, disable on touch and under reduced-motion. |
| 4 | direction | Text animated while readable | Letter-by-letter reveal on a paragraph; text fading during the read | Reveal lines then words; hold 0.3 s/word + 0.5 s; letters for 1-2 hero words only. |
| 5 | web-3d | Uncompressed 3D | glTF over 5 MB, PNG textures, shipped as exported | gltf-transform: meshopt or Draco, KTX2, resize textures to need, lazy-load after first paint. |
| 6 | ui | Layout and paint-heavy animation | Animating top/left/width/height/margin/font-size, or filter and backdrop-filter, every frame | transform, opacity, clip-path and mask on a promoted layer, or shader uniforms; verify anything else in the Performance panel at 4x CPU throttle. |
| 7 | accessibility | No reduced-motion variant | Media query absent or only shortens durations | Design the variant in the beat table. Same information. Translation under 8 px, no parallax, no autoplay. |
| 8 | accessibility | Autoplay loop with no pause | Hero video or loop runs forever beside content | Add pause, or end it. WCAG 2.2.2 Level A. |
| 9 | direction | Two heroes | Headline and visual arrive at once, both fast | Sequence: the visual lands, then the headline 200-300 ms after settle. |
| 10 | scroll | Parallax tearing | Every section parallaxes at different ratios | One or two parallax moments, ratios 1.2/1.0/0.6. |
| 11 | direction | Unintended dead beat | Nothing changes and there is nothing to read or inspect for over a second | Hold still on purpose for reading or inspection; otherwise give the beat a change of state. A slow push is optional, specified in screen pixels, never a default. |
| 12 | direction | Wobble | Idle "breathing" or constant bob on everything | Motion performs or it stops. Idle motion only on one living element, if any. |
| 13 | direction | Invented UI | Fake app screens, lorem ipsum, placeholder charts | Capture the real app. Use real copy and real data. |
| 14 | web-3d | Flat 3D | Model floating in a gradient, no contact shadow, no env map | Contact shadow plus HDRI before any material work. |
| 15 | web-3d | Render-only mindset in real-time | Shadows, bloom, SSR, DOF all on, 20 fps on a phone | One post pass max on mobile; bake what is static; measure on the device floor. |
| 16 | scroll | Pixel-based scroll distances | Breakpoints change everything | Scroll ranges in viewport heights and fractions. |
| 17 | direction | Overshoot everywhere | Every element bounces | One back-ease per screen, on the hero. |
| 18 | direction | Transition amnesia | Sections fade in and out with no directional logic | Vector law: exit direction sets next entry. Add a carrier element. |
| 19 | ui | Hover-only information | Specs or links reachable only by hover | Make it reachable by tap and keyboard. |
| 20 | ui | Spinner flash | Loading indicator appears for 150 ms | Nothing under 300 ms; skeleton to 2 s; progress after. |
| 21 | web-3d | Color mismatch 3D to web | Brand hex looks different in render and page | Set material colors in linear space; test a swatch under the view transform. |
| 22 | qa | Judging on a fast Mac | "It's smooth here" | 4x CPU throttle plus a physical mid-range phone; record the numbers. |
| 23 | direction | Timings scattered through code | Durations hard-coded in 40 places | One tokens file; one timeline per section. |
| 24 | direction | Builder reviews own work | No critique round | Second reviewer with references and checklist; top three fixes only. |
| 25 | web-3d | Floating callouts | Labels placed near a 3D part by hand drift off it as the camera moves | Project the anchor each tick, or use an orthographic camera and align in 2D. |
| 26 | web-3d | Competing loops | Smooth scroll, three.js and GSAP each run their own rAF; stutter the profiler cannot explain | One ticker; render on demand. |
| 27 | ui | Split text breaks semantics | Heading split into spans; links inside unreadable to screen readers | `aria-hidden` animated copy plus `.sr-only` duplicate with real markup. |
| 28 | web-3d | Live 3D for everything | Smoke, hundreds of parts, photoreal reflections drawn live on a phone | Canvas image-sequence scrub for the heavy beat; live glTF only where the user must orbit. |
| 29 | qa | Memory leak in single-page apps | Tab slows or crashes after navigating between pages four or five times | `gsap.context` or `useGSAP`; dispose geometry, material, textures and renderer on unmount; check `renderer.info.memory`. |
| 30 | web-3d | Uncapped pixel ratio | Phones overheat and fall to 30 fps within seconds | `Math.min(devicePixelRatio, 2)`, 1.5 on phones during scroll. |
| 31 | scroll | Layout shift breaks pins | Pin starts early or overlaps the footer after fonts or images load; on iOS the address bar resize shifts every pin | Explicit `aspect-ratio`, no lazy loading in or above pins, `ScrollTrigger.refresh()` after assets settle, `ignoreMobileResize`. If iOS still drifts, scroll a dedicated container so the address bar cannot change the scroll length (Horeca build, Codrops 2026). |
| 32 | scroll | Travel, annotate and reveal at once | Busy and expensive-looking; nobody remembers a sentence | Move, then settle, then annotate; 75% of the camera move before callouts. |
| 33 | web-3d | Lit by uniform ambient | Everything visible, nothing deep | Rim light first, then key, then low fill. |
| 34 | film | Flicker or jitter between frames | Values driven by a clock, timers or unseeded random | Pure function of t; seeded noise; no timers or CSS transitions in render mode. |
| 35 | film | Fallback font in some frames | Frames captured before the font loaded | `display=block`, wait for `document.fonts.ready`. |
| 36 | film | Loop seam hiccup | Frame N rendered, which duplicates frame 0 | Render 0 to N-1; whole-number cycles from phase = frame/N. |
| 37 | film | Audio drifts off the beat | Rounded frame counts added repeatedly | Compute each beat from n × 60 / BPM and round per beat. |
| 38 | film | Shimmering or blurry text | Resting text on sub-pixel positions; scaled type | Snap resting text to whole pixels; render 2x and scale down. |
| 39 | film | "Done" because the MP4 exists | No one looked at rendered frames | Critic on contact sheet, strip, phone test, loop check. |
| 40 | film | The builder approves its own work | Review happens in the same context that built it | Fresh-context critic judging rendered evidence only. |
| 41 | film | Endless repair loop | The same defect re-fixed many times | Smallest change, two rounds per defect, then stop and ask. |
| 42 | film | Vertical made by cropping the wide master | Type too small, subject cut off | Separate composition per format from the same timeline. |
| 43 | direction | Invented product screen in a film | A real screenshot was missing | Missing asset is a blocker; ask. |
| 44 | scroll | Reveals replay on every scroll direction | Sections vanish and re-animate when scrolling back up | Reveal once (`once: true`, or never `toggleActions: "play reverse play reverse"` on content); reversible only for scrubbed beats. |
| 45 | ui | Whole-card hover scale | `scale(1.05)` plus shadow jump on every card; text shimmers | Keep the card still; scale only inner media (about 1.03, clipped) or nudge one icon, 150 to 180 ms. |
| 46 | ui | Counting-up stats | Every number counts from zero over two seconds; widths jitter | Count only when the number is the hero; start near the target; under about 0.8-1.2 s, ease-out; `tabular-nums`. |
| 47 | ui | Filler marquee | Infinite logo or word ticker at constant speed beside reading text | Static row, or a marquee that is the hero with a pause control. |
| 48 | web-3d | Particle soup | Random points drifting behind dark glass cards | Cut unless the particles are the content (real geometry, real flow). |
| 49 | web-3d | Unmotivated idle 3D | `rotation.y += 0.005` and sine bobbing on a heavy product | Rotate only on scroll or input, then settle to a dead stop. |
| 50 | ui | Animated glass | `backdrop-filter` cards moving during scroll | Pre-blur a static background; never animate backdrop-filter. |
| 51 | ui | Cursor gimmicks everywhere | Follower dot and magnetic buttons on every element | None, or one cursor behaviour the brief asks for. |
| 52 | ui | CSS transition fighting JS | `transition: transform` on an element `mousemove` also drives; laggy, snaps on leave | Remove the CSS transition; use `gsap.quickTo` or one spring. |
| 53 | web-3d | Mesh behind the headline | Specular highlight sits under the words | Offset the lens with `setViewOffset` or move the camera before the text reveals. |
| 54 | web-3d | Mid-scroll shader hitch | Freeze the first time a new material enters view | `await renderer.compileAsync(scene, camera)` before the hero shows. |
| 55 | web-3d | Black canvas after app switch | Mobile reclaimed the GPU context | Handle `webglcontextlost` with the poster fallback; rebuild on restore. |
| 56 | web-3d | Late 3D snaps | User scrolled before the model loaded; scene starts at frame 0 then jumps | Seed the scene at current progress, render once, fade in over the poster. |
| 57 | web-3d | Pixel ratio toggled during scroll | Hitch every time scrolling starts or stops | Choose DPR once by device tier. |
| 58 | web-3d | Image sequence kills the tab | Decoded frames far exceed device memory | Keep compressed blobs, decode a small window, `ImageBitmap.close()` on eviction. |
| 59 | ui | Breaks when interrupted | Double-click mid-Flip, fast hover sweeps, resize mid-tween | `overwrite: 'auto'`, `Flip.killFlipsOf()`, `quickTo`; test reverse, skip and stop-halfway. |
| 60 | direction | Generic spectacle | The same orbit-explode-reassemble could sell any product | Make the movement prove a specific claim, or cut it. |
| 61 | ui | Fake preloader | Percentage counter that runs to 100 on a timer | Real progress from asset loads, or no preloader. The loader is the first beat, not a delay. |
| 62 | ui | Flash of the final state before a `from()` tween | Content shows, disappears, then animates in | Hide with `visibility: hidden` in CSS; reveal with `autoAlpha` after the first render or `document.fonts.ready`. |
| 63 | scroll | Anchor links broken under ScrollSmoother | Native anchors do not move the transformed content | Route jump links through `smoother.scrollTo(target, true, "center center")` or `smoother.offset()`. |
| 64 | accessibility | ScrollTo leaves focus behind | Page scrolls to a section, keyboard focus stays at the top | Move focus to the target after the scroll (`tabindex="-1"`); duration 0 under reduced motion. |
| 65 | ui | Observer on a reading page | Wheel steps whole sections; scroll hijacked | Observer only for full-screen slide steppers; never on reading pages. |
| 66 | film | Glint floods the face | A specular sweep washes out letters or whole surfaces | Put the strip in a specular-only environment; keep it narrow (one lab: 0.6 degrees at intensity 3 instead of 2 degrees at 6); set elevation so flat faces' mirror direction misses it. |
| 67 | film | Bevels fuse glyphs | Extruded letters merge at their bevels | Space glyphs by measured outlines, not font advance. |
| 68 | film | Element leaves the frame mid-move | An overshoot or arc crosses the edge for a few frames | Project every moving bounding box per frame; flag edge and keep-out excursions. |
| 69 | film | Extra held frame on the beat | A spring released exactly on the beat frame holds one frame too long | Release half a frame early so the beat frame is the first moving frame. |
| 70 | film | Morph through a degenerate shape | Interpolating sphere to glyph passes through flat coins | Grow the target inside a sphere from the source, shrink the source into it, join with smooth-min. |
| 71 | film | Blend pop at contact | A smooth-min blend makes a bump appear when a body first enters range | Grow new bodies from a negative radius so the pull fades in. |
| 72 | film | Click at the loop seam | AAC padding (one lab: about 16 ms) makes a looping player stop and restart hard | Keep the seamless WAV master; for a single-loop MP4, 2 ms raised-cosine fades on the first and last samples. |
| 73 | film | Late hits | Waveshapers or sine-phase starts put sound peaks 8-11 ms late (one lab) | Cosine-phase bodies with 0.5-1 ms attack; no waveshaper on hit bodies; first peak must be the largest. |
| 74 | film | Silent on phones | Mix loud full-range but quiet in 200 Hz-6 kHz (one lab: -14 LUFS full, -22.9 LUFS phone band) | Measure the phone band; raise bass an octave, shorten the kick, open filters. |
| 75 | film | Slideshow instead of film | Still title cards joined by wipes; `freeze_check.py` reports full-frame freezes during read holds (a field test: 60% of a 15 s reel frozen) | A read hold keeps the text still, not the frame: a 1-3% slow push or a visibly moving secondary layer under every hold; only the end card may stand still, at most 1 s. |
| 76 | film | Reduced-motion render by accident | The final film shows the reduced-motion branch because the machine has system animations turned off | Create the render's browser context with `reducedMotion: 'no-preference'`; render the reduced-motion version as its own pass. |
| 77 | direction | Small hero, empty frame | The beat's hero fills a tenth of the frame; the composition reads as unfinished, not minimal | Scale the hero to at least 40% of the frame's width or height; let it break the frame edge if needed. |
| 78 | film | A later scene leaks into an earlier frame | Out-of-order stills or scrubbing show text from another beat; a straight render looks fine | Hide scenes with `display: none`, not `visibility: hidden` (a child set to `visible` shows through a hidden parent). The studio's determinism check catches it. |
| 79 | film | Soft text during a camera push, order-dependent pixels | `will-change: transform` makes Chrome reuse a layer rasterised at an older scale | No `will-change` in compositions rendered frame by frame. |
