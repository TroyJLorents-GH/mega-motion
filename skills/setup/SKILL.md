---
name: setup
description: Use when mega-motion is used for the first time on a machine, when a render, caption, QA or 3D step fails because a tool is missing, or when the user asks what they need to install for motion work - checks Node, Python, ffmpeg and its filters, Playwright, Blender and the GSAP, HyperFrames and ffmpeg skills, and gives the install command for anything missing.
---

# Setup

Find out what this machine can do before promising a render.

1. Run the check: `python3 <this skill's folder>/scripts/check_env.py` (add `--json` for machine-readable output). It is read-only and installs nothing.
2. Report the result in one short table: ready, partial, missing. Say what each missing piece blocks, in plain words (for example "captions cannot be burned in until ffmpeg has libass").
3. For anything missing, show the exact install command the script printed and ask the user whether to run it. **Never install without a clear yes for that item.** Installing changes their machine.
4. If the user says yes, run that one command, then re-run the check to confirm. If an install needs a password or a GUI, tell them to run it themselves.
5. If they decline, continue with what works and say what the result will lack (for example a video without burned captions, or no automated QA).

Required for most work: Node, Python, ffmpeg with the subtitles, drawtext and loudnorm filters, and Playwright with Chromium. Optional: Blender (3D only), git, and the official GSAP skills, HyperFrames skills and ffmpeg-skill, which mega-motion hands library mechanics to when they are installed.

When ffmpeg-skill is installed the check also runs its `doctor` once and reports per-tool usability (its overall `ok` can be true while one tool, such as captions, is unusable). Do not start every job with doctor; run it here, once.

Run this check once per machine, not on every request.
