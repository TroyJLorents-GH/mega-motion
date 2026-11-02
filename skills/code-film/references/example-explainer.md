# Worked example: 30-second pre-rendered explainer

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.

## Example 2: 30-second pre-rendered explainer film (Blender plus HTML overlays)

**Brief**
- Takeaway: "Your data pipeline is three honest steps."
- Output: pre-rendered video, 1920x1080 at 24 fps (720 frames), posted to a product site and X. Sound on and off.
- References: one hardware teaser for its lighting and the 2-3 second beat length; one UI-led motion reel for its typography reveals. Reject: constant camera drift, lens flares.
- Brand: bg `#101418`, ink `#E8ECEF`, accent `#4FD1C5`. Type at 64 px for hero lines.
- Content: three real screenshots of the product at full resolution; three verbs the product does (ingest, validate, publish).

**Director's decisions**
- Physical light and a tangible 3D object (a stylised pipe or conduit) justify Blender. Typography and the real UI screenshots are HTML overlays composited over the render, so they stay crisp and editable.
- Three beats of roughly 8 seconds, each with one verb, one object state, one real screenshot, one hero line. A 3-second open, a 3-second close.
- Camera: one continuous move with two hidden cuts behind the object. The camera brakes to under 2% push for every read hold.
- Beat grid: if a music track is chosen at 96 BPM, frames per beat is 15; hero hits land on downbeats at frames 72, 264, 456.

**Beat table (excerpt)**

| Beat | Frames | Verb (literal) | Object state | Screenshot | Hero text | Hold |
|---|---|---|---|---|---|---|
| 0 | 1-72 | the conduit lights up | dark to lit, key sweeps on | none | title, 2 words, letter stagger 1 f | 1.1 s |
| 1 | 73-264 | raw blocks flow in | intake end fills | ingest screen slides in from right, lands at frame 120 | "Ingest anything" | 1.1 s |
| 2 | 265-456 | blocks are sorted, two rejected | mid-section gates open and close | validate screen | "Validate before it costs you" | 1.7 s |
| 3 | 457-648 | clean stream exits | outlet glows accent | publish screen | "Publish with confidence" | 1.4 s |
| 4 | 649-720 | camera settles on the logo | still with 1.5% push | none | logo and URL | rest |

**Implementation**
1. Blender: model the conduit; one warm key, cool fill, HDRI from Poly Haven; AgX view transform. Set the accent as a linear-space material color and check it against the web hex on the first still.
2. Render key stills, one per beat, at full resolution. Review. Fix only what was flagged. Then render EEVEE shots with motion blur; Cycles only if EEVEE's reflections fail on the hero.
3. Overlays: an HTML composition (HyperFrames or Remotion, see licensing in tool-selection) with the type reveals and the real screenshots placed in their real proportions. Render to a transparent image sequence or a second video layer.
4. Composite and encode with ffmpeg: H.264 High, yuv420p, AAC, faststart. One copy under 30 MB.
5. Sound: one cue per visible event on its frame; hero cues loudest; mix to -14 LUFS. Watch once with the sound off and confirm every beat still reads.

**Critique round looks for**: a verb not shown literally (blocks "appear" instead of flow); text moving during the hold; the camera drifting during a read; an invented UI element in a screenshot; the accent used on more than the hero in any frame.

---
