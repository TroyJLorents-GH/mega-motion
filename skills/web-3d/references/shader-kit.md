# Shader kit (specification; code arrives in phase 3)

A shader earns its place when it is the content, not a background effect. These are the ten a studio keeps ready. Write them in TSL so they run on both WebGL and WebGPU backends; each under about 60 lines. Sources: synthesised from three model reviews (Fable 5.1, GPT-6 ASTRA, Gemini 4 Argon) on 2026-10-30, kept in the research folder. Items marked *verified* were checked against a primary source; everything else is reported or judgment.

| Shader | Use when the brief says | Notes |
|---|---|---|
| Noise field | atmosphere, living surfaces, organic texture | seeded, time-driven; one octave on mobile |
| Dissolve | a part appears or a material changes | noise threshold with a thin emissive edge |
| Fresnel rim | silhouette separation without a rim light | cheap; pairs with dark grounds |
| Depth-displaced plane (2.5D) | hero image with parallax, no 3D model | beauty plus depth map; keep displacement about 0.015-0.025 to avoid tearing |
| Gradient map / duotone | brand colour treatment on footage or renders | sRGB input, careful with tone mapping |
| Matcap material | studio look at near-zero cost | no lights needed; one matcap PNG |
| Wireframe-to-solid wipe | engineering reveal, blueprint to product | object-space coordinate threshold |
| Chromatic edge | speed or lens stress, velocity driven | clamp to zero at rest |
| Grain and dither | banding control, editorial texture | merge into the single post pass |
| Fluid splat | interactive atmosphere responding to cursor or scroll | one shared field per renderer; off under reduced motion |
