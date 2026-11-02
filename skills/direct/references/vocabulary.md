# Vocabulary and prompt patterns

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


Precise words produce precise motion. Use these terms in briefs, beat tables and reviews.

## Timing

| Term | Meaning |
|---|---|
| Beat | One idea on screen, 2-3 s in film, one scroll range on the web |
| Hold | Time nothing moves so text can be read; 0.3 s/word + 0.5 s |
| Read time | The hold computed from the actual words |
| Stagger | Offset between sibling starts; overlap is how much they share |
| Settle | Small residual motion after the main move; 2-4% then stop |
| Push | Camera moving in slowly, under 2%, used instead of a frozen hold |
| Downbeat | A music beat the hero hit lands on |
| Frame-accurate | Timed to the frame, not "about half a second" |


## Easing and physics

| Term | Meaning |
|---|---|
| Ease-out | Fast start, slow end. Arrivals. |
| Ease-in | Slow start, fast end. Departures. |
| Ease-in-out | Both ends settle. Repositions. |
| Linear | Constant speed. Scrub, mechanical, loops. |
| Overshoot / back | Passes the target and returns. One hero per screen. |
| Spring, damping ratio | 1.0 no overshoot; 0.8 hint of life; 0.5 playful |
| Anticipation | A small move opposite to the main move before it starts |
| Follow-through | Parts that keep moving briefly after the body stops |


## Space and camera

| Term | Meaning |
|---|---|
| Hero | The single element the frame is about |
| Carrier | An element that persists across a section change and glues them |
| Primary actor, secondary follower, static anchor | The hero, the thing that follows it 60-100 ms later and moves less, and the thing that does not move so motion can be measured |
| Callout projection | 3D anchor projected to screen space each tick so a label stays pinned to its part |
| Exploded view | Parts offset along local axes from a centre, driven by one value |
| Cutaway | A Boolean cutter slicing geometry, often with a glowing edge |
| Shader wipe | A sweep that transitions a material from wireframe to clay to photoreal |
| Vector law | Exit direction determines the next entry direction |
| Current | The dominant direction of travel across the whole piece |
| Parallax ratio | Layer speed relative to the subject: 1.2 fg, 1.0 subject, 0.6 bg |
| Dolly | Camera moves. Viewer feels they travelled. |
| Zoom | Lens changes. Viewer feels they looked closer. |
| Orbit | Camera circles the subject |
| Rack focus | Focus shifts from one plane to another |
| Occluder | Something that passes in front to hide a cut |
| Match cut | A cut where a shape or motion continues across it |


## Accessibility and performance

| Term | Meaning |
|---|---|
| Reduced-motion variant | The build for `prefers-reduced-motion: reduce`; same information, no translation beyond 8 px, no parallax, no autoplay |
| Compositor-only | Animates only transform and opacity |
| Layout thrash | Animating width, height, top, left, margin; causes reflow each frame |
| Device floor | The slowest device and network that must work |
| First-frame budget | Bytes needed before the hero is visible |


## Prompt patterns

Use these shapes. Each gives numbers and a reference instead of adjectives.

**Beat spec**
```
BEAT 3 | scroll 200vh-300vh (scrub, linear) | hero: headphones model
camera: orbit 40° right, dolly from 1.4 m to 0.9 m, ease-in-out over the range
support: spec labels fade in at 30%, 55%, 80% of range, 300 ms each, ease-out, 100 ms stagger
text: "40-hour battery" appears at 55%, fully opaque from 55% to 100%
reduced-motion: model static at the end pose; labels fade in on trigger
```


**Precise phrasing (prefer the right column)**

| Vague | Precise |
|---|---|
| fade in the text | overflow-masked line reveal, 80 ms stagger, 700 ms, enter ease |
| move the pieces apart | exploded view along local axes from the assembly centre, 40 ms stagger by distance, 900 ms, move ease |
| cool lighting | one warm key upper left, cool fill at 20%, environment map for reflections, baked contact AO |
| connect it to scroll | pin the section for 2.5 viewport heights; map scroll progress 0 to 1 to the master timeline; 0.6 s catch-up smoothing |
| zoom in on the part | dolly from 1.4 m to 0.9 m while the target interpolates to the part's bounding-box centre, 600 ms, move ease |
| show a technical view | interpolate the camera from perspective (35 mm) to orthographic so callout lines align with a 2D grid, 800 ms, move ease |
| smooth scroll | native scroll; animation weight comes from scrub smoothing, not from altering the user's scroll |


**Six-layer prompt for a motion component or Blender script**
```
1. CONTEXT AND MEDIUM:   library versions, or Blender version and bpy
2. SPATIAL AND CAMERA:   projection, focal length or fov, start and end coordinates, target vector
3. ACTOR HIERARCHY:      primary actor motion; secondary follower and its delay; static anchors
4. TIMING AND PHYSICS:   durations, stagger, easing curves, scrub smoothing
5. PERFORMANCE BUDGET:   draw calls, pixel-ratio cap, cleanup (gsap.context, dispose)
6. A11Y AND REDUCED:     what replaces camera travel under reduce (cross-fade of end states)
```

**Translating a feeling into numbers** (from the Motion Lab source)

| Note received | Send instead |
|---|---|
| make it pop | scale 1.0 to 1.08 to 1.0 over 6 frames, peak on the beat |
| make it feel premium | ease-out-quint entrances, springs at damping 0.8, no overshoot on text |
| it drags | shorten each hold by one beat (12 frames at 120 BPM, 24 fps) so cuts stay on the grid |
| it feels busy | one hero move at a time; everything else starts 150 ms later at 60% of its travel |
| it looks like AI | list the defaults used by name, ban each one, render again |


**Reference extraction**
```
From ref-A at 0:04-0:09: borrow the single warm key from upper left, the 0.6 bg parallax,
and the way text holds for 1.8 s before the camera resumes. Reject the lens flare.
```


**Correction note (review to builder)**
```
Beat 2: two heroes. The headline and the product both arrive in the same 400 ms.
Fix: product lands first (600 ms, ease-out), headline arrives 250 ms after it settles.
```


**Reduced-motion spec**
```
For reduce: replace every translateY reveal with opacity 0 -> 1 over 200 ms.
Remove parallax. Pinned 3D section becomes normal-flow chapters, one still per key pose (silhouette, exploded, detail, lockup), each caption beside the pose it describes; a sticky chapter label replaces the progress rail.
Autoplay hero loop replaced by its first frame with a Play control.
```
