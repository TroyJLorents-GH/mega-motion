# Defaults that ship unless the brief overrides

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

| Thing | Default |
|---|---|
| UI feedback | 100-200 ms, ease-out |
| UI move or reveal | 200-500 ms, ease-out for arrivals, ease-in-out for repositions |
| Hero reveal | 600-900 ms, one per screen |
| Exits | 40-50% shorter than the matching entrance, ease-in |
| Stagger | letters 1 frame, words 60-120 ms, list items 40-80 ms, 30-50% overlap. Use `amount` (a fixed total) rather than `each` when item counts vary; `from: index` for a ripple from the clicked item; `grid: "auto"` with `from` for grids; `from: "random"` only on decoration, never on text |
| Read hold | Timed media: 0.3 s per word + 0.5 s, camera and text still. Scrubbed media: convert read time to scroll distance, about 1 viewport height per 25 words, camera pose held still (an exact plateau) and text fully opaque across that range. Scroll distance cannot guarantee reading time, so the text must be readable wherever the user stops inside it. Never dead scroll; hysteresis is allowed on trigger thresholds, never on scroll position |
| Easing presets | enter `cubic-bezier(0.16,1,0.3,1)`, move `(0.76,0,0.24,1)`, exit `(0.7,0,0.84,0)`, pop `(0.34,1.56,0.64,1)` |
| Springs | damping ratio 1.0 for UI and text, 0.8 for premium product, 0.5 for playful character |
| Scroll scrub | scroll position maps linearly to timeline progress; properties inside the timeline may ease, plateau and hold. 0.4-0.8 s catch-up smoothing on desktop wheel input (ScrollTrigger scrub), never on the scrollbar; with smoothing, drive labels from the animated playhead, not raw scroll. The user owns the scrollbar; no smooth-scroll library on touch |
| Pinned sections | a budget, not a count: total pinned scroll under about 60% of page length; every pin shows progress (rail, chapter labels, or a visibly finite object) and has a readable stop point at least once per viewport height; alternate pinned chapters with normal-flow reading chapters. When scroll is the time axis of the whole page, the pin is the page |
| Reduced motion | opacity and color only; no translation over 8 px; no parallax; no autoplay loops; same information |
| 3D web budget | WebGLRenderer by default; under 50 draw calls on mobile; 32-64 MiB resident texture memory; pixel ratio 1.5 on phones for a full-viewport canvas and 2 on desktop, set once and never toggled during scroll; first frame under 1.5 MB of model and texture, Draco or meshopt compressed, KTX2 textures, one directional light plus environment map |
| Frame budget | 60 fps on the device floor; compositor-friendly properties for anything that moves every frame: transform, opacity, clip-path and mask on a promoted layer, shader uniforms. Layout properties, filter and backdrop-filter are bugs unless the Performance panel clears them at 4x CPU throttle. No long task over 50 ms during scroll |

These are proposed craft defaults, not measured laws. Change them on purpose, in the brief, with a reason.

## House style when no references or brand are given

A premium default, so a skipped question still produces finished-looking work. Change any of it the moment the user gives a reference or brand.

| Element | Default |
|---|---|
| Ground | near-black `#0B0B0D` for product, tech and data; warm paper `#F3EFE6` for editorial, story and craft subjects |
| Ink | `#F2F0EA` on dark, `#151515` on paper |
| Accent | one: signal orange `#FF5A1F`, reserved for the hero element and nothing else |
| Secondary | one neutral grey `#8A8A8E` for labels and rules |
| Display type | Inter Tight 700, tracking -0.03em, line height 0.95 (Google Fonts, free) |
| Body type | Inter 400, 1.45 line height |
| Labels and numbers | JetBrains Mono 500, uppercase labels tracked +0.08em, tabular figures |
| Motion | the easing set above; one hero move per beat; masked line reveals for headlines; no bounce on text |
| 3D | one warm key light plus a studio environment map, neutral tone mapping, contact shadow, roughness contrast |
| Texture | none by default; a 1-2% film grain only for editorial or cinematic pieces |
| Format | websites: responsive section tested at 360 and 1440 px. Reels: 1080x1920 at 30 fps, captions and key content inside the destination's safe zone (TikTok keeps top 10%, bottom 22%, right 14% clear; Reels top 8%, bottom 20%, right 12%; full table in `skills/code-film/references/code-rendered-video.md` §10b) |

These are house choices (judgment), not measured standards.
