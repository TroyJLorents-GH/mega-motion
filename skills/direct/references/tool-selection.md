# Tool selection

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


Pick by job, output class, and device floor. Not by popularity.

## Step 1: output class

| Output | Meaning | Primary toolchain |
|---|---|---|
| Real-time web | Runs in the browser, responds to scroll and input | GSAP (+ScrollTrigger), CSS, Motion, three.js, Rive |
| Pre-rendered video | A file. Played back. Always identical. | Blender, HTML-to-video (HyperFrames, Remotion), ffmpeg |
| Hybrid | Video or image sequence embedded in a real-time page | Pre-render the heavy part, drive playback with scroll or time |

Decision rule: if the motion must respond to the user, it is real-time. If it needs physically accurate light, characters, destruction, or more than a mid-range phone can draw, pre-render it and embed. Hybrid is how most "impossible" web pages actually work.

## Step 2: by content

| Content | Real-time choice | Pre-rendered choice |
|---|---|---|
| Typography, layout, UI | CSS + GSAP or Motion | HTML-to-video |
| Vector illustration, characters (2D) | Rive or Lottie | HTML-to-video or Blender Grease Pencil |
| Product or object (3D) | three.js via React Three Fiber, compressed glTF | Blender |
| Environment, atmosphere, destruction | Pre-render | Blender |
| Data, charts | SVG + GSAP or D3 | HTML-to-video |

## Step 3: by device floor

If the floor is a mid-range Android phone on 4G: no real-time shadows, one post pass at most, model under 1.5 MB first frame, consider hybrid. If the floor is a modern laptop only (an internal tool, a demo): geometry, fill rate, memory and loading budgets all loosen, but not by one multiplier; measure.

## Tools, with license status

Verification was done against official license files or pages on 2026-10-27. "Verified" means I read the official source today. "Unverified" means stated from memory; check before relying on it.

### Web animation orchestration

**GSAP** (gsap.com). Timeline-based tween engine; ScrollTrigger for scroll-linked and scroll-triggered motion; SplitText for text; Flip for layout transitions; MotionPath. Use it for: orchestrating multi-element sequences, scroll stories, anything with a timeline. Do not use it for: trivial hover states (CSS is lighter), or React layout animations between component trees (Motion's layout animations are purpose-built).
License, verified: Standard "No Charge" GSAP License, effective 30 April 2025. Commercial use is covered. All plugins including formerly paid ones (SplitText and the rest) are included. This is **not** an OSI open-source license: Webflow owns the IP and grants a license. The notable restriction is building a no-code visual animation tool that competes with Webflow. AI-generated GSAP code is explicitly allowed.

Practical note: ScrollTrigger relative `end` values such as `+=250%` are percentages of the trigger element's height, not the viewport. For viewport-height scroll distances use a function, e.g. `end: () => "+=" + window.innerHeight * 2.5`.

GSAP plugins by job: see `shared/gsap-plugin-map.md` at the plugin root.

Native browser APIs (CSS scroll-driven animations, View Transitions) with verified support: see `shared/native-apis.md`.

**Motion** (motion.dev, formerly Framer Motion). Declarative animation for React, plus a vanilla API. Spring physics, gesture handling, `layout` animations, `AnimatePresence` for exit animations. Use it for: component-level and interaction motion in React apps, shared-element transitions. Do not use it for: long scrubbed scroll timelines across many unrelated elements (GSAP's timeline model is clearer there).
License, verified: MIT.

**CSS animations and transitions.** Zero bytes, compositor-friendly, honor `prefers-reduced-motion` with a media query. Use for: hover, focus, toggles, simple reveals, the reduced-motion variant. CSS scroll-driven animations (`animation-timeline: scroll()`) are powerful but MDN marks them "Limited availability", not Baseline, as of today (verified). Use with `@supports` and a JS fallback, or wait.

**anime.js** (v4). Lightweight tween library with timelines and scroll observers. Reasonable alternative to GSAP when bundle size is the overriding constraint. License, verified: MIT.

**Lenis.** Smooth-scroll library that keeps the browser's real scroll, so sticky, anchors and find-in-page keep working. Since 1.3.26 it respects `prefers-reduced-motion` (verified). Use only when a scrubbed canvas or 3D beat steps on a notched wheel, or WebGL must stay locked to scrolling DOM (principles section 11). Keep `syncTouch` off. License, verified: MIT.

### Vector and 2D runtime animation

**Rive.** Editor plus runtimes for interactive vector animation with state machines. Use for: characters, icons, illustrated UI that reacts to input. Runtime (rive-wasm), verified: MIT. The editor is a proprietary product with a free tier (unverified today; check rive.app for current plan terms).

**Lottie / dotLottie.** Plays After Effects exports. Use when a motion designer is already in After Effects. Avoid for anything interactive beyond play/pause/segment. lottie-web is MIT (unverified today). After Effects itself is paid proprietary software.

### 3D

**three.js.** The web 3D engine. License, verified: MIT.
**React Three Fiber** and **drei** (pmndrs). React renderer for three.js and a helper library (cameras, controls, environment maps, text, contact shadows). License, verified for react-three-fiber: MIT. drei: MIT (unverified today).
**Theatre.js.** Visual sequencer for three.js and DOM properties. Core, verified: Apache 2.0. Studio (the dev-time editor), verified: AGPL-3.0. The studio is not shipped to production, so the AGPL terms apply to the tool, not your site. Confirm with counsel if your organisation is strict about AGPL anywhere in the dev dependency tree.
**Blender.** Modelling, UV, texturing, lighting, animation, rendering (EEVEE real-time, Cycles path tracing), Grease Pencil 2D, glTF export, render passes (depth, normal, AO, Cryptomatte), Line Art and Freestyle SVG export for vector overlays, and scripting through bpy for repeatable camera, exploded-view and cutaway setups. License, verified: GPL; Blender's license page states that what you create with it is your sole property and commercial use is unrestricted.
**glTF-Transform.** CLI and library to compress glTF: Draco or meshopt geometry, KTX2 texture compression, deduplication, resizing. The single most important step between Blender and the browser. License, verified: MIT.
**Spline.** Browser-based 3D design tool with a web runtime. Proprietary, free tier (unverified today). Fast to start, but its runtime and export options are constrained compared with three.js; check current limits before committing.

### Assets

**Poly Haven.** HDRIs, PBR textures, models. License, verified: CC0, commercial use without attribution.
**ambientCG.** PBR textures and HDRIs. License, verified: CC0.
**Material Maker.** Procedural PBR material authoring (open source, MIT, unverified today).
**Inkscape** (vector, GPL), **Krita** (raster, GPL), **Penpot** (UI design, MPL 2.0): all open source (licenses unverified today).

### HTML-to-video

**HyperFrames** (HeyGen). HTML/GSAP compositions rendered to video, with a CLI for preview and render and hosted rendering through HeyGen. Use for typography and UI-led films from the same code vocabulary as the web. License, verified 2026-10-28: Apache-2.0, actively maintained. No company-size rule.
**Remotion.** React compositions rendered to video. License, verified: free for individuals, non-profits and for-profit organisations with up to three employees; larger companies must buy a Company License. Not an OSI open-source license. Decide early, because the threshold is headcount, not revenue.

### Post-production and delivery

**ffmpeg-skill** (kajisho5). 42 local tools over ffmpeg with an MCP server and a machine-readable contract: cut, fit, captions, overlays, loudness, sync, platform templates with safe zones, `check.py` delivery checks, `look.py` contact sheets. Use it for footage that exists and for delivering renders to platforms. Do not use it to decide taste. License, verified: MIT; upstream active. Details in `code-rendered-video.md` section 10.

### Studying reference sites and apps

**REA** (Reverse Engineer Anything, morluto). MCP server and CLI that lets an agent inspect web pages, Electron apps, binaries and more, with evidence for each claim. For motion work it answers "what easing, duration, scroll range and shader does this reference actually use?" License, verified: MIT. Use it only on things you may lawfully examine, and keep it clean-room: record behavior and numbers in a spec, then build from the spec. Never copy code, shaders, assets, fonts or paid features into the build. Browser DevTools (Performance panel, Animations panel, computed styles) answers most of the same questions with less setup.

### Encoding and QA

**ffmpeg.** Encoding, muxing, GIF, frame extraction, GOP=1 scrubbable video. **Sharp** (Node image library, Apache 2.0, unverified today) for turning render passes into resized WebP or AVIF sequences. LGPL/GPL depending on build (unverified today).
**Chrome DevTools** Performance panel with 4x CPU throttling; Rendering panel to emulate `prefers-reduced-motion` and show paint flashing and layer borders.
**Lighthouse** for loading and Core Web Vitals; **Playwright** for scripted screenshots at fixed scroll positions and reduced-motion emulation (both open source under Apache 2.0, unverified today).
**A physical mid-range phone.** Emulation misses thermal throttling and real touch scrolling. Not optional for shipping.

## Source notes

Two of the author's research notes informed this file (formats, the breakdown arc, the one-ticker rule, render passes and Blender recipes).

## When NOT to reach for a tool

- Not GSAP for one hover. Not three.js for a product that never rotates. Not Lenis unless inertia is the brief. Not a shader for a background. Not Remotion at a company with four employees without buying the license. Not Spline when you need control of loading, compression, or materials.
