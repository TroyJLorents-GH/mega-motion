# Motion brief

Short form (for a quick piece): `GOAL / OUTPUT / TIME / LOOK / MOTION / SHOTS / BANNED / QA`, plus `MODEL` and `CAMERA` for 3D. Write GOAL first and TIME second. Each shot gets a frame range, one hero move and a handoff; the cut is the default. MODEL states what may never change (a mascot's proportions).

Full form: (fill every blank with a number, a hex, a file, or a frame)

```
TITLE:
TAKEAWAY (one sentence a first-time viewer says afterward):
OUTPUT CLASS:  real-time web | pre-rendered video | hybrid
FORMAT:        viewport or ____x____ (__:__), __ fps or 60 fps target, hosts: ____
DEVICE FLOOR:  ____ (phone model class) on ____ (network). Desktop secondary: yes/no
REFERENCES:    ref-A ____ borrow: ____ reject: ____
               ref-B ____ borrow: ____ reject: ____
PALETTE:       bg #______  ink #______  accent #______ (one accent, reserved for the hero)
TYPE:          family ____, hero weight ___ at ___ px, body weight ___ at ___ px
ASSETS OWNED:  logos ____, models ____ (raw size ____ MB), captures ____, music ____
BANNED:        ____ (invented UI, unlicensed marks, lens flares, idle wobble are banned by default)

TOOLCHAIN (from tool-selection.md):
  orchestration ____  3D ____  video ____  encode ____  QA ____
  license notes: ____

CURRENT (dominant direction of travel): ____
CARRIER (element that persists across sections): ____
EASING SET: enter ________  move ________  exit ________  pop (hero only) ________
SPRING: damping ___ (1.0 UI / 0.8 premium / 0.5 playful)
DURATIONS: feedback ___ ms  move ___ ms  hero reveal ___ ms  exits ___% of entrance
STAGGER: words ___ ms  items ___ ms  overlap ___%
READ HOLD: 0.3 s/word + 0.5 s unless: ____
BEAT GRID (if music): ___ BPM -> ___ frames/beat; downbeats at f___, f___

BEATS (one hero per row; nothing moves that is not here)
| # | viewport variant (d / 3m) | time or scroll range | literal verb | hero | support | text (words) | hold | easing | reduced-motion version | sound cue |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | d |  |  |  |  |  |  |  |  |  |

SCROLL RULES: pin budget ___% of page (default under 60%); every pin shows progress and a readable stop each viewport height; ranges in vh; no wheel interception; text readable wherever the user stops
REDUCED MOTION: opacity and color only; translation under 8 px; no parallax; no autoplay; same information
PERFORMANCE BUDGET: first paint ___ s; 3D first frame ___ MB after gltf-transform; 60 fps at 4x throttle; transform/opacity only per frame
ACCESSIBILITY: autoplay over 5 s has pause (WCAG 2.2.2); keyboard path; works with sound off
RENDER CONTRACT (video): frame = f(t); renderAt(t) exposed; no clock, timers or unseeded random; loops render 0..N-1
RENDERER: ____ (named explicitly)
EXPORT (video): H.264 High yuv420p AAC faststart; copy under 30 MB
KIT TESTS: record each kit test and its result in kit-tests.md (write "not run" if not run)
MECHANICS: mount fades, hysteresis and other implementation motion belong in the table too
DELIVERABLES: build or film, brief, beat table, qa.md (device, numbers, gaps), critic report
```
