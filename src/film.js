/* ── the frame ────────────────────────────────────────────────────────────────
   Timeline (seconds):
   0.0–2.0   the two homes, one sun on the seam; a slow dolly settles the eye
   2.0–4.0   the light comes up: sun pillar, lamps and shoji, smoke, first leaves
   4.0–10.5  she enters from the left edge, he from the right, walking in
   10.5–12.5 they slow and stop, facing each other in the corridor of light
   12.5–15.0 hold: breath, a blink, a small smile                          */

async function bakeScene() {
  prepareWalker(WALKERS.hana); prepareWalker(WALKERS.liam);
  buildStrips(); buildRanges();
}

const SHOTS = [
  { id: 'establish', start: 0, end: 2, readAt: 1.0, action: 'two homes, one sun on the seam', transition: 'continuous' },
  { id: 'light', start: 2, end: 4, readAt: 3.2, action: 'the light comes up; lamps, smoke, leaves', transition: 'continuous' },
  { id: 'approach', start: 4, end: 10.5, readAt: 7.5, action: 'she enters left, he enters right, walking in', transition: 'continuous' },
  { id: 'arrive', start: 10.5, end: 12.5, readAt: 12.0, action: 'they slow and stop facing each other', transition: 'continuous' },
  { id: 'hold', start: 12.5, end: 15, readAt: 14.0, action: 'hold on the two of them', transition: 'end' },
];

function drawScene(t) {
  if (Q.get('debug') === 'heads') return drawHeadsDebug(t);
  drawSky(t);
  drawRanges(t);
  drawSun(t);
  drawGround(t);
  drawGroundDetail(t);
  drawVillage(t);
  drawRacks(t);
  drawDock(t);
  drawSpruces(t);
  drawGroundLight(t);
  // far to near: the homes, then what stands in front of them
  drawMinka(t); drawFarmhouse(t);
  drawBirches(t); drawKaki(t);
  drawSugarMaple(t); drawMomiji(t);
  drawFence(t); drawLantern(t); drawCanoe(t);
  drawLeaves(t, 'mid');
  // the walkers and their shadows
  const hw = WALKERS.hana, lw = WALKERS.liam;
  const hp = pose(hw, t, lw), lp = pose(lw, t, hw);
  const hs = sunAt(hp.pel[0], hp.pel[2]), ls = sunAt(lp.pel[0], lp.pel[2]);
  if (hs > 0.01) drawFigureShadow(hw, 'hana', hp, PAL.shadow, hs);
  if (ls > 0.01) drawFigureShadow(lw, 'liam', lp, PAL.shadow, ls);
  const order = hp.pel[2] > lp.pel[2] ? [[hw, 'hana', hp, hs], [lw, 'liam', lp, ls]] : [[lw, 'liam', lp, ls], [hw, 'hana', hp, hs]];
  for (const [w, id, ps, s] of order) drawFigureBlurred(w, id, t, s, id === 'hana' ? lw : hw);
  drawLeaves(t, 'near');
  drawForeground(t);
}

/* The walkers carry motion blur: three shutter samples (a 180° shutter at 30 fps)
   are drawn into a transparent layer each and averaged, so a swinging foot
   smears across its 1/60 s instead of strobing. Where a part is still, the
   three samples coincide and it prints sharp.                              */
const FIGL = penPair(PW, PH), FIGA = penPair(PW, PH);
function drawFigureBlurred(w, id, t, sunK, other) {
  const n = 3, shutter = 1 / 60;
  const acc = FIGA.pen;
  acc.clear();
  const saved = pen.g;
  for (let i = 0; i < n; i++) {
    const ts = t + (i / (n - 1) - 0.5) * shutter;
    const ps = pose(w, ts, other);
    FIGL.pen.clear();
    pen.g = FIGL.pen.g;
    pen.setTransform(1, 0, 0, 1, PAD, PAD);
    drawFigure(w, id, ps, sunK);
    pen.g = saved;
    acc.each((g, k) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 / n; g.drawImage(FIGL.canv[k], 0, 0); g.restore(); });
  }
  pen.each((g, k) => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.drawImage(FIGA.canv[k], 0, 0); g.restore(); });
}

/* falling leaves: momiji on the left, sugar maple on the right */
const LEAVES = (() => {
  const r = rngFor('leaves'), out = [];
  for (let i = 0; i < 18; i++) {
    const left = i % 2 === 0;
    const src = left ? [-4.75, 2.7, 26, 1.7] : [4.85, 4.9, 27, 2.3];
    out.push({ left, x: src[0] + (r() - 0.5) * src[3] * 1.6, y: src[1] + (r() - 0.3) * 1.2, z: src[2] + (r() - 0.5) * 2.5,
      period: 7 + r() * 5, off: r(), spin: 1.5 + r() * 2.5, drift: (left ? 0.18 : -0.18) * (0.3 + r()), size: left ? 0.05 : 0.075, ph: r() * TAU, layer: 'mid' });
  }
  // two leaves that cross the seam during the hold, one from each tree
  out.push({ left: true, x: -1.7, y: 3.0, z: 12.5, t0: 11.2, dur: 6.5, spin: 2.2, drift: 0.34, size: 0.05, ph: 1, layer: 'mid', once: true });
  out.push({ left: false, x: 1.9, y: 3.4, z: 13.5, t0: 11.9, dur: 6.5, spin: 1.8, drift: -0.3, size: 0.075, ph: 2, layer: 'mid', once: true });
  return out;
})();
function leafShape(cx, cy, s, rot, flat, left) {
  const pts = [];
  const lobes = left ? 7 : 5;
  for (let i = 0; i < lobes * 2; i++) {
    const a = rot + i / (lobes * 2) * TAU, rr = i % 2 === 0 ? s : s * (left ? 0.42 : 0.55);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * flat]);
  }
  return poly(pts);
}
function drawLeaves(t, layer) {
  const pm = new Path2D(), ps = new Path2D();
  for (const L of LEAVES) {
    if (L.layer !== layer) continue;
    let age, dur;
    if (L.once) { age = t - L.t0; dur = L.dur; if (age < 0 || age > dur) continue; }
    else { dur = L.period; age = fract(t / dur + L.off) * dur; }
    const fallT = Math.min(age, L.y / 0.55);
    const y = Math.max(0.01, L.y - 0.55 * age);
    const x = L.x + L.drift * fallT + 0.18 * Math.sin(fallT * 1.7 + L.ph);
    const z = L.z - 0.05 * fallT;
    const s = ppm(z) * L.size * smooth(age / 0.4) * (1 - smooth((age - dur + 0.5) / 0.5));
    if (s < 0.3) continue;
    const p = pj(x, y, z);
    const flat = y <= 0.02 ? 0.35 : 0.35 + 0.65 * Math.abs(Math.sin(fallT * L.spin + L.ph));
    (L.left ? pm : ps).addPath(leafShape(p[0], p[1], s, fallT * L.spin * 0.6 + L.ph, flat, L.left));
  }
  pen.fill(pm, PAL.momiji); pen.fill(ps, PAL.sugar);
}

/* ground detail: moss clumps and grass blades, fallen leaves near the maples */
function drawGroundDetail(t) {
  const r = rngFor('gdetail');
  const mossB = new Path2D(), grassB = new Path2D(), lvL = new Path2D(), lvR = new Path2D();
  for (let i = 0; i < 2600; i++) {
    const left = i % 2 === 0, Z = 3.4 + Math.pow(r(), 2.2) * 32, X = (left ? -1 : 1) * (0.2 + r() * Z * 0.72);
    if (Math.abs(X) < 0.3 || Z - CAM.z < 2.6) continue;
    const s = ppm(Z), h = (left ? 0.07 : 0.14) * (0.5 + r()), b = pj(X, 0, Z);
    const lean = (r() - 0.5) * 0.06 + wz('gd' + (i % 11), t, 0.4, 0.015);
    const tp = pj(X + lean, h, Z), wdt = Math.max(0.8, s * (left ? 0.02 : 0.014));
    (left ? mossB : grassB).addPath(nib([b, tp], (u) => wdt * (1 - u)));
  }
  pen.fill(mossB, C(0.3, 0.05, 0.12, 0.1, 0.6, 0.42));
  pen.fill(grassB, C(0.7, 0.1, 0.45, 0, 0.05, 0.22));
  // fallen leaves under each maple and drifted onto the paths
  for (let i = 0; i < 220; i++) {
    const left = i % 2 === 0, cx = left ? -4.75 : 4.85, cz = left ? 26 : 27;
    const a = r() * TAU, rr = Math.pow(r(), 0.6) * (left ? 3.2 : 3.8);
    let X = cx + Math.cos(a) * rr * 1.3, Z = cz + Math.sin(a) * rr - (r() < 0.35 ? r() * 16 : 0);
    if (left ? X > -0.2 : X < 0.2) continue;
    const q = pj(X, 0, Z), s = ppm(Z) * (left ? 0.045 : 0.07);
    (left ? lvL : lvR).addPath(leafShape(q[0], q[1], s, r() * TAU, 0.4, left));
  }
  // where they meet, a few leaves from each tree lie together on the clearing
  const mz = (WALKERS.hana.end[1] + WALKERS.liam.end[1]) / 2;
  for (let i = 0; i < 16; i++) {
    const left = i % 2 === 0, X = (r() - 0.5) * 2.4 + (left ? 0.25 : -0.25), Z = mz + (r() - 0.5) * 1.8;
    const q = pj(X, 0, Z), s = ppm(Z) * (left ? 0.045 : 0.068);
    (left ? lvL : lvR).addPath(leafShape(q[0], q[1], s, r() * TAU, 0.38, left));
  }
  pen.fill(lvL, PAL.momiji); pen.fill(lvR, PAL.sugar);
}

/* foreground: tall dry grass at the bottom corners, in the homes' shadows */
function drawForeground(t) {
  const r = rngFor('fg');
  for (const side of [-1, 1]) {
    const blades = new Path2D(), light = new Path2D();
    for (let i = 0; i < 90; i++) {
      const Z = CAM.z + 4.2 + r() * 1.6, X = side * (0.62 + Math.pow(r(), 0.6) * 0.5) * Z * 0.64, h = 0.3 + r() * 0.5;
      const base = pj(X, 0, Z), top = pj(X + side * (0.05 + r() * 0.1) + wz('fg' + side + (i % 9), t, 0.5, 0.03), h, Z);
      const bw = 2 + r() * 3.5, mid = [lerp(base[0], top[0], 0.5) + side * 3, lerp(base[1], top[1], 0.5)];
      const blade = nib(curve([base, mid, top], false, 5), (u) => bw * (1 - u));
      (r() < 0.25 ? light : blades).addPath(blade);
    }
    pen.fill(blades, cmix(PAL.grass, C(0.1, 0.25, 0.2, 0.4, 0.2, 0.5), 0.6));
    pen.fill(light, cmix(PAL.grass, C(0.5, 0.1, 0.3), 0.3));
  }
}
