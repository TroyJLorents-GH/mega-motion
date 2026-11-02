# Interaction spec pattern

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

**Interaction spec**
```
Card hover: scale 1.00 -> 1.02 and shadow 8 px -> 24 px over 180 ms, ease-out.
Press: scale 0.98 within 80 ms. Release: spring back, damping 1.0.
Focus: same as hover plus 2 px outline, no delay. Touch: press state only, no hover.
```
