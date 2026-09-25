/* ── Halfway · the two worlds ───────────────────────────────────────────────
   One sky, one sun, split at world X = 0.

   Left (X < 0): a thatched minka in the Japanese countryside at sunrise:
   cedar mountains, harvested terraces with rice drying on racks, a Japanese
   maple, a persimmon tree, a stone lantern, persimmons drying under the eaves.
   Right (X > 0): an Ontario brick farmhouse at sunset: a lake, spruce and
   birch on the Shield hills, a sugar maple, a split-rail fence, a canoe.

   The sun stands low on the seam, rising for one house and setting for the
   other. Everything the lens sees is backlit, so each home throws a long
   shadow strip toward the viewer (shadows radiate from the sun's point on
   the horizon). Between the strips runs one corridor of light down the
   middle of the frame, capped by a sun pillar in the sky: that is the
   dividing line, and it is where the two walkers meet.

   All geometry is in world metres and projected every frame, so the slow
   dolly gives exact parallax without resizing any screened bitmap.        */

/* ── palette (plate coverages) ─────────────────────────────────────────────── */
const PAL = {
  haze: C(0.52, 0.2, 0.38),
  thatch: C(0.45, 0.16, 0.45, 0, 0, 0.26), thatchDk: C(0.35, 0.3, 0.55, 0, 0, 0.55), thatchEdge: C(0.55, 0.1, 0.42, 0, 0, 0.12),
  wood: C(0.1, 0.35, 0.5, 0, 0, 0.72), woodLt: C(0.2, 0.22, 0.45, 0, 0, 0.42),
  plaster: C(0.1, 0, 0.08, 0, 0, 0.14), stone: C(0.12, 0, 0, 0.3, 0, 0.32),
  shoji: C(0.65, 0, 0.24), shojiDim: C(0.5, 0.06, 0.3, 0, 0, 0.08),
  brick: C(0.08, 0.55, 0.7, 0, 0, 0.3), brickDk: C(0.08, 0.55, 0.7, 0, 0, 0.52),
  trim: C(0.06, 0, 0.04, 0, 0, 0.1), shingle: C(0, 0.18, 0, 0.35, 0, 0.55),
  glow: C(0.66, 0, 0.32), shutter: C(0.05, 0, 0, 0.3, 0.72, 0.5),
  momiji: C(0.12, 0.8, 0.86), momijiLt: C(0.45, 0.4, 0.72), momijiDk: C(0.05, 0.8, 0.8, 0, 0, 0.36),
  sugar: C(0.55, 0.38, 0.86), sugarLt: C(0.8, 0.1, 0.5), sugarDk: C(0.35, 0.6, 0.82, 0, 0, 0.28),
  bark: C(0.1, 0.3, 0.4, 0, 0, 0.72), spruce: C(0.06, 0, 0, 0.3, 0.72, 0.58), cedar: C(0.08, 0, 0, 0.35, 0.6, 0.6),
  birch: C(0.06, 0, 0.04, 0, 0, 0.08),
  moss: C(0.45, 0.06, 0.2, 0, 0.34, 0.26), earth: C(0.32, 0.14, 0.4, 0, 0, 0.3),
  grass: C(0.55, 0.06, 0.34, 0, 0.12, 0.16), gravel: C(0.25, 0.1, 0.28, 0.08, 0, 0.26),
  meadow: C(0.52, 0.06, 0.28, 0, 0.2, 0.16),
  stubble: C(0.55, 0.1, 0.34, 0, 0, 0.1), shadow: C(0, 0.06, 0, 0.28, 0, 0.3),
};

/* ── 3D helpers ─────────────────────────────────────────────────────────────── */
const pj = (x, y, z) => { const s = proj(x, y, z); return [s[0], s[1]]; };
const Q3 = (pts) => poly(pts.map(p => pj(p[0], p[1], p[2])));
const L3 = (pts) => poly(pts.map(p => pj(p[0], p[1], p[2])), false);
// rectangle in a plane of constant z
const rectZ = (x0, x1, y0, y1, z) => Q3([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);
// rectangle in a plane of constant x
const rectX = (x, z0, z1, y0, y1) => Q3([[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]]);
// ground polygon from (x, z) pairs, clipped in front of the lens
function groundPoly(xz, y = 0) {
  const zc = CAM.z + 1.0, out = [];
  for (let i = 0; i < xz.length; i++) {
    const a = xz[i], b = xz[(i + 1) % xz.length];
    const ain = a[1] >= zc, bin = b[1] >= zc;
    if (ain) out.push(a);
    if (ain !== bin) { const u = (zc - a[1]) / (b[1] - a[1]); out.push([lerp(a[0], b[0], u), zc]); }
  }
  return poly(out.map(p => pj(p[0], y, p[1])));
}
const wz = (key, t, hz, amp) => wander(key, t, hz) * amp;

/* ── the sun and what it lights ─────────────────────────────────────────────── */
// Occluders between the sun and the foreground: [x0, x1, z, dapple]
const OCC = [
  [-16.6, -3.9, 34, 0],       // minka and its eaves
  [-6.4, -3.1, 26, 0.45],     // Japanese maple canopy
  [-19.3, -15.2, 30, 0.5],    // persimmon
  [-6.62, -6.25, 18, 0],      // stone lantern
  [4.8, 15.2, 34.8, 0],       // farmhouse and porch
  [2.6, 7.1, 27, 0.4],        // sugar maple
  [15.6, 19.8, 30, 0.55],     // birches
];
// strips with dapple gaps, built once
let STRIPS = null;
function buildStrips() {
  STRIPS = [];
  OCC.forEach(([x0, x1, z, dap], k) => {
    if (!dap) { STRIPS.push([x0, x1, z]); return; }
    const r = rngFor('dapple' + k);
    let x = x0;
    while (x < x1) {
      const run = 0.12 + r() * 0.5, gap = r() < dap ? 0.05 + r() * 0.2 : 0;
      STRIPS.push([x, Math.min(x1, x + run), z]);
      x += run + gap;
    }
  });
}
// how much sun reaches a point on the ground at (X, Z): 0 shadow, 1 full sun
function sunAt(X, Z) {
  let lit = 1;
  for (const [x0, x1, z] of STRIPS) {
    if (Z >= z) continue;
    const pen = 0.06 + (z - Z) * 0.012;      // penumbra widens with distance from the occluder
    const inside = Math.min(smooth((X - x0 + pen) / (2 * pen)), smooth((x1 - X + pen) / (2 * pen)));
    lit = Math.min(lit, 1 - inside);
  }
  return lit;
}

/* ── sky ───────────────────────────────────────────────────────────────────── */
function drawSky(t) {
  // one sky across both halves; cooler dawn above the left, warmer dusk above the right
  const top = CY + 4;
  pen.rect(0, 0, W, top, { lin: [0, 0, 0, top], stops: [[0, C(0.0, 0.18, 0, 0.55, 0, 0.32)], [0.4, C(0.02, 0.3, 0.08, 0.34, 0, 0.14)], [0.72, C(0.22, 0.34, 0.26, 0.08)], [1, C(0.6, 0.22, 0.42)]] });
  pen.rect(0, 0, W / 2, top, { lin: [0, 0, W / 2, 0], stops: [[0, C(0, 0.04, 0, 0.12, 0, 0.14), 1], [1, C(), 0]] }, 'add');
  pen.rect(W / 2, 0, W / 2, top, { lin: [W / 2, 0, W, 0], stops: [[0, C(), 0], [1, C(0.08, 0.14, 0.14), 1]] }, 'add');
  // the glow round the sun: lift the blues, add yellow
  const g = 1 + 0.04 * wz('glow', t, 0.2, 1);
  pen.fill(ellipsePath(SUN.x, SUN.y, 900, 420), { rad: [SUN.x, SUN.y, 20, SUN.x, SUN.y, 560 * g], stops: [[0, C(0.2, 0.4, 0.2, 1, 1, 1)], [0.3, C(0.05, 0.25, 0.1, 0.75, 0, 0.75)], [1, C(0, 0, 0, 0, 0, 0)]] }, 'lift');
  pen.fill(ellipsePath(SUN.x, SUN.y, 900, 420), { rad: [SUN.x, SUN.y, 20, SUN.x, SUN.y, 460 * g], stops: [[0, C(0.8, 0, 0.3)], [0.3, C(0.35, 0.02, 0.16)], [1, C(0, 0, 0)]] }, 'add');
  // sun pillar: a column of light standing on the sun (the seam), fading upward
  const pil = 0.55 + 0.45 * smoother(t / 3.2);
  const slices = 36;
  for (let k = 0; k < slices; k++) {
    const y0 = SUN.y * k / slices, y1 = SUN.y * (k + 1) / slices, v = (k + 0.5) / slices;
    const pw = (15 + 7 * v + 3 * wz('pillar', t + v, 0.17, 1)) * (0.85 + 0.3 * v);
    const a = pil * (0.25 + 0.75 * Math.pow(v, 1.3));
    const sl = new Path2D(); sl.rect(SUN.x - pw * 3, y0, pw * 6, y1 - y0 + 0.5);
    const st = [], st2 = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12, g = Math.exp(-(((u - 0.5) * 6) ** 2)) * a;
      st.push([u, C(0, 0.6 * g, 0.3 * g, 0.95 * g, 0, 0.95 * g)]); st2.push([u, C(0.6 * g, 0, 0.1 * g)]);
    }
    pen.fill(sl, { lin: [SUN.x - pw * 3, 0, SUN.x + pw * 3, 0], stops: st }, 'lift');
    pen.fill(sl, { lin: [SUN.x - pw * 3, 0, SUN.x + pw * 3, 0], stops: st2 }, 'add');
  }
  drawClouds(t);
  drawMoon(t); drawGeese(t);
}
function drawSun(t) {    // the sun itself, sitting in the notch between the ranges
  const r = 44;
  pen.fill(ellipsePath(SUN.x, SUN.y, r * 1.5, r * 1.5), { rad: [SUN.x, SUN.y, r, SUN.x, SUN.y, r * 1.5], stops: [[0, C(0.7, 0, 0.15)], [1, C(0.7, 0, 0.15), 0]] }, 'mix');
  pen.fill(ellipsePath(SUN.x, SUN.y, r, r), { rad: [SUN.x - 8, SUN.y - 10, 0, SUN.x, SUN.y, r], stops: [[0, C(0.85, 0, 0.05)], [1, C(0.95, 0.1, 0.42)]] });
}
function drawClouds(t) {
  const r = rngFor('clouds');
  for (let i = 0; i < 16; i++) {
    const side = i < 8 ? -1 : 1;
    const y = 90 + r() * 280, len = 180 + r() * 360;
    const x = side < 0 ? 40 + r() * 760 : 1120 + r() * 760;
    const drift = t * (6 + r() * 5) * side * 0.6;
    const th = 5 + r() * 9;
    const cx = x + drift, pts = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([cx - len / 2 + u * len, y + Math.sin(u * 7 + i) * 2]); }
    const shape = nib(pts, (u) => th * Math.pow(Math.sin(Math.PI * u), 0.7) * (0.8 + 0.2 * Math.sin(u * 9 + i)));
    // underlit: warm near the sun, violet away from it
    const near = 1 - clamp(Math.abs(cx - CX) / 900, 0, 1) * 0.7 - clamp((CY - y) / 500, 0, 0.5);
    const col = cmix(C(0.05, 0.42, 0.22, 0.28, 0, 0.15), C(0.35, 0.45, 0.45, 0.02, 0, 0.02), clamp(near, 0, 1));
    pen.fill(shape, col);
    // a lit lower lip
    const lip = nib(pts.map(([px, py]) => [px, py + th * 0.35]), (u) => th * 0.35 * Math.pow(Math.sin(Math.PI * u), 0.9));
    pen.fill(lip, cmix(col, C(0.7, 0.15, 0.4), 0.6));
  }
}
function drawMoon(t) {   // a pale morning moon over the Japanese side
  const x = 250, y = 150, r = 17;
  const moon = ellipsePath(x, y, r, r);
  const bite = ellipsePath(x + 9, y - 4, r * 0.95, r * 0.95);
  pen.save(); pen.clip(moon);
  const m = new Path2D(); m.rect(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4); m.addPath(bite);
  pen.fill(m, C(0.12, 0.05, 0.05, 0.1, 0, 0.12), 'put', 1, 'evenodd');
  pen.restore();
}
function drawGeese(t) { // a skein crossing the evening sky over the Canadian side
  const n = 11, lead = [1880 - t * 38, 175 + t * 1.8];
  for (let i = 0; i < n; i++) {
    const rank = Math.ceil(i / 2), arm = i % 2 ? 1 : -1;
    const x = lead[0] + rank * 22 + wz('gx' + i, t, 0.4, 2), y = lead[1] + rank * 11 * arm * (arm > 0 ? 1 : 0.8) + wz('gy' + i, t, 0.3, 2);
    if (x < W / 2 + 60) continue;
    const flap = Math.sin(t * 7.5 + i * 1.3) * 3.2;
    const g = poly([[x - 6, y - flap], [x - 1.5, y + 0.8], [x + 2.5, y - 0.2], [x + 6.5, y - flap * 0.9], [x + 2, y + 2], [x - 1.5, y + 2.2]]);
    pen.fill(g, C(0.05, 0.3, 0.15, 0.45, 0, 0.6));
  }
}

/* ── far ranges (at infinity: static) ─────────────────────────────────────── */
let RANGES = null;
function buildRanges() {
  const ridge = (key, x0, x1, fn, step = 6) => {
    const r = rngFor(key), pts = [];
    let n1 = 0, n2 = 0;
    for (let x = x0; x <= x1 + 0.1; x += step) {
      n1 = n1 * 0.85 + (r() - 0.5) * 3; n2 = n2 * 0.6 + (r() - 0.5) * 2;
      pts.push([x, fn(x) + n1 + n2]);
    }
    return pts;
  };
  const close = (pts) => poly(pts.concat([[pts[pts.length - 1][0], CY + 60], [pts[0][0], CY + 60]]));
  const seamL = (x) => clamp((CX - x) / 200, 0, 1), seamR = (x) => clamp((x - CX) / 200, 0, 1);
  // Japan: steep, layered, forested; the ridges fall to the notch where the sun sits
  const jFar = ridge('jfar', -20, 980, x => CY - 330 * Math.pow(seamL(x - 10) * 0.9 + 0.1, 0.8) * (0.72 + 0.28 * Math.sin(x / 150 + 1)) - 10, 5);
  const jMid = ridge('jmid', -20, 980, x => CY - 230 * Math.pow(seamL(x + 40), 0.9) * (0.6 + 0.4 * Math.abs(Math.sin(x / 210 + 2.2))) + 4, 4);
  const jNear = ridge('jnear', -20, 980, x => CY - 120 * Math.pow(seamL(x + 70), 1.1) * (0.55 + 0.45 * Math.abs(Math.sin(x / 130 + 0.4))) + 8, 3);
  // Canada: low rounded Shield hills
  const cFar = ridge('cfar', 940, W + 20, x => CY - 120 * Math.pow(seamR(x - 20), 0.7) * (0.7 + 0.3 * Math.sin(x / 260 + 0.5)) - 6, 6);
  const cMid = ridge('cmid', 940, W + 20, x => CY - 70 * Math.pow(seamR(x + 10), 0.9) * (0.65 + 0.35 * Math.sin(x / 180 + 2)) + 2, 5);
  RANGES = { jFar: close(jFar), jMid: close(jMid), jNear, cFar: close(cFar), cMid, jNearPath: close(jNear) };
  // conifer skylines (cedar on the near Japanese ridge, spruce on the Canadian far shore)
  RANGES.cedars = conifers('ced', jNear, 9, 3.2, 0.5);
  const shore = [];
  for (let x = 940; x <= W + 20; x += 4) shore.push([x, CY - 6 - 18 * seamR(x + 30) * (0.5 + 0.5 * Math.sin(x / 90))]);
  RANGES.shore = shore;
  RANGES.spruces = conifers('spr', shore, 7, 4.6, 0.9);
}
function conifers(key, line, spacing, hk, jitter) {
  const r = rngFor(key), p = new Path2D();
  const at = (x) => { let i = 0; while (i < line.length - 2 && line[i + 1][0] < x) i++; const a = line[i], b = line[i + 1]; return lerp(a[1], b[1], clamp((x - a[0]) / (b[0] - a[0] || 1), 0, 1)); };
  for (let x = line[0][0]; x < line[line.length - 1][0]; x += spacing * (0.6 + r() * 0.8)) {
    const y = at(x), h = (10 + r() * 14) * (hk / 4) * (0.6 + 0.4 * clamp(Math.abs(x - CX) / 300, 0, 1)), w = h * (0.32 + r() * 0.1);
    const tri = [[x - w, y + 2], [x - w * 0.15, y - h * 0.55 - jitter], [x, y - h], [x + w * 0.15, y - h * 0.5], [x + w, y + 2]];
    p.addPath(poly(tri));
  }
  return p;
}
function drawRanges(t) {
  const R = RANGES;
  // Japan
  pen.fill(R.jFar, C(0.24, 0.32, 0.26, 0.2, 0.02, 0.12));
  pen.fill(R.jMid, C(0.18, 0.36, 0.22, 0.32, 0.1, 0.24));
  pen.fill(R.jNearPath, C(0.14, 0.28, 0.18, 0.4, 0.34, 0.4));
  pen.fill(R.cedars, C(0.14, 0.28, 0.18, 0.4, 0.34, 0.4));
  // Canada
  pen.fill(R.cFar, C(0.26, 0.3, 0.28, 0.18, 0.0, 0.1));
  pen.fill(poly(R.cMid.concat([[W + 20, CY + 60], [940, CY + 60]])), C(0.2, 0.3, 0.24, 0.3, 0.14, 0.24));
  pen.fill(poly(R.shore.concat([[W + 20, CY + 60], [940, CY + 60]])), C(0.14, 0.22, 0.16, 0.38, 0.5, 0.46));
  pen.fill(R.spruces, C(0.14, 0.22, 0.16, 0.38, 0.5, 0.46));
  // haze: the ranges dissolve into the glow toward the sun
  const hz = new Path2D(); hz.rect(0, 0, W, CY + 60);
  const land = new Path2D();
  for (const k of ['jFar', 'jMid', 'jNearPath', 'cFar']) land.addPath(R[k]);
  land.addPath(R.cedars); land.addPath(R.spruces);
  land.addPath(poly(R.cMid.concat([[W + 20, CY + 60], [940, CY + 60]])));
  land.addPath(poly(R.shore.concat([[W + 20, CY + 60], [940, CY + 60]])));
  pen.save(); pen.clip(land);
  pen.fill(hz, { lin: [0, 120, 0, CY + 10], stops: [[0, PAL.haze, 0], [1, PAL.haze, 0.4]] }, 'put', 1);
  pen.fill(hz, { rad: [SUN.x, SUN.y + 10, 10, SUN.x, SUN.y + 10, 520], stops: [[0, C(0.75, 0.05, 0.3), 0.9], [0.4, C(0.6, 0.1, 0.35), 0.45], [1, C(0.6, 0.1, 0.35), 0]] }, 'put', 1);
  pen.restore();
}

/* ── ground ─────────────────────────────────────────────────────────────────── */
const ZFAR = 1400;
function drawGround(t) {
  // Japan: terraced paddies, harvested, stepping down toward the valley
  pen.fill(groundPoly([[-400, ZFAR], [0, ZFAR], [0, 1.5], [-400, 1.5]]), PAL.moss);
  const terr = [[52, 64], [64, 78], [78, 96], [96, 125], [125, 170], [170, 240], [240, 340], [340, 1400]];
  for (const [z0, z1] of terr) {
    const k = clamp((z0 - 50) / 350, 0, 1);
    pen.fill(groundPoly([[-400, z1], [0, z1], [0, z0], [-400, z0]]), cmix(PAL.stubble, PAL.haze, 0.2 + k * 0.65));
    // the terrace bank: a darker lip at the near edge
    pen.fill(groundPoly([[-400, z0 + 0.7 + z0 * 0.004], [0, z0 + 0.7 + z0 * 0.004], [0, z0], [-400, z0]], 0.3), cmix(C(0.3, 0.1, 0.35, 0, 0.25, 0.3), PAL.haze, 0.15 + k * 0.65));
  }
  const rows = new Path2D();
  for (let z = 53; z < 125; z += 1.8) for (let x = -40; x < -0.6; x += 0.9 + (z - 50) * 0.05) {
    const a = pj(x, 0, z), b = pj(x + 0.35, 0, z);
    rows.moveTo(a[0], a[1]); rows.lineTo(b[0], b[1]);
  }
  pen.stroke(rows, C(0.45, 0.3, 0.5, 0, 0, 0.3), 1, 'put', 0.7);
  // yard before the minka: moss with patches of packed earth
  pen.fill(groundPoly([[-400, 52], [0, 52], [0, 1], [-400, 1]]), PAL.moss);
  const ye = rngFor('yard'), yard = new Path2D();
  for (let i = 0; i < 80; i++) {
    const x = -1.5 - ye() * 26, z = 3.5 + Math.pow(ye(), 1.3) * 46, s = 0.3 + ye() * 1.2;
    yard.addPath(groundPoly([[x - s, z - s * 0.4], [x + s, z - s * 0.3], [x + s * 0.7, z + s * 0.5], [x - s * 0.8, z + s * 0.4]]));
  }
  pen.fill(yard, cmix(PAL.moss, PAL.earth, 0.5));
  // Canada: lawn and dry meadow down to the lake
  pen.fill(groundPoly([[0, 60], [400, 60], [400, 1], [0, 1]]), PAL.grass);
  const ge = rngFor('lawn'), tufts = new Path2D();
  for (let i = 0; i < 100; i++) {
    const x = 1.5 + ge() * 30, z = 3.5 + Math.pow(ge(), 1.3) * 52, s = 0.25 + ge() * 0.9;
    tufts.addPath(groundPoly([[x - s, z - s * 0.3], [x + s, z - s * 0.4], [x + s * 0.8, z + s * 0.4], [x - s * 0.7, z + s * 0.5]]));
  }
  pen.fill(tufts, cmix(PAL.grass, C(0.3, 0, 0.1, 0, 0.45, 0.3), 0.45));
  drawLake(t);
  // one meadow where the worlds meet: a band either side of the seam, no hard edge
  const band = new Path2D(); band.addPath(groundPoly([[-2.2, 56], [2.2, 56], [2.2, 1], [-2.2, 1]]));
  pen.save(); pen.clip(band);
  const bl = pj(-2.2, 0, 8)[0], br = pj(2.2, 0, 8)[0];
  pen.fill(band, { lin: [bl, 0, br, 0], stops: [[0, PAL.meadow, 0], [0.3, PAL.meadow, 1], [0.7, PAL.meadow, 1], [1, PAL.meadow, 0]] }, 'mix');
  pen.restore();
  // the two footpaths, meeting in a worn clearing on the seam
  drawPath('hana', PAL.earth); drawPath('liam', PAL.gravel);
  const hw = WALKERS.hana, lw = WALKERS.liam;
  const mz = (hw.end[1] + lw.end[1]) / 2 + 0.1;
  pen.fill(groundPoly(ringXZ(0, mz, 1.25, 0.95, 28)), cmix(PAL.earth, PAL.gravel, 0.5));
}
function drawPath(id, col) {
  const w = WALKERS[id], L = w.L;
  const left = [], right = [], r = rngFor('path' + id);
  for (let d = L + 0.6; d >= L - 17; d -= 0.25) {
    const p = w.path(d), fr = frameH(p.h), hw = 0.42 + 0.05 * Math.sin(d * 1.3) + (r() - 0.5) * 0.03;
    left.push([p.x - fr.r[0] * hw, p.z - fr.r[2] * hw]); right.push([p.x + fr.r[0] * hw, p.z + fr.r[2] * hw]);
  }
  pen.fill(groundPoly(left.concat(right.reverse())), col);
  if (id === 'hana') {   // stepping stones set into the path
    for (let d = L - 1.2; d > L - 17; d -= 0.62 + r() * 0.1) {
      const p = w.path(d), fr = frameH(p.h), s = 0.2 + r() * 0.06, o = (r() - 0.5) * 0.12;
      pen.fill(groundPoly(ringXZ(p.x + fr.r[0] * o, p.z + fr.r[2] * o, s * 1.1, s * 0.85, 12)), C(0.3, 0.12, 0.3, 0.1, 0, 0.42));
    }
  } else {               // gravel: a scatter of small stones
    const g = new Path2D();
    for (let i = 0; i < 260; i++) {
      const d = L + 0.5 - Math.pow(r(), 0.8) * 17, p = w.path(d), fr = frameH(p.h), o = (r() - 0.5) * 0.8, s = 0.02 + r() * 0.03;
      const q = pj(p.x + fr.r[0] * o, 0, p.z + fr.r[2] * o), rr = ppm(p.z) * s;
      g.addPath(ellipsePath(q[0], q[1], rr, rr * 0.6));
    }
    pen.fill(g, cmix(col, C(0.1, 0.05, 0.1, 0.2, 0, 0.4), 0.5));
  }
}
function ringXZ(x, z, rx, rz, n) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([x + Math.cos(a) * rx, z + Math.sin(a) * rz]); } return o; }
function drawLake(t) {
  // water from behind the farmhouse out to the far shore; it holds the sky
  const water = groundPoly([[1.2, 1200], [400, 1200], [400, 64], [30, 64], [18, 60], [10, 63], [4.2, 58], [1.6, 61]]);
  pen.fill(water, { lin: [0, CY, 0, pj(0, 0, 58)[1]], stops: [[0, C(0.62, 0.2, 0.4)], [0.35, C(0.3, 0.3, 0.3, 0.12)], [1, C(0.05, 0.25, 0.06, 0.42, 0, 0.2)]] });
  // reflection of the far shore and hills
  pen.save(); pen.clip(water);
  const refl = new Path2D();
  for (const [x, y] of RANGES.shore) { if (x < CX + 8) continue; refl.rect(x, CY, 4, (CY - y) * 0.9 + 2); }
  pen.fill(refl, C(0.14, 0.22, 0.16, 0.34, 0.4, 0.4), 'put', 0.8);
  // ripples: thin light and dark streaks that drift
  const r = rngFor('ripples'), rp = new Path2D(), rd = new Path2D();
  for (let i = 0; i < 140; i++) {
    const z = 66 + Math.pow(r(), 2.2) * 900, x = 1.5 + r() * (z * 0.7);
    const a = pj(x + wz('rp' + i, t, 0.2, 0.3) * z * 0.01, 0, z), len = (4 + r() * 18) * clamp(60 / z, 0.2, 1.5);
    (i % 3 ? rp : rd).rect(a[0] - len / 2, a[1], len, 1.3);
  }
  pen.fill(rp, C(0.2, 0.0, 0.1, 0.0, 0, 0.0), 'lift');
  pen.fill(rd, C(0.0, 0.1, 0.0, 0.3, 0.1, 0.25), 'add');
  pen.restore();
}

/* shadows cast toward the lens, then the glare down the middle */
function drawGroundLight(t) {
  const sh = new Path2D();
  for (const [x0, x1, z] of STRIPS) {
    sh.addPath(groundPoly([[x0, z], [x1, z], [x1, CAM.z + 1.0], [x0, CAM.z + 1.0]], 0.001));
  }
  pen.fill(sh, PAL.shadow, 'add');
  // glare: the low sun on dewy ground and water, a column under the sun
  const gw = 520, gl = new Path2D(); gl.rect(CX - gw, CY, gw * 2, H - CY + 10);
  const st = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16, a = Math.exp(-(((u - 0.5) * 3.6) ** 2)) * 0.6; st.push([u, C(0.15 * a, 0.3 * a, 0.2 * a, 0.8 * a, 0.45 * a, 0.75 * a)]); }
  pen.save(); pen.clip(gl);
  pen.fill(gl, { lin: [CX - gw, 0, CX + gw, 0], stops: st }, 'lift');
  pen.fill(gl, { lin: [0, CY, 0, H], stops: [[0, C(0.5, 0.1, 0.3)], [0.45, C(0.2, 0.08, 0.16), 0.6], [1, C(), 0]] }, 'add', 0.55);
  pen.restore();
  // glitter on the lake near the column
  const r = rngFor('glint'), gp = new Path2D();
  for (let i = 0; i < 80; i++) {
    const z = 66 + Math.pow(r(), 1.6) * 700, x = 1.3 + Math.pow(r(), 1.5) * z * 0.035;
    const life = 0.5 + 0.5 * Math.sin(t * (0.8 + r() * 0.6) + r() * TAU);
    const a = pj(x, 0, z), len = (3 + 7 * life) * clamp(80 / z, 0.4, 1.6);
    if (life > 0.25) gp.rect(a[0] - len / 2, a[1] - 0.6, len, 1.6);
  }
  pen.fill(gp, C(0.3, 0.6, 0.4, 1, 1, 1), 'lift');
}
