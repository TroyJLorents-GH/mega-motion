# Scroll-driven storytelling

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

### 11. Scroll-driven storytelling

Two models. **Scroll as trigger**: crossing a threshold plays a timed animation. **Scroll as time**: scroll position scrubs the animation directly. Trigger is for revealing content. Scrub is for explaining a process or walking a camera.

Doctrine:
- The user owns the scrollbar. Never change scroll speed, direction, or snap position without a visible affordance. Smooth-scroll libraries are a taste choice with real costs, and the two common ones work differently. Lenis keeps the browser's real scroll and lerps toward it, so `position: sticky`, anchors and find-in-page keep working, and since 1.3.26 it respects `prefers-reduced-motion` itself (verified in its release notes). GSAP ScrollSmoother transforms a content wrapper, so `position: fixed` and `sticky` inside it stop working and need pins. Both add latency on OS-smoothed trackpads. Use one only when a scrubbed canvas or 3D beat visibly steps on a notched wheel, or when WebGL must stay pixel-locked to scrolling DOM; keep it off on touch; test find-in-page, anchors, keyboard paging and screen-reader focus with it on.
- Readable at every scroll position. If a user stops mid-section, the screen must make sense. Half-faded text fails this.
- Pins are a budget, not a count. Total pinned scroll stays under about 60% of page length. Every pin shows progress (a rail, chapter labels, or an object the viewer can see is finite) and has a readable stop point at least once per viewport height. Alternate pinned chapters with normal-flow reading chapters. A pin that fails the progress or stop-point test is cut however short; a pin that passes may run the whole page when scroll is the page's time axis (Igloo Inc, Awwwards Site of the Year 2024, is in effect one pin with three rest states). What feels like a trap is not length; it is a pin with no progress and nowhere to stop.
- Progress must be visible. In a long scrub, the viewer needs to know how much is left: a progress rail, chapter labels, or an obviously finite object.
- Mobile first in the beat plan, not as an afterthought. Scroll distances are in viewport heights, never pixels.

### If ScrollSmoother is chosen

Create it before any ScrollTrigger; use the wrapper and content divs; `overscroll-behavior: none` on the body; keep `smooth` at or below 1 s on reading pages; `effects: true` enables `data-speed` and `data-lag` (an element with `data-speed` sits at its layout position when centred in the viewport); clamping speed for elements in the first viewport is reported but unverified here. Leave `normalizeScroll` off unless an iOS bug forces it. Route jump links through `smoother.scrollTo(target, true, "center center")`.

### Observer: steppers only

Observer turns wheel, touch and pointer intent into discrete steps without real scrolling. Use it only for full-screen, slide-like steppers (a portfolio intro, a launch deck), never on reading pages. Guard with a busy flag; tolerance about 10 (the default); `wheelSpeed: -1` if wheel and swipe directions must match; `gsap.utils.wrap` for the index; arrow keys and Page Up/Down must also step; under reduced motion fall back to stacked sections.
