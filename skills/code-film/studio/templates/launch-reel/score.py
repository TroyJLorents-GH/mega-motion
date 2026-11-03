"""Score for the launch reel, rendered by `node studio/render.mjs film` (or: python run_sfx.py score.py).

The composition lists its own cues in window.EVENTS; the renderer writes them to out/timeline.json, so every
sound lands on the frame that causes it. Chords and tempo come from film.json "sound".
"""

from sfx.score_kit import airy, bed, chords, thud
from sfx.synth import blip, chime, click, impact, riser, whoosh

TIMELINE = "out/timeline.json"
TARGET_LUFS = -14.0
SEED = 7


def score(mix, tl):
    dur = tl["duration"]
    snd = tl.get("sound", {})
    bpm = snd.get("bpm", 104)
    key = chords(*snd.get("chords", ["Dm9:D3 F3 A3 C4 E4/D2", "Bbmaj7:Bb2 D3 F3 A3/Bb1"]))
    root = key[0][0][0]

    # A quiet bed the whole way through: the film never goes silent, just as it never freezes.
    left, right, low, drums = bed(dur, bpm, key, motif=(), kicks=(0, 2.5), snares=(1, 3), hats=8, swing=0.08, drums_from=1, keys_vel=0.6, keys_lp=3200)
    mix.put_stereo(0, left, right, 0.11)
    mix.put(0, low, 0.13)
    mix.put(0, drums, 0.05)

    events = tl.get("events", [])
    hit = next((e["t"] for e in events if e["kind"] == "impact"), None)
    for e in events:
        t, kind = e["t"], e["kind"]
        if kind == "swipe":
            mix.put(t - 0.04, whoosh(0.34, 700, 3600, 0.55), 0.05, -0.3)
        elif kind == "whoosh-up":
            mix.put(t - 0.05, whoosh(0.42, 500, 3200, 0.6), 0.06)
        elif kind in ("whoosh-left", "whoosh-right"):
            mix.put(t - 0.05, whoosh(0.38, 1600, 500, 0.5), 0.05, -0.4 if kind == "whoosh-left" else 0.4)
        elif kind == "ring":
            mix.put(t, blip(root * 4, 0.4, 0.14), 0.05)
        elif kind == "tick":
            mix.put(t, click(2600, 0.02), 0.018)
        elif kind == "tick-hi":
            mix.put(t, click(3400, 0.02), 0.024)
        elif kind == "riser" and hit:
            mix.put(t, riser(hit - t, 300, 4800), 0.035)
        elif kind == "impact":
            mix.put(t, impact(1.4), 0.2)
            mix.put(t, thud(58, 0.16, 0.6), 0.12)
        elif kind == "label":
            mix.put(t, blip(root * 6, 0.3, 0.1), 0.03)
        elif kind == "zoom":
            mix.put(t - 0.08, whoosh(0.5, 250, 5200, 0.85), 0.08)
        elif kind == "land":
            mix.put(t, thud(70, 0.09, 0.35), 0.09)
        elif kind == "pour":
            mix.put(t, airy(0.9, 300, 900, 0.7), 0.05)
        elif kind == "clink":
            mix.put(t, chime([root * 16, root * 16 * 1.5], 0.6, 0.18), 0.05)
        elif kind == "drip":
            mix.put(t, blip(root * 12, 0.15, 0.05), 0.02)
        elif kind == "type":
            mix.put(t, click(3000, 0.015), 0.02)
        elif kind == "click":
            mix.put(t, click(2200, 0.03), 0.04)
        elif kind == "chime":
            mix.put(t, chime([root * 4, root * 4 * 1.26, root * 4 * 1.5, root * 8 * 1.12], 2.2, 0.8), 0.06)
            mix.put(t, airy(1.6, 600, 2400, 0.6), 0.02)
