---
name: code-film
description: Use when the output is a video file made from code (HTML and GSAP, Canvas, SVG, three.js, Remotion, HyperFrames): render contract, departments and gates, state lists, deterministic springs, beat grid and sound sync, per-format compositions, export and delivery. Not for editing existing footage; use ffmpeg-skill.
---

# Code-rendered film

The model writes a program that answers "what does the screen show at time t"; a renderer records it.

1. Render contract: every frame a pure function of t; no clock, timers or unseeded randomness; loops render frames 0 to N-1.
2. Departments in order, each with a gate: director, art director, animator, render engineer, critic (the `motion-critic` agent).
3. Story as states: hook, problem, reveal, proof, close; each beat has an entry state, an exit state and a reason.
4. Sound on the same clock; the picture works muted first.
5. Every format is its own composition from the same timeline, never a crop.
6. Render stills before the full film; deliver through `ffmpeg-skill` (`check.py`, `look.py`) when installed. HyperFrames and Remotion mechanics: their own skills and docs.

## Red flags

- A render driven by a clock, timers or unseeded randomness
- A vertical version made by cropping the wide master
- Calling a film done because the export finished
- An invented product screen

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `references/code-rendered-video.md`: the studio pipeline: contract, departments, states, sound, evidence, export, ffmpeg-skill
- `references/film-principles.md`: beat grids, pre-rendered pipelines, real UI capture
- `references/video-vocabulary.md`: video terms
- `references/example-explainer.md`: worked example: 30-second explainer
