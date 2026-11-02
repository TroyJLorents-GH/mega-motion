# Blender and colour principles

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

### 21. Color consistency between 3D and web

Renders out of Blender pass through a view transform (Filmic or AgX). Web colors are sRGB. A brand hex in Blender does not match the same hex on the page unless the material color is set in linear space and the output transform is accounted for. Test with a swatch in the first still.

### 26. Blender for the web: passes and recipes

Render passes worth exporting for web work: Z-depth (depth planes, fake DOF), normal map (surface detail without geometry), curvature or cavity (panel gaps and edges without shadows), ambient occlusion (multiply over flat color to ground a composite), Cryptomatte or material-ID (isolate a part so it can glow on hover). Render with a transparent film so the 3D layer can sit between a background and a foreground HUD.

Recipes to script with bpy: a Boolean cutter with an emissive edge material for a live cutaway; Geometry Nodes that offset parts from a controlling Empty for an exploded view driven by one value; a Mix Shader driven by Object Coordinate, Separate XYZ and ColorRamp for a wireframe-to-clay-to-photoreal wipe; a curve-guided camera. Blender's Line Art modifier and Freestyle SVG export give vector lines that GSAP DrawSVG can animate.
