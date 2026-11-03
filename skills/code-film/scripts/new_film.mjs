#!/usr/bin/env node
// Create a film project from the mega-motion studio: the harness plus a proven template.
//
//   node <code-film skill>/scripts/new_film.mjs <folder> [--template launch-reel]
//
// Then, in <folder>: npm install, edit film.json, node studio/render.mjs preview | stills | film.
// Works on macOS, Linux and Windows (Node 18+). Never overwrites an existing film.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STUDIO = path.join(SKILL, 'studio');
const argv = process.argv.slice(2);
const dest = argv.find((a) => !a.startsWith('--'));
const ti = argv.indexOf('--template');
const template = ti === -1 ? 'launch-reel' : argv[ti + 1];
const templates = fs.readdirSync(path.join(STUDIO, 'templates'));

if (!dest || !templates.includes(template)) {
  console.error(`usage: node new_film.mjs <folder> [--template ${templates.join('|')}]`);
  process.exit(1);
}
const out = path.resolve(dest);
if (fs.existsSync(path.join(out, 'film.json'))) {
  console.error(`${out} already has a film.json; pick a new folder.`);
  process.exit(1);
}
fs.mkdirSync(out, {recursive: true});
fs.cpSync(path.join(STUDIO, 'core'), out, {recursive: true, filter: (src) => !src.includes('__pycache__')});
fs.cpSync(path.join(STUDIO, 'templates', template), out, {recursive: true});
fs.copyFileSync(path.join(SKILL, 'scripts', 'freeze_check.py'), path.join(out, 'studio', 'freeze_check.py'));
fs.writeFileSync(path.join(out, '.gitignore'), 'node_modules/\nout/\n__pycache__/\n');

console.log(`Created ${out} from the "${template}" template.

Next:
  cd "${out}"
  npm install                      (Playwright and the fonts; Chrome or Edge is used if Playwright's browser is missing)
  edit film.json                   (words, colours, beat times)
  node studio/render.mjs preview   (watch it live in a browser)
  node studio/render.mjs stills    (contact sheet at every beat)
  node studio/render.mjs film      (score, MP4, freeze check, determinism, contact sheet)`);
