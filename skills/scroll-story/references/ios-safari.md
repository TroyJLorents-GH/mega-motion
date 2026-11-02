# iOS Safari: scroll-driven motion bugs and workarounds

Sources: synthesised from three model reviews (Fable 5.1, GPT-6 ASTRA, Gemini 4 Argon) on 2026-10-30, kept in the research folder. Items marked *verified* were checked against a primary source; everything else is reported or judgment. Treat each row as a failure mode to test on a real iPhone, not a promise that every Safari version shows it. iOS 26 changed the address bar again (floating tab bar); record the exact OS build with every test.

| Bug | What you see | Workaround |
|---|---|---|
| Address bar shows and hides | Viewport height changes, ScrollTrigger refreshes, pins jump | `ScrollTrigger.config({ ignoreMobileResize: true })` (documented trade-off: trigger positions are less exact). Size pinned stages in `lvh` or `svh`, never `dvh`. Resize the WebGL renderer only when width changes or height changes by more than about 150 px (rotation). If it still drifts, scroll a dedicated full-height container and set ScrollTrigger's `scroller` to it. |
| `dvh` on a pinned or full-screen element | Layout animates every frame during the bar transition | `svh` for anything that must be visible on load (text, rails, captions); `lvh` for the canvas behind it so it bleeds edge to edge. `svh`/`lvh`/`dvh` shipped in Safari 15.4 (verified by GPT-6 against WebKit). |
| Pin entry flash during momentum | Section overshoots by 10-30 px for a frame, then snaps | Prefer CSS `position: sticky` inside a tall parent and read progress with ScrollTrigger without `pin: true`; Safari composites sticky natively. Otherwise animate a child, not the pinned wrapper, remove transformed ancestors, use `anticipatePin`. |
| `normalizeScroll()` as a cure-all | Touch scrolling moves to the JS thread and can feel laggy | Only after reproducing the specific bug it targets; re-test input and accessibility afterwards. |
| Rubber-band overscroll | `scrollY` negative or past max; frame index -1 in an image sequence | Clamp every derived progress to 0..1; never rewrite scroll position to fight the bounce. |
| Low Power Mode | rAF capped near 30 fps; frame-count lerps run at half speed | Use time-based smoothing: `value += (target - value) * (1 - Math.exp(-lambda * dt))` with dt in seconds, lambda about 8-12. Design scrubs to read at 30 fps (no single-frame flashes). |
| Momentum after the finger lifts | Scene stops while the page keeps moving | Read scroll position through momentum; never drive the scene from `touchmove` alone; never `preventDefault` on `touchmove`. `-webkit-overflow-scrolling: touch` has been unnecessary since iOS 13. |
| Fixed elements during bar transition, home indicator, floating tab bar | Bottom rails and captions hidden or cut | `viewport-fit=cover`; pad bottom UI with `max(20px, env(safe-area-inset-bottom))`; keep interactive UI in an `svh` layer. |
| Device pixel ratio 3 | Thermal throttling within minutes | Set DPR once by device tier (see web-3d budgets). |
| Video scrubbed by `currentTime` | 100-300 ms seek lag, blank frames | `playsinline` and `muted` are required to render at all; prefer an image sequence for scrubbed beats. |
| WebGL context lost after app switch | Black canvas | Handle `webglcontextlost` with the poster; rebuild on restore. |
| Back-forward cache | Stale pin positions after swipe-back | On `pageshow` with `event.persisted`, call `ScrollTrigger.refresh()`. |
| Animated `filter` on an ancestor | Inner scroller's gesture cancelled (reported on iOS 26.6, WebKit bug 322849; reported with a reproducer, not reproduced here) | Do not animate `filter` on ancestors of scrollers during interaction. |

Recent fixes worth knowing (reported by GPT-6 from WebKit release notes): Safari 26.4 moved CSS scroll-driven animations to the compositor thread; Safari 26.5 fixed view-timeline boundary, pause, restoration and scroll-snap issues.

**Test matrix on a real iPhone:** bar expanded and collapsed, slow drag, fling, reversal, rotation, keyboard open, pinch zoom, back navigation, Low Power Mode, reduced motion, VoiceOver.
