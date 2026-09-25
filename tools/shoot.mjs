// node shoot.mjs --times 0,4,8 [--out dir] [--query view=flat] [--sheet]
import fs from 'node:fs';
import path from 'node:path';
import { launch, openFilm, frameAt, args, ROOT, ff } from './lib.mjs';
const a = args(process.argv.slice(2));
const out = path.resolve(a.out || path.join(ROOT, 'out', 'shots'));
fs.mkdirSync(out, { recursive: true });
let times = [];
if (a.times) times = String(a.times).split(',').map(Number);
if (a.range) { const [s, e, st] = a.range.split(':').map(Number); for (let t = s; t <= e + 1e-9; t += st) times.push(+t.toFixed(4)); }
const browser = await launch();
const t0 = Date.now();
const { page, errors } = await openFilm(browser, { query: a.query || '' });
console.log(`ready in ${Date.now() - t0} ms`);
const files = [];
for (const t of times) {
  const s = Date.now();
  const buf = await frameAt(page, t);
  const f = path.join(out, `t_${t.toFixed(3)}.png`);
  fs.writeFileSync(f, buf); files.push(f);
  console.log(`${f}  ${Date.now() - s} ms`);
}
if (errors.length) console.error('page errors:\n' + errors.join('\n'));
await browser.close();
if (a.sheet) {
  const { spawnSync } = await import('node:child_process');
  const sheet = path.join(out, a.name || 'sheet.png');
  spawnSync('python3', [path.join(ROOT, 'tools', 'sheet.py'), sheet, String(a.cols || 4), String(a.cell || 480), ...files], { stdio: 'inherit' });
  console.log('sheet', sheet);
}
