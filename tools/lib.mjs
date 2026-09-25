import { chromium } from 'playwright-core';
import path from 'node:path';
import url from 'node:url';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';

export const FFMPEG = process.env.FFMPEG || ffmpegStatic;
export const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
export const FILM = path.join(ROOT, 'film', 'index.html');

export async function launch() {
  const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium'].find(p => fs.existsSync(p));
  return chromium.launch({ executablePath: exe, args: ['--disable-gpu', '--disable-background-networking', '--disable-component-update', '--no-first-run', '--js-flags=--max-old-space-size=8192'] });
}

export async function openFilm(browser, { query = '', timeout = 300000 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); else if (process.env.LOG) console.log('  [page]', m.text()); });
  await page.route(u => !/^(file|data|blob|about):/.test(u.href), r => { errors.push('network blocked: ' + r.request().url()); return r.abort(); });
  const href = url.pathToFileURL(FILM).href + '?capture=1' + (query ? '&' + query : '');
  await page.goto(href, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__riso && window.__riso.ready === true, null, { timeout })
    .catch(() => { throw new Error('film never ready\n' + errors.join('\n')); });
  const duration = await page.evaluate(() => window.__riso.duration);
  return { page, duration, errors };
}

export async function frameAt(page, t) {
  await page.evaluate(time => window.__riso.seek(time), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

export function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq > -1) out[a.slice(2, eq)] = a.slice(eq + 1);
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}

export function ff(fnArgs, stdin = false) {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...fnArgs], { stdio: [stdin ? 'pipe' : 'ignore', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));
  return {
    write: buf => new Promise(res => (p.stdin.write(buf) ? res() : p.stdin.once('drain', res))),
    end: () => { if (p.stdin) p.stdin.end(); return done; },
    done,
  };
}
