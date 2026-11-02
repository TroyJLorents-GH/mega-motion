# Transitions and interaction feedback

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

### 10. Transitions

A transition should answer "where did I go". The strongest tools are continuity of direction (the vector law), shared elements (an element that persists across the cut and moves to its new place), and hidden cuts (the cut happens behind an occluder, a whip, or a flash of white under 2 frames).

Crossfades are the weakest transition and the most used. Use them when nothing else is justified, and keep them short.

### 12. Interaction feedback

Acknowledge input within 100 ms (a color change, a scale of 0.98). Complete the response within 200-300 ms. Use one spring for the whole product so everything feels like the same material.

Hover does not exist on touch. Any information revealed on hover must be reachable another way.

Loading states: under 300 ms show nothing (a flash of spinner is worse than nothing); 300 ms to 2 s show a skeleton or indeterminate indicator; over 2 s show progress or a message.

### Flip options

Capture `Flip.getState(targets)`, change the DOM or classes, then `Flip.from(state, opts)`, which returns a controllable timeline. `absolute: true` when elements leave the flow or toggle `display`; `onEnter` and `onLeave` to fade added or removed items; `scale: true` animates scale instead of size (cheaper, but distorts text). On resize, kill the old Flip, clear inline styles and rebuild.

### Drag and toss

Always set `bounds`; `edgeResistance` about 0.65; `inertia: true` for throws. Grid snapping with `snap` functions that round to the cell; magnetic points with `liveSnap: { points, radius }`; dials with `type: "rotation"`. Kill the target's tweens in `onPress`. Draggable is not keyboard accessible: every draggable control needs an arrow-key or button alternative, and `touch-action` must still allow page scrolling on the other axis.

### React rules (checked against the official gsap-react skill)

`useGSAP` from `@gsap/react` with `{ scope: containerRef }` and string selectors; register plugins once at module level; pass `dependencies` with `revertOnUpdate: true` when the animation must rebuild; wrap handlers created after mount in `contextSafe`; never animate in a bare `useEffect` without reverting.

### Theme recolour

Tween one custom property on `:root`; every rule that uses it updates together.
