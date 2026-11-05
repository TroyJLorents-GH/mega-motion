#!/usr/bin/env node
// mega-motion studio: render a seekable HTML composition to video, stills and review evidence.
//
//   node studio/render.mjs preview                 serve the film and print a URL to watch it live
//   node studio/render.mjs still 3.2               one PNG at t = 3.2 s
//   node studio/render.mjs stills every:0.5        labelled contact sheet (also: beats, or 0,2.5,6)
//   node studio/render.mjs film                    score (if score.py), frames, MP4, freeze check, contact sheet
//   node studio/render.mjs check                   determinism, freeze check and sheet for the last film
//
// Options: --out FILE  --fps N  --from S  --to S  --crf N  --cols N  --reduced (render the reduced-motion
// variant)  --no-audio  --port N.  Everything is read from film.json; the page must expose window.seek(t)
// and set window.__ready once fonts and setup are done.
//
// The capture loop follows elvarofficial/teardown's sims/capture.mjs (MIT); see LICENSES/.
import {spawn, spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};
const flag = (k) => argv.includes(`--${k}`);
const film = JSON.parse(fs.readFileSync(path.join(ROOT, 'film.json'), 'utf8'));
const W = film.width ?? 1080;
const H = film.height ?? 1920;
const FPS = Number(opt('fps', film.fps ?? 30));
const DUR = Number(film.duration);
fs.mkdirSync(OUT, {recursive: true});

// ---------- tools found on PATH, with the Windows names tried too ----------
const python = () => {
  for (const exe of [process.env.PYTHON, 'python3', 'python', 'py'].filter(Boolean)) {
    const r = spawnSync(exe, ['--version'], {encoding: 'utf8'});
    if (r.status === 0 && /Python 3/.test(r.stdout + r.stderr)) return exe;
  }
  return null;
};
const run = (exe, args, opts = {}) =>
  new Promise((resolve, reject) =>
    spawn(exe, args, {stdio: 'inherit', ...opts}).on('error', reject).on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${exe} exited ${c}`)))),
  );

// ---------- a tiny static server, so fetch, fonts and modules work the same on every OS ----------
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp4': 'video/mp4'};
const serve = (port = 0) =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (rel === '/favicon.ico') return void res.writeHead(204).end();
      const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
      fs.createReadStream(file).pipe(res);
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });

// ---------- browser: Playwright's Chromium, else installed Chrome, else Edge (present on every Windows machine) ----------
async function launch() {
  let chromium;
  try {
    ({chromium} = await import('playwright'));
  } catch {
    console.error('Playwright is missing: run `npm install` in this folder first.');
    process.exit(2);
  }
  const args = ['--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'];
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try {
      const browser = await chromium.launch({channel, args});
      return {browser, name: channel || 'playwright chromium'};
    } catch {}
  }
  console.error('No browser found. Run `npx playwright install chromium`, or install Google Chrome.');
  process.exit(2);
}

async function openPage({reduced = flag('reduced')} = {}) {
  const server = await serve();
  const {browser, name} = await launch();
  // Full motion is explicit: a machine with system animations off would otherwise render the reduced branch.
  const context = await browser.newContext({viewport: {width: W, height: H}, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference'});
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?render`);
  await page.waitForFunction(() => (window.__ready === true && typeof window.seek === 'function') || window.__fatal, null, {timeout: 120000});
  const fatal = await page.evaluate(() => window.__fatal);
  if (fatal) {
    console.error(`The film refused to render:\n${fatal}`);
    await browser.close();
    server.close();
    process.exit(1);
  }
  await page.evaluate(() => document.fonts.ready);
  console.log(`browser: ${name}${reduced ? ' (reduced motion)' : ''}`);
  const draw = (t) => page.evaluate((x) => window.seek(x), t);
  const close = async () => {
    await browser.close();
    server.close();
  };
  return {page, draw, close};
}

const label = (page, text) =>
  page.evaluate((txt) => {
    const el = document.createElement('div');
    el.id = '__t';
    el.textContent = txt;
    el.style.cssText = 'position:fixed;left:16px;top:16px;z-index:2147483647;font:700 34px monospace;color:#fff;background:rgba(0,0,0,.72);padding:6px 12px;border-radius:6px';
    document.body.appendChild(el);
  }, text);

function stillTimes(arg) {
  if (arg === 'beats') return [...new Set([0, ...Object.values(film.beats || {}).map((b) => b + 0.35)])].filter((t) => t < DUR);
  if (arg.startsWith('every:')) {
    const step = Number(arg.slice(6));
    const ts = [];
    for (let t = Number(opt('from', 0)); t < Number(opt('to', DUR)) - 1e-6; t += step) ts.push(Number(t.toFixed(3)));
    return ts;
  }
  return arg.split(',').map(Number);
}

async function sheet(times, out, cols = Number(opt('cols', 6))) {
  const {page, draw, close} = await openPage();
  const dir = out.replace(/\.png$/, '') + '-frames';
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  for (const [i, t] of times.entries()) {
    await draw(Math.min(Math.max(t, 0), DUR - 1 / FPS));
    await label(page, `t=${t.toFixed(2)}  F${Math.round(t * FPS)}`);
    await page.screenshot({path: path.join(dir, `${String(i).padStart(3, '0')}.png`)});
    await page.evaluate(() => document.getElementById('__t')?.remove());
  }
  await close();
  // 360 px wide tiles double as the phone-size readability test.
  const tw = 360;
  const th = Math.round((H / W) * tw);
  const n = Math.min(times.length, cols);
  await run(FFMPEG, ['-loglevel', 'error', '-y', '-framerate', '1', '-i', path.join(dir, '%03d.png'),
    '-vf', `scale=${tw}:${th},tile=${n}x${Math.ceil(times.length / n)}:padding=6:color=0x444444`, '-frames:v', '1', out]);
  console.log(`sheet → ${path.relative(process.cwd(), out)}  (full frames in ${path.relative(process.cwd(), dir)})`);
}

async function score() {
  const cue = path.join(ROOT, 'score.py');
  if (!fs.existsSync(cue) || flag('no-audio')) return null;
  const py = python();
  if (!py) {
    console.warn('No Python 3 found: rendering without sound. Install Python 3 to get the score.');
    return null;
  }
  const wav = path.join(OUT, 'score.wav');
  await run(py, ['-I', path.join(ROOT, 'run_sfx.py'), cue, '--out', wav], {cwd: ROOT});
  return wav;
}

function freezeCheck(video) {
  const py = python();
  if (!py) return {status: 'not tested', problems: ['no Python 3 for the freeze check']};
  const r = spawnSync(py, ['-I', path.join(ROOT, 'studio', 'freeze_check.py'), video, '--json'], {encoding: 'utf8'});
  try {
    return JSON.parse(r.stdout);
  } catch {
    return {status: 'not tested', problems: [r.stderr.trim()]};
  }
}

// The same frame, reached in a different order, must look the same. Identical bytes pass at once; otherwise
// PSNR >= 60 dB passes (GPU rounding can flip a pixel by one level), and anything lower is a real defect:
// a clock, timer, unseeded random, or state left behind by an earlier frame.
async function determinism() {
  const {page, draw, close} = await openPage();
  const ts = [0.37 * DUR, 0.71 * DUR, 0.13 * DUR].map((t) => Number(t.toFixed(3)));
  const dir = path.join(OUT, 'review', 'determinism');
  fs.mkdirSync(dir, {recursive: true});
  const shot = async (t, tag) => {
    await draw(t);
    const file = path.join(dir, `${tag}-${t}.png`);
    await page.screenshot({path: file});
    return file;
  };
  const a = [];
  for (const t of ts) a.push(await shot(t, 'a'));
  const b = [];
  for (const t of [...ts].reverse()) b.unshift(await shot(t, 'b'));
  await close();
  const psnr = ts.map((_, i) => {
    const hash = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
    if (hash(a[i]) === hash(b[i])) return Infinity;
    const r = spawnSync(FFMPEG, ['-hide_banner', '-i', a[i], '-i', b[i], '-lavfi', 'psnr', '-f', 'null', '-'], {encoding: 'utf8'});
    const m = r.stderr.match(/average:(inf|[\d.]+)/);
    return m ? (m[1] === 'inf' ? Infinity : Number(m[1])) : 0;
  });
  const worst = Math.min(...psnr);
  const ok = worst >= 60;
  return {status: ok ? 'measured pass' : 'measured fail', times: ts, worst_psnr_db: Number.isFinite(worst) ? Number(worst.toFixed(1)) : 'identical',
    note: ok ? 'same picture when reached in a different order' : `frames at ${ts.filter((_, i) => psnr[i] < 60).join(', ')} s change with render order (compare the a- and b- files in ${path.relative(ROOT, dir)})`};
}

// Settled text must stay inside the platform's safe zone (film.json "safe": fractions to keep clear on each side).
// Text in motion is exempt: a headline may whip across an edge, but nothing may rest there.
async function safeZone() {
  const safe = film.safe;
  if (!safe) return {status: 'not applicable', note: 'film.json has no "safe" margins'};
  const {page, draw, close} = await openPage();
  const boxes = () =>
    page.evaluate(() => {
      const root = document.getElementById('viewport') || document.body;
      const vr = root.getBoundingClientRect();
      const out = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent.trim()) continue;
        let box = (() => {
          const r = document.createRange();
          r.selectNodeContents(node);
          return r.getBoundingClientRect();
        })();
        let rect = {l: box.left, r: box.right, t: box.top, b: box.bottom};
        let visible = rect.r > rect.l;
        let opacity = 1;
        for (let e = node.parentElement; e && visible && e !== document.body; e = e.parentElement) {
          const cs = getComputedStyle(e);
          if (cs.display === 'none' || cs.visibility === 'hidden') visible = false;
          opacity *= parseFloat(cs.opacity);
          if (cs.overflow === 'hidden' && e !== root) {
            const c = e.getBoundingClientRect();
            rect = {l: Math.max(rect.l, c.left), r: Math.min(rect.r, c.right), t: Math.max(rect.t, c.top), b: Math.min(rect.b, c.bottom)};
            if (rect.r - rect.l < 2 || rect.b - rect.t < 2) visible = false;
          }
        }
        if (!visible || opacity < 0.5) continue;
        out.push({text: node.textContent.trim().slice(0, 40), l: rect.l - vr.left, r: rect.r - vr.left, t: rect.t - vr.top, b: rect.b - vr.top});
      }
      return out;
    });
  const lim = {l: safe.left * W, r: (1 - safe.right) * W, t: safe.top * H, b: (1 - safe.bottom) * H};
  const step = 0.1;
  const hits = new Map();
  let prev = null;
  for (let t = 0; t < DUR - 1e-6; t += step) {
    await draw(t);
    const cur = await boxes();
    if (prev) {
      for (const b of cur) {
        const p = prev.find((x) => x.text === b.text);
        const settled = p && Math.abs(p.l - b.l) < 2 && Math.abs(p.r - b.r) < 2 && Math.abs(p.t - b.t) < 2 && Math.abs(p.b - b.b) < 2;
        if (!settled) continue;
        const over = {left: lim.l - b.l, right: b.r - lim.r, top: lim.t - b.t, bottom: b.b - lim.b};
        for (const [side, px] of Object.entries(over)) {
          if (px <= 1) continue;
          const key = `${b.text} (${side})`;
          const h = hits.get(key) || {text: b.text, side, from: t, to: t, worst_px: 0};
          h.to = t;
          h.worst_px = Math.max(h.worst_px, Math.round(px));
          hits.set(key, h);
        }
      }
    }
    prev = cur;
  }
  await close();
  const problems = [...hits.values()].map((h) => `"${h.text}" rests ${h.worst_px}px into the ${h.side} margin from ${h.from.toFixed(1)} to ${h.to.toFixed(1)} s`);
  return {status: problems.length ? 'measured fail' : 'measured pass', margins: safe, problems};
}

async function renderFilm() {
  const reduced = flag('reduced');
  const out = path.resolve(opt('out', path.join(OUT, `${film.title || 'film'}${reduced ? '-reduced' : ''}.mp4`)));
  const {page, draw, close} = await openPage({reduced});
  // The composition lists its own sound cues (window.EVENTS), so sound and picture share one clock.
  const events = await page.evaluate(() => window.EVENTS || []);
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({duration: DUR, fps: FPS, beats: film.beats || {}, sound: film.sound || {}, events}, null, 1));
  const wav = reduced ? null : await score();
  const from = Number(opt('from', 0));
  const to = Number(opt('to', DUR));
  const frames = Math.round((to - from) * FPS);
  const silent = wav ? out.replace(/\.mp4$/, '-silent.mp4') : out;
  const ff = spawn(FFMPEG, ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt('crf', 20)), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silent],
  {stdio: ['pipe', 'inherit', 'inherit']});
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await draw(from + i / FPS);
    const buf = await page.screenshot({type: 'png'});
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % FPS === 0) process.stdout.write(`\rframes ${i}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await close();
  console.log(`\rframes ${frames}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (wav) {
    await run(FFMPEG, ['-loglevel', 'error', '-y', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out]);
    fs.rmSync(silent);
  }
  console.log(`film → ${path.relative(process.cwd(), out)}`);
  return out;
}

async function qa(video) {
  const freeze = freezeCheck(video);
  console.log(`freeze check: ${freeze.status}${freeze.problems?.length ? '\n  - ' + freeze.problems.join('\n  - ') : ''}`);
  const det = await determinism();
  console.log(`determinism: ${det.status}`);
  const zone = await safeZone();
  console.log(`safe zone: ${zone.status}${zone.problems?.length ? '\n  - ' + zone.problems.join('\n  - ') : ''}`);
  const sheetPath = path.join(OUT, 'review', 'contact.png');
  fs.mkdirSync(path.dirname(sheetPath), {recursive: true});
  await sheet(stillTimes('every:0.5'), sheetPath);
  const report = {video: path.relative(ROOT, video), checks: {'video-freeze': freeze, determinism: det, 'safe-zone': zone}, evidence: {contact_sheet: path.relative(ROOT, sheetPath)}};
  fs.writeFileSync(path.join(OUT, 'review', 'checks.json'), JSON.stringify(report, null, 2));
  const failed = [freeze, det, zone].some((c) => c.status === 'measured fail');
  console.log(failed ? 'QA: FAIL. Fix the problems above before calling the film done.' : 'QA: automatic checks pass. Now review the contact sheet (motion-critic).');
  return failed ? 1 : 0;
}

if (cmd === 'preview') {
  const server = await serve(Number(opt('port', 5173)));
  console.log(`watch it live: http://127.0.0.1:${server.address().port}/  (space pause, ←/→ seek, r restart; Ctrl+C to stop)`);
} else if (cmd === 'still') {
  const t = Number(argv[1] ?? 0);
  const {page, draw, close} = await openPage();
  await draw(t);
  const out = path.resolve(opt('out', path.join(OUT, `still-${t.toFixed(2)}.png`)));
  await page.screenshot({path: out});
  await close();
  console.log(`still → ${path.relative(process.cwd(), out)}`);
} else if (cmd === 'stills') {
  const arg = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'beats';
  await sheet(stillTimes(arg), path.resolve(opt('out', path.join(OUT, 'review', `sheet-${arg.replace(/[^\w.]+/g, '_')}.png`))));
} else if (cmd === 'film') {
  const video = await renderFilm();
  process.exitCode = flag('reduced') ? 0 : await qa(video);
} else if (cmd === 'check') {
  const video = path.resolve(opt('video', path.join(OUT, `${film.title || 'film'}.mp4`)));
  process.exitCode = await qa(video);
} else {
  console.log('usage: node studio/render.mjs preview | still <t> | stills <every:0.5|beats|t,t,t> | film [--reduced] | check');
  process.exitCode = 1;
}
