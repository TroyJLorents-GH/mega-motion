---
name: blender-web
description: Use when a model, render pass, image sequence or camera path must come out of Blender for a website or film: naming and origins, callout anchors, baking, render passes, colour management, glTF export and KTX2 or meshopt compression, bpy recipes for exploded views, cutaways and curve cameras.
---

# Blender to web

Prepare in Blender so the browser does as little as possible.

1. Name every object semantically; put each part's origin on the axis it moves along; add Empty anchors where callouts attach.
2. Bake lighting and AO for real-time; bake procedural shader nodes to textures before export.
3. Export glTF and compress with glTF-Transform (meshopt plus KTX2; UASTC for normal and ORM maps).
4. For pre-rendered or 2.5D work, enable the passes you need and render with transparent film.
5. Match colour: Blender's AgX or Filmic view transform will not match a CSS hex; use Standard or match the three.js tone mapping, then check with a grey card and a brand swatch.

## Red flags

- Procedural nodes exported without baking
- Brand colour judged by eye across Blender and the browser
- Uncompressed textures in the export

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `references/blender-pipeline.md`: preparation, commands, colour
- `references/blender-principles.md`: colour consistency, passes and bpy recipes
