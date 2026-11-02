---
name: study
description: Use when a reference website, app or video must be measured before building or matching it: timings, easings, scroll ranges, palette, depth cues and pacing, recorded clean-room with numbers and confidence. Never copies code, shaders, assets or fonts.
---

# Study a reference

Taste is transferred by reference, not adjective, so measure the reference instead of describing it.

1. For each reference, list shots or sections, palette hex, pacing (seconds or scroll per idea), easing family, depth cues, what to borrow and what to reject.
2. For a live site or app, measure real values: DevTools (Performance, Animations panel, computed styles), or REA where installed. Record behavior and numbers only.
3. For a video, extract frames with ffmpeg and time the moves from frame numbers.
4. Write `references.md` with each value, its source (measured, read from code, estimated) and a confidence.
5. Long browser sessions belong in the `reference-analyst` agent so the dumps stay out of the main context.

Clean-room rule: write a spec of behavior and numbers, then build from the spec. Never copy code, shaders, assets, fonts or paid features into the build.

## Red flags

- Describing a reference with adjectives instead of numbers
- Copying a reference's code or assets instead of its measured behavior
- A value with no source or confidence

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `../direct/references/tool-selection.md`: REA, DevTools and other research tools with licences
- `references/measured/`: the measured reference library and candidate sites to measure next
