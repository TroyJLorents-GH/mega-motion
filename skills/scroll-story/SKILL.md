---
name: scroll-story
description: Use when scroll drives motion on a page: pinning, scrub, camera plateaus and reading holds, progress affordances, smooth-scroll decisions, iOS address-bar and viewport-unit problems, CSS scroll-driven animations versus GSAP. Not for GSAP API syntax; the official gsap-scrolltrigger skill covers that.
---

# Scroll story

The user owns the scrollbar. Scroll maps linearly to progress; properties inside the timeline may ease, plateau and hold. Text must be readable wherever the user stops inside its range.

Decide in this order:
1. Trigger or scrub: scroll as trigger reveals content; scroll as time explains a process or walks a camera.
2. Pin budget and progress: see the pinned-sections row in `../../shared/defaults.md`.
3. Reading holds: an exact camera plateau per text block, sized by the read-time heuristic; hysteresis on thresholds, never on scroll position.
4. Smooth scroll: only when a scrubbed canvas or 3D beat steps on a notched wheel, or WebGL must stay locked to scrolling DOM.
5. Native API or GSAP: `../../shared/native-apis.md`.
6. Reduced motion: normal-flow chapters with key-pose stills, designed in the beat table.


## Start from the template, not a blank file

For a product or feature story, scaffold the proven template and adapt it:

```
node <plugin>/shared/web-studio/new_page.mjs <folder> --template scroll-story/product-story
cd <folder> && npm install
```

Put the words, numbers and colours in `content.json` (and a real cutout in `product.image` when there is one), then `node studio/web.mjs shots` (phone and desktop contact sheets), `check` (text still while read, pin budget, frame pacing, no horizontal scroll, reduced motion keeps content) and `film`. Read `<plugin>/shared/web-studio/README.md` for the page contract. The template: hero, a pinned chapter per claim where the motion proves it (noise lines that calm, an hour count with a timeline, a balance for weight), a bridge, a summary. Adapt its chapters before writing new ones; keep its structure (`chapter(name, render(p))`, `data-read` plateaus, `?capture`, `window.ScrollTrigger`).

## Red flags

- Scroll speed altered, direction reversed, or wheel events intercepted on touch
- Reveals that replay every time the user scrolls back up
- Text half-faded at a point where the user can stop
- A pin with no progress affordance and nowhere to stop
- Observer or section-stepping on a page people read

Defaults: `../../shared/defaults.md`. Failure modes: `../../shared/failure-modes.md`. Starting a new piece rather than fixing one: begin with the `direct` skill.

## Files

- `references/scroll-principles.md`: scroll storytelling doctrine
- `references/scroll-vocabulary.md`: scroll terms and the plateau-curve pattern
- `references/pin-stability.md`: layout shift, iOS address bar, refresh
- `references/ios-safari.md`: iOS Safari bug table with workarounds and a device test matrix
- `references/example-product-page.md`: worked example: pinned 3D product page
- `../../shared/native-apis.md`: CSS scroll-driven animations and View Transitions support
- `../../shared/gsap-plugin-map.md`: which GSAP plugin does which job
