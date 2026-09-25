'use strict';
/* ── Halfway · engine ──────────────────────────────────────────────────────────
   A 1920×1080 live-plate risograph compositor, adapted from the riso-windowseat
   kit (github.com/sevenevesai/riso-windowseat, MIT) for a wide frame.

   Every frame draws continuous ink coverage for six plates. Coverage is packed
   into the RGB channels of two canvases (A: yellow, pink, orange; B: blue,
   green, indigo) that share one alpha, so ordinary source-over compositing is
   the kit's `put` for three plates at once: a shape owns its value on every
   plate it touches. 'screen' adds ink toward full coverage (an overprint),
   'multiply' removes a fraction of it (a partial knockout).

   compose() then thresholds each plate per pixel against a page-pinned screen
   table (dot distance field, low-frequency mottling, starvation flecks), with
   a fixed registration miss per plate, and multiplies the inks onto a baked
   cream paper. Gradients print as dot size; the screen never swims.         */

const W = 1920, H = 1080, FPS = 30, DUR = 15;
const PAD = 4, PW = W + PAD * 2, PH = H + PAD * 2;
const PITCH = 4.6;
const PAPER = '#F2EDE3';
const PLATES = ['yellow', 'pink', 'orange', 'blue', 'green', 'indigo'];
const INK = {
  yellow: '#FFE800', pink: '#FF48B0', orange: '#FF6C2F',
  blue: '#0078BF', green: '#00A95C', indigo: '#2E3192',
};
// Rational screen tangents b/a so the rotated lattice tiles seamlessly.
const SCREEN = {
  yellow: { a: 1, b: 0 },  //  0.0°
  pink:   { a: 1, b: 4 },  // 76.0°
  orange: { a: 2, b: 1 },  // 26.6°
  blue:   { a: 4, b: 1 },  // 14.0°
  green:  { a: 1, b: 2 },  // 63.4°
  indigo: { a: 1, b: 1 },  // 45.0°
};
// Each plate misses by a fixed amount (device px): the contours reveal it.
const REG = {
  yellow: [2, 1], pink: [-2, 2], orange: [1, 2],
  blue: [1, -1], green: [-1, -1], indigo: [0, 0],
};

/* ── deterministic randomness ─────────────────────────────────────────────── */
function mulberry32(a) {
  return function () {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rngFor = (key) => mulberry32(hash(key));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const smoother = (u) => { u = clamp(u, 0, 1); return u * u * u * (u * (u * 6 - 15) + 10); };
const phase = (t, t0, d) => clamp((t - t0) / d, 0, 1);
const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
const easeOut = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const fract = (x) => x - Math.floor(x);

function cv(w, h, fast) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  if (fast) c.getContext('2d', { willReadFrequently: true });
  return c;
}

/* Smooth deterministic variation in t: a small sine stack per key. */
const WANDER = new Map();
function wander(key, t, hz = 0.3, n = 3) {
  let h = WANDER.get(key);
  if (!h) {
    const r = rngFor('w:' + key); h = [];
    for (let i = 0; i < n; i++) h.push([hz * (1 + i * 0.77 + r() * 0.3), r() * TAU, 1 / (1 + i)]);
    WANDER.set(key, h);
  }
  let s = 0, norm = 0;
  for (const [f, p, a] of h) { s += Math.sin(TAU * f * t + p) * a; norm += a; }
  return s / norm;
}

/* ── colour: plate coverages ───────────────────────────────────────────────── */
// A colour is {y,p,o,b,g,i} in 0..1 (missing = 0).
const C = (y = 0, p = 0, o = 0, b = 0, g = 0, i = 0) => ({ y, p, o, b, g, i });
const cmix = (a, b, u) => C(lerp(a.y || 0, b.y || 0, u), lerp(a.p || 0, b.p || 0, u), lerp(a.o || 0, b.o || 0, u),
  lerp(a.b || 0, b.b || 0, u), lerp(a.g || 0, b.g || 0, u), lerp(a.i || 0, b.i || 0, u));
const cscale = (a, k) => C((a.y || 0) * k, (a.p || 0) * k, (a.o || 0) * k, (a.b || 0) * k, (a.g || 0) * k, (a.i || 0) * k);
// overprint: add ink toward full coverage on each plate
const cover = (a, b) => C(1 - (1 - (a.y || 0)) * (1 - (b.y || 0)), 1 - (1 - (a.p || 0)) * (1 - (b.p || 0)), 1 - (1 - (a.o || 0)) * (1 - (b.o || 0)),
  1 - (1 - (a.b || 0)) * (1 - (b.b || 0)), 1 - (1 - (a.g || 0)) * (1 - (b.g || 0)), 1 - (1 - (a.i || 0)) * (1 - (b.i || 0)));
const c255 = (v) => clamp(Math.round(v * 255), 0, 255);
const rgbA = (c, a = 1) => `rgba(${c255(c.y || 0)},${c255(c.p || 0)},${c255(c.o || 0)},${a})`;
const rgbB = (c, a = 1) => `rgba(${c255(c.b || 0)},${c255(c.g || 0)},${c255(c.i || 0)},${a})`;
const PAPERC = C();

/* ── painter: one drawing call lands on both packed canvases ────────────────
   A Pen wraps a pair of contexts (A, B). `style` is a colour, or a gradient
   spec {lin:[x0,y0,x1,y1] | rad:[x0,y0,r0,x1,y1,r1], stops:[[t, colour, a?]]}. */
function makeStyle(g, which, st) {
  if (st.lin || st.rad) {
    const gr = st.lin ? g.createLinearGradient(...st.lin) : g.createRadialGradient(...st.rad);
    for (const [u, c, a] of st.stops) gr.addColorStop(clamp(u, 0, 1), which ? rgbB(c, a ?? 1) : rgbA(c, a ?? 1));
    return gr;
  }
  return which ? rgbB(st) : rgbA(st);
}
class Pen {
  constructor(a, b) { this.g = [a, b]; }
  get A() { return this.g[0]; }
  each(fn) { fn(this.g[0], 0); fn(this.g[1], 1); }
  save() { this.each(g => g.save()); }
  restore() { this.each(g => g.restore()); }
  setTransform(a, b, c, d, e, f) { this.each(g => g.setTransform(a, b, c, d, e, f)); }
  transform(a, b, c, d, e, f) { this.each(g => g.transform(a, b, c, d, e, f)); }
  translate(x, y) { this.each(g => g.translate(x, y)); }
  scale(x, y) { this.each(g => g.scale(x, y)); }
  rotate(r) { this.each(g => g.rotate(r)); }
  clip(path, rule) { this.each(g => g.clip(path, rule || 'nonzero')); }
  clear() { this.each(g => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height); g.restore(); }); }
  /* op: 'put' (own the value), 'add' (overprint), 'lift' (remove fraction), 'mix' (put at alpha) */
  fill(path, st, op = 'put', alpha = 1, rule) {
    this.each((g, w) => {
      g.globalAlpha = alpha;
      if (op === 'add') { g.globalCompositeOperation = 'screen'; g.fillStyle = makeStyle(g, w, st); }
      else if (op === 'lift') { g.globalCompositeOperation = 'multiply'; g.fillStyle = makeStyle(g, w, liftStyle(st)); }
      else { g.globalCompositeOperation = 'source-over'; g.fillStyle = makeStyle(g, w, st); }
      g.fill(path, rule || 'nonzero');
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    });
  }
  stroke(path, st, width, op = 'put', alpha = 1) {
    this.each((g, w) => {
      g.globalAlpha = alpha; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
      g.globalCompositeOperation = op === 'add' ? 'screen' : op === 'lift' ? 'multiply' : 'source-over';
      g.strokeStyle = makeStyle(g, w, op === 'lift' ? liftStyle(st) : st);
      g.stroke(path);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    });
  }
  rect(x, y, w, h, st, op, alpha) { const p = new Path2D(); p.rect(x, y, w, h); this.fill(p, st, op, alpha); }
  image(pair, ...args) { this.g[0].drawImage(pair[0], ...args); this.g[1].drawImage(pair[1], ...args); }
  set alpha(a) { this.each(g => { g.globalAlpha = a; }); }
  set filter(f) { this.each(g => { g.filter = f; }); }
  set op(o) { this.each(g => { g.globalCompositeOperation = o; }); }
}
// 'lift' removes a fraction of ink: multiply by (1 - c)
function liftStyle(st) {
  const inv = (c) => C(1 - (c.y || 0), 1 - (c.p || 0), 1 - (c.o || 0), 1 - (c.b || 0), 1 - (c.g || 0), 1 - (c.i || 0));
  if (st.lin || st.rad) return Object.assign({}, st, { stops: st.stops.map(([u, c, a]) => [u, inv(c), a]) });
  return inv(st);
}
function penPair(w, h, fast = false) {
  const a = cv(w, h), b = cv(w, h);
  const o = fast ? { willReadFrequently: true } : undefined;
  return { pen: new Pen(a.getContext('2d', o), b.getContext('2d', o)), canv: [a, b] };
}

/* ── shape builders (craft kit, simplified) ─────────────────────────────────── */
function poly(pts, closed = true) {
  // closed shapes are wound one way so unions of subpaths never cancel into holes
  if (closed && pts.length > 2) {
    let A = 0;
    for (let i = 0, n = pts.length; i < n; i++) { const q = pts[i], r = pts[(i + 1) % n]; A += q[0] * r[1] - r[0] * q[1]; }
    if (A < 0) pts = pts.slice().reverse();
  }
  const p = new Path2D();
  pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y));
  if (closed) p.closePath();
  return p;
}
// Catmull-Rom through points as a dense polyline
function curve(pts, closed = false, per = 8) {
  const out = [], n = pts.length;
  const get = (i) => closed ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}
// hand-cut contour: displace a closed polyline along normals by smoothed noise
function cut(pts, rng, amp = 1.2) {
  const n = pts.length, d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = (rng() * 2 - 1) * amp;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) d[i] = (d[(i - 1 + n) % n] + d[i] * 2 + d[(i + 1) % n]) / 4;
  return pts.map(([x, y], i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let nx = b[1] - a[1], ny = a[0] - b[0];
    const l = Math.hypot(nx, ny) || 1;
    return [x + nx / l * d[i], y + ny / l * d[i]];
  });
}
// variable-width ribbon along a polyline
function nib(pts, wfn) {
  const L = [], R = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = wfn(n > 1 ? i / (n - 1) : 0) / 2;
    L.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
    R.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
  }
  return poly(L.concat(R.reverse()));
}
function ellipsePath(x, y, rx, ry, rot = 0) { const p = new Path2D(); p.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); return p; }

/* ── halftone screens ───────────────────────────────────────────────────────── */
function buildScreen(name, pitch = PITCH) {
  const { a, b } = SCREEN[name];
  const n = a * a + b * b;
  const S = Math.max(2, Math.round(pitch * Math.sqrt(n)));
  const P = S / Math.sqrt(n), u = P / Math.sqrt(n);
  const v1 = [u * a, u * b], v2 = [-u * b, u * a];
  const pts = [];
  for (let m = -n; m <= n; m++) for (let k = -n; k <= n; k++) {
    const x = m * v1[0] + k * v2[0], y = m * v1[1] + k * v2[1];
    const wx = ((x % S) + S) % S, wy = ((y % S) + S) % S;
    if (!pts.some(q => Math.abs(q[0] - wx) < 0.01 && Math.abs(q[1] - wy) < 0.01)) pts.push([wx, wy]);
  }
  const wrapped = [];
  for (const [x, y] of pts) for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) wrapped.push([x + dx + 0.5, y + dy + 0.5]);
  const th = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d2 = Infinity;
    for (const [px, py] of wrapped) { const dx = x + 0.5 - px, dy = y + 0.5 - py, q = dx * dx + dy * dy; if (q < d2) d2 = q; }
    th[y * S + x] = clamp(Math.PI * d2 / (P * P), 0, 1);
  }
  return { S, th };
}

/* Threshold per pixel (0..255): screen + mottling + jitter, starvation = 255. */
function buildThr(name, pitch = PITCH) {
  const sc = buildScreen(name, pitch), S = sc.S, t = new Uint8Array(W * H), r = rngFor('thr:' + name + pitch);
  const R = 24, R2 = R + 2, nz = new Float32Array(R2 * R2);
  for (let i = 0; i < nz.length; i++) nz[i] = r() * 2 - 1;
  for (let y = 0; y < H; y++) {
    const fy = y / W * R, iy = fy | 0, vy = fy - iy, row = (y % S) * S;
    for (let x = 0; x < W; x++) {
      const fx = x / W * R, ix = fx | 0, vx = fx - ix, k = iy * R2 + ix;
      const m = (nz[k] * (1 - vx) + nz[k + 1] * vx) * (1 - vy) + (nz[k + R2] * (1 - vx) + nz[k + R2 + 1] * vx) * vy;
      t[y * W + x] = clamp(Math.round(sc.th[row + x % S] * 234 + 9 + m * 8 + (r() - 0.5) * 16), 3, 250);
    }
  }
  const flecks = pitch < PITCH ? 0 : Math.round(W * H / 700);
  for (let i = 0; i < flecks; i++) {
    const cx = r() * W, cy = r() * H, rad = 0.5 + r() * r() * 2.4, rr = rad * rad;
    for (let y = Math.max(0, Math.floor(cy - rad)); y <= Math.min(H - 1, Math.ceil(cy + rad)); y++)
      for (let x = Math.max(0, Math.floor(cx - rad)); x <= Math.min(W - 1, Math.ceil(cx + rad)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= rr) t[y * W + x] = 255;
  }
  return t;
}

/* ── paper ─────────────────────────────────────────────────────────────────── */
function bakePaper() {
  const c = cv(W, H), x = c.getContext('2d');
  x.fillStyle = PAPER; x.fillRect(0, 0, W, H);
  const r = rngFor('paper');
  for (const [res, maxA] of [[32, 0.10], [80, 0.07], [180, 0.05]]) {
    const rh = Math.round(res * H / W);
    const n = cv(res, rh), nx = n.getContext('2d'), img = nx.createImageData(res, rh);
    for (let i = 0; i < res * rh; i++) {
      img.data[i * 4] = 0xB4; img.data[i * 4 + 1] = 0xA6; img.data[i * 4 + 2] = 0x8C;
      img.data[i * 4 + 3] = Math.pow(r(), 1.8) * 255 * maxA;
    }
    nx.putImageData(img, 0, 0);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(n, 0, 0, W, H);
  }
  x.strokeStyle = '#8a7f6a';
  for (let i = 0; i < 760; i++) {
    const px = r() * W, py = r() * H, len = 5 + r() * 22, ang = r() * Math.PI;
    x.globalAlpha = 0.008 + r() * 0.016; x.lineWidth = 0.5 + r() * 0.7;
    x.beginPath(); x.moveTo(px, py);
    x.quadraticCurveTo(px + Math.cos(ang) * len * 0.5 + (r() - 0.5) * 5, py + Math.sin(ang) * len * 0.5 + (r() - 0.5) * 5,
      px + Math.cos(ang) * len, py + Math.sin(ang) * len);
    x.stroke();
  }
  for (let i = 0; i < 4000; i++) {
    x.globalAlpha = 0.012 + r() * 0.03;
    x.fillStyle = r() < 0.55 ? '#7d7362' : '#ffffff';
    x.beginPath(); x.arc(r() * W, r() * H, 0.4 + r() * 1.0, 0, TAU); x.fill();
  }
  return c;
}

/* ── the frame: packed plate canvases and the compositor ────────────────────── */
const FRAME = penPair(PW, PH, true);
const pen = FRAME.pen, FA = pen.g[0], FB = pen.g[1];

let FACC = null, THR = null, THRF = null, PAPERPX = null, OUTIMG = null, FAC = null;
/* Fine detail (faces, hands) is printed on a half-pitch screen, as a printer
   would switch to a finer line screen for small detail: FINE is its mask. */
const FINE = cv(PW, PH, true).getContext('2d', { willReadFrequently: true });
function fineMark(path) { FINE.setTransform(1, 0, 0, 1, PAD, PAD); FINE.fillStyle = '#fff'; FINE.fill(path); }
function fineClear() { FINE.setTransform(1, 0, 0, 1, 0, 0); FINE.clearRect(0, 0, PW, PH); }
function initCompositor(outCtx) {
  THR = PLATES.map(n => buildThr(n));
  THRF = PLATES.map(n => buildThr(n, 1.7));
  FACC = PLATES.map(n => { const ink = [1, 3, 5].map(i => parseInt(INK[n].substr(i, 2), 16) / 255); return [0, 1, 2].map(ch => { const f = new Uint16Array(256); for (let c = 0; c < 256; c++) f[c] = Math.round(256 * (1 - (c / 255) * (1 - ink[ch]))); return f; }); });
  PAPERPX = bakePaper().getContext('2d').getImageData(0, 0, W, H).data;
  OUTIMG = outCtx.createImageData(W, H);
  // Per plate: ink factor per channel as a function of (coverage - threshold),
  // with a ~1 px soft edge so dots are anti-aliased rather than stair-stepped.
  FAC = PLATES.map(n => {
    const ink = [1, 3, 5].map(i => parseInt(INK[n].substr(i, 2), 16) / 255);
    const f = [new Uint16Array(512), new Uint16Array(512), new Uint16Array(512)];
    for (let d = -255; d <= 256; d++) {
      const amt = clamp(d / 22 + 0.5, 0, 1);
      for (let ch = 0; ch < 3; ch++) f[ch][d + 255] = Math.round(256 * (1 - amt * (1 - ink[ch])));
    }
    return f;
  });
}

function compose(outCtx) {
  const a = FA.getImageData(0, 0, PW, PH).data, b = FB.getImageData(0, 0, PW, PH).data;
  const o = OUTIMG.data, pp = PAPERPX;
  // pixel (x,y) of the print samples plate coverage at (x+PAD-dx, y+PAD-dy)
  const off = PLATES.map(n => ((PAD - REG[n][1]) * PW + (PAD - REG[n][0])) * 4);
  const o0 = off[0], o1 = off[1] + 1, o2 = off[2] + 2, o3 = off[3], o4 = off[4] + 1, o5 = off[5] + 2;
  const fm = FINE.getImageData(0, 0, PW, PH).data;
  const [c0, c1, c2, c3, c4, c5] = THR, [e0, e1, e2, e3, e4, e5] = THRF;
  const [f0, f1, f2, f3, f4, f5] = FAC;
  const r0 = f0[0], g0 = f0[1], b0 = f0[2], r1 = f1[0], g1 = f1[1], b1 = f1[2], r2 = f2[0], g2 = f2[1], b2 = f2[2];
  const r3 = f3[0], g3 = f3[1], b3 = f3[2], r4 = f4[0], g4 = f4[1], b4 = f4[2], r5 = f5[0], g5 = f5[1], b5 = f5[2];
  for (let y = 0; y < H; y++) {
    let s4 = y * PW * 4, pi = y * W, i4 = pi * 4;
    for (let x = 0; x < W; x++, s4 += 4, pi++, i4 += 4) {
      const fine = fm[s4 + PAD * PW * 4 + PAD * 4 + 3] > 96;
      if (fine) {   // fine detail prints as continuous ink, so a face's small marks survive
        let r = pp[i4] << 8, g = pp[i4 + 1] << 8, bl = pp[i4 + 2] << 8, c = 0;
        for (let k = 0; k < 6; k++) {
          c = (k < 3 ? a : b)[s4 + [o0, o1, o2, o3, o4, o5][k]];
          if (c !== 0) { const f = FACC[k]; r = (r * f[0][c]) >>> 8; g = (g * f[1][c]) >>> 8; bl = (bl * f[2][c]) >>> 8; }
        }
        o[i4] = (r + 128) >>> 8; o[i4 + 1] = (g + 128) >>> 8; o[i4 + 2] = (bl + 128) >>> 8; o[i4 + 3] = 255;
        continue;
      }
      const t0 = c0, t1 = c1, t2 = c2, t3 = c3, t4 = c4, t5 = c5;
      // 20.12 fixed point: paper byte << 8, each ink multiplies by factor/4096
      let r = pp[i4] << 8, g = pp[i4 + 1] << 8, bl = pp[i4 + 2] << 8, c = 0, d = 0;
      c = a[s4 + o0]; if (c !== 0) { d = c - t0[pi] + 255; r = (r * r0[d]) >>> 8; g = (g * g0[d]) >>> 8; bl = (bl * b0[d]) >>> 8; }
      c = a[s4 + o1]; if (c !== 0) { d = c - t1[pi] + 255; r = (r * r1[d]) >>> 8; g = (g * g1[d]) >>> 8; bl = (bl * b1[d]) >>> 8; }
      c = a[s4 + o2]; if (c !== 0) { d = c - t2[pi] + 255; r = (r * r2[d]) >>> 8; g = (g * g2[d]) >>> 8; bl = (bl * b2[d]) >>> 8; }
      c = b[s4 + o3]; if (c !== 0) { d = c - t3[pi] + 255; r = (r * r3[d]) >>> 8; g = (g * g3[d]) >>> 8; bl = (bl * b3[d]) >>> 8; }
      c = b[s4 + o4]; if (c !== 0) { d = c - t4[pi] + 255; r = (r * r4[d]) >>> 8; g = (g * g4[d]) >>> 8; bl = (bl * b4[d]) >>> 8; }
      c = b[s4 + o5]; if (c !== 0) { d = c - t5[pi] + 255; r = (r * r5[d]) >>> 8; g = (g * g5[d]) >>> 8; bl = (bl * b5[d]) >>> 8; }
      o[i4] = (r + 128) >>> 8; o[i4 + 1] = (g + 128) >>> 8; o[i4 + 2] = (bl + 128) >>> 8; o[i4 + 3] = 255;
    }
  }
  outCtx.putImageData(OUTIMG, 0, 0);
}

/* A plain preview of coverage (no screen) for construction views: ?view=flat */
function composeFlat(outCtx) {
  const a = FA.getImageData(0, 0, PW, PH).data, b = FB.getImageData(0, 0, PW, PH).data;
  const o = OUTIMG.data, pp = PAPERPX;
  const inks = PLATES.map(n => [1, 3, 5].map(i => parseInt(INK[n].substr(i, 2), 16) / 255));
  const chan = [0, 1, 2, 0, 1, 2], src = [a, a, a, b, b, b];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i4 = (y * W + x) * 4, s4 = ((y + PAD) * PW + x + PAD) * 4;
    let r = pp[i4], g = pp[i4 + 1], bl = pp[i4 + 2];
    for (let k = 0; k < 6; k++) {
      const c = src[k][s4 + chan[k]] / 255;
      r *= 1 - c * (1 - inks[k][0]); g *= 1 - c * (1 - inks[k][1]); bl *= 1 - c * (1 - inks[k][2]);
    }
    o[i4] = r; o[i4 + 1] = g; o[i4 + 2] = bl; o[i4 + 3] = 255;
  }
  outCtx.putImageData(OUTIMG, 0, 0);
}
