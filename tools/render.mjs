// node render.mjs [--from a --to b] [--out ../out/x.mp4] [--no-audio] [--crf 16]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { launch, openFilm, args, ROOT, ff, FFMPEG } from './lib.mjs';
const a = args(process.argv.slice(2));
const fps = 30;
const out = path.resolve(a.out || path.join(ROOT, 'out', 'halfway.mp4'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const browser = await launch();
const { page, duration, errors } = await openFilm(browser, { query: a.query || '' });
const from = Number(a.from || 0), to = Math.min(Number(a.to || duration), duration);
const total = Math.round((to - from) * fps);
let wav = null;
if (!a['no-audio'] && from === 0 && to === duration) {
  // the lossless master from tools/score.py; the page embeds the same score as Opus
  const master = path.join(ROOT, 'out', 'score.wav');
  if (fs.existsSync(master)) { wav = master; console.log('audio <-', wav); }
  else {
    const b64 = await page.evaluate(async () => window.__riso.renderAudio ? window.__riso.renderAudio() : null);
    if (b64) { wav = out.replace(/\.mp4$/, '.wav'); fs.writeFileSync(wav, Buffer.from(b64, 'base64')); console.log('audio ->', wav); }
  }
}
const video = wav ? out.replace(/\.mp4$/, '.silent.mp4') : out;
const enc = ff(['-f', 'image2pipe', '-framerate', String(fps), '-i', 'pipe:0',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(a.crf || 14), '-preset', 'slow', '-tune', 'grain',
  '-profile:v', 'high', '-movflags', '+faststart', '-y', video], true);
const t0 = Date.now();
for (let f = 0; f < total; f++) {
  const t = from + f / fps;
  await page.evaluate(time => window.__riso.seek(time), t);
  await enc.write(await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } }));
  if (f % 30 === 0 || f === total - 1) console.log(`  frame ${f + 1}/${total} eta ${((Date.now() - t0) / (f + 1) * (total - f - 1) / 1000).toFixed(0)}s`);
}
await enc.end();
if (wav) {
  await ff(['-i', video, '-i', wav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest',
    '-metadata', 'title=Halfway', '-metadata', 'comment=Piano: Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0)',
    '-movflags', '+faststart', '-y', out]).done;
  fs.unlinkSync(video);
  const r = spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  console.log((r.stderr || '').split('\n').filter(l => /^\s+(I|LRA|Peak):/.test(l)).map(l => l.trim()).join('  '));
}
if (errors.length) console.error('page errors:\n' + errors.slice(0, 10).join('\n'));
console.log(`done ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out}`);
await browser.close();
