---
name: direct
description: Use first when starting a new motion-heavy page, hero, scroll story or motion film, or when existing motion needs re-direction rather than a fix - sets the brief, references, beat table, hero per beat, timing defaults and approval gates. Not for fixing a single tween or library bug, editing existing footage, or GSAP API questions.
---

# Direct

Motion is direction, not decoration. Every movement has one of four jobs: orient (where am I), reveal (what matters), respond (did it hear me), or persuade (why care). A movement with no job is cut. The skill runs a gated pipeline so the agent plans before building, builds a kit before shots, and tests on a slow device before calling anything done.

**Rule zero: decide what the motion must communicate first, then use numbers to build and test it.** Adjectives get defaults; numbers get direction; label every number as a default, a measurement or a judgment. "Smooth" and "premium" are not instructions. Durations, easing curves, hex values, pixel sizes and frame numbers are.

**Read on demand, not up front:** `references/principles.md` when making a creative decision, `references/tool-selection.md` when choosing a tool or checking a license, and the specialised file named in each workflow step when that step starts. A one-line fix needs none of them.

## Route the request

| The request is mainly about | Use |
|---|---|
| Measuring a reference site, app or video | `study` |
| Scroll driving motion: pins, scrub, reading holds, smooth scroll, iOS | `scroll-story` |
| three.js or React Three Fiber on a page | `web-3d` |
| Getting models, passes or camera paths out of Blender | `blender-web` |
| Interface motion: feedback, hover, loading, page transitions, Flip | `ui-motion` |
| A video file made from code | `code-film` |
| Checking that motion works before calling it done | `motion-qa` |
| A tool is missing, or first use on this machine | `setup` |
| GSAP, HyperFrames or ffmpeg API mechanics | the official `gsap-*` skills, the `hyperframes` skills, `ffmpeg-skill` |

## Defaults

Timing, easing, scroll, budget and reduced-motion defaults live once, in `../../shared/defaults.md`. Read it when choosing a number. They are proposed craft defaults: change them on purpose, in the brief, with a reason.

## Inputs: ask once, then build

Read the request first. If it already says what the piece is for, where it goes and what to show, do not ask anything; state your assumptions and start.

Otherwise ask **one** bundled question, once, in this shape, and accept a skip:

> Before I start, share any of these you have (skip any and I'll use premium defaults):
> 1. **Files:** paths to a logo, screenshots, a 3D model, footage or copy
> 2. **References:** images, clips or links whose look you like
> 3. **Brand:** colours, fonts, anything to avoid
> 4. **Destination:** website section, 9:16 reel, 16:9 video, or both

What each answer changes:

| Input | Why it matters | If skipped |
|---|---|---|
| The single takeaway | Picks the hero | Derive it from the request and state it |
| Output class and format | Changes the toolchain | Infer from the words ("reel" means 9:16 video, "landing page" means web); else a website section plus a 9:16 cut |
| References | Taste is transferred by reference | House style in `../../shared/defaults.md` |
| Brand facts | Prevents invented marks | House palette and free fonts; no logos |
| Device floor | Sets the budget | Mid-range Android on 4G |
| Real content | Read time comes from real words | Use the request's own words; mark anything else as a visible placeholder |
| 3D only: orbit freely or one authored path; existing model or not | Live glTF versus pre-rendered | One authored path; ask for a model only if the piece cannot work without one |

Never invent product screens, metrics, testimonials or logos, even when the user skipped the question. If the piece needs a real asset that is missing, use a clearly labelled placeholder and say so.

If the user does not answer and the session is unattended, take the defaults and continue; the approval gates below become a written record of what was assumed instead of a stop.

Fill `templates/motion-brief.md` with what was given and what was assumed, labelled.

## Workflow (each step has a gate)

1. **Analyse references.** For each: list shots or sections, palette hex, pacing (seconds per idea), easing family, depth cues, what to copy and what to reject. For a live site or app, measure its real values with DevTools, or REA where installed, and record behavior and numbers only, never code or assets. Use the `study` skill; delegate long browser measurement to the `reference-analyst` agent. Output: `references.md`. Gate: the person confirms the take.
2. **Direct the brief.** Fill the template with numbers. Pick the output class and toolchain with `references/tool-selection.md`. For a short video (about 30 s or less) that a `code-film` studio template fits, do not stop for a concept choice: pick the template, state the assumptions in one line, and go straight to stills; the user redirects from real frames. For anything longer or high-stakes, before detailed timing, propose two or three materially different concepts (each one sentence plus one style frame or reference): who it is for, what they believe now, what they should do after, and which product fact the motion proves. Precise animation cannot rescue a generic idea. Gate: brief approved.
3. **Beat plan.** One table, one row per beat: trigger (time or scroll range), the literal verb, hero element, text and its read time, easing, duration, sound cue if any. Nothing moves that is not in the table, including mount fades and back-scroll hysteresis. Add a row per viewport variant (desktop, 3m phone) because camera framing differs. Then build a timed animatic: grey boxes on the real durations or scroll ranges, scratch audio if any, at low resolution. Pacing problems surface here for an hour's work instead of after the build. Gate: animatic approved.
4. **Kit tests before shots.** Prove each reusable piece in isolation: the type reveal, the card hover, the 3D model lit and compressed, the scroll pin. Each kit test is a still or a 2-second clip at full resolution. Record results in `kit-tests.md`. Gate: kit approved.
5. **Build the beats** from the table. Reduced-motion variant is written in the same pass, not after.
6. **Framing and performance pass.** Use the `motion-qa` skill: run its gates (delegate execution to the `qa-runner` agent) and report each with its result status. Verify framing by arithmetic or screenshot at 360 and 1440 px: for a vertical fov camera the visible half-height is r*tan(fov/2). Then CPU throttled 4x, a mid-range phone, `prefers-reduced-motion: reduce` emulated, keyboard only, sound off. Record numbers in `qa.md`.
7. **Critique round.** Delegate to the `motion-critic` agent, which never sees the builder's notes and scores rendered evidence against the review checklist and the references. Top three fixes become the next round. Two to four rounds is normal. Judge rendered evidence, never the builder's description. Each defect names the frame, what is seen, why it matters, the smallest fix, what to preserve and which frames to recheck. At most two repair rounds per defect, then stop and ask.
8. **Deliver** with `qa.md`, the brief, and known gaps stated plainly.

## Red flags: stop and go back to the table

- Something moves and you cannot say which of the four jobs it does
- Two heroes on one screen, or two things moving fast at once
- Text animating while a person is reading it
- "Add some particles" or any effect proposed before the beat it serves
- A build with no reduced-motion branch
- "Looks fine on my Mac" as the performance evidence

Domain red flags live in each specialist skill. Failure modes with fixes: `../../shared/failure-modes.md`.

## Files

- `references/principles.md`: foundations with reasoning
- `references/tool-selection.md`: tool choice, licences, when not to use each
- `references/vocabulary.md`: terms and prompt patterns
- `references/worked-examples.md`: index of three worked examples
- `references/section-map.md`: where content from the original single skill now lives
- `templates/motion-brief.md`: the directed brief
- `templates/motion-system.md`: brand motion system the client keeps
- `templates/motion-spec-handoff.md`: per-element spec and effort estimate for handoff
