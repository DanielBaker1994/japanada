// Inline src/*.js (in order) and the piano bank into film/index.html.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const order = ['engine.js', 'camera.js', 'figures.js', 'figdraw.js', 'scene.js', 'homes.js', 'debug.js', 'film.js', 'score.js', 'main.js'];
let src = '';
for (const f of order) {
  const p = path.join(root, 'src', f);
  if (fs.existsSync(p)) src += `\n/* ════ ${f} ════ */\n` + fs.readFileSync(p, 'utf8');
}
let html = fs.readFileSync(path.join(root, 'src', 'template.html'), 'utf8');
html = html.replace('/*@@SOURCES@@*/', () => src);
const opus = path.join(root, 'out', 'score.opus');
const bank = fs.existsSync(opus)
  ? `<script id="score" type="text/plain">${fs.readFileSync(opus).toString('base64')}</script>` : '';
html = html.replace('/*@@BANK@@*/', () => bank);
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
fs.writeFileSync(path.join(root, 'out', 'check.js'), src);
const { spawnSync } = await import('node:child_process');
const chk = spawnSync(process.execPath, ['--check', path.join(root, 'out', 'check.js')], { encoding: 'utf8' });
if (chk.status !== 0) { console.error(chk.stderr); process.exit(1); }
fs.mkdirSync(path.join(root, 'film'), { recursive: true });
fs.writeFileSync(path.join(root, 'film', 'index.html'), html);
console.log(`film/index.html ${(html.length / 1e6).toFixed(2)} MB`);
