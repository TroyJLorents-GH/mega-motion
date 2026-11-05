---
name: code-film
description: Use when the output is a video file made from code (HTML and GSAP, Canvas, SVG, three.js, Remotion, HyperFrames): render contract, departments and gates, state lists, deterministic springs, beat grid and sound sync, per-format compositions, export and delivery. Not for editing existing footage; use ffmpeg-skill.
---

# Code-rendered film

The model writes a program that answers "what does the screen show at time t"; a renderer records it.

## Start from the studio, not from a blank file

This skill ships a working harness and proven templates in `studio/`. Use them for every video unless the user names another framework (HyperFrames, Remotion):

```
node <this skill's folder>/scripts/new_film.mjs <project folder> --template launch-reel
cd <project folder> && npm install
```

Then put the user's words, colours and beat times in `film.json` and run `node studio/render.mjs stills` (contact sheet at every beat), adjust, and `node studio/render.mjs film` (score, MP4, freeze, rhythm, determinism and safe-zone checks, contact sheet). Read `studio/README.md` for the page contract and every command. It runs on macOS, Windows and Linux with Node 18+; Python 3 adds the score and the freeze check; it uses Chrome or Edge when Playwright's own browser is missing.

| Template | Use it for |
|---|---|
| `launch-reel` | 9:16 product or feature launch, about 15 s: hook written by accent wipes, a claim proved by motion (a ring that laps 1x to 2x, or for drinks `"visual": "glass"`, a glass poured to 1x then 2x), product, optional facts on a progress rail, call to action with the product dropping onto the end card. Put a real cutout photo in `content.product.image` when the user has one; ask for it once on a product launch |
| `character-film` (beta) | A voxel mascot acting through a 3D world of app windows (three.js), 9:16 or 16:9, about 17 s: a question in a chat, the mascot runs, crashes THROUGH a page that shatters, catches the file that falls out, flings it onto an editor timeline, the result plays, end card. The mascot is a sprite grid in film.json (swap in the user's own); windows take real screen captures (`"capture"`), and a listed capture that is missing stops the render instead of shipping a stand-in. Read its `TEMPLATE.md` |

Adapt the closest template before writing a composition from scratch. A new composition keeps the template's structure: `boot()` and `seek(t)` from `studio/kit.js`, one carrier element that travels through every beat, a living ground under every hold, and `window.EVENTS` for sound cues.

## Rules

1. Render contract: every frame a pure function of t; no clock, timers or unseeded randomness; loops render frames 0 to N-1.
2. Departments in order, each with a gate: director, art director, animator, render engineer, critic (the `motion-critic` agent).
3. Story as states: hook, problem, reveal, proof, close; each beat has an entry state, an exit state and a reason.
4. Sound on the same clock; the picture works muted first.
5. Every format is its own composition from the same timeline, never a crop.
6. Render stills before the full film; deliver through `ffmpeg-skill` (`check.py`, `look.py`) when installed. HyperFrames and Remotion mechanics: their own skills and docs.
7. The frame never freezes. A read hold keeps the text still, not the frame: a slow push or a visibly moving secondary layer carries every hold, and the hero of each beat fills at least 40% of the frame's width or height. Only the final end card may stand still, for at most 1 s.
8. Render the main film with reduced motion explicitly off (Playwright `reducedMotion: 'no-preference'`), because some machines report reduced motion system-wide. Render the reduced-motion version as its own pass.
9. Before calling the film done, the freeze, determinism and safe-zone checks must pass: `node studio/render.mjs film` runs both and writes `out/review/checks.json`. Outside the studio, run `python3 <this skill's folder>/scripts/freeze_check.py out/anim.mp4` (on Windows, `python` or `py`). A freeze fail means more motion is needed: fix the beats it names and re-render. Never loosen a limit to pass.
10. Then the `motion-critic` agent reviews `out/review/contact.png` plus 12-frame strips around each transition (`node studio/render.mjs stills every:0.04 --from A --to B --out out/review/strip-NAME.png`), with the brief's one sentence and the beat table, never your description.

## Red flags

- A render driven by a clock, timers or unseeded randomness
- A vertical version made by cropping the wide master
- Calling a film done because the export finished
- Still cards joined by wipes or cuts: a slideshow, not a film
- A small hero floating in a large empty frame
- An invented product screen

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `references/code-rendered-video.md`: the studio pipeline: contract, departments, states, sound, evidence, export, ffmpeg-skill
- `references/film-principles.md`: beat grids, pre-rendered pipelines, real UI capture
- `references/video-vocabulary.md`: video terms
- `references/example-explainer.md`: worked example: 30-second explainer
- `scripts/freeze_check.py`: fails a film that freezes (stdlib Python plus ffmpeg; `--json` for QA)
- `scripts/new_film.mjs`: creates a film project from the studio harness and a template
- `studio/README.md`: the harness: page contract, commands, checks, sound, credits
