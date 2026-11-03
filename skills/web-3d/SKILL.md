---
name: web-3d
description: Use when a page renders three.js or React Three Fiber: device-floor budgets, renderer choice, responsive camera framing, lighting and materials, live 3D versus image sequence versus video, projected callouts, cleanup and robustness. Not for authoring in Blender; use blender-web.
---

# Web 3D

Choose 3D when rotation, material or scale is the story; otherwise a still with one reveal is often better.

Decide in this order:
1. Delivery format: live glTF, image sequence or video (`references/pipeline.md` §13).
2. Renderer: WebGLRenderer by default; WebGPURenderer only for compute, a long-lived TSL material library, or a WebGPU-majority floor (§12).
3. Budget against the device floor: draw calls, resident texture memory, pixel ratio set once (`../../shared/defaults.md`, §2).
4. Framing at 360 and 1440 px: widen the vertical FOV on narrow screens; offset the lens to clear the copy (§14).
5. Light and materials: one key plus environment map, neutral tone mapping, grey-card exposure (§15).
6. Robustness: compile shaders before the hero shows, handle context loss, seed late-loading scenes at the current scroll progress (`references/principles-3d.md` §31).


## Start from the template, not a blank file

For a product hero that turns on scroll, scaffold the proven template and adapt it:

```
node <plugin>/shared/web-studio/new_page.mjs <folder> --template web-3d/product-hero
cd <folder> && npm install
```

Put the product name, callouts and numbers in `content.json`; set `model` to a real `.glb` (CC0 or the brand's) when there is one, otherwise adapt the procedural model in `watch.js`. Then `node studio/web.mjs shots`, `check` and `film`. Read `<plugin>/shared/web-studio/README.md` for the page contract. The template: procedural studio environment (no HDRI download), one key light, contact shadow, callouts on leader lines projected from 3D anchors every frame, a camera plateau per callout, an SVG fallback without WebGL, 9 draw calls at 390 px. Keep under 50 draw calls on phones.

## Red flags

- A model shipped straight from the modelling tool without compression
- More than one animation loop, or two writers for the same value
- A scene lit with uniform ambient light and no rim
- A 3D hero sitting behind the headline it should sit beside
- Pixel ratio changed while scrolling

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `references/pipeline.md`: budgets, ticker, callouts, renderer, delivery tree, framing, materials
- `references/principles-3d.md`: 3D doctrine: formats, breakdown arc, one ticker, robustness
- `references/vocabulary-3d.md`: light and material terms, performance budget pattern
- `references/shader-kit.md`: the ten shaders worth keeping ready and when each earns its place
- `../scroll-story/references/example-product-page.md`: worked example with a 3D hero
