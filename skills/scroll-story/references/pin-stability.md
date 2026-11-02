# Pin stability

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

## 10. Pin stability

Layout shift after ScrollTrigger measures breaks pins. Give media containers an explicit `aspect-ratio`, remove `loading="lazy"` from anything inside or above a pinned container, and call `ScrollTrigger.refresh()` after fonts and async assets finish. Use `ignoreMobileResize` and `anticipatePin` on pinned sections. If iOS address-bar resizing still desyncs pins, scroll a dedicated container (`overflow: auto` on a `100dvh` wrapper, ScrollTrigger `scroller` set to it) so the viewport resize cannot change the scroll length; the Horeca build (Codrops, June 2026) shipped this fix.
