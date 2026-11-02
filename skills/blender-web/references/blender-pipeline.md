# Blender to web: preparation, commands, colour

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

## 3. Blender preparation

- Name every object semantically (`diffuser_strake_L`, `anchor_callout_exhaust`). Set each part's origin on the axis it slides or rotates along.
- Place Empty objects at every point where an HTML or SVG callout attaches. They export with the glTF and become the projection anchors.
- Real-time glTF: bake ambient occlusion and lighting into a second UV channel. Procedural shader nodes do not export to glTF; bake them to textures first.
- Pre-rendered or 2.5D: enable passes (Combined, Z normalised through Map Range, Normal, AO, Cryptomatte). Render with transparent film.
- Vector overlays: Grease Pencil Line Art or Freestyle to SVG, or project anchors live.

## 4. Commands

```bash
# Weld, simplify, compress geometry, convert textures to KTX2 (KTX2 needs KTX-Software installed)
npx @gltf-transform/cli optimize raw_model.glb public/model_opt.glb --compress meshopt --texture-compress ktx2 --texture-size 2048
# Default KTX2 mode (ETC1S) is fine for base colour and emissive but blocks up normal and ORM maps.
# Encode those slots with UASTC instead (proposed by one review; check `gltf-transform uastc --help` for slot syntax on your version).

# Scrubbable video: every frame a keyframe. Reduces backward-seek cost but does not remove seek latency;
# prefer an image sequence for scrubbed beats, video for long beats and autoplay (see section 13)
ffmpeg -i render_%04d.png -c:v libx264 -crf 20 -pix_fmt yuv420p -g 1 -keyint_min 1 -movflags +faststart scrub_ready.mp4
```

## 11. Color: Blender versus CSS

Blender defaults to AgX or Filmic, which desaturates and compresses highlights, so a hex in Blender will not match the same hex in CSS. If an object must blend into a solid CSS background, set the view transform to Standard, or match three.js tone mapping and scene background so both sides use the same transform. Test with a swatch in the first still. For web scenes, calibrate exposure with an 18% grey card: a sphere, colour 0.18 linear, roughness 0.5, metalness 0, should read about sRGB 118 to 128 under the chosen tone mapping. Blender exposure 0 is not three.js exposure 1.
