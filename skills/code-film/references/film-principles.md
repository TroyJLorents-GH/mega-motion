# Film principles: sound, pre-rendered pipelines, real UI

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

### 16. Beat grids and sound

If there is music, derive frames per beat (fps × 60 / BPM) and land hero hits on downbeats. One sound cue per visible event, landing about one frame after it (never before), hero cues loudest. The piece must still work with sound off; sound confirms, it does not explain.

### 20. Pre-rendered pipelines

When the output is video, decide the engine by content: HTML and typography-led motion renders well from HTML-to-video tools; physically lit objects, characters and destruction need Blender. Blender's EEVEE renders fast on consumer GPUs; Cycles is slower and more faithful. Render key stills at full resolution first (one per beat), review, then render shots. Encode with ffmpeg to H.264 High, yuv420p, AAC, faststart. Keep a copy under 30 MB for sending.

### 22. Capturing real UI

Never invent application UI. Capture the real thing at full resolution, or record 5-10 s of real use. Composite it with its real proportions. Invented UI is the fastest way to lose a knowledgeable audience.

### 29. Code-rendered video and studying references

The studio pipeline for video made from code (render contract, five departments, state lists, deterministic springs, sound sync, critic evidence, repair policy, formats, export, ffmpeg-skill) is in `references/code-rendered-video.md`. Studying a live reference's real motion values with DevTools or REA, clean-room, is covered in `tool-selection.md`.

A second parallax convention, from the Motion Lab source: foreground 1.0, middle 0.5, background 0.2. It gives stronger depth than the 1.2/1.0/0.6 default in section 6, which is relative to the subject. Pick one per project and write it in the brief.
