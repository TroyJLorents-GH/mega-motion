#!/usr/bin/env python3
"""Fail a rendered film that freezes.

Runs ffmpeg's freezedetect on a video and fails when the whole frame stands still for longer than
--max-hold seconds anywhere except a final end card, when the end card holds longer than --end-hold,
or when frozen time exceeds --max-share of the runtime. A film of still cards joined by wipes fails.

Usage: python3 freeze_check.py out/anim.mp4 [--json]
Exit code 0 = pass, 1 = fail, 2 = could not run (ffmpeg or ffprobe missing, unreadable file).
Stdlib only; needs ffmpeg and ffprobe on PATH. Works on macOS, Linux and Windows.
"""
import argparse
import json
import re
import subprocess
import sys


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def freezes(path, noise, min_len, total):
    err = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vf", f"freezedetect=n={noise}:d={min_len}",
         "-map", "0:v", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    spans, start = [], None
    for key, val in re.findall(r"lavfi\.freezedetect\.freeze_(start|end): ([\d.]+)", err):
        if key == "start":
            start = float(val)
        elif start is not None:
            spans.append((start, float(val)))
            start = None
    if start is not None:
        spans.append((start, total))
    return spans


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("video")
    ap.add_argument("--max-hold", type=float, default=0.5, help="longest full-frame freeze allowed mid-film, seconds")
    ap.add_argument("--end-hold", type=float, default=1.0, help="longest frozen end card allowed, seconds")
    ap.add_argument("--max-share", type=float, default=0.10, help="largest share of runtime that may be frozen")
    ap.add_argument("--noise", type=float, default=0.001, help="freezedetect noise tolerance")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    try:
        total = duration(a.video)
        spans = freezes(a.video, a.noise, a.max_hold, total)
    except (OSError, subprocess.CalledProcessError, ValueError) as e:
        print(f"freeze_check: could not analyse {a.video}: {e}", file=sys.stderr)
        sys.exit(2)

    end_tol = 1.5 / 30  # a freeze that stops within about a frame of the end is the end card
    mid = [(s, e) for s, e in spans if e < total - end_tol]
    end = next((e - s for s, e in spans if e >= total - end_tol), 0.0)
    frozen = sum(e - s for s, e in spans)
    share = frozen / total if total else 0.0

    problems = [f"frame frozen {e - s:.2f}s from {s:.2f}s to {e:.2f}s (limit {a.max_hold}s mid-film)" for s, e in mid]
    if end > a.end_hold:
        problems.append(f"end card frozen {end:.2f}s (limit {a.end_hold}s)")
    if share > a.max_share:
        problems.append(f"{share:.0%} of the runtime is frozen (limit {a.max_share:.0%})")

    result = {
        "video": a.video, "status": "measured fail" if problems else "measured pass",
        "duration_s": round(total, 3), "frozen_s": round(frozen, 3), "frozen_share": round(share, 3),
        "end_hold_s": round(end, 3), "freezes": [[round(s, 3), round(e, 3)] for s, e in spans], "problems": problems,
    }
    if a.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"{result['status']}: {frozen:.2f}s of {total:.2f}s frozen ({share:.0%}), end hold {end:.2f}s")
        for p in problems:
            print(f"  - {p}")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
