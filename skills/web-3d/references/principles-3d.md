# Real-time 3D principles

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

### 17. Real-time 3D on the web, properly

Pipeline: model in Blender, export glTF, run `gltf-transform` to apply Draco or meshopt geometry compression and KTX2 (Basis Universal) texture compression, generate a low-res placeholder, and lazy-load the full asset after first paint. Budget the first frame: under 1.5 MB of model and textures for a hero, under 50 draw calls on mobile and 60 to 100 on desktop (see `web-3d-pipeline.md` for the full budget table), one directional light plus environment map, no real-time shadows on mobile unless a single contact shadow.

Instance repeated geometry. Bake lighting into textures for anything static. Use a camera path along a curve for scroll-linked 3D so the motion is authored, not procedural.

### 18. Sequencing 3D with a timeline tool

Keyframing a camera and lights in code is slow to iterate. Theatre.js (Apache 2.0 core, verified; its visual studio is AGPL-3.0, verified, and is a dev-time tool) gives a visual sequencer for three.js properties, exports JSON, and the studio is not shipped to production. Use it when a scene has more than a handful of keyframed properties.

### 19. Shaders and post-processing

A custom shader earns its place when it is the content (a material that is the product's story, a transition that cannot be done with DOM). It does not earn its place as a background effect. Post-processing (bloom, grain, vignette) costs a full-screen pass each; on mobile, one pass at most, and bloom only on the hero.

### 23. Five delivery formats for 3D on the web

Choosing the format is the biggest performance decision. Mix them so the viewer cannot tell where video ends and live 3D begins.

| Format | Use when | How |
|---|---|---|
| Canvas image-sequence scrub | Photoreal reflections, smoke, hundreds of exploding parts; anything a phone GPU cannot draw live | Render 100-150 transparent WebP frames in Blender, preload, draw to a 2D canvas, map scroll progress to frame index. Alternative: a keyframe-every-frame (GOP=1) WebM scrubbed by currentTime. |
| Baked glTF with MatCap or baked lighting | The user must orbit, drag or inspect | Bake AO and lighting into textures in Blender; MatCap material instead of real-time lights and shadow maps; compress with glTF-Transform |
| 2.5D depth-displaced plane | Hero backgrounds and detail shots where a full model is overkill | Export beauty render plus Z-depth; a small fragment shader offsets pixels by depth on pointer move. A few hundred KB gives convincing parallax |
| Orthographic vector overlay | Technical callouts, HUD lines, engineering transitions | Render Blender Line Art or Freestyle to SVG, or project 3D anchor points to screen space each tick (`vector.project(camera)` to NDC to `translate3d`) so labels stay pinned to the bolt they describe. An orthographic camera keeps lines parallel so SVG and CSS align exactly |
| Flip state morph | Page transitions, card-to-detail, thumbnail-to-viewport | Capture layout state, change the DOM, let GSAP Flip compute the transform so nothing cuts or jumps |

Callouts that float near a part instead of being projected from it are a common tell. Pin them to geometry or do not draw them.

### 24. The breakdown arc

A scroll-driven product breakdown that works almost always follows four stages. Use it as the default shape of the beat table, then break it on purpose.

| Scroll | Stage | What happens |
|---|---|---|
| 0-20% | Silhouette and hook | High-contrast rim light, minimal UI, establish scale. One hero. |
| 20-50% | Deconstruction | Camera dollies in while layers separate along their local axes; line-art overlays draw in to bridge art and engineering |
| 50-80% | Micro-inspection | Long lens (85-135 mm equivalent) on material: weave, finish, machining. Staggered masked data readouts |
| 80-100% | Reassembly and resolution | Parts return with a fast, well-damped spring; camera settles into a heroic three-quarter lockup |

The half-second stillness before the parts separate, and the callout that waits for the camera to slow before it draws, are where the craft lives.

### 25. One ticker

Never run competing animation loops, and give every animated value exactly one owner (one writer for the camera, one for each transform). Smooth-scroll (if used), the three.js render call, and DOM updates all run from one ticker (GSAP's `gsap.ticker.add`, or one `requestAnimationFrame`). Two loops fighting each other is the usual cause of "it stutters but the profiler looks fine". Render on demand: if nothing changed, do not render.

### 28. Pipeline details

Budgets, commands, the single-ticker snippet, projection code, cleanup, pin stability and the Blender-versus-CSS color fix are in `references/web-3d-pipeline.md`.

### 31. Robustness the happy path never tests

Real users scroll backwards, flick, stop halfway, resize, switch tabs and click again mid-transition. Design and test for it:
- Same scroll position, same picture, whichever direction it was reached from. Reveals play once unless the beat is scrubbed.
- Interactive tweens use `overwrite: 'auto'`; high-frequency followers use `gsap.quickTo()`; call `Flip.killFlipsOf()` before capturing a new layout state; never put a CSS `transition` on a property JavaScript drives from `mousemove`.
- Compile shaders before the hero shows (`await renderer.compileAsync(scene, camera)`) so a new material does not hitch mid-scroll; handle `webglcontextlost` with the poster fallback.
- If the user scrolls before the 3D is ready, start the scene at the current scroll progress, render once, then fade the canvas in over the poster. Never start at frame 0 and snap.
- The spectacle must prove a specific product claim. If the same orbit, explode and reassemble would advertise any product, it is decoration.
