# 3D vocabulary and budget pattern

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

## Light and material

| Term | Meaning |
|---|---|
| Key, fill, rim | Main light, shadow lifter, edge separator |
| HDRI / environment map | Panoramic image lighting the scene and reflections |
| Roughness contrast | Glossy next to matte so both read |
| Contact shadow | Soft shadow where object meets ground |
| Atmospheric perspective | Deeper layers lower in contrast and saturation |
| View transform | Filmic or AgX; changes how Blender hexes map to screen |
| MatCap | A material that samples a lit sphere image; lighting without lights |
| Baked lighting / AO | Light and occlusion computed once in Blender and stored in textures |
| Render passes | Z-depth, normal, curvature, AO, Cryptomatte; separate data layers from one render |
| Canvas scrub | A pre-rendered frame sequence drawn to a 2D canvas by scroll progress |
| Depth plane | A flat image displaced by its depth map in a shader for 2.5D parallax |
| GOP=1 | Video encoded with every frame a keyframe so it scrubs without seeking lag |


**Performance budget**
```
Device floor: Adreno 710 class Android (Snapdragon 6 Gen 1), 4G. First paint under 1.5 s. Hero model under 1.2 MB after gltf-transform
(meshopt + KTX2). 60 fps during scrub with 4x CPU throttle. Only transform/opacity per frame.
```
