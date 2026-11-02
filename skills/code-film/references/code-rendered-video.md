# Code-rendered video: the studio pipeline

> Moved from the single `motion-direction` skill on 2026-10-30 (phase 1 split, wording unchanged). Section numbers (§) and file names in this text refer to that original skill; `skills/direct/references/section-map.md` says where each now lives.


Use this file when the output is a video file made from code (HTML/GSAP, Canvas, SVG, three.js, Remotion, HyperFrames) rather than a live page. Sources: the author's research clippings (Motion Engineering by @0xjmori, rari's Motion Engineering thread, seeconvm's "What the One-Prompt Videos Are Hiding", flxrnc's Opus 5.5 Motion Lab) and the ffmpeg-skill README. The rules below are distilled and reworded; numbers attributed to a source are that source's measurements, not mine.

## 1. The model writes a program, not pixels

The deliverable is a program that answers one question: what does the screen show at time t? A headless browser or framework calls it once per frame and ffmpeg encodes the frames. That is what makes edits local (change one number, re-render the affected frames) and what lets the agent inspect its own output.

**Render contract** (put it in the project's CLAUDE.md or the brief):
- Every frame is a pure function of t. Expose `window.renderAt(t)` (or the framework's frame hook) that draws exactly that frame.
- No wall clock, no timers, no CSS transitions in render mode, no unseeded randomness. Seeded noise only.
- One self-contained composition; libraries pinned to a version; no network calls except pinned fonts and libraries.
- Fonts loaded with `display=block`; wait for `document.fonts.ready` before the first frame.
- Loops render frames 0 to N-1 only, and frame N-1 flows into frame 0.
- Determinism test: render the same frame twice; the image hashes must match.

Name the renderer in the brief. Left to choose, agents tend to write a zero-dependency HTML plus Playwright plus ffmpeg rig even when a framework is installed. Use the smallest system you will want to reuse: plain HTML for a one-off loop under ten seconds, HyperFrames (HTML plus GSAP, Apache-2.0, verified) or Remotion (React, company-size license, verified) for a series, Blender when light, characters or physics are the content.

Code loses to footage or a video model for photoreal scenes, complex characters and organic motion. It wins for product films, UI motion, typography, data stories and explainers.

## 2. Five departments, one agent

Keep the jobs separate even when one agent does all of them. Collapsing them into one unreviewed step is where generic output comes from.

| Department | Decides | Writes | Gate |
|---|---|---|---|
| Director | what the film says; one sentence the viewer keeps; why each scene exists | `brief.md`, storyboard | approve story and asset list |
| Art Director | type, color, composition, motion character, texture, banned defaults, from references | `style-guide.md` | approve style |
| Animator | frame-driven motion between known states | source | stills for every shot |
| Render Engineer | resolution, fps, duration, fonts, assets, errors; stills before full renders | previews, final exports | rough cut (960x540 is enough) |
| Critic | judges rendered frames only, in a fresh context, never the Animator's description | `reviews/findings.md` | defects fixed or escalated |

Studio folder, so a long run can resume from files instead of chat:
```
brief.md  style-guide.md  shotlist.md  CLAUDE.md
assets/   (approved logos, real screenshots, fonts, audio)
src/      (seekable composition)
reviews/  (frames, contact sheets, findings.md)
out/      (previews, one export per format)
```
When the Critic finds the same defect in two films, it becomes a CLAUDE.md rule, a component, or a checklist line. That is how the studio improves.

**Gates for long or overnight runs:** 1 references and real assets approved; 2 style guide and shot list approved; 3 stills for every shot, critiqued; 4 animatic or rough cut with placeholder audio; 5 full pass, polish, sound; 6 formats, loop check, poster frame, notes. A missing real screen is a blocker, never an invitation to draw a convincing fake. An unclear reference earns a question or one test frame, not 900 polished wrong frames.

## 3. Story as states

A storyboard says what the viewer knows at each second, not which effects play. A dependable short-film shape:

| Time | Beat | Job |
|---|---|---|
| 0-2 s | Hook | one image that earns attention |
| 2-5 s | Problem | the friction, shown not told |
| 5-9 s | Reveal | the product enters through a real interaction |
| 9-13 s | Proof | one screen or number backs the claim |
| 13-16 s | Close | clean final state, readable CTA, strong poster frame |

Every beat has an entry state, an exit state and a reason. If the agent cannot say why shot four exists, cut shot four. A scene's final state sets how the next one begins: keep the position or transition away deliberately. For UI films, write the state list first (for example search, result, detail, action, confirmation) and let one container morph through it, driven by a cursor doing real clicks. Convert timestamps to frame numbers so events are addressable ("click at frame 195").

## 4. Motion with mass, deterministically

Springs give mass, but in a seekable film they must be closed-form functions of time. When a value retargets several times (a cursor, a container width), stack one spring per change rather than restarting:

```
value(t) = v0 + Σ (v_i − v_(i−1)) · spring(t − t_i)
```
Frame 812 then renders without simulating frames 0 to 811.

Give each class of object one rule: micro UI snaps with minimal overshoot; panels settle; the camera glides on the softest curve; headlines land hard and hold to be read; a mascot may bounce on purpose. If everything overshoots, nothing feels precise.

For organic drift in a loop, sample noise along a circle so it returns to its start. Drive loops from `phase = frame / N` with whole-number cycles. Frame 0 must be a finished composition, because it is what shows while a GIF loads.

Motion blur in 3D pieces: average several subframes over half a frame in linear light, which mimics a 180-degree shutter.

## 5. Sound on the same clock

- The picture must work muted first; feeds autoplay silent.
- Measure a supplied track before animating (tempo, beats, downbeats, hits; librosa or ffmpeg-skill's `scenes.py --beats`). State changes on beats, big moments on downbeats, clicks and whooshes on hits.
- Compute each beat as n × 60 / BPM from time and round per beat. Adding a rounded frame count drifts off the music.
- Impact sounds land about one frame after their visual event by house default: light arrives before sound in life, and early audio feels wrong sooner than late. Other cues (anticipation, swells, synced music hits) are authored relationships; write the intended offset in the beat table and measure against it.
- Mix to about -14 LUFS integrated, -1 dBTP. One lab measured the AAC encode lifting true peak from -1.3 to -0.4 dBTP, so it limited the WAV to -2.2 dBTP; measure your own encode.
- An agent cannot listen. It verifies sync by decoding the final file and lining each hit's first peak up with its frame, and checks level in the 200 Hz to 6 kHz phone band as well as full range.
- Blindfold test: listen with eyes closed. If the audio has no shape without the picture, the sound design is unfinished.

## 6. Evidence the Critic needs (built with ffmpeg)

| Evidence | What it catches |
|---|---|
| Contact sheet, every 12th frame or 2 fps, 4 to 6 across | layout, hierarchy, dead beats, two things moving at once |
| Strip of 12 consecutive frames around the fastest move | sliding instead of easing, mid-transition ugliness |
| Phone test: frames scaled to 360 px wide | unreadable type, crowded composition |
| Loop check: clip played three times back to back | seam hiccup, audio click |
| Determinism: one frame rendered twice, hashes compared | hidden clocks, unseeded noise |
| `?t=2.5` URL freeze of any frame | exact frame inspection without a full render |
| Onion skin of a move at 25% opacity | even spacing means constant speed (right for mechanical and scrubbed motion, wrong for an arrival); spacing tightening near the keys means the move eases into them |
| Speed graph: hero x and scale per frame | straight lines are linear; corners are dead starts and stops |

```bash
# Frame numbers drawn after scaling (from timestamps, so they stay true after select); replace 24 with the film's fps.
# 640 px tiles, one sheet per 12 tiles so the whole film is covered. Tested with ffmpeg 9.0.2 on 2026-10-30.
ffmpeg -framerate 24 -i out/frames/%04d.png -vf "select='not(mod(n\,12))',scale=640:-1,drawtext=text='F%{eif\:t*24\:d}':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=6,tile=4x3" -fps_mode vfr reviews/contact_%02d.png
ffmpeg -stream_loop 2 -i out/anim.mp4 -c copy reviews/loop_check.mp4
```

**Defect report format** (one per defect, top three only):
```
FRAME     210 (or a range)
SEE       the cursor crosses the result label
WHY       the viewer reads the cursor, not the result
FIX       smallest change: move the cursor away before the label reveals
PRESERVE  click timing, card size, result animation
RECHECK   frames 195, 210, 225, 240
```

**Repair policy:** read the evidence, make the smallest relevant change, preserve approved work, re-render only affected frames, inspect neighbouring scene boundaries, return new evidence. At most two repair rounds per defect; if it persists, stop, explain the blocker and ask. Never remove a verification requirement to make a review pass. A fix that works becomes a line in the render contract.

When a fix does not hold, render the frames either side of the problem side by side, list every difference, fix only the line that causes it.

## 7. Formats come from the timeline, never a crop

16:9, 1:1 and 9:16 are different compositions from the same assets and states. Vertical gets larger type, fewer simultaneous elements and stronger vertical hierarchy; square gets tighter type and shorter holds; wide gets more spatial context. Each format gets its own stills and review. Cropping 16:9 to 9:16 throws away about 70% of the width.

## 8. Export

```bash
# MP4 for a post: H.264 High, yuv420p, plays at once
ffmpeg -framerate 24 -i out/frames/%04d.png -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -movflags +faststart out/anim.mp4
# GIF: one palette for the whole clip
ffmpeg -framerate 24 -i out/frames/%04d.png -vf "scale=1200:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop 0 out/anim.gif
```
- GIF frame delays are stored in hundredths of a second. At 24 fps, rounding every frame to 40 ms runs the loop 4% fast; alternate five 40 ms frames with one 50 ms frame.
- GIFs band on gradients: use flat color or dither.
- Snap resting text to whole pixels; render at 2x and scale down if text shimmers.
- X limits as quoted by the Motion Lab source (unverified here): GIF 15 MB, up to 1280x1080, at most 350 frames; video up to 140 s without Premium, up to 60 fps, H.264 High yuv420p AAC.
- Deliver: one export per format, poster frames, contact sheets, editable source, asset list, QA notes naming what still needs human review.

## 9. Accessibility for video

- Text contrast at least 4.5:1 on every frame, including over moving backgrounds.
- No more than three flashes in any one second (WCAG 2.3.1, Level A).
- Captions or on-screen text carry the message for muted viewing.
- Hold text for read time (0.3 s per word + 0.5 s) before it moves.

## 10. Post-production with ffmpeg-skill

`ffmpeg-skill` (kajisho5, MIT, verified 2026-10-28) is the editing hands for footage that already exists: 42 standard-library Python tools over local ffmpeg, an MCP server, and a machine-readable contract. Use it after the render, or on real footage, for cut, fit to aspect or duration, captions, overlays, loudness, sync, platform export and delivery checks.

Its workflow is the same discipline as this skill's: probe the real file first; stay lossless when possible; plan with `--dry-run --json`; frame changes before captions; `check.py --platform X` before reporting; then `look.py` contact sheet whenever the picture changed. It never decides taste: what to cut, whether a deliverable is good, what a caption says. Those decisions stay here.

Rules when it is installed: route through its scripts, never a hand-written raw ffmpeg command for an operation it covers; use `render.py --template NAME` for a straight platform delivery; trust its `--json` numbers over summaries. Captions need an ffmpeg build with libass (`doctor --json` reports per-tool usability).

## 11. Unverified claims from the sources

View counts, hours, token totals, the "effort setting" advice (xhigh for new films) and the generate-then-trace pipeline (a video model renders base shots, code redraws over them) are reported by the clippings' authors and were not checked. Treat them as anecdotes, not rules.

## 12. Sourcing sound legally

Sync and loudness are covered above; this is where sound comes from. Classes, safest first:
1. **Synthesised in code** (Web Audio or a script): yours, no licence questions.
2. **Your own recordings or a track you commissioned** with written rights for the platforms you publish to.
3. **CC0 sound effects** (for example Freesound filtered to CC0): free for any use; keep the source link.
4. **Subscription music libraries:** terms differ by service and plan, especially for client work and for platforms where a video is monetised; read the current licence for each project and keep the licence record with the deliverable. (No specific service's terms were verified here.)
5. **A platform's in-app music:** usable inside that platform only; does not travel with the file.
Never use a commercial track you do not have rights to, even "for a test" that might be posted. Whooshes on every cut are not sound design: one cue per visible event, and silence is a tool.

## 10b. Job to ffmpeg-skill command (from the ffmpeg-skill README, MIT; checked against installed 2.17.3)

Cropping is for real footage only. Code renders keep the rule that each format is its own composition. `S=~/.claude/skills/ffmpeg-skill/scripts`.

| Job | Command |
|---|---|
| Straight platform delivery | `python3 $S/render.py talk.mp4 --template tiktok --cues cues.txt` (crop, captions, loudness, export and check in one run); `--template all` writes every destination plus a `_pack.md` table; `--dry-run` prints the plan |
| Reframe footage 16:9 to 9:16 | `fit.py in.mp4 --aspect 9:16 --fit crop --crop-x 0.6` (choose the anchor by looking at a `look.py` sheet; default is a centre crop); or `--fit pad --pad-fill blur` |
| Reel to an exact length | `cut.py --segments 0:45-3:10,5:00-6:30` then `fit.py --duration 60 --aspect 9:16 --fit crop` then `export.py --preset reels` then `check.py --platform reels` then `look.py` |
| Captions | `caption.py --platform tiktok --animate pop --karaoke`; leave `--size` unset so the fit-to-cue shrink works; cue text is never rewritten |
| Code-rendered graphics over footage | `overlay.py talk.mp4 --video graphics.mov --place 0-2.5@12 --platform reels` (whether an alpha channel in `--video` survives is unverified; test a ProRes 4444 file first) |
| Cut to music | measure `scenes.py --beats`, then `cut.py --snap beats`; below its confidence it refuses: ask for the BPM instead of inventing a grid |
| Talking-head silence | `silence.py talk.mp4 --list`, then `--speech-aware` (cuts only between sentences) |
| B-roll | `broll.py talk.mp4 --insert product.mp4 --at 12 --duration 4` |
| Title card or end slate from a still | `insert.py` (optional Ken Burns); hold a frame with `freeze.py --at T --hold 2` |
| Whole edit as data | `render.py project.json` with `--dry-run`, `--cache DIR`, and `--export-timeline edit.fcpxml` for Final Cut, Resolve or Premiere |
| Delivery report | `report.py --before raw.mov --after final.mp4 --platform reels -o report.html` |

A file written by HyperFrames or Remotion is an ordinary input to `probe.py`, `fit.py`, `export.py` and `check.py`.

**Platform facts** (`render.py --list-templates`, installed 2.17.3): all social templates target -14 LUFS (podcast -16). Safe zones as fractions of the frame:

| Template | Frame | Top | Bottom | Left | Right | Max length |
|---|---|---|---|---|---|---|
| reels | 1080x1920 | 0.08 | 0.20 | 0.05 | 0.12 | 90 s |
| shorts, youtube-shorts | 1080x1920 | 0.06 | 0.18 | 0.05 | 0.12 | 180 s |
| tiktok | 1080x1920 | 0.10 | 0.22 | 0.05 | 0.14 | 600 s |
| x | 1280x720 | 0.05 | 0.05 | 0.05 | 0.05 | 140 s |
| youtube, facebook | 1920x1080 | 0.05 | 0.05 | 0.05 | 0.05 | long |
| linkedin | 1080x1080 | 0.05 | 0.05 | 0.05 | 0.05 | 600 s |

Loudness elsewhere (README): podcast -16 LUFS / -1.5 dBTP, broadcast -23 LUFS. A clip at -40 LUFS or below is room tone; normalising it only raises noise.

## 10c. Footage gotchas for reels

- **Variable frame rate** screen recordings: `probe.py` flags it; conform with `fit.py --fps 30` before compositing captures into a 24 or 30 fps film.
- **Keyframe snapping:** a stream-copy cut can start up to one GOP early; use `cut.py --accurate` for frame-exact cuts on a beat; check `precision` in the JSON.
- **HDR** iPhone footage stays HDR until `color.py --to-sdr`; do that before compositing over an SDR render.
- **Frame changes before captions;** check what the app UI covers with `look.py reel.mp4 --safe tiktok --at 3`.
- **Emoji** in captions are monochrome unless `--emoji-assets DIR` points at Twemoji or Noto PNGs.
- **True peak:** when ffmpeg-skill is installed, use `loudness.py` (it re-measures and re-encodes until the peak target is met) or `export.py --normalize` instead of manual limiting.
- **`look.py` is a delivery check, not critic evidence:** its tiles are small; keep the frame-numbered 640 px sheets for the critic.

## 13. Studio lessons from a published lab (one lab's result, flxrnc's Opus 5.5 Motion Lab, Sept 2026; not re-tested here)

**Render mode.** Set `window.__ready = true` only after fonts and any precompute (texture or SDF bakes) finish; the renderer waits for that flag, not page load. When opened with `?t=`, never start `requestAnimationFrame`; `renderAt(t)` is the only thing that draws. Pin three.js through an importmap and check which parameter names your pinned version reads (the lab hit an r160 `TextGeometry` `height` versus `depth` trap).

**Minimal renderer.** A Playwright script opens the page by `pathToFileURL` (Windows-safe), waits for `networkidle` and `document.fonts.ready`, then for `i = 0..N-1` sets `t = i / fps`, calls `renderAt(t)`, pauses every `document.getAnimations()` entry at `t * 1000` ms, seeks the project's own GSAP timeline (invisible to `getAnimations()`), and screenshots. For 3D render on the real GPU and average several subframes over half a frame in linear light for 180-degree motion blur.

**Springs as code.** Damping ratio = d / (2 sqrt(k m)): Remotion's default spring (m 1, d 10, k 100) is 0.5; react-spring's default (tension 170, friction 26) is about 1.0. Position and size may bounce; opacity and colour never do.

**Beat-frame precision.** A spring that starts from rest exactly on the beat frame leaves that frame in the anticipation pose; release half a frame early so the beat frame is the first moving frame. Count held frames including motion-blur subframes. Cut on the beat; change the layout on the bar. At 128 BPM and 30 fps a beat is 14.06 frames; adding a rounded 14 drifts about 2 frames by beat 32.

**Loops and morphs.** Put the seam inside continuous motion (a settling wobble running through frame 0), never on a resting pose. Morph sphere to glyph by growing the target inside a sphere from the source and joining with smooth-min, never by interpolating shapes (it passes through flat coins). Grow new bodies from a negative radius so smooth-min pull fades in. For a reverse melt, regrow sources first, then retract targets.

**Sound measured, not heard.** The lab fixed every mix from measurements of the decoded file:
- Cosine-phase tonal bodies with a 0.5-1 ms attack so the first peak lands on the target sample (48 kHz at 60 fps: sample `(F + 1) x 800`); no waveshapers on hit bodies (they made peaks 8-11 ms late).
- The largest peak of each hit must be its first.
- Each hit 3-6 dB above the bed (hit stem minus bed stem, K-weighted, first 60 ms), checked full range and in the 200 Hz-6 kHz phone band.
- Keep limiter gain reduction under about 1.5 dB per hit; lower coincident layers instead of limiting harder. Duck the bed about 4 dB under the climax. Remove DC; render twice, keep the second pass.
- Web Audio traps reported by the lab (unverified): a gain node starts at full volume unless set at time 0; a compressor added about 6 ms delay.

**Receipts.** Log each prompt and follow-up verbatim in `reviews/followups.md`, creative notes separate from technical fixes. The lab's directed pieces needed 4 to 15 creative follow-ups over 2 to 4 rounds.

**Canvas sizes:** 1920x1080 (16:9), 1080x1080 (1:1), 1080x1350 (4:5), 1080x1920 (9:16). Choose before the first shot.

**Burn-in while iterating:** frame counter, playhead and per-beat labels in the frame, switched off for the final render; a label pinned to a frame exposes a move that runs late.

**Sequencing:** build sequences with timelines and the position parameter (`"<"`, `"+=0.5"`, labels), never chained delays; keep a reference to every tween; review with `timeScale(0.2)` or a slider driving `tl.progress()`; GSDevTools is development-only.
