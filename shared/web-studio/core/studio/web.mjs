#!/usr/bin/env node
// mega-motion web studio: preview, review evidence and automatic checks for motion on web pages
// (scroll stories, 3D heroes, interface motion). The video studio's sibling.
//
//   node studio/web.mjs preview                 serve the page and print a URL
//   node studio/web.mjs shots                   labelled contact sheets down the page, phone (390) and desktop (1440)
//   node studio/web.mjs film                    record a scripted run (scroll through, or the page's tour) as video
//   node studio/web.mjs check                   automatic checks; writes out/review/checks.json, exits 1 on a fail
//
// Options: --port N, --step 0.5 (viewport heights between shots), --cols N.
// page.json configures it: {"entry": "index.html", "kind": "scroll" | "interface", "readable": "[data-read]",
// "maxPinned": 0.6}. The page sets window.__ready = true when it is ready, and reads ?capture to drop smoothing
// so a scroll position always gives the same frame.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const REVIEW = path.join(OUT, 'review');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};
const cfg = {entry: 'index.html', kind: 'scroll', readable: '[data-read]', maxPinned: 0.6, ...JSON.parse(fs.readFileSync(path.join(ROOT, 'page.json'), 'utf8'))};
const VIEWPORTS = {phone: {width: 390, height: 844}, desktop: {width: 1440, height: 900}};
fs.mkdirSync(REVIEW, {recursive: true});

const run = (exe, args) =>
  new Promise((resolve, reject) => spawn(exe, args, {stdio: 'inherit'}).on('error', reject).on('close', (c) => (c === 0 ? resolve() : reject(new Error(`${exe} exited ${c}`)))));

// A small static server, so modules, fonts and fetch behave the same on every OS.
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.mp4': 'video/mp4', '.ktx2': 'image/ktx2'};
const serve = (port = 0) =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (rel === '/favicon.ico') return void res.writeHead(204).end();
      const file = path.join(ROOT, rel === '/' ? cfg.entry : rel);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return void res.writeHead(404).end();
      res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
      fs.createReadStream(file).pipe(res);
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });

async function launch() {
  let chromium;
  try {
    ({chromium} = await import('playwright'));
  } catch {
    console.error('Playwright is missing: run `npm install` in this folder first.');
    process.exit(2);
  }
  // Real GPU for WebGL where there is one; Playwright's Chromium, else Chrome, else Edge.
  const args = ['--hide-scrollbars', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
  for (const channel of [undefined, 'chrome', 'msedge']) {
    try {
      return {browser: await chromium.launch({channel, args}), name: channel || 'playwright chromium'};
    } catch {}
  }
  console.error('No browser found. Run `npx playwright install chromium`, or install Google Chrome.');
  process.exit(2);
}

async function open(viewport, {reduced = false, video = null} = {}) {
  const server = await serve();
  const {browser, name} = await launch();
  const context = await browser.newContext({viewport, deviceScaleFactor: 1, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(video ? {recordVideo: {dir: video, size: viewport}} : {})});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${server.address().port}/${cfg.entry}?capture`);
  await page.waitForFunction(() => window.__ready === true, null, {timeout: 60000}).catch(() => errors.push('window.__ready never became true'));
  await page.evaluate(() => document.fonts.ready);
  const close = async () => {
    await context.close();
    await browser.close();
    server.close();
  };
  return {page, context, close, errors, browserName: name};
}

const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60)))));
const scrollTo = async (page, y) => {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await settle(page);
};
const height = (page) => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);

const label = (page, text) =>
  page.evaluate((txt) => {
    const el = document.createElement('div');
    el.id = '__t';
    el.textContent = txt;
    el.style.cssText = 'position:fixed;left:10px;top:10px;z-index:2147483647;font:700 22px monospace;color:#fff;background:rgba(0,0,0,.75);padding:4px 10px;border-radius:5px;pointer-events:none';
    document.body.appendChild(el);
  }, text);

async function sheet(files, out, tile, cols) {
  const list = path.join(REVIEW, 'list.txt');
  fs.writeFileSync(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  const n = Math.min(cols, files.length);
  await run(FFMPEG, ['-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf',
    `scale=${tile}:-2,tile=${n}x${Math.ceil(files.length / n)}:padding=6:color=0x444444`, '-frames:v', '1', out]);
  fs.rmSync(list);
}

// Scroll pages: a tile every --step viewport heights. Interface pages: the page's tour steps (window.__tour).
async function shots() {
  for (const [vname, vp] of Object.entries(VIEWPORTS)) {
    const {page, close, errors} = await open(vp);
    const dir = path.join(REVIEW, `shots-${vname}`);
    fs.rmSync(dir, {recursive: true, force: true});
    fs.mkdirSync(dir, {recursive: true});
    const files = [];
    if (cfg.kind === 'interface') {
      const steps = await page.evaluate(() => (window.__tour || []).map((s) => s.label));
      for (let i = 0; i <= steps.length; i++) {
        if (i > 0) await page.evaluate((k) => window.__tourStep(k), i - 1);
        // Wait the step's own hold, so things that arrive late (a toast after a save) are in the shot.
        await page.waitForTimeout(i > 0 ? await page.evaluate((k) => window.__tour[k].hold ?? 900, i - 1) : 450);
        await label(page, i === 0 ? 'start' : steps[i - 1]);
        const f = path.join(dir, `${String(i).padStart(3, '0')}.png`);
        await page.screenshot({path: f});
        await page.evaluate(() => document.getElementById('__t')?.remove());
        files.push(f);
      }
    } else {
      const total = await height(page);
      const step = Number(opt('step', 0.5)) * vp.height;
      const ys = [];
      for (let y = 0; y < total; y += step) ys.push(y);
      ys.push(total); // the true end, even when it is not a whole step away
      for (const [i, y] of ys.entries()) {
        await scrollTo(page, y);
        await label(page, `${Math.round((100 * y) / Math.max(1, total))}%  y=${Math.round(y)}`);
        const f = path.join(dir, `${String(i).padStart(3, '0')}.png`);
        await page.screenshot({path: f});
        await page.evaluate(() => document.getElementById('__t')?.remove());
        files.push(f);
      }
    }
    await close();
    const out = path.join(REVIEW, `shots-${vname}.png`);
    await sheet(files, out, vname === 'phone' ? 300 : 480, Number(opt('cols', vname === 'phone' ? 8 : 5)));
    console.log(`${vname}: ${files.length} shots → ${path.relative(process.cwd(), out)}${errors.length ? `  (page errors: ${errors.length})` : ''}`);
  }
}

// A real-time recording of a scripted run, for watching and for the critic's strips.
async function film() {
  for (const [vname, vp] of Object.entries(VIEWPORTS)) {
    const tmp = path.join(OUT, `rec-${vname}`);
    fs.rmSync(tmp, {recursive: true, force: true});
    const {page, close} = await open(vp, {video: tmp});
    await page.waitForTimeout(800);
    if (cfg.kind === 'interface') {
      const n = await page.evaluate(() => (window.__tour || []).length);
      for (let i = 0; i < n; i++) {
        await page.evaluate((k) => window.__tourStep(k), i);
        await page.waitForTimeout(await page.evaluate((k) => window.__tour[k].hold ?? 900, i));
      }
    } else {
      const total = await height(page);
      const secs = Number(opt('seconds', Math.max(8, total / vp.height * 1.6)));
      const frames = Math.round(secs * 30);
      for (let i = 0; i <= frames; i++) {
        await page.evaluate((yy) => window.scrollTo(0, yy), (total * i) / frames);
        await page.waitForTimeout(1000 / 30);
      }
      await page.waitForTimeout(800);
    }
    const vid = page.video();
    try {
      await close();
    } catch (e) {
      console.error(`Recording failed (${e.message.split('\n')[0]}). Playwright needs its video encoder: run \`npx playwright install ffmpeg\` once, then try again.`);
      process.exit(2);
    }
    const src = await vid.path();
    const out = path.join(OUT, `run-${vname}.mp4`);
    await run(FFMPEG, ['-loglevel', 'error', '-y', '-i', src, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out]);
    fs.rmSync(tmp, {recursive: true, force: true});
    console.log(`${vname}: recording → ${path.relative(process.cwd(), out)}`);
  }
}

// Text currently on screen and actually visible: non-zero box, not display:none or visibility:hidden, opacity > 0.5.
function collectVisible() {
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode;
    const tx = n.textContent.trim();
    if (!tx || !n.parentElement || n.parentElement.closest('script,style,[aria-hidden="true"]')) continue;
    const r = n.parentElement.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
    let op = 1;
    let shown = true;
    for (let e = n.parentElement; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      op *= parseFloat(cs.opacity);
      if (cs.display === 'none' || cs.visibility === 'hidden') shown = false;
    }
    if (shown && op > 0.5) out.push(tx.slice(0, 60));
  }
  return out;
}

async function check() {
  const results = {};
  const fail = (k, problems, extra = {}) => (results[k] = {status: problems.length ? 'measured fail' : 'measured pass', problems, ...extra});

  for (const [vname, vp] of Object.entries(VIEWPORTS)) {
    const {page, close, errors} = await open(vp);
    // 1. Nothing wider than the screen.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    fail(`no-horizontal-scroll-${vname}`, overflow > 1 ? [`page is ${overflow}px wider than the ${innerWidth}px screen`] : []);

    if (cfg.kind !== 'interface') {
      const total = await height(page);
      // 2. Reading text holds still: elements marked data-read="a,b" (page scroll fractions) keep their box and stay opaque.
      const marked = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((el, i) => ({i, range: (el.dataset.read || '').split(',').map(Number), text: el.textContent.trim().slice(0, 40)})), cfg.readable);
      const moving = [];
      for (const m of marked) {
        if (m.range.length !== 2 || m.range.some(Number.isNaN)) continue;
        const [a, b] = m.range;
        const samples = [];
        for (const u of [a + (b - a) * 0.1, (a + b) / 2, a + (b - a) * 0.9]) {
          await scrollTo(page, u * total);
          samples.push(await page.evaluate(([sel, i]) => {
            const el = document.querySelectorAll(sel)[i];
            const r = el.getBoundingClientRect();
            let op = 1;
            for (let e = el; e; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity);
            return {x: r.left, y: r.top, w: r.width, op};
          }, [cfg.readable, m.i]));
        }
        const drift = Math.max(...samples.map((s) => Math.hypot(s.x - samples[0].x, s.y - samples[0].y)));
        const minOp = Math.min(...samples.map((s) => s.op));
        if (drift > 1.5 || minOp < 0.98) moving.push(`"${m.text}" moves ${drift.toFixed(1)}px or fades to ${minOp.toFixed(2)} while it should be read (${a}-${b})`);
      }
      fail(`text-still-while-read-${vname}`, moving, {marked: marked.length});
      if (!marked.length) results[`text-still-while-read-${vname}`] = {status: 'not tested', problems: ['no elements marked data-read="a,b"']};

      // 3. Pin budget: total pinned scroll under maxPinned of the page.
      const pinned = await page.evaluate(() => {
        const ST = window.ScrollTrigger;
        if (!ST) return null;
        const spans = ST.getAll().filter((t) => t.pin).map((t) => [t.start, t.end]).sort((x, y) => x[0] - y[0]);
        let sum = 0;
        let cur = null;
        for (const [s, e] of spans) {
          if (!cur || s > cur[1]) {
            if (cur) sum += cur[1] - cur[0];
            cur = [s, e];
          } else cur[1] = Math.max(cur[1], e);
        }
        if (cur) sum += cur[1] - cur[0];
        return sum;
      });
      // CSS position: sticky pins are invisible to ScrollTrigger: a sticky element's parent height minus its own.
      const sticky = await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).position === 'sticky' && e.parentElement)
        .reduce((sum, e) => sum + Math.max(0, e.parentElement.offsetHeight - e.offsetHeight), 0));
      const pinnedAll = (pinned || 0) + sticky;
      if (pinned === null && !sticky) results[`pin-budget-${vname}`] = {status: 'not applicable', problems: []};
      else fail(`pin-budget-${vname}`, pinnedAll / (total + vp.height) > cfg.maxPinned ? [`${Math.round((100 * pinnedAll) / (total + vp.height))}% of the page is pinned (limit ${cfg.maxPinned * 100}%)`] : [], {pinned_share: Number((pinnedAll / (total + vp.height)).toFixed(2))});

      // 4. Frame pacing during a scripted scroll, CPU slowed 4x (a regression signal, not a phone).
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
      await page.evaluate(() => {
        window.__iv = [];
        let last = performance.now();
        const tick = (now) => {
          window.__iv.push(now - last);
          last = now;
          if (window.__iv.length < 100000) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      for (let i = 0; i <= 90; i++) {
        await page.evaluate((yy) => window.scrollTo(0, yy), (total * i) / 90);
        await page.waitForTimeout(33);
      }
      const iv = (await page.evaluate(() => window.__iv.slice(5))).sort((x, y) => x - y);
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});
      const p95 = iv[Math.floor(iv.length * 0.95)] || 0;
      fail(`frame-pacing-${vname}`, p95 > 20 ? [`p95 frame interval ${p95.toFixed(1)}ms at 4x CPU throttle (limit 20ms)`] : [], {p95_ms: Number(p95.toFixed(1)), note: 'headless and host-relative: a regression signal, not a phone measurement'});
    } else {
      // Interface: every tour step must give visible feedback within 100 ms, and survive five fast repeats.
      const n = await page.evaluate(() => (window.__tour || []).length);
      const slow = [];
      for (let i = 0; i < n; i++) {
        const ms = await page.evaluate(async (k) => {
          const snap = () => [...document.querySelectorAll('*')].slice(0, 400).map((e) => getComputedStyle(e).transform + getComputedStyle(e).backgroundColor + getComputedStyle(e).opacity).join('|');
          const s0 = snap();
          const t0 = performance.now();
          window.__tourStep(k);
          for (let f = 0; f < 30; f++) {
            await new Promise((r) => requestAnimationFrame(r));
            if (snap() !== s0) return performance.now() - t0;
          }
          return Infinity;
        }, i);
        if (ms > 100) slow.push(`step ${i + 1}: first visible change after ${Number.isFinite(ms) ? ms.toFixed(0) + 'ms' : 'never'} (limit 100ms)`);
        await page.waitForTimeout(400);
      }
      fail(`feedback-under-100ms-${vname}`, slow, {steps: n});
      const before = errors.length;
      for (let i = 0; i < n; i++) for (let r = 0; r < 5; r++) await page.evaluate((k) => window.__tourStep(k), i);
      await page.waitForTimeout(800);
      fail(`survives-fast-repeats-${vname}`, errors.length > before ? errors.slice(before) : []);
    }
    fail(`no-page-errors-${vname}`, errors);
    await close();
  }

  // 5. Reduced motion keeps every word: at phone width, any text that becomes visible somewhere down the page with
  // normal motion must also become visible with reduced motion. (Text hidden at this width by design is ignored.)
  {
    const visibleWords = async (reduced) => {
      const {page, close} = await open(VIEWPORTS.phone, {reduced});
      const total = cfg.kind === 'interface' ? 0 : await height(page);
      const ys = [];
      for (let y = 0; y < total; y += VIEWPORTS.phone.height * 0.25) ys.push(y);
      ys.push(total);
      const words = new Set();
      let finalText = null;
      if (cfg.kind === 'interface') {
        const n = await page.evaluate(() => (window.__tour || []).length);
        for (let i = -1; i < n; i++) {
          if (i >= 0) await page.evaluate((k) => window.__tourStep(k), i);
          await page.waitForTimeout(500);
          for (const w of await page.evaluate(collectVisible)) words.add(w);
        }
      } else {
        for (const y of ys) {
          await scrollTo(page, y);
          for (const w of await page.evaluate(collectVisible)) words.add(w);
        }
      }
      // Text the page still holds when it has finished (not counter in-betweens), outside decorative aria-hidden parts.
      finalText = new Set(await page.evaluate(() => {
        const out = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const tx = walker.currentNode.textContent.trim();
          const el = walker.currentNode.parentElement;
          if (tx && el && !el.closest('script,style,[aria-hidden="true"]')) out.push(tx.slice(0, 60));
        }
        return out;
      }));
      await close();
      return {words, finalText};
    };
    const normal = await visibleWords(false);
    const reduced = await visibleWords(true);
    const missing = [...normal.words].filter((w) => normal.finalText.has(w) && !reduced.words.has(w)).map((w) => `"${w}" shows with normal motion but never with reduced motion`);
    fail('reduced-motion-keeps-content', missing.slice(0, 12), {words_checked: normal.words.size});
  }

  const report = {page: cfg.entry, kind: cfg.kind, checks: results};
  fs.writeFileSync(path.join(REVIEW, 'checks.json'), JSON.stringify(report, null, 2));
  let failed = false;
  for (const [k, v] of Object.entries(results)) {
    console.log(`${k}: ${v.status}${v.problems?.length ? '\n  - ' + v.problems.slice(0, 6).join('\n  - ') : ''}`);
    if (v.status === 'measured fail') failed = true;
  }
  console.log(failed ? 'QA: FAIL. Fix the problems above.' : 'QA: automatic checks pass. Now review the shots (motion-critic).');
  return failed ? 1 : 0;
}

if (cmd === 'preview') {
  const server = await serve(Number(opt('port', 5174)));
  console.log(`open http://127.0.0.1:${server.address().port}/  (Ctrl+C to stop)`);
} else if (cmd === 'shots') await shots();
else if (cmd === 'film') await film();
else if (cmd === 'check') process.exitCode = await check();
else {
  console.log('usage: node studio/web.mjs preview | shots | film | check');
  process.exitCode = 1;
}
