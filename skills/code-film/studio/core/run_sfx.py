"""Render a cue sheet to a mastered WAV from any folder: python run_sfx.py score.py | --list

Sound engine vendored from elvarofficial/teardown (MIT), itself from whaleyxbt/claude-motion (MIT).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sfx.__main__ import main  # noqa: E402

main()
