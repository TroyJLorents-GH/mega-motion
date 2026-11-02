# Web 3D pipeline: budgets, renderer, framing, materials, delivery

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

Source: the author's notes on foundation principles of motion, checked on 2026-10-28. Verified today: Lenis `autoRaf` exists (default false) and the documented GSAP integration is the ticker snippet below; GSAP SplitText supports `mask` (3.13+) and adds `aria-label` plus `aria-hidden` on children by default. Numbers marked *proposed* are budgets to start from, not measured laws. Items marked *unverified* were not checked.

## 1. Intake questions that change the architecture

Ask only when the answer is not clear from the brief.
1. Delivery medium: real-time web, pre-rendered video, or hybrid (image sequence scrubbed on a page).
2. Interaction freedom versus fidelity: must the user orbit the object freely (live glTF), or does the camera follow one art-directed path (pre-rendered canvas sequence or baked camera track is often better)?
3. Device floor (already in SKILL.md).
4. Asset starting point: existing model or CAD, a flat reference image, or procedural geometry from Blender Python.

## 2. Budgets (proposed)

| Item | Mobile | Desktop |
|---|---|---|
| Triangles, live scene | under 150,000 | under 500,000 |
| Draw calls per frame | under 50 | under 60 to 100 |
| Texture size | 512 to 2048 by projected detail; KTX2 | 2048 to 4096, KTX2 |
| Resident texture memory | 32 to 64 MiB including mips and environment; a 2048² RGBA8 map with mips is about 21 MiB uncompressed, so KTX2 is a memory requirement, not just a download one | 64 to 128 MiB |
| Compressed glTF payload | under 4 MB (hero first frame under 1.5 MB) | under 8 MB |
| Canvas sequence | 90 to 150 frames; budget download (about 5 to 10 MB at 1080 wide) and **decoded** memory separately: 120 frames at 1280×720 is about 420 MiB decoded, so keep compressed blobs and decode a window of about 12 frames, calling `ImageBitmap.close()` on eviction | two sizes served |
| Poster frame | static WebP under 50 KB matching frame 0 | same |
| Device pixel ratio | 1.5 on phones for a full-viewport canvas, set once at load by device tier; never toggled during scroll (reallocating the drawing buffer hitches) | cap 2 |
| Main thread per frame | under 8 ms at 4x CPU throttle | same |
| Post-processing | one merged full-screen pass at most; none above DPR 1.5 | as needed |
| Thermal | test a four-minute session, not twenty seconds; mid-range phones throttle | n/a |

This replaces the looser "300 draw calls" figure from an earlier draft. Reference phone for "mid-range Android" in 2026: Adreno 710 or Mali-G68 class (Snapdragon 6 Gen 1, Dimensity 7050), not a Pixel 6a, whose GPU is stronger. All budgets reviewed by three models on 2026-10-30; they are starting points to measure against, not limits from a source.

## 5. One ticker (Lenis, GSAP, three.js)

Verified against the Lenis README: Lenis does not need its own loop when driven from GSAP's ticker.

```javascript
gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ autoRaf: false });          // only if the brief wants inertial scroll
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);                              // 1. scroll position
  updateCameraAndProjections();                        // 2. camera, 3D-to-2D anchors
  if (dirty) renderer.render(scene, camera);           // 3. render only when something changed
});
gsap.ticker.lagSmoothing(0);
```

Audit: search the codebase for `requestAnimationFrame` and `setAnimationLoop`; only one master loop may remain. Disable Lenis on touch and under reduced motion.

## 6. 3D to 2D callouts

```javascript
anchor.getWorldPosition(v);  v.project(camera);        // NDC -1..1
const x = (v.x * 0.5 + 0.5) * innerWidth;
const y = (-v.y * 0.5 + 0.5) * innerHeight;
callout.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
```
Never render UI text inside WebGL: it blurs, cannot be selected or translated, and is invisible to screen readers. (Igloo Inc did, and still won Site of the Year 2024; that is an exception a brand chose, not a default.)

## 7. Sequence: move, settle, annotate

Finish about 75% of the camera move before the callout line draws and the label reveals. The secondary follower starts 60 to 120 ms after the primary actor and waits for deceleration. Camera optics to specify: dolly plus a narrowing field of view (for example 50 to 24 degrees) for telephoto compression; interpolate perspective to orthographic when callouts must align with a CAD-like layout.

## 8. Reduced motion with gsap.matchMedia

```javascript
const mm = gsap.matchMedia();
mm.add({ reduce: '(prefers-reduced-motion: reduce)', wide: '(min-width: 768px)' }, (ctx) => {
  if (ctx.conditions.reduce) { /* no pin, no orbit, no explosion: opacity cross-fades between the key poses (one per stage), not one end pose */ return; }
  /* full timeline */
});
// teardown: mm.revert()
```

## 9. Cleanup in single-page apps

Wrap GSAP in `gsap.context()` or `useGSAP()`. On unmount, traverse the scene and call `geometry.dispose()`, `material.dispose()`, dispose textures, then `renderer.dispose()`. Test by navigating to the page and away five times; texture count (`renderer.info.memory.textures`) must return to zero and tab memory must be flat.

## 12. Renderer choice (verified 2026-10-30)

The three.js manual still calls WebGPURenderer experimental, says WebGLRenderer is the recommended choice for pure WebGL 2 applications and can perform better depending on the scene, and lists what does not carry over: `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` and `EffectComposer` must be ported to node materials, TSL and the new post-processing stack.

- **Default: WebGLRenderer** for a conventional glTF hero.
- **Choose WebGPURenderer** for compute (large particle fields, fluid, GPU culling), a TSL material library that must outlive the project, or a device floor where most visitors get WebGPU. Test the WebGL 2 fallback first, since many phones land there. `await renderer.init()` before the first render in a custom ticker. drei components that patch shaders and the postprocessing package may not work; check before committing.
- Pin the three.js version; read release notes before every bump.

## 13. Delivery format decision

1. Must the user orbit, inspect, hover a part or switch a variant? **Live glTF.** If it misses the budget, bake lighting or use MatCaps; it stays live.
2. Does the look need what real-time cannot draw (global illumination, caustics, smoke, hundreds of moving parts)? If no, live glTF usually still wins on portrait reframing and variants.
3. Pre-rendered, up to about 150 frames or needs alpha over the page: **image sequence** with a decode window. Longer, or played rather than scrubbed: **video** (normal keyframe spacing, 1 to 2 MB). Scrubbed video needs GOP 1 (several times larger) and still seeks approximately; WebCodecs decode is the frame-accurate option at a complexity cost.
4. Portrait traffic above about 60% doubles every pre-rendered option; count it.

## 14. Responsive framing

three.js `fov` is vertical, so a narrow phone keeps the same visible height and loses most of the width; products get cropped left and right. When the aspect drops below the design aspect, widen the vertical FOV (or dolly out) so the horizontal coverage stays constant:

```javascript
const base = THREE.MathUtils.degToRad(baseFovDeg);
camera.fov = camera.aspect < designAspect
  ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(base / 2) * designAspect / camera.aspect))
  : baseFovDeg;
camera.updateProjectionMatrix();
```
To make room for text without rotating the camera, shift the lens with `camera.setViewOffset()` so the product sits in the column opposite the copy. Never leave a bright mesh behind the headline it should sit beside.

## 15. Materials with one key light and an environment map (starting values)

`renderer.toneMapping = THREE.NeutralToneMapping` (Khronos PBR Neutral, built for faithful product colour) unless a filmic look matters more; then AgX. Rotate the HDRI until a bright region rims the silhouette, put the warm key opposite. Pass hex colours as sRGB; mark colour textures sRGB and data maps (normal, roughness, metalness) as non-colour.

| Material | Base | Metalness | Roughness | Extras |
|---|---|---|---|---|
| Brushed aluminium | about #E8EAEA (measured aluminium F0) | 1 | 0.25 to 0.45 with a streaked roughness map | anisotropy 0.5 to 0.8 along the brushing |
| Clear glass | white, tint through attenuation colour | 0 | 0.02 to 0.08 | transmission 1, IOR 1.5 to 1.52, thickness to real scale; transmission re-renders the scene, so use it sparingly on phones |
| Fabric | mid-tone | 0 | 0.8 to 1.0 | sheen 0.4 to 1.0, sheen roughness 0.5 to 1.0, a weave normal map |
| Matte plastic | brand colour | 0 | 0.5 to 0.75 | faint roughness noise; specular intensity 0.5 to 0.7 |
| Glossy coated plastic or paint | brand colour | 0 | 0.4 to 0.5 under the coat | clearcoat 1, clearcoat roughness 0.03 to 0.1 |

Bevel every edge before export: a highlight needs a surface to catch. Values agreed across two reviews; the aluminium colour is from Filament's measured-conductor table, the rest is judgment.

## 16. One merged post-processing pass

Each full-screen pass is another fill of the viewport. On mobile, use at most one pass and merge what you need into it:
- **Dither** (blue noise or hash, about 1.5% amplitude) to remove 8-bit banding in dark gradients and HDRI falloff, at no extra pass.
- **Vignette** (about 0.15 edge darkening) to settle the eye on the hero.
- **Velocity-driven chromatic shift**, clamped so the image is fully clean when still: offset = clamp(|scrollVelocity| x 0.0002, 0, 0.004) (Gemini's values, judgment).
Bloom only on the hero, only on desktop, only if the brief asks. With WebGPURenderer this is a node in the new post-processing stack; with WebGLRenderer a single custom `ShaderPass` or a final full-screen quad.

## 17. Preloader and poster-to-live handoff

- The poster is a finished composition of frame 0 (under about 50 KB WebP) and shows instantly; LCP is the poster, not the canvas.
- Progress is real: drive it from `THREE.LoadingManager` (or fetch progress), never a fake counter.
- Before revealing: `await renderer.compileAsync(scene, camera)` (r160+).
- If the user already scrolled, set the scene to the current ScrollTrigger progress, render once, then cross-fade the canvas over the poster in about 400 ms.
- Stream heavy textures after first render; step quality down by tier if the first 45 frames average over about 18 ms (Gemini, judgment).

## 18. Shared DOM-to-WebGL coordinates

For sites where a DOM card becomes a 3D object or WebGL must track scrolling HTML: one persistent full-viewport canvas behind a semantic DOM; read each anchor element's `getBoundingClientRect()` on layout and resize (not every frame), convert to world units, and render the plane in the scene. Native scrolling composites DOM a frame before the main thread draws WebGL, so meshes can lag their DOM slot during fast scrolls; this is the one case where driving scroll from the same ticker as the render (Lenis plus `gsap.ticker`) earns its cost (Gemini's reasoning; measure on the target device).

## 19. Velocity as a secondary channel (use sparingly)

Read scroll velocity (`ScrollTrigger.getVelocity()` or the smooth-scroll library's velocity) and feed one subtle secondary channel: a camera bank of about 2 degrees, cable or strap follow-through, or the clamped chromatic shift above. It must decay to zero within about 250 ms of stopping, so the scene is still when read. Never more than one velocity channel per scene.

## 20. Product-film lighting lessons (one lab's result, flxrnc's Opus 5.5 Motion Lab, Sept 2026; not re-tested here)

- Chrome needs something to reflect: a dark studio (about 0.1 grey), one white cyc behind the subject, a black panel on the camera side with a thin horizon strip so camera-facing faces do not read as flat charcoal.
- A glint is a reflection, not a light: put the sweep strip only in a specular environment and keep a static one for diffuse; measure strip-on versus strip-off pixel difference; keep it narrow; set its elevation so flat faces' mirror direction misses it; calibrate the sweep to touch the first and last glyph on named frames.
- Space extruded letters by measured outlines, not font advance; bevels fuse neighbours.
- Watch for pareidolia: a round dark grille read as an eye. Reshape or move the feature.
- A white product on a near-white backdrop melts into it; drop the backdrop to about a third of its brightness and let unlit sides fall off.
- An accent colour on a flat surface under grazing specular washes out; raise roughness to about 0.7 and lower specular.
- In product loops with no text on screen, a slow camera creep through holds is fine; with text on screen, the camera holds still.
