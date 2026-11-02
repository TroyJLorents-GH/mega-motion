# Scroll vocabulary and patterns

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

## Scroll

| Term | Meaning |
|---|---|
| Trigger | Crossing a threshold plays a timed animation |
| Scrub | Scroll position drives the animation directly |
| Pin | A section stays fixed while scroll continues; measured in viewport heights |
| Scroll range | Start and end, as fractions of viewport or section, e.g. `top 80%` to `top 20%` |
| Progress rail | Visible indicator of how far through a scrub the user is |


**Scrub with readable stops (plateau curve)**
```
Scrub range 120vh-370vh. Scroll maps linearly to timeline progress; the camera pose inside it
follows a plateau curve: smoothstep travel between stops, and an exactly constant pose across each
reading range (one viewport height per 25 words, as a starting heuristic).
Text visibility is derived from the current progress (inside the reading range = fully opaque), so
the text is readable wherever the user stops; a 300 ms ease-out entrance may play on top.
Use hysteresis on the show and hide thresholds (show at 0.55 going down, hide at 0.50 going up),
never on scroll position. With scrub smoothing on, derive text from the animated playhead.
Acceptance: the same scroll position gives the same pose and text after forward scroll, reverse,
a large jump and a reload.
Mobile row: repeat the beat with its own camera distance and label position (viewport variant 3m).
```
