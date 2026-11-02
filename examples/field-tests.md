# Field tests

Four real briefs, one per kind of output, plus an optional vague one. Run each the way a new user would, score it with the card at the bottom, and keep the good ones as examples (see [README.md](README.md)).

## Before you start

1. **Use a fresh folder per test**, outside this repo, for example `~/motion/tests/reel-01`. Each test gets its own new Claude Code session.
2. **Make sure the plugin loads exactly once.** If this repo is linked into `~/.claude/skills/mega-motion` (the author's setup), the plugin already loads in every session; do not also install it from the marketplace, or the skills load twice. Everyone else installs it:
   ```
   /plugin marketplace add TroyJLorents-GH/mega-motion
   /plugin install mega-motion@mega-motion
   ```
3. **Run setup once:** `/mega-motion:setup`. Accept or decline its install offers and note which tools were missing.
4. **Paste the prompt exactly as written.** If it asks its one optional question, give the answer listed under the test. Do not steer it otherwise; the point is to see what it does alone.
5. Copy [_template/NOTES.md](_template/NOTES.md) into the test folder and fill it in as you go.

## Test 1: vertical reel (`code-film`)

Folder: `reel-ember-roast`

```
Make a 15-second 9:16 launch reel for Ember Roast, a small-batch coffee brand. The new product is Night Shift cold brew: twice the caffeine, out this Friday.
```

If it asks: "Moody and premium, dark roast colours. Instagram Reels."

Look for: a brief and beat table before any code; every frame drawn as a function of time; text inside the Instagram safe zone; a contact sheet; the critic run on rendered frames; an MP4 that plays on a phone.

## Test 2: scroll story (`scroll-story`)

Folder: `scroll-aura-one`

```
Build a scroll story section for Aura One wireless headphones: 40-hour battery, adaptive noise cancelling, 250 g. It should feel like an Apple product page, not a template.
```

If it asks: "Light background, one accent colour, no 3D model available."

Look for: pinned sections that stay under about 60% of the page; text that holds still while it is read; a working reduced-motion version; no jumps on resize; usable at 390 px wide.

## Test 3: 3D product hero (`web-3d`)

Folder: `hero-atlas-pro`

```
Make a three.js hero for the Atlas Pro smartwatch that turns as you scroll, with three callouts: titanium case, 18-hour battery, 212 g. Use a free CC0 model or build a simple one.
```

If it asks: "Dark studio look. It must run well on a mid-range phone."

Look for: a stated device budget; callouts that stay attached to the model; sensible framing on a phone; a fallback when WebGL is missing; the model's licence written down.

## Test 4: interface motion (`ui-motion`)

Folder: `ui-settings-panel`

```
Build a settings panel with four toggles, a slider, a save button and a confirmation toast, and make the motion feel premium and fast.
```

If it asks: "Plain HTML, CSS and JS. Dark mode."

Look for: feedback within about 100 ms of a press; motion that survives fast repeated clicks; focus states; reduced motion handled; nothing that slows the interface down.

## Test 5 (optional): vague request

Folder: `vague-coffee`

```
Make me something animated for my coffee brand, Ember Roast.
```

Answer its question however you like. This checks the ask-once rule: at most one optional question, then premium defaults.

## Without the plugin (for side-by-side proof)

Run the same prompt in a session where mega-motion is not loaded, in a separate folder (for example `reel-ember-roast-baseline`).

- Marketplace install: run `claude plugin disable mega-motion@mega-motion` in a terminal before the run, and `claude plugin enable mega-motion@mega-motion` afterwards.
- Linked setup: move the link out of the skills folder for the run, then put it back:
  ```bash
  mv ~/.claude/skills/mega-motion ~/.claude/mega-motion-link-off
  ```
  ```bash
  mv ~/.claude/mega-motion-link-off ~/.claude/skills/mega-motion
  ```

Use the same model and effort for both runs, and save both outputs.

## Scorecard

Fill in one per test in `NOTES.md`.

| Check | Pass when |
|---|---|
| Questions | At most one, and it was optional |
| Routing | The expected skill loaded (see the Skill calls in the transcript) |
| Plan first | A brief and beat table existed before code |
| Reduced motion | A designed reduced-motion version exists and was checked |
| QA | `qa/checks.json` or a QA summary with a status for every check |
| Critic | `motion-critic` reviewed rendered evidence, not the builder's notes |
| Phone | Works and reads at 390 px wide (or 1080×1920 for video) |
| Quality, 1 to 5 | Would you post or ship it as is? |
| Plugin fixes | Anything the plugin should have done differently |

Anything scored as a fail is a fix to the plugin, not just to that example; note it under "Plugin fixes".
