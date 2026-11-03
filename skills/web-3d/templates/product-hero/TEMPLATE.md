# product-hero (web-3d)

A three.js product hero that turns as you scroll. Callouts hang off the model on thin leader lines, and each callout's motion proves its claim. The default content is the field-test brief: the Atlas Pro smartwatch with three callouts, titanium case, 18-hour battery and 212 g. The watch is built procedurally. It stands in for the product category and does not copy any brand's design. Any .glb can replace it.

```
node <plugin>/shared/web-studio/new_page.mjs my-hero --template web-3d/product-hero
cd my-hero && npm install
node studio/web.mjs preview | shots | check | film
```

## Beats (page = hero 1 vh, pinned stage `pinLength` vh, outro 1.4 vh)

Each chapter is one third of the pin. It spends 34% of that third moving and the rest on a read plateau, where the camera and model hold exactly still and the copy and callout stay fully opaque. The copy fades in over the last 38% of the move and leaves over the first 30% of the next move. On the plateau, the copy carries `data-read` with the plateau range, so the checker can verify it.

| Beat | Hero | Motion that proves the claim | Text | Reduced motion |
|---|---|---|---|---|
| Hero | product, three-quarter | holds, then turns to the case side while the name scrolls away | kicker, name, scroll cue | static pose |
| 1 Case (`proof: highlight`) | case flank | profile pose; studio strips slide along the brushed flank all through the hold (environment rotation, product still) | `01 - Case`, headline, callout | key pose |
| 2 Battery (`proof: ring`) | face | turns face-on; the display hands over from the time to an hour ring that fills 0 to `number` | headline, callout | ring shown full |
| 3 Weight (`proof: lift`) | whole product | turns three-quarter and rises off the floor; the camera does not follow, and the shadow stays down, spreads and fades | headline, callout | lifted pose |
| Outro | lockup | settles back down, three-quarter | name and spec row (normal flow) | same |

A progress rail shows the chapter and pin progress (desktop: under the copy; portrait: top). Reduced motion, and no WebGL, use normal-flow chapters with one key pose each. The canvas cross-fades between poses, with no travel and no pin.

## What to edit

- `content.json`: product name, kicker, headline per chapter, callout label and value, ring hours (`number`), outro specs, colours (`titanium`, `band`, `floor`, `glow` feed the 3D), `pinLength` (vh) and `model`. Invent no facts: every word is the client's.
- `main.js` holds motion and framing:
  - `POSES`: yaw, tilt, lift, the model-space `target` to frame, `size` (number or `{wide, tall}`), and the `frame` screen position for each layout.
  - `CALLOUT_OFFSETS`: label offsets in px per layout.
  - `CHAPTER.move`: the move/hold split.
  - Easing and the environment-sweep keys, in `layout()`.
- `stage.js` holds the studio:
  - the PMREM environment strips (no HDRI download);
  - the key light, floor pool, backdrop glow and baked contact shadow;
  - renderer settings: WebGLRenderer, Neutral tone mapping, and a pixel ratio of 1.5 on phones and up to 2 on desktop, set once.
- `watch.js`: the procedural watch and its display `CanvasTexture`.
- `fallback.js`: the SVG still. It shows before the first frame, without WebGL, and after a lost context.

Callout ids `case`, `battery` and `weight` match the procedural anchors in `watch.js`. If you add or rename chapters, add a pose and an offset under the same id.

## Dropping in a real model (.glb)

1. Use a CC0 or brand-supplied model. Check its licence and keep the source URL in your notes.
2. Compress it before shipping, for example `npx @gltf-transform/cli optimize in.glb product.glb --compress meshopt --texture-compress ktx2`. Aim for under 1.5 MB.
3. Put it in the page folder and set `"model": "product.glb"` in `content.json`. The loader takes meshopt, Draco and KTX2 from `node_modules/three`, with no CDN. It then normalises the model: same height as the stand-in, centred, standing on the floor.
4. Set each callout's `anchor` as bounding-box fractions `[x, y, z]`, from 0 to 1 (for example, `[1, 0.45, 0.55]` is the right flank). Leader lines project from these points every frame.
5. Without the procedural face, `proof: ring` draws a DOM ring that fills around the battery anchor. The highlight and lift proofs work with any model.
6. Re-tune `POSES` (yaw and target) for the new shape. Then run `shots` and `check`.

If the .glb fails to load, the page logs a warning and keeps the procedural watch.

## Guarantees and budgets (measured on the Atlas default)

- 9 draw calls and about 17k triangles at 390 px and 1440 px (budget under 50 on mobile). `window.__drawCalls` is logged at load.
- A scroll position always gives the same frame. With `?capture`, raw scroll is used with no 0.6 s catch-up, and `window.ScrollTrigger` is exposed. One gsap ticker drives everything and renders only when something changed.
- About 51% of the page is pinned (budget 60%). The no-horizontal-scroll check passes at 390 and 1440 px.
- Shaders are compiled before the canvas fades in over the still, and the first frame is seeded at the current scroll.
- On a lost context the page shows the still, and recovers when the context is restored.
- `window.__dispose()` (also on `pagehide`) frees the ticker, triggers, geometry, materials, textures, the PMREM and the renderer.

## Known limits

- The procedural strap is a closed loop. In tight profile views it is the largest shape in frame, and it reads as simpler than a real band.
- The case-flank highlight sweep is clear in motion but subtle in stills.
- Headless frame pacing is a regression signal only. Test on a physical mid-range phone for four minutes.
