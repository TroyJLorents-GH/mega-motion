#!/usr/bin/env python3
"""mega-motion environment check. Read-only: it detects tools and prints install
commands; it never installs anything. Usage: python3 check_env.py [--json]"""
import json, os, platform, re, shutil, subprocess, sys
from pathlib import Path

OS = {"Darwin": "mac", "Windows": "windows"}.get(platform.system(), "linux")
HOME = Path.home()

def run(cmd, timeout=15):
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return (p.stdout or "") + (p.stderr or "")
    except Exception:
        return ""

def version(cmd, flag="--version"):
    exe = shutil.which(cmd)
    if not exe:
        return None
    out = run([exe, flag])
    m = re.search(r"\d+\.\d+(\.\d+)?", out)
    return m.group(0) if m else "found"

INSTALL = {
    "node": {"mac": "brew install node", "windows": "winget install OpenJS.NodeJS.LTS", "linux": "install Node 22+ from nodejs.org or your package manager"},
    "python": {"mac": "brew install python", "windows": "winget install Python.Python.3.12", "linux": "sudo apt install python3"},
    "ffmpeg": {"mac": "brew install ffmpeg-full  (keg-only: put $(brew --prefix ffmpeg-full)/bin first on PATH, or brew unlink ffmpeg && brew link --force ffmpeg-full)",
               "windows": "winget install Gyan.FFmpeg  (full build; unverified that every filter is present, re-run this check after)",
               "linux": "sudo apt install ffmpeg  (re-run this check to confirm libass and vidstab)"},
    "playwright": {"all": "npm i -D playwright && npx playwright install chromium   (inside the project)"},
    "blender": {"mac": "brew install --cask blender", "windows": "winget install BlenderFoundation.Blender", "linux": "download from https://www.blender.org/download/"},
    "git": {"mac": "xcode-select --install", "windows": "winget install Git.Git", "linux": "sudo apt install git"},
    "gsap-skills": {"all": "Claude Code: /plugin marketplace add greensock/gsap-skills  then  /plugin install gsap-skills@gsap-skills   (or any agent: npx skills add greensock/gsap-skills)"},
    "hyperframes": {"all": "Claude Code: /plugin marketplace add heygen-com/hyperframes  then  /plugin install hyperframes@hyperframes   (or any agent: npx skills add heygen-com/hyperframes)"},
    "ffmpeg-skill": {"all": "npx ffmpeg-skill   (add --codex or --cursor for those agents)"},
}
def how(key):
    d = INSTALL[key]
    return d.get("all") or d.get(OS)

def skill_found(name):
    roots = [HOME/".claude/skills", HOME/".agents/skills", HOME/".claude/plugins/cache", HOME/".codex/skills", Path.cwd()/".claude/skills"]
    for r in roots:
        if not r.exists():
            continue
        if (r/name/"SKILL.md").exists():
            return str(r/name)
        if "plugins" in str(r):
            for hit in r.glob(f"*/*/*/skills/{name}/SKILL.md"):
                return str(hit.parent)
    return None

items = []
def add(key, label, needed_for, status, detail, required):
    items.append({"id": key, "tool": label, "status": status, "detail": detail, "needed_for": needed_for,
                  "required": required, "install": None if status == "ok" else how(key)})

# Runtimes
nv = version("node")
add("node", "Node.js", "GSAP/three.js projects, HyperFrames, Playwright, npx installers",
    "ok" if nv and int(nv.split(".")[0]) >= 18 else ("old" if nv else "missing"), nv or "not on PATH", True)
pv = f"{sys.version_info.major}.{sys.version_info.minor}"
newer = sorted({n for d in os.environ.get("PATH", "").split(os.pathsep) if os.path.isdir(d)
                for n in os.listdir(d) if re.fullmatch(r"python3\.(1[0-9])", n)})
if sys.version_info < (3, 10) and newer:
    INSTALL["python"] = {"all": f"already installed: {newer[-1]} is on PATH; run Python scripts with {newer[-1]} instead of python3, no new install needed"}
add("python", "Python 3", "ffmpeg-skill (3.10+ preferred), this check",
    "ok" if sys.version_info >= (3, 10) else "old", pv + ("" if sys.version_info >= (3, 10) else " (works, but ffmpeg-skill deprecates 3.9)"), True)
gv = version("git")
add("git", "git", "versioning projects and installing plugins", "ok" if gv else "missing", gv or "not on PATH", False)

# ffmpeg and the filters video work needs
fv = version("ffmpeg", "-version")
if fv:
    filters = run([shutil.which("ffmpeg"), "-hide_banner", "-filters"])
    need = {"subtitles": "burned captions (libass)", "drawtext": "labels on contact sheets", "loudnorm": "loudness to -14 LUFS", "vidstabdetect": "stabilisation"}
    missing = [f"{f} ({why})" for f, why in need.items() if not re.search(rf"\s{f}\s", filters)]
    add("ffmpeg", "ffmpeg", "rendering frames to video, contact sheets, captions, loudness, delivery",
        "ok" if not missing else "partial", fv + ("" if not missing else "; missing filters: " + ", ".join(missing)), True)
else:
    add("ffmpeg", "ffmpeg", "rendering frames to video, contact sheets, captions, loudness, delivery", "missing", "not on PATH", True)

# Playwright browsers (headless rendering and motion QA)
cache = {"mac": HOME/"Library/Caches/ms-playwright", "linux": HOME/".cache/ms-playwright",
         "windows": Path(os.environ.get("LOCALAPPDATA", str(HOME)))/"ms-playwright"}[OS]
chromium = sorted(cache.glob("chromium*")) if cache.exists() else []
add("playwright", "Playwright + Chromium", "rendering HTML frames headlessly, automated motion QA",
    "ok" if chromium else "missing", (f"browsers in {cache}" if chromium else "no Playwright browsers downloaded"), True)

# Blender (optional)
bl = version("blender")
if not bl and OS == "mac" and Path("/Applications/Blender.app/Contents/MacOS/Blender").exists():
    bl = re.search(r"\d+\.\d+(\.\d+)?", run(["/Applications/Blender.app/Contents/MacOS/Blender", "--version"]) or "") 
    bl = bl.group(0) if bl else "found"
add("blender", "Blender", "3D models, renders, exploded views (only for 3D work)", "ok" if bl else "missing", bl or "not found", False)

# Skills the plugin routes to
for key, probe, label, why in [
    ("gsap-skills", "gsap-scrolltrigger", "Official GSAP skills", "GSAP API detail: ScrollTrigger, Flip, SplitText, timelines"),
    ("hyperframes", "hyperframes", "HyperFrames skills", "HTML-to-video reels and films"),
    ("ffmpeg-skill", "ffmpeg-skill", "ffmpeg-skill", "editing real footage, captions, platform exports and delivery checks"),
]:
    where = skill_found(probe)
    status, detail = ("ok" if where else "missing"), (where or "not installed")
    if key == "ffmpeg-skill" and where:
        doc = Path(where)/"scripts"/"_contract.py"
        if doc.exists():
            try:
                pr = subprocess.run([sys.executable, str(doc), "doctor", "--json"], capture_output=True, text=True, timeout=45)
                d = json.loads(pr.stdout or "{}")
                bad = [k for k, v in (d.get("tools") or {}).items() if isinstance(v, dict) and v.get("usable") not in (True, "yes")]
                detail = f"{where}; doctor ok={d.get('ok')}, version {d.get('version')}"
                if bad:
                    status, detail = "partial", detail + "; unusable tools: " + ", ".join(sorted(bad)[:8])
            except Exception:
                status, detail = "partial", where + "; doctor could not be read (unknown)"
    add(key, label, why, status, detail, False)

if "--json" in sys.argv:
    print(json.dumps({"os": OS, "items": items}, indent=2))
else:
    print(f"mega-motion setup check ({OS})\n")
    for it in items:
        mark = {"ok": "OK  ", "partial": "PART", "old": "OLD ", "missing": "MISS"}[it["status"]]
        req = "required" if it["required"] else "optional"
        print(f"[{mark}] {it['tool']:<24} {it['detail']}")
        if it["status"] != "ok":
            print(f"        needed for: {it['needed_for']} ({req})")
            print(f"        install:    {it['install']}")
    gaps = [i for i in items if i["status"] != "ok"]
    print(f"\n{len(items)-len(gaps)} of {len(items)} ready. Nothing was installed.")
