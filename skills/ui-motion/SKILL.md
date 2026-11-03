---
name: ui-motion
description: Use for interface motion that is not scroll-driven: feedback timing, hover and press, focus states, loading states, page and route transitions, Flip and View Transitions, and behaviour under interrupted or repeated input. Not for whole-page scroll stories; use scroll-story.
---

# Interface motion

Interface motion orients and responds; it rarely persuades.

- Acknowledge input within 100 ms; complete the response in 200 to 300 ms; one spring for the whole product.
- Hover does not exist on touch; anything revealed on hover must be reachable another way. Focus equals hover plus a visible outline.
- Loading: nothing under 300 ms, a skeleton to 2 s, progress after.
- Transitions answer "where did I go": continuity of direction, shared elements, hidden cuts. View Transitions for route changes where supported; Flip where the morph must stay interruptible or live.
- Design for interruption: `overwrite: 'auto'`, `gsap.quickTo` for followers, `Flip.killFlipsOf()` before capturing state, never a CSS transition on a property JavaScript drives.


## Start from the kit, not a blank file

The template ships reusable components with motion already tuned (toggle, slider, async button, toast stack) in `kit/`, shown as a settings panel:

```
node <plugin>/shared/web-studio/new_page.mjs <folder> --template ui-motion/settings-panel
cd <folder> && npm install
```

Lift components from `kit/` into the user's app (plain JS, or wrap them in React as `TEMPLATE.md` shows), or edit `content.json` for the demo. `node studio/web.mjs check` measures feedback within 100 ms per interaction, survival of five fast repeats, and reduced motion; `shots` and `film` record the tour (`tour.js`). Read `<plugin>/shared/web-studio/README.md` for the page contract.

## Red flags

- Whole cards scaling on hover, counting-up stats, filler marquees, cursor gimmicks everywhere
- A spinner that flashes for under 300 ms
- Information reachable only by hover
- A CSS transition fighting a mousemove handler

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `references/interaction-principles.md`: transitions and interaction feedback doctrine
- `references/interaction-vocabulary.md`: the interaction spec pattern
- `references/example-app-motion.md`: worked example: app motion with no 3D
- `references/web-audio.md`: opt-in interactive sound, synthesised
- `../../shared/native-apis.md`: View Transitions support
- `../../shared/gsap-plugin-map.md`: Flip, Draggable, Observer and the rest by job
