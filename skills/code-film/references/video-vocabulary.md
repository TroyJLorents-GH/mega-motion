# Video vocabulary

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

**Video terms**

| Term | Meaning |
|---|---|
| Render contract | rules that make every frame a pure function of t |
| renderAt(t) / seek(t) | the function that draws exactly the frame at time t |
| State list | the sequence of known UI states a film moves through |
| Contact sheet | one image of evenly spaced frames, read like a storyboard |
| Strip | consecutive frames around the fastest move |
| Onion skin | frames stacked at low opacity to show spacing |
| Speed graph | position per frame plotted; corners are dead starts |
| Determinism hash | the same frame rendered twice must produce identical images |
| Poster frame | the frame that represents the film while it loads |
