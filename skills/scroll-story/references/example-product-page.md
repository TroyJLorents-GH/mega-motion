# Worked example: scroll-driven product page with a real-time 3D hero

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

## Example 1: Scroll-driven product launch page with a real-time 3D hero

**Brief**
- Takeaway: "These headphones are built like an instrument."
- Output: real-time web, Next.js or plain Vite site, desktop and mobile.
- Format: full viewport; device floor is a Pixel 6a class phone on 4G.
- References: a camera-brand product page for its single warm key light and slow orbit; a watch brand for text that holds fully opaque during read. Reject lens flares and particle fields.
- Brand: bg `#0F0F10`, ink `#F2F0EA`, one accent `#D9A441` (reserved for the "Reserve" button and one spec highlight). Type: a geometric sans at 700 for heroes, 400 for body.
- Content: real copy (five spec lines), real glTF from the product team (raw export 38 MB).

**Director's decisions**
- The product rotates and its materials are the story, so 3D is justified. Only one 3D moment, pinned, in the middle of the page. Everything else is typography and photography.
- Hybrid fallback: on the device floor, if the model fails budget after compression, swap to a pre-rendered 120-frame image sequence scrubbed by scroll. Decide at kit test, not at launch.
- Current: downward and slightly rightward. Every section's exit continues it. The carrier is a thin ink-colored hairline that runs from the hero into the specs (not the accent: the brief reserves the accent for the CTA and one spec).
- Hero beat: product lands first (600 ms, ease-out, from 24 px below and 0 opacity), headline arrives 250 ms after settle, line by line, 80 ms stagger. Nothing else moves.

**Beat table (excerpt)**

| Beat | Range | Hero | Motion | Text | Reduced motion |
|---|---|---|---|---|---|
| 1 | load | product still | 600 ms rise and fade in, ease-out | headline 250 ms later, 2 lines | opacity only, 200 ms |
| 2 | 100-120vh | ink hairline | draws down as scrub, linear | none | static line |
| 3 | pin 120-380vh (2.6 vh of scroll) | 3D model | orbit 0 to 50 degrees, dolly 1.4 m to 0.9 m, ease-in-out over the range; spec labels fade in at 25/50/75% with 300 ms ease-out, opaque till end | three spec labels | static end pose image with the same three labels on trigger |
| 4 | after pin | photography grid | 400 ms reveal on trigger, 60 ms stagger in reading order | captions | opacity only |
| 5 | end | Reserve CTA | 180 ms hover scale 1.02, press 0.98 at 80 ms | one line | same |

**Implementation**
1. Asset prep: `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress ktx2`, resize textures to 1024 for the body, 512 for small parts. Target under 1.2 MB. Generate a 2 KB poster image for first paint.
2. Scene: React Three Fiber, one directional key (warm, upper left), `Environment` with a Poly Haven studio HDRI (CC0), `ContactShadows` from drei. No real-time shadow maps. Roughness contrast: metal parts 0.25, ear-cup fabric 0.85.
3. Scroll: GSAP ScrollTrigger pins the canvas section; `scrub: true` with linear mapping drives a progress value 0 to 1; camera position and rotation are interpolated from that value with the ease applied once to the value (so the scrub stays linear in the user's hand while the camera motion is eased).
4. Text: SplitText lines, GSAP timeline per section. One tokens file for durations and easings.
5. Reduced motion: a `matchMedia` branch at module level. The pinned section renders a static end-pose image and the labels on trigger. No parallax anywhere. Autoplay nothing.
6. Loading: canvas mounts after first paint and `requestIdleCallback`; poster image shows until the first rendered frame.

**QA numbers to record**: first paint, model bytes, fps during the pin at 4x throttle, fps on the phone, Lighthouse performance.

**Critique round looks for**: a second hero in beat 1; label text fading while readable; the pin exceeding three viewport heights; orbit overshooting into an angle that shows the model's back seams; the accent appearing on anything but the CTA and one spec (including the carrier line).

---
