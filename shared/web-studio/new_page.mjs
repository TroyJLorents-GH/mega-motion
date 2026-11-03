#!/usr/bin/env node
// Create a web motion project from the mega-motion web studio and a proven template.
//
//   node <plugin>/shared/web-studio/new_page.mjs <folder> --template <skill>/<template>
//   e.g. --template scroll-story/product-story, web-3d/product-hero, ui-motion/settings-panel
//
// Then, in <folder>: npm install, edit content, node studio/web.mjs preview | shots | check | film.
// Works on macOS, Linux and Windows (Node 18+). Never overwrites an existing page.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN = path.resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const dest = argv.find((a) => !a.startsWith('--'));
const ti = argv.indexOf('--template');
const name = ti === -1 ? '' : argv[ti + 1];
const all = [];
for (const skill of fs.readdirSync(path.join(PLUGIN, 'skills'))) {
  const t = path.join(PLUGIN, 'skills', skill, 'templates');
  if (fs.existsSync(t)) for (const n of fs.readdirSync(t)) if (fs.existsSync(path.join(t, n, 'page.json'))) all.push(`${skill}/${n}`);
}
if (!dest || !all.includes(name)) {
  console.error(`usage: node new_page.mjs <folder> --template <${all.join('|') || 'none yet'}>`);
  process.exit(1);
}
const out = path.resolve(dest);
if (fs.existsSync(path.join(out, 'page.json'))) {
  console.error(`${out} already has a page.json; pick a new folder.`);
  process.exit(1);
}
const [skill, tpl] = name.split('/');
fs.mkdirSync(out, {recursive: true});
fs.cpSync(path.join(HERE, 'core'), out, {recursive: true});
fs.cpSync(path.join(PLUGIN, 'skills', skill, 'templates', tpl), out, {recursive: true});
fs.writeFileSync(path.join(out, '.gitignore'), 'node_modules/\nout/\n');
console.log(`Created ${out} from ${name}.

Next:
  cd "${out}"
  npm install
  edit content.json            (the words, colours, numbers)
  node studio/web.mjs preview  (open it in a browser)
  node studio/web.mjs shots    (contact sheets at phone and desktop width)
  node studio/web.mjs check    (automatic checks; exits 1 on a fail)
  node studio/web.mjs film     (a recorded run, for review or sharing)`);
