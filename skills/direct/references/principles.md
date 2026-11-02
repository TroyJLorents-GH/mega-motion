# Principles: foundations

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

Two tiers. Foundations apply to every job. Advanced applies when the brief earns it. Everything here is craft doctrine, stated as decisions with reasons, not as measured fact. Where a number appears it is a default to override deliberately.

---

### 1. Motion has a job

Four jobs: **orient** (where am I, what changed), **reveal** (what matters, in what order), **respond** (the system heard me), **persuade** (feel something about this product).

Decision rule: name the job before writing the tween. If you cannot, delete the movement. This one rule removes most "AI-looking" motion, which is motion added because it was possible.

Weak-work signal: a page where ten things fade-up on scroll. None of them orients, reveals, or responds. They all just arrive. Fix: let the layout arrive instantly, and spend motion on the one element the section is about.

### 2. One hero per frame

At any moment the eye should have one place to go. Hierarchy is made by contrast: size, value (light against dark), and motion. Motion is the strongest of the three, which is why it must be rationed. Two things moving fast at once is a tie, and a tie is noise.

Decision rule: in the beat table, every row names one hero. Everything else in that beat is support, which means slower, smaller, lower contrast, or still.

A useful three-role cast for any moment: a **primary actor** (the hero), a **secondary follower** (a callout line or label that starts 60-100 ms after the hero and moves less), and a **static anchor** (typography or a grid line that does not move at all, so the eye has a reference). If a beat has no static anchor, the viewer has nothing to measure motion against and everything reads as drift.

### 3. Timing: duration follows distance and mass

Short travel, short time. Big heavy things take longer to start and stop. Small UI elements feel wrong above 300 ms; a full-screen panel feels wrong below 400 ms.

Exits are shorter than entrances. The viewer has already seen the thing; leaving is housekeeping. Default: 40-50% of the entrance.

Stagger creates reading order. Items that stagger in are read in that order, so stagger in reading order, never in a visually pleasing but semantically random order. Overlap the staggers (each starts before the previous ends) or the sequence feels like a slide show.

### 4. Easing is character

Easing says what the thing is made of and why it moved.

- **Ease-out** (fast start, slow settle): arrivals. Things entering the frame or responding to the user. The default for 70% of UI motion.
- **Ease-in** (slow start, fast end): departures. Something leaving under its own power.
- **Ease-in-out**: a move between two on-screen positions. Both ends are visible, so both should settle.
- **Linear**: the mapping from scroll position to timeline progress, mechanical motion, and continuous loops. Linear for anything else looks computed. Scroll-to-progress linear does not mean every property inside a scrubbed timeline is linear: a camera can accelerate, decelerate and hold within it (see the plateau pattern in vocabulary.md).
- **Springs**: interaction response and physical objects. A spring with damping ratio 1.0 (critically damped) has no overshoot and is the right default for text and UI. 0.8 gives a hint of life for premium product motion. 0.5 is playful and belongs to characters, not interface.
- **Overshoot / back-ease**: one hero element per screen, at most. Two overshoots on one screen reads as a toy.

Weak-work signal: every tween uses the library default (often `power1.out` or `ease`). Everything has the same personality, so nothing has one. Fix: three easings per project, assigned by role (enter, move, exit) and named in code.

Advanced note: custom curves should be drawn from a reference, not guessed. Scrub a reference video frame by frame, plot the hero's position, and fit your curve to that.

### 5. Choreography: relationships, not timings

Good choreography is about how elements relate. A card and its shadow are one object; the shadow must not lag unless lag is the point. A parent moving carries its children; children that also move should move less (they are already being carried).

**The vector law:** how something exits determines how the next thing enters. If a section slides out to the left, the next section arrives from the right, or continues leftward. Reversing direction without a reason breaks the feeling of one continuous space.

**Follow-through and settle:** heavy elements settle after the main motion stops. A single 2-4% settle is enough; more becomes wobble.

**The camera is a character.** In 3D and in scroll stories, treat the viewport as a camera with a personality: it moves for a reason, decelerates into readable positions, and never jitters. In scroll stories the camera is still while text is read; in timed video the camera brakes but the frame never freezes (see the settle rule in section 8).

### 6. Depth

Three layers: foreground, subject, background. Parallax ratios roughly 1.2 : 1.0 : 0.6 on scroll or mouse. Deeper layers are lower contrast and slightly desaturated (atmospheric perspective) so depth reads even without parallax.

Depth comes from light, not from drop shadows. A soft gradient on a surface, a highlight edge, and a darker lower region say "volume" better than a box-shadow.

Depth of field in 3D: one subject in focus, everything else soft. Used once per scene. Used constantly it reads as a blur filter.

Weak-work signal: parallax on every section at wildly different speeds. The page feels like it is tearing. Fix: parallax on one or two sections where depth tells the story, at gentle ratios.

### 7. Lighting and materials (3D)

Build lighting silhouette first. Beginners flood a scene with uniform ambient light so everything is visible, which destroys depth; chiaroscuro, the ratio of light to shadow, is what carves form. Establish a **rim or back light** to separate the subject from the background, then a **key** at about 30 to 45 degrees to reveal surface detail, then a low **fill** so shadows keep texture and do not go muddy grey. Three-point thinking still works: a **key** (direction and mood), a **fill** (lifts shadows so detail survives), and a **rim** or environment light (separates the subject from the background). On the web the cheapest convincing rig is one directional key plus an HDRI environment map for reflections and ambient. Poly Haven HDRIs are CC0 (verified, see tool-selection).

Materials read through contrast: put one rough surface next to one glossy one. A product that is all glossy or all matte looks like a render. Roughness variation (a roughness map, or at least two roughness values) is the single biggest realism gain per byte.

Avoid pure white (#FFFFFF) and pure black (#000000) in 3D materials and rendered scene backgrounds. They clip, they do not take light, and they flatten everything near them. This is a PBR albedo rule, not a CSS rule: a #000000 page background behind a canvas is a normal, premium choice.

Color temperature contrast: a warm key against a cool fill or background gives dimensionality for free.

Weak-work signal: a 3D hero lit with even ambient light so every surface is equally visible and nothing has depth. Fix: kill the ambient, start from the rim.

Weak-work signal: a 3D hero floating in a flat gradient with no shadow contact. Fix: a contact shadow (even a baked soft blob) and an environment map, before any other material work.

### 8. Camera

Lens choice is a mood choice. Wide (24-35 mm equivalent) for environments and scale; it distorts products. Normal to long (50-85 mm) for products and faces; it flatters and compresses.

Moves must be motivated by content: a dolly in because the next thing to read is small; an orbit because the side reveals a feature. Unmotivated drift is the 3D equivalent of fade-up-on-scroll.

Dolly, do not zoom, when you want the viewer to feel they moved. Zoom when you want them to feel they looked closer. They are different feelings and are often confused.

Settle rule: the camera brakes to under 2% motion while any text is read. On a page, stillness is an authored state: hold the camera completely still for reading or inspection unless movement reveals something. In timed media (reels, films) a read hold is not a freeze: the text holds its position and stays fully opaque, while the frame keeps living through a slow push (1-3% scale over the hold) or a visibly moving secondary layer such as drifting light, a shifting gradient or a background shape. Grain alone does not count. Nothing in the frame stands fully still for more than 0.5 s except the final end card, which holds at most 1 s. A video made of still cards joined by wipes is a slideshow, not motion. In scrubbed media the viewer owns time, so the settle is a scroll range, not a duration: the camera pose is exactly constant across the range in which the text is read (see section 9).

### 9. Typography in motion

Text is read, not watched. That changes everything.

- Reveal in reading order. Lines, then words. Letters only for one or two hero words.
- Hold for read time. In timed media: 0.3 s per word plus 0.5 s, minimum, and nothing moves the text during the hold. In scrubbed media the viewer owns time, so convert read time to scroll distance: give each text block a scroll range (default one viewport height per 25 words, more on short phones; a heuristic, because scroll distance cannot guarantee reading time) in which the camera pose is constant and the text is fully opaque wherever the user stops. Never add dead scroll. Hysteresis is good on trigger thresholds (a label shows at 55% going down and hides at 50% going up); hysteresis on scroll position, where the page refuses to move, is banned. If scrub smoothing is on, the camera lags the scrollbar by a fraction of a second, so start the text at the plateau's start, not its middle.
- Never animate weight, letter spacing, or size while the text is legible. Those are reveal effects, finished before reading begins.
- Scroll-linked text that fades as you read it is a usability failure dressed as elegance. Text pinned for reading should be fully opaque for the whole readable range.
- Type scale and weight carry hierarchy. Motion confirms it, and does not create it.
- Typography can sandwich the 3D subject in depth: a large title behind the mesh and crisp telemetry in front gives optical depth without shaders. Otherwise lock display type to a rigid grid so it grounds the scene.
- Split text breaks semantics. Splitting a heading into spans turns one accessible string into dozens of fragments and breaks nested links. For any split text that contains a link or emphasis, animate an `aria-hidden` copy and keep a visually hidden `.sr-only` duplicate with the real markup for screen readers.

### 13. Restraint

Three situations where less clearly beats more: the user is reading or comparing data (lock text once revealed); the 3D subject is already complex, such as a 300-part assembly, in which case UI transitions should be sharp, minimal and quiet and particles, chromatic aberration and bouncing buttons cheapen the precision; and scroll fatigue, where every section pins for thousands of pixels. Alternate pinned spectacle chapters with normal-flow reading chapters so the user feels in control of the journey.

Run a subtraction pass before every review: remove each movement and ask whether the beat got worse. Keep only the ones where it did. Half of motion survives this.

The one-accent rule: one accent color, reserved for the hero. One overshoot per screen. One pinned 3D moment per page. Scarcity is what makes the hero land.

Static is a valid answer. A still, well-lit product photo with one 400 ms reveal often beats a 3D hero. Choose 3D when rotation, material, or scale is the story.

### 14. Accessibility and performance are design requirements

- `prefers-reduced-motion: reduce` is a first-class variant, designed in step 3, not patched in step 6. It keeps every piece of information and every affordance. It replaces translation with opacity, removes parallax, stops autoplay loops, and shortens durations.
- WCAG 2.2.2 (Level A, verified): any moving, blinking or scrolling content that starts automatically, lasts longer than five seconds and sits beside other content must be pausable, stoppable or hideable. Autoplay hero loops need a pause control or must end.
- WCAG 2.3.3 (Level AAA, verified): motion triggered by interaction can be disabled unless essential. Reduced-motion handling satisfies this.
- Keyboard: every interactive animated element is focusable, focus is visible, and nothing requires a pointer gesture.
- Performance budget: 60 fps on the device floor. Per-frame motion uses compositor-friendly properties: `transform`, `opacity`, `clip-path` and `mask` on a promoted layer, and uniforms in a shader. Width, height, top, left, margin, font-size, `filter` and `backdrop-filter` are bugs unless the Performance panel shows no layout or paint storms at 4x CPU throttle. `will-change` on the few elements that move, removed when they stop.
- Loading: motion must not block first content. Heavy assets (3D, video) load after first paint, with a designed placeholder that is itself a complete composition.
- Maintainability: all timings in one tokens file. All easings named. One timeline per section. A new developer can change the hero duration in one place.


### 15. Scene continuity across a whole page or film

Treat the page as one camera move. Keep a "current": a dominant direction of travel that persists across sections. Elements that carry across sections (a product, a line, a color field) are the strongest glue. Plan carriers in the beat table before building.

### 27. Where this skill disagrees with common advice

- "Never use ease-in-out." Disagree. Repositions where both ends are visible need both ends to settle. Use it for moves, not for arrivals.
- "Default eases are forbidden." Partly. Library defaults are a problem because they are unexamined, not because they are wrong. A named, role-assigned `power2.out` is fine.
- "Always use a smooth-scroll library with heavy 3D." Disagree as a default. Inertial smoothing adds latency to every scroll, can disorient keyboard and screen-reader users while it catches up, and feels wrong on OS-tuned trackpads (Lenis keeps native find-in-page working; ScrollSmoother breaks sticky and fixed inside its wrapper). Use it when the brief wants inertia, off on touch, off under reduced motion. ScrollTrigger's scrub smoothing (0.5 to 1.0 s catch-up) gives weight to the animation without touching the user's scroll.
- "Jargon commands quality." Precise words help because they carry numbers and mechanisms, not because they sound expert. "Overflow-masked line reveal, 80 ms stagger, 700 ms, enter ease" is precise. "Sub-pixel inertial damping" is decoration.

### 32. Typography mechanics

From the model reviews; values are house judgment.
- Track by size: display type at 48 px and up tightens to about -0.025 to -0.04em with line height 0.92 to 1.05; small uppercase labels and telemetry (10-12 px) open to about +0.06 to +0.12em.
- Any number that moves, ticks or sits in a readout uses `font-variant-numeric: tabular-nums` so its width never jitters.
- Light text on dark motion scenes: `-webkit-font-smoothing: antialiased` so strokes do not bloat on promoted layers.
- Reveal headlines with overflow masks per line (SplitText `mask: "lines"` in GSAP 3.13+, verified), not opacity fades; letters only for one or two hero words.
- Set line breaks by hand for display lines; no widows; test the longest likely translation and the longest real headline, because read time and masks change with length.
- Optical alignment: hang punctuation and align display type to the visual edge of letterforms, not the text box.

### 33. Vague prompts and the defaults they summon

(one lab's result, flxrnc's Opus 5.5 Motion Lab, Sept 2026; not re-tested here): a 27-word "premium, modern" prompt came back with dark navy space, a glowing halo ring, bloom, particles, a spinning product and an invented tagline. Ban these by name in every brief unless the brief asks for them: purple or blue gradients, glow orbs, bloom, neon, lens flares, decorative particles, spinning turntables, invented text, fade-and-slide-up on everything. After every first render, add whatever new default appeared to the ban list. Translate adjectives into numbers: "premium" into materials, "cool" into a lit studio, "modern" into a camera, "animation" into beats and springs.

### 34. Character and follow-through numbers

Exaggerate key poses 10-30% for phone viewing. Follow-through example from the lab: arms settling at 2.2 Hz with damping 0.22. Secondary moves travel 50-70% of the hero's distance. The lab started them 100-200 ms after the hero; this skill's UI default is 60-100 ms. Pick one per piece on purpose: tighter for interface, looser for characters.
