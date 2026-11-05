# character-film

A code-rendered short film in which a voxel mascot acts its way through a 3D world of app windows. three.js inside
the studio: every frame is a pure function of t, rendered frame by frame by `studio/render.mjs`, with the same
freeze, rhythm, determinism and safe-zone checks as every studio film.

Default story (16 s, 9:16): a question types into a chat window; the mascot hears it and RUNS off across the desk,
leaps THROUGH a page that breaks into pieces, catches the file that falls out, runs it to an editor, flings it onto
the timeline over its head, watches the result render and play, cheers, and the end card lands.

```
node <code-film skill>/scripts/new_film.mjs my-film --template character-film
cd my-film && npm install
node studio/render.mjs stills every:0.5     # contact sheet, the whole film
node studio/render.mjs film                 # score, MP4, all checks
```

## Files

| File | What it does |
|---|---|
| `film.json` | Everything a non-coder edits: the sprite, colours, windows, captures, the action timeline, camera shots, words |
| `film.js` | Wires it together: preflight, the derived crash, the file card's flights, sound cues, the end card |
| `mascot.js` | The voxel character from a sprite grid, and its acting (run, leap, crash, grab, toss, cheer, wave, look, blink) |
| `panels.js` | 3D app windows: bevelled slabs, screens from captures or generic drawn UIs, live overlays (chat, terminal, viewer, timeline, cracks) |
| `smash.js` | The page breaking: seeded shards on closed-form arcs that land and stay, dust, paper chips, a shockwave ring |
| `world.js` | Desk, light (key, rim, hemisphere, PMREM room environment), fog, bokeh, the camera rig |
| `score.py` | The sound, placed on the events film.js reports |

## The mascot (film.json "mascot")

- `grid`: rows of equal length, row 0 at the top; `.` is empty. Each letter is mapped in `parts` to a part
  (`body`, `eye`, `arm`, `leg`, `antenna`) and a colour key in `colors`.
- Every cell becomes a bevelled cube. The body is `depth` cells deep, arms `limbDepth`, legs `legDepth`. `cell` is the
  cube size in world units (0.075 makes a 12-row character about 0.9 units tall next to 4-unit windows).
- Legs: each connected group of leg cells is one leg, alternating phase left to right (two legs run, four legs trot).
  Arms are pivoted at the shoulder and sit near the front corners; an arm mid-side reads as a snout from three
  quarters. Antennae wobble on every impulse (start, stop, land, catch).
- Swap in your own character by replacing `grid`, `parts` and `colors`. The default "Bit" is an original design; do
  not ship someone else's mascot in a public film.

## Acting (film.json "actions")

Verbs placed in time. Positions are derived, never keyed per frame.

| Verb | Fields | What happens |
|---|---|---|
| `run` | `from`, `to`, `path` [[x, z], ...] | Runs a smooth path from where he is; trapezoid speed (accelerates, cruises, brakes), leans with speed, legs cycle with distance (no foot skate), anticipation crouch at the start, settle at the stop |
| `leap` | `at`, `dur`, `to`, `apex` | Only when the story needs it. A run that ends on the take-off frame flows into it without stopping |
| `face` | `at`, `target`: `"camera"`, [x, z], or `yaw` degrees | Turns (critically damped) when standing |
| `look` | `at`, `target`: `"camera"` or [ex, ey] in -1..1 | Eyes slide on a spring |
| `grab` | `at` | Nubs reach up (they stretch as they rise); the file card lands on his head, leaned back like a tray so the face stays clear and the label faces the lens |
| `toss` | `at` | The card is flung over his head onto the editor's timeline |
| `react` | `at`, `amt` | A squash and an antenna flick (a nod) |
| `cheer` | `at` | A small hop with arms up, eyes squinting |
| `wave`, `blink` | `at`, `dur` | |

While running, `faceCheat` turns the face part-way to the lens, so a voxel character never runs in pure profile.

## The crash is derived

`smash.panel` names the window to break. film.js finds the moment his path crosses that window's plane from behind
and where on the page, so editing the leap moves the break with it. Cracks spread 0.16 s before, the page dents, then
it shatters: shards fly out from the impact and through along his travel, hit the desk, bounce once, slide and lie
face up showing their piece of the page. If no move crosses the window, the render stops with a message.

## Windows (film.json "panels")

`{id, kind, pos [x, y, z], size [w, h], yaw, tilt, capture?, captureAnchor?, overlays?}`. On a drawn page the file card
sits flush in the page as one of its sections until the break; on a captured page it stays hidden and is born from
the hole, so it never covers the capture's own words (`card.embedded` overrides). Kinds: `chat` (the
question), `doc` (the page that breaks; the file card sits in it at `card.at`), `terminal`, `editor` (viewer and
timeline). Words for each kind are in `content.<id>`.

**Real captures.** Set `"capture": "assets/editor.png"` to texture a window with a real screenshot (cover-fit,
`captureAnchor` [0..1, 0..1] picks the crop, `captureZoom` zooms in). The editor keeps its live viewer and timeline
overlays; place them with `"overlays": {"viewer": [x, y, w, h], "timeline": [...]}` (fractions of the screen,
top-left origin) over the capture's own viewer and timeline. **A listed capture that is missing stops the render**
with the list of missing files. There is no stand-in card, by design.

**The result playing.** By default the editor's viewer plays a short film cut from the notes (title, a chart, two
lines, the mascot), then the render bar reaches the file name. To play real footage instead, give an image sequence:
`content.editor.viewer.sequence: {"pattern": "assets/frames/f_%04d.jpg", "from": 1, "step": 1, "count": 48, "fps": 12}`.
Every frame is checked by the preflight like a capture.

## Camera (film.json "camera")

`keys`: shots in time, `{at, pos, look, fov, rel?, drift?, omega?, zeta?}`. `rel: true` makes pos and look offsets
from the hero (followed with a lead, so he stays framed while running). Shots blend on closed-form springs: `omega`
about 2.5-3.5 for an operator's move. `drift` keeps a slow push under every hold, so the frame never freezes. Impact
shakes are added automatically on the smash and on landings. `keysWide` (optional) replaces `keys` when the film is
wider than tall.

## 16:9

Set `"width": 1920, "height": 1080`. The vertical field of view is kept, so the frame shows more desk to the sides and
nothing is cropped; add `camera.keysWide` if a shot needs reframing, and set `safe` to the platform's margins (or
remove it).

## Rules this template keeps (from the character-film reviews)

- He RUNS; there is no constant hopping. Big jumps only where they mean something (through the page, the cheer).
- He crashes THROUGH a page that breaks with visible consequences; pages are never floors.
- Windows look like real apps in close-up: real captures when provided, otherwise dense, generic, unbranded UI.
- No decorative props or stray highlights. The verb is staged literally, face-on to the lens.
- Never a placeholder card.
