# Worked example: interactive app motion with no 3D

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

## Example 3: Interactive app motion with no 3D (restraint as the brief)

**Brief**
- Takeaway: "This finance app feels calm and immediate."
- Output: real-time web, React. Device floor: a three-year-old mid-range Android.
- References: one well-regarded banking app for its 150 ms acknowledgements and single spring; one design-system site for its page transitions that keep the header still. Reject: bouncy modals, skeleton shimmer that never stops.
- Brand: existing design tokens; accent reserved for primary actions.
- Content: real screens, real data.

**Director's decisions**
- No decorative motion at all. Every movement is orient or respond. The budget is spent on three things: page transitions that preserve context, list and card feedback, and loading states.
- One spring for the product: damping ratio 1.0, stiffness tuned so a 24 px move completes in about 220 ms.
- Page transitions: header stays; content slides 16 px in the direction of navigation and fades, 240 ms; back navigation reverses the direction (vector law applied to navigation).
- Shared element: tapping an account card expands it into the detail header via a layout animation, so the user never loses the object.

**Motion spec (excerpt)**

| Element | Trigger | Motion | Reduced motion |
|---|---|---|---|
| Button | press | scale 0.98 within 80 ms; release springs back | same, no scale; background change only |
| Card | hover / focus | translateY -2 px, shadow 8 to 16 px, 180 ms ease-out | shadow only |
| Card to detail | tap | layout animation, 320 ms, spring 1.0; header text crossfades 160 ms | crossfade 160 ms |
| Route change | navigate | content 16 px slide plus fade, 240 ms; direction follows navigation | fade 160 ms |
| List load | data arrives | items fade in with 40 ms stagger in reading order, 200 ms | all at once, 150 ms |
| Loading | request starts | nothing under 300 ms; skeleton to 2 s; progress text after | same |
| Balance update | value changes | number ticks over 400 ms, ease-out; accent flash 200 ms then returns | value swaps; color flash only |

**Implementation**
1. Motion (motion.dev, MIT): `layoutId` for the card-to-detail shared element; `AnimatePresence` for route transitions; a single `transition` object exported from tokens and reused everywhere.
2. CSS for hover, focus and press; `@media (prefers-reduced-motion: reduce)` overrides translation to none in the same stylesheet.
3. A `useReducedMotion` hook gates the Motion variants.
4. Playwright: screenshots of each state at 360 px and 1440 px, with reduced-motion emulated on and off; fail the build if focus outlines are missing.

**Critique round looks for**: any movement that is neither orient nor respond; a second spring; skeletons that shimmer longer than two seconds without a message; transitions that move the header; hover-only affordances.

---
