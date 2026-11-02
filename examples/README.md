# Examples

Real work made with mega-motion from one-line prompts, kept with everything needed to judge it: the prompt, the plan it wrote, the result and the checks it ran.

No examples are published yet. They come from the field tests in [field-tests.md](field-tests.md).

## How an example gets here

1. Run a test from [field-tests.md](field-tests.md) in its own folder outside this repo, filling in [_template/NOTES.md](_template/NOTES.md) as you go.
2. If it scores well and you would ship it, copy the keepers into `examples/<name>/` using the layout below.
3. Add a preview to the gallery in this file and, for the best ones, to the main README.
4. If it failed a check, fix the plugin first, then run the test again.

## Layout of one example

```
examples/<name>/
  NOTES.md            prompt, its question and your answer, scorecard, plugin fixes
  brief.md            the brief and beat table it wrote
  src/                the code it built (no node_modules, no render frames)
  preview.gif         short preview for the README, under 5 MB
  final.mp4           the finished video, or a screen recording of the page, under 25 MB
  contact-sheet.png   frames with frame numbers burned in
  qa/checks.json      QA results with a status for every check
  critic.md           the motion-critic's review
  baseline/           optional: the same prompt run without the plugin
```

Keep large or regenerable files out: no `node_modules`, frame folders or raw recordings. Code that needs packages lists them in `package.json`. Any 3D model, font or sound must be free to redistribute; write its source and licence in `NOTES.md`.

## Making the preview GIF

GitHub plays GIFs inline in a README but not committed MP4 files, so each example gets a small GIF that links to its `final.mp4`.

For a 9:16 video:

```bash
ffmpeg -i final.mp4 -t 8 -vf "fps=15,scale=360:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer" -loop 0 preview.gif
```

For 16:9 or a page recording, use `scale=640:-1` instead. If the GIF is over 5 MB, lower `fps` to 12 or shorten `-t`.

For a scroll story or interface piece, record the page at phone width (390 px) and at desktop width with the macOS screen recorder (Shift-Command-5), then trim and convert it the same way.

## Gallery

| Example | Prompt | Preview |
|---|---|---|
| (none yet) | | |
