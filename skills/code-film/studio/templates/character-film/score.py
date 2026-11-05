"""Score for the character film, rendered by `node studio/render.mjs film` (or: python run_sfx.py score.py).

film.js lists its own cues in window.EVENTS (typing, footfalls, the crack and the smash, the catch, the toss, the
dock, play, done, the end card); the renderer writes them to out/timeline.json, so every sound lands on the frame
that causes it. Chords and tempo come from film.json "sound".
"""

from sfx.score_kit import airy, bang, bed, chords, rattle, thud
from sfx.synth import blip, chime, click, impact, pop, riser, whoosh

TIMELINE = "out/timeline.json"
TARGET_LUFS = -14.0
SEED = 11


def score(mix, tl):
    dur = tl["duration"]
    snd = tl.get("sound", {})
    bpm = snd.get("bpm", 112)
    key = chords(*snd.get("chords", ["Fmaj9:F3 A3 C4 E4 G4/F2", "Dm9:D3 F3 A3 C4 E4/D2"]))
    root = key[0][0][0]
    events = tl.get("events", [])
    at = lambda kind: next((e["t"] for e in events if e["kind"] == kind), None)  # noqa: E731

    # A light bed the whole way: drums come in when he starts running, so the music follows the story.
    run = at("whoosh") or 2.4
    left, right, low, drums = bed(dur, bpm, key, motif=(), kicks=(0, 2.5), snares=(1, 3), hats=8, swing=0.1,
                                  drums_from=max(1, round(run / (240 / bpm))), keys_vel=0.55, keys_lp=3000)
    mix.put_stereo(0, left, right, 0.1)
    mix.put(0, low, 0.11)
    mix.put(0, drums, 0.045)

    smash = at("smash")
    done = at("done")
    for e in events:
        t, kind = e["t"], e["kind"]
        if kind == "type":
            mix.put(t, click(3100, 0.014), 0.018)
        elif kind == "key":
            mix.put(t, click(2400, 0.02), 0.02)
        elif kind == "pop":
            mix.put(t, pop(root * 4, root * 6, 0.14), 0.05)
        elif kind == "blip":
            mix.put(t, blip(root * 6, 0.3, 0.1), 0.045)
        elif kind == "whoosh":
            mix.put(t, whoosh(0.35, 600, 3000, 0.5), 0.045)
        elif kind == "step":
            mix.put(t, thud(160, 0.03, 0.08), 0.03)
            mix.put(t, click(1500, 0.012), 0.008)
        elif kind == "leap":
            mix.put(t - 0.04, whoosh(0.4, 400, 2600, 0.6), 0.05)
        elif kind == "crack" and smash:
            mix.put(t, riser(smash - t, 900, 6000), 0.02)
            mix.put(t, click(5200, 0.03), 0.03)
        elif kind == "smash":
            mix.put(t, impact(1.3), 0.17)
            mix.put(t, bang(1.0, seed=3), 0.12)
            mix.put(t + 0.02, rattle(0.9, rate=26, f=4200, seed=5, level=1.0), 0.06)
        elif kind == "debris":
            mix.put(t, rattle(0.8, rate=14, f=3000, seed=9, level=0.8), 0.045)
        elif kind == "land":
            mix.put(t, thud(70, 0.1, 0.4), 0.1)
        elif kind == "hop":
            mix.put(t, pop(root * 3, root * 5, 0.12), 0.04)
        elif kind == "catch":
            mix.put(t, pop(root * 5, root * 8, 0.12), 0.06)
            mix.put(t, thud(110, 0.05, 0.2), 0.05)
        elif kind == "toss":
            mix.put(t - 0.03, whoosh(0.5, 500, 4200, 0.7), 0.06)
        elif kind == "dock":
            mix.put(t, click(2000, 0.04), 0.06)
            mix.put(t, thud(90, 0.06, 0.25), 0.07)
        elif kind == "tick":
            mix.put(t, click(2900, 0.018), 0.025)
        elif kind == "play":
            if done:
                mix.put(t, riser(done - t, 300, 4200), 0.03)
            mix.put(t, airy(1.2, 500, 1600, 0.6), 0.025)
        elif kind == "done":
            mix.put(t, chime([root * 4, root * 4 * 1.26, root * 4 * 1.5, root * 8], 2.0, 0.8), 0.07)
        elif kind == "end":
            mix.put(t, chime([root * 2, root * 3, root * 4 * 1.26], 2.6, 1.0), 0.05)
            mix.put(t, airy(1.6, 600, 2400, 0.6), 0.02)
