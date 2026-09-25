/* ── figures: drawing ────────────────────────────────────────────────────────
   Parts are built from projected 3D points into screen-space silhouettes
   (convex hulls of projected rings and circles), painted far to near. The
   sun sits behind the pair on the seam, so every surface the lens sees is in
   skylight; the sun only rims the edges that face it. Rim light is the part
   of a silhouette left uncovered when the shadow fill is shifted away from
   the sun: a crescent on the lit edge, as a printer would cut it.          */

const SUN = { x: CX, y: CY - 30, elev: 1.6 * DEG };

function hull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop();
  return lo.concat(up);
}
const P2 = (p) => { const s = proj(p[0], p[1], p[2]); return [s[0], s[1], F / s[2]]; };
function circlePts(c, r, n = 14) { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); } return o; }
// screen-space capsule through world joints with world radii
function capsulePts(pts3, radii, n = 12) {
  const o = [];
  pts3.forEach((p, i) => { const s = P2(p); o.push(...circlePts(s, radii[i] * s[2], n)); });
  return o;
}
function capsule(pts3, radii) { return poly(hull(capsulePts(pts3, radii))); }
// ring of an ellipse in a frame: centre, frame, half-depth (f), half-width (r)
function ringPts(o, fr, df, wr, n = 20, a0 = 0) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = a0 + i / n * TAU; out.push(L2W(fr, o, Math.cos(a) * df, 0, Math.sin(a) * wr)); }
  return out;
}
function ellipsoidPts(c, fr, ra, rb, rc, n = 10) {
  const o = [];
  for (let i = 1; i < n; i++) {
    const th = i / n * Math.PI, y = Math.cos(th), rr = Math.sin(th);
    for (let j = 0; j < n * 2; j++) { const ph = j / (n * 2) * TAU; o.push(L2W(fr, c, Math.cos(ph) * rr * ra, y * rb, Math.sin(ph) * rr * rc)); }
  }
  o.push(L2W(fr, c, 0, rb, 0), L2W(fr, c, 0, -rb, 0));
  return o;
}
const hull3 = (pts3) => poly(hull(pts3.map(P2)));

/* Parts are filled flat in their skylit tone and their outlines collected;
   rimPass() then lights the whole figure's sun-facing edge at once, since an
   edge inside the silhouette is shadowed by the body behind it.          */
let SIL = null;
function litFill(path, shade, lit, cx, cy, rimPx, extra) {
  pen.fill(path, shade);
  if (SIL) SIL.addPath(path);
  if (extra) { pen.save(); pen.clip(path); extra(); pen.restore(); }
}
const RIMM = cv(PW, PH).getContext('2d'), RIMC = cv(PW, PH).getContext('2d');
function rimPass(sil, cx, cy, rimPx, strength = 1, lift = C(0.3, 0.45, 0.35, 0.62, 0.62, 0.62), add = C(0.34, 0.03, 0.2)) {
  let dx = SUN.x - cx, dy = SUN.y - cy; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
  // crescent mask: the silhouette minus itself shifted away from the sun
  const m = RIMM;
  m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
  m.clearRect(0, 0, PW, PH);
  m.setTransform(1, 0, 0, 1, PAD, PAD); m.fillStyle = '#fff'; m.fill(sil);
  m.globalCompositeOperation = 'destination-out';
  m.setTransform(1, 0, 0, 1, PAD - dx * rimPx, PAD - dy * rimPx * 0.7); m.fill(sil);
  m.globalCompositeOperation = 'source-over';
  const c = RIMC;
  const layer = (col, which) => {
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, PW, PH); c.drawImage(m.canvas, 0, 0);
    c.globalCompositeOperation = 'source-in'; c.fillStyle = which ? rgbB(col) : rgbA(col); c.fillRect(0, 0, PW, PH);
    c.globalCompositeOperation = 'source-over';
  };
  const inv = C(1 - lift.y * strength, 1 - lift.p * strength, 1 - lift.o * strength, 1 - lift.b * strength, 1 - lift.g * strength, 1 - lift.i * strength);
  pen.g.forEach((g, which) => {
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    layer(inv, which); g.globalCompositeOperation = 'multiply'; g.drawImage(c.canvas, 0, 0);
    layer(cscale(add, strength), which); g.globalCompositeOperation = 'screen'; g.drawImage(c.canvas, 0, 0);
    g.restore();
  });
}
// linear coverage ramp across a part (darker toward `toward`), clipped to the part
function rampOver(path, x0, y0, x1, y1, col, a0, a1) {
  pen.save(); pen.clip(path);
  pen.fill(path, { lin: [x0, y0, x1, y1], stops: [[0, col, a0], [1, col, a1]] }, 'add');
  pen.restore();
}

/* ── looks ────────────────────────────────────────────────────────────────── */
const LOOK = {
  hana: {
    skin: C(0.1, 0.12, 0.2), skinLit: C(0.18, 0.06, 0.22),
    cheek: C(0, 0.17, 0.04),
    hair: C(0, 0.5, 0.45, 0.35, 0, 0.92), hairLit: C(0.45, 0.42, 0.62, 0.05, 0, 0.45),
    top: C(0.14, 0.05, 0.14, 0, 0, 0.14), topLit: C(0.24, 0.04, 0.14),
    inner: C(0.03, 0, 0, 0, 0, 0.05),
    skirt: C(0, 0.1, 0, 0.62, 0, 0.78), skirtLit: C(0.12, 0.3, 0.12, 0.55, 0, 0.45),
    shoe: C(0.04, 0, 0, 0, 0, 0.12), shoeLit: C(0.06, 0.0, 0.04), sole: C(0.1, 0.2, 0.25, 0.1, 0, 0.3),
    leg: C(0.1, 0.12, 0.2, 0, 0, 0.06), legLit: C(0.18, 0.06, 0.22),
    brow: C(0.1, 0.6, 0.5, 0.4, 0, 1), iris: C(0.1, 0.6, 0.6, 0.5, 0, 1), lip: C(0.05, 0.6, 0.3, 0, 0, 0.12),
  },
  liam: {
    skin: C(0.1, 0.14, 0.2), skinLit: C(0.18, 0.08, 0.22),
    cheek: C(0, 0.14, 0.05),
    hair: C(0.6, 0.04, 0.24, 0, 0, 0.12), hairLit: C(0.78, 0.0, 0.14),
    top: C(0.12, 0, 0, 0.16, 0.72, 0.48), topLit: C(0.42, 0.0, 0.12, 0.0, 0.7, 0.16),
    inner: C(0.14, 0, 0.1, 0, 0, 0.08),
    pants: C(0, 0.05, 0, 0.72, 0, 0.52), pantsLit: C(0.08, 0.12, 0.06, 0.66, 0, 0.26),
    shoe: C(0.28, 0.32, 0.62, 0.0, 0, 0.48), shoeLit: C(0.5, 0.22, 0.72, 0, 0, 0.16), sole: C(0.1, 0.2, 0.25, 0.2, 0, 0.6),
    brow: C(0.7, 0.3, 0.8, 0.05, 0, 0.5), iris: C(0.0, 0.0, 0.0, 1.0, 0.2, 0.5), lip: C(0.04, 0.5, 0.3, 0, 0, 0.1),
  },
};

/* ── head ─────────────────────────────────────────────────────────────────── */
// face profile in head units (fwd, up), midline; scaled by dims.headScale
const PROFILE = {
  hana: [[0.066, 0.083], [0.082, 0.052], [0.088, 0.022], [0.089, 0.009], [0.085, -0.002], [0.093, -0.022], [0.103, -0.040],
    [0.101, -0.047], [0.090, -0.051], [0.093, -0.061], [0.092, -0.066], [0.087, -0.069], [0.091, -0.076], [0.086, -0.084],
    [0.084, -0.090], [0.086, -0.100], [0.074, -0.112], [0.045, -0.113], [0.015, -0.098]],
  liam: [[0.068, 0.085], [0.085, 0.055], [0.091, 0.024], [0.094, 0.011], [0.087, -0.001], [0.096, -0.022], [0.108, -0.042],
    [0.106, -0.050], [0.093, -0.054], [0.096, -0.064], [0.094, -0.069], [0.089, -0.072], [0.093, -0.079], [0.088, -0.088],
    [0.087, -0.095], [0.091, -0.106], [0.080, -0.119], [0.048, -0.118], [0.015, -0.103]],
};
function headModel(w, ps) {
  const s = w.dims.headScale, fr = ps.headFr, c = ps.headC;
  const H = (a, b, cc) => L2W(fr, c, a * s, b * s, cc * s);
  // which side of the head faces the lens
  const toCam = vsub([CAM.x, CAM.y, CAM.z], c);
  const near = vdot(fr.r, toCam) > 0 ? 1 : -1;
  const facing = vdot(fr.f, vnorm(toCam));          // 1 frontal, 0 profile
  return { H, s, fr, c, near, facing };
}

function drawHead(w, ps, lk, id) {
  const M = headModel(w, ps), H = M.H, near = M.near, S = P2(ps.headC)[2];
  const hc = P2(ps.headC);
  const rim = Math.max(1.6, 0.011 * S);
  const isH = id === 'hana';
  // neck
  const neckTop = H(-0.012, -0.075, 0), neckBase = ps.neck;
  const neckR = isH ? 0.047 : 0.057;
  const neck = capsule([neckBase, neckTop], [neckR, neckR * 0.93]);
  litFill(neck, cover(lk.skin, C(0, 0.07, 0.1, 0.03, 0, 0.07)), lk.skinLit, hc[0], hc[1], rim);
  // back hair mass (behind neck and head)
  if (isH) {
    const lag = w.lag(ps.t) * 0.8, pts = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, b = lerp(0.0, -0.18, u);
      const half = lerp(0.092, 0.078, u * u), back = lerp(-0.07, -0.058, u);
      for (const k of [-1, -0.6, 0, 0.6, 1]) {
        const cc = k * half;
        pts.push(H(back + (1 - Math.abs(k)) * -0.025 + u * u * lag * 1.2 + Math.abs(k) * lerp(0.05, 0.0, u), b - (1 - Math.abs(k)) * 0.012 * u, cc));
      }
    }
    const back = hull3(pts.concat(ellipsoidPts(H(-0.015, 0.03, 0), M.fr, 0.104 * M.s, 0.111 * M.s, 0.087 * M.s, 8)));
    litFill(back, lk.hair, lk.hairLit, hc[0], hc[1], rim * 1.3);
  }
  // skull, then the hair cap over it, then the face in front of the hairline
  const skull = ellipsoidPts(H(-0.012, 0.028, 0), M.fr, 0.097 * M.s, 0.104 * M.s, 0.077 * M.s, 10);
  const jaw = ellipsoidPts(H(0.026, -0.047, 0), M.fr, 0.068 * M.s, 0.068 * M.s, (isH ? 0.058 : 0.064) * M.s, 9);
  const headHull = hull3(skull.concat(jaw));
  const prof = PROFILE[id].map(([a, b]) => H(a, b, 0));
  const fan = poly([P2(H(0.0, -0.02, 0))].concat(prof.map(P2)).concat([P2(H(-0.02, -0.09, 0))]));
  litFill(headHull, lk.skin, lk.skinLit, hc[0], hc[1], rim);
  // hairline in head units: hair where a < lim(b) (forehead, temples, behind the ear)
  const hairLim = (b, cc) => {
    let lim;
    if (isH) lim = b > 0.05 ? 0.062 : b > -0.01 ? lerp(0.006, 0.062, (b + 0.01) / 0.06) : -0.028;
    else lim = b > 0.056 ? 0.07 : b > 0.004 ? lerp(0.02, 0.07, (b - 0.004) / 0.052) : b > -0.035 ? 0.006 : -0.05;
    return lim - Math.abs(cc) * 0.1;
  };
  const local = (p) => { const q = vsub(p, M.c); return [vdot(q, M.fr.f) / M.s, vdot(q, M.fr.u) / M.s, vdot(q, M.fr.r) / M.s]; };
  const cap = ellipsoidPts(H(isH ? -0.014 : -0.01, isH ? 0.032 : 0.04, isH ? 0 : -0.004), M.fr, (isH ? 0.105 : 0.1) * M.s, (isH ? 0.112 : 0.106) * M.s, (isH ? 0.087 : 0.081) * M.s, 11);
  const capPts = [];
  for (const p of cap) { const [a, b, cc] = local(p); if (a < hairLim(b, cc) + 0.012) capPts.push(p); }
  if (isH) {
    const lag = w.lag(ps.t) * 0.8;
    for (let i = 0; i <= 6; i++) { const u = i / 6; capPts.push(H(lerp(-0.028, -0.05, u) + u * u * lag, lerp(0.0, -0.18, u), near * lerp(0.091, 0.08, u * u))); }
  } else {
    capPts.push(H(0.07, 0.112, 0.02), H(0.086, 0.088, 0.035), H(0.084, 0.084, -0.01), H(0.05, 0.128, 0.0), H(0.0, 0.14, -0.02));
  }
  const hairCap = hull3(capPts);
  litFill(hairCap, lk.hair, lk.hairLit, hc[0], hc[1], rim * 1.4);
  {
    pen.save(); pen.clip(hairCap);
    const rs = rngFor(id + 'strands');
    for (let i = 0; i < 6; i++) {
      const c0 = (rs() - 0.5) * 0.1, a0 = 0.04 - rs() * 0.1;
      const line = [H(a0 + 0.02, 0.11, c0 * 0.5), H(a0 - 0.01, 0.06, c0 + 0.03 * near), H(a0 - 0.03, isH ? -0.08 : 0.0, c0 * 0.8 + 0.07 * near)].map(P2);
      pen.stroke(poly(curve(line.map(q => [q[0], q[1]]), false, 6), false), cover(lk.hair, C(0, 0.15, 0.1, 0.15, 0, 0.35)), Math.max(0.8, 0.0035 * S), 'put', 0.6);
    }
    pen.restore();
  }
  // the face: skin surface in front of the hairline, plus the midline profile
  const facePts = [];
  for (const p of skull.concat(jaw)) { const [a, b, cc] = local(p); if (a > hairLim(b, cc) + 0.004 && b < (isH ? 0.075 : 0.08)) facePts.push(p); }
  const face = new Path2D(); face.addPath(hull3(facePts.concat(prof))); face.addPath(fan);
  litFill(face, lk.skin, lk.skinLit, hc[0], hc[1], rim);
  // a cool turn toward the jaw and under the chin
  pen.save(); pen.clip(face);
  const jawBack = P2(H(-0.03, -0.07, 0)), brow = P2(H(0.06, 0.05, 0));
  pen.fill(face, { lin: [brow[0], brow[1], jawBack[0], jawBack[1]], stops: [[0, C(), 0], [0.55, C(), 0], [1, C(0, 0.06, 0.08, 0.05, 0, 0.05), 1]] }, 'add');
  const ck = P2(H(0.058, -0.035, 0.045 * near));
  pen.fill(ellipsePath(ck[0], ck[1], 0.026 * S * M.s, 0.018 * S * M.s), { rad: [ck[0], ck[1], 0, ck[0], ck[1], 0.026 * S * M.s], stops: [[0, lk.cheek, 1], [1, lk.cheek, 0]] }, 'add');
  pen.restore();
  // fringe and strands on top
  if (isH) {
    const fr0 = [H(0.052, 0.098, 0.0), H(0.08, 0.066, -0.01 * near), H(0.092, 0.042, 0.0), H(0.088, 0.03, 0.022 * near),
      H(0.074, 0.03, 0.045 * near), H(0.05, 0.05, 0.07 * near), H(0.02, 0.09, 0.05 * near)];
    const fringe = hull3(fr0);
    litFill(fringe, lk.hair, lk.hairLit, hc[0], hc[1], rim * 1.2);
  }
  // ear on the near side
  if (Math.abs(M.facing) < 0.93) {
    const ec = [-0.004, -0.012, 0.076 * near], ep = [];
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU;
      ep.push(P2(H(ec[0] + Math.cos(a) * 0.015 - 0.004 * Math.max(0, Math.sin(a)), ec[1] + Math.sin(a) * (a > Math.PI ? 0.026 : 0.03), ec[2] + 0.004 * near)));
    }
    const ear = poly(curve(ep.map(q => [q[0], q[1]]), true, 3));
    pen.fill(ear, lk.skin);
    pen.fill(ear, C(0, 0.18, 0.12, 0.05, 0, 0.12), 'add', 0.6);
    const e1 = P2(H(ec[0] + 0.002, ec[1] + 0.012, ec[2])), e2 = P2(H(ec[0] + 0.006, ec[1] - 0.012, ec[2]));
    pen.stroke(poly([[e1[0], e1[1]], [e2[0], e2[1]]], false), C(0.05, 0.3, 0.25, 0.1, 0, 0.3), Math.max(0.8, 0.004 * S));
  }
  // features on the near side of the face
  drawFace(w, ps, lk, id, M, S);
  const fineP = new Path2D(); fineP.addPath(face); fineP.addPath(hairCap); fineP.addPath(headHull); fineMark(fineP);
}

function drawFace(w, ps, lk, id, M, S) {
  const H = M.H, near = M.near, isH = id === 'hana';
  const t = ps.t;
  const px = (a, b, c) => { const q = P2(H(a, b, c)); return [q[0], q[1]]; };
  const lw = (k) => Math.max(1.2, k * S * M.s * 1.25);
  // brow
  const browC = isH ? lk.brow : lk.brow;
  pen.stroke(poly(curve([px(0.088, 0.017, 0.012 * near), px(0.084, 0.023, 0.03 * near), px(0.07, 0.024, 0.05 * near)], false, 5), false), browC, lw(isH ? 0.0062 : 0.0075));
  // eye: almond between inner and outer corners, set into the socket
  const blink = blinkAt(id, t);
  const ic = [0.08, 0.004, 0.018 * near], oc = [0.064, 0.006, 0.05 * near];
  const mid = (u, up) => [lerp(ic[0], oc[0], u) + 0.004 * Math.sin(Math.PI * u), lerp(ic[1], oc[1], u) + up * Math.sin(Math.PI * u), lerp(ic[2], oc[2], u)];
  const openUp = 0.0085 * (1 - blink), openDn = -0.0052 * (1 - blink);
  const upper = [], lower = [];
  for (let i = 0; i <= 6; i++) { const u = i / 6; upper.push(px(...mid(u, openUp))); lower.push(px(...mid(u, openDn))); }
  const eyeP = poly(upper.concat(lower.slice().reverse()));
  if (blink < 0.9) {
    pen.fill(eyeP, C(0.02, 0.03, 0.02, 0.05, 0, 0.06));        // white of the eye, a little shaded
    // iris: shifted toward where the eyes look
    const look = clamp(Math.atan2(Math.sin(ps.lookYaw - Math.atan2(M.fr.f[2], M.fr.f[0])), 1) * 0.5, -0.3, 0.3);
    const irisC = px(lerp(ic[0], oc[0], 0.28 - look * near * 0.3) + 0.004, ic[1] + 0.001, lerp(ic[2], oc[2], 0.28 - look * near * 0.3));
    const irR = Math.max(1.6, 0.0082 * S * M.s);
    pen.save(); pen.clip(eyeP);
    pen.fill(ellipsePath(irisC[0], irisC[1], irR * 0.75, irR), lk.iris);
    pen.fill(ellipsePath(irisC[0], irisC[1], irR * 0.35, irR * 0.45), C(0.1, 0.3, 0.3, 0.4, 0, 1.0));
    pen.restore();
  }
  // upper lid and lash line
  pen.stroke(poly(upper, false), isH ? C(0.1, 0.6, 0.5, 0.4, 0, 1) : C(0.2, 0.5, 0.6, 0.3, 0, 1), lw(isH ? 0.0062 : 0.0052));
  // nostril
  const n0 = px(0.093, -0.046, 0.011 * near);
  pen.fill(ellipsePath(n0[0], n0[1], lw(0.0042), lw(0.0028)), C(0.05, 0.4, 0.35, 0.1, 0, 0.4));
  // mouth: a line from the lips' parting to the corner; the corner lifts with a smile
  const smile = smileAt(id, t);
  const m0 = px(0.093, -0.066, 0.0), m1 = px(0.088, -0.0665, 0.012 * near), m2 = px(0.079, -0.066 + 0.004 * smile, 0.022 * near);
  pen.stroke(poly(curve([m0, m1, m2], false, 4), false), C(0.05, 0.7, 0.45, 0.1, 0, 0.6), lw(0.0045));
  // lips: a little colour on the lip line
  const l0 = px(0.095, -0.062, 0.004 * near), l1 = px(0.093, -0.074, 0.004 * near);
  pen.fill(ellipsePath((l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2, lw(0.006), lw(0.008)), lk.lip, 'add', 0.8);
}

/* blinks: ~0.12 s, every few seconds, offset per person */
const BLINKS = { hana: [3.1, 6.4, 9.2, 12.9, 14.3], liam: [2.4, 5.8, 8.7, 11.4, 13.7] };
function blinkAt(id, t) {
  let b = 0;
  for (const t0 of BLINKS[id]) { const u = (t - t0) / 0.14; if (u > 0 && u < 1) b = Math.max(b, Math.sin(Math.PI * u) ** 0.7); }
  return b;
}
function smileAt(id, t) { return smoother((t - (id === 'hana' ? 12.95 : 13.25)) / 0.9); }

/* ── torso, arms, legs ────────────────────────────────────────────────────── */
function torsoRings(w, ps, id) {
  const pf = frameH(ps.pp.h + (vdot(ps.pelFr.f, [0, 0, 1]) * 0)), pel = ps.pel, D = w.dims;
  const pelFr = ps.pelFr, chFr = ps.chestFr;
  const at = (fr, o, y, df, wr, cf = 0, n = 18) => ringPts(L2W(fr, o, cf, y, 0), fr, df, wr, n);
  const br = 1 + 0.012 * ps.breath;
  if (id === 'hana') {
    const lag = w.lag(ps.t);
    return [
      at(pelFr, pel, 0.765 - D.hipH, 0.124, 0.17, -0.004 + lag * 0.4),
      at(pelFr, pel, 0.86 - D.hipH, 0.112, 0.168),
      at(chFr, pel, 1.03 - D.hipH, 0.096 * br, 0.136),
      at(chFr, pel, 1.2 - D.hipH, 0.114 * br, 0.142, 0.016),
      at(chFr, pel, 1.31 - D.hipH, 0.095 * br, 0.158, 0.004),
      at(chFr, pel, 1.37 - D.hipH, 0.068, 0.152, -0.012),
      at(chFr, pel, 1.43 - D.hipH, 0.048, 0.056, -0.006),
    ];
  }
  const lag = w.lag(ps.t);
  return [
    at(pelFr, pel, 0.79 - D.hipH, 0.13, 0.19, lag * 0.3),
    at(pelFr, pel, 0.88 - D.hipH, 0.118, 0.178),
    at(chFr, pel, 1.05 - D.hipH, 0.112 * br, 0.168),
    at(chFr, pel, 1.22 - D.hipH, 0.126 * br, 0.184, 0.014),
    at(chFr, pel, 1.33 - D.hipH, 0.108 * br, 0.19, 0.004),
    at(chFr, pel, 1.385 - D.hipH, 0.078, 0.182, -0.012),
    at(chFr, pel, 1.45 - D.hipH, 0.062, 0.068, -0.004),
  ];
}

function drawArm(w, ps, side, lk, id, S) {
  const A = ps.arms[side], isH = id === 'hana';
  const sleeveR = isH ? [0.056, 0.048, 0.046] : [0.06, 0.052, 0.047];
  const c = P2(A.elbow);
  const rim = Math.max(1.4, 0.012 * S);
  // hand first (the cuff overlaps it)
  const hd = A.handDir, fr = ps.chestFr;
  const k1 = vmad(A.wrist, hd, 0.035), k2 = vmad(A.wrist, hd, 0.078);
  const thumb = vmad(vmad(A.wrist, hd, 0.03), fr.f, 0.025);
  const hs = 1 - (A.handIn || 0);
  if (hs > 0.05) {
    const hand = capsule([vmad(A.wrist, hd, 0.005), vmad(A.wrist, hd, 0.035 * hs), vmad(A.wrist, hd, 0.078 * hs), vmad(vmad(A.wrist, hd, 0.03 * hs), fr.f, 0.025 * hs)], [0.026, 0.03 * (0.5 + hs / 2), 0.022 * hs, 0.014 * hs]);
    litFill(hand, lk.skin, lk.skinLit, c[0], c[1], rim * 0.8);
  }
  const cuff = vmad(A.wrist, hd, isH ? 0.012 : -0.005);
  const sleeve = capsule([A.sh, A.elbow, cuff], sleeveR);
  litFill(sleeve, lk.top, lk.topLit, c[0], c[1], rim);
  // a keyline where the sleeve crosses the body, so arm and torso read as two forms
  pen.save(); pen.clip(sleeve);
  pen.stroke(sleeve, cover(lk.top, C(0, 0.12, 0.08, 0.18, 0.05, 0.3)), Math.max(1.6, 0.012 * S), 'put', 0.9);
  pen.restore();
  // a crease at the elbow and the cuff edge
  const e0 = P2(A.elbow), cf = P2(cuff);
  pen.save(); pen.clip(sleeve);
  const dark = cover(lk.top, C(0, 0.1, 0.05, 0.12, 0, 0.18));
  pen.fill(ellipsePath(e0[0], e0[1], sleeveR[1] * S * 0.55, sleeveR[1] * S * 0.25), dark, 'put', 0.5);
  pen.fill(ellipsePath(cf[0], cf[1], sleeveR[2] * S * 1.05, sleeveR[2] * S * 1.05), dark, 'put', 0.35);
  pen.restore();
}

function footOutline(w, fs) {
  // shoe outline in its local side plane: rear part pitched, toe part bent back to the ground
  const G = footGeom(w), fr = frameH(fs.yaw);
  const c = Math.cos(fs.pitch), s = Math.sin(fs.pitch);
  const toWorld = (x, y, z) => {  // local to ankle: x forward, y up (relative to ankle), z right
    const X = x * c - y * s, Y = x * s + y * c;
    return [fs.ankle[0] + fr.f[0] * X + fr.r[0] * z, fs.ankle[1] + Y, fs.ankle[2] + fr.f[2] * X + fr.r[2] * z];
  };
  const ah = G.ah, ball = G.ball, toe = G.toe, heel = G.heel;
  // the toe box rotates about the ball joint by the bend
  const tb = fs.toeBend, cb = Math.cos(tb), sb = Math.sin(tb);
  const toeW = (x, y, z) => { const dx = x - ball, dy = y + ah; return toWorld(ball + dx * cb - dy * sb, -ah + dx * sb + dy * cb, z); };
  return { toWorld, toeW, ah, ball, toe, heel };
}
function drawShoe(w, fs, lk, id, S) {
  const O = footOutline(w, fs), isH = id === 'hana';
  const wdt = isH ? 0.043 : 0.05, ht = isH ? 0.065 : 0.085;
  const pts = [];
  for (const z of [-wdt, wdt]) {
    pts.push(O.toWorld(O.heel - 0.004, -O.ah, z * 0.8), O.toWorld(O.heel - 0.008, -O.ah + 0.03, z * 0.85),
      O.toWorld(O.heel + 0.01, -O.ah + ht, z * 0.8), O.toWorld(0.03, -O.ah + ht * 0.95, z * 0.9),
      O.toWorld(O.ball - 0.03, -O.ah + 0.045, z), O.toWorld(O.ball, -O.ah, z));
    pts.push(O.toeW(O.ball + 0.01, -O.ah + 0.042, z * 0.95), O.toeW(O.toe - 0.015, -O.ah + 0.03, z * 0.7),
      O.toeW(O.toe, -O.ah + 0.01, z * 0.4), O.toeW(O.toe - 0.01, -O.ah, z * 0.6), O.toeW(O.ball + 0.02, -O.ah, z));
  }
  const shoe = hull3(pts);
  const c = P2(fs.ankle);
  litFill(shoe, lk.shoe, lk.shoeLit, c[0], c[1], Math.max(1.3, 0.01 * S));
  // sole
  const sole = hull3([O.toWorld(O.heel - 0.004, -O.ah, -wdt * 0.8), O.toWorld(O.heel - 0.004, -O.ah, wdt * 0.8),
    O.toWorld(O.heel - 0.004, -O.ah + 0.018, 0), O.toWorld(O.ball, -O.ah + 0.012, 0), O.toWorld(O.ball, -O.ah, wdt),
    O.toWorld(O.ball, -O.ah, -wdt), O.toeW(O.toe - 0.004, -O.ah + 0.008, 0), O.toeW(O.toe - 0.01, -O.ah, 0)]);
  pen.save(); pen.clip(shoe); pen.fill(sole, lk.sole, 'put', 0.9); pen.restore();
}

function drawLeg(w, ps, side, lk, id, S) {
  const hip = side < 0 ? ps.hipL : ps.hipR, knee = side < 0 ? ps.kneeL : ps.kneeR, ank = side < 0 ? ps.ankL : ps.ankR;
  const fs = side < 0 ? ps.footL : ps.footR;
  const c = P2(knee), rim = Math.max(1.3, 0.011 * S);
  if (id === 'hana') {
    // bare lower leg below the skirt
    const calf = vlerp(knee, ank, 0.3);
    const leg = capsule([knee, calf, ank], [0.048, 0.05, 0.031]);
    litFill(leg, lk.leg, lk.legLit, c[0], c[1], rim);
    drawShoe(w, fs, lk, id, S);
  } else {
    const mid = vlerp(hip, knee, 0.45), calf = vlerp(knee, ank, 0.32), hem = vmad(ank, [0, 1, 0], 0.02);
    const leg = capsule([hip, mid, knee, calf, hem], [0.074, 0.066, 0.051, 0.05, 0.046]);
    drawShoe(w, fs, lk, id, S);
    litFill(leg, lk.pants, lk.pantsLit, c[0], c[1], rim);
    // knee crease and hem shadow
    const k = P2(knee);
    pen.save(); pen.clip(leg);
    pen.fill(ellipsePath(k[0], k[1] + 0.02 * S, 0.035 * S, 0.012 * S), cover(lk.pants, C(0, 0, 0, 0.1, 0, 0.25)), 'put', 0.6);
    const hm = P2(hem);
    pen.fill(ellipsePath(hm[0], hm[1], 0.06 * S, 0.012 * S), C(0.05, 0.05, 0.05, 0.6, 0, 0.3), 'put', 0.5);
    pen.restore();
  }
}

function drawSkirt(w, ps, lk, S) {
  const D = w.dims, pf = ps.pelFr, pel = ps.pel, lag = w.lag(ps.t);
  const waistY = 1.0, hemY = 0.36 + 0.004 * Math.sin(ps.t * 3);
  const waist = ringPts(L2W(pf, pel, 0, waistY - D.hipH, 0), pf, 0.1, 0.14, 24);
  // hem: base ellipse pushed out by the legs where they cross the hem height
  const hc = L2W(pf, [pel[0], hemY, pel[2]], lag * 1.4 - 0.01, 0, 0);
  const legAt = (hip, knee, ank) => {
    const pts = [hip, knee, ank];
    for (let i = 0; i < 2; i++) {
      const a = pts[i], b = pts[i + 1];
      if ((a[1] - hemY) * (b[1] - hemY) <= 0) { const u = (a[1] - hemY) / (a[1] - b[1]); return vlerp(a, b, u); }
    }
    return knee;
  };
  const legs = [legAt(ps.hipL, ps.kneeL, ps.ankL), legAt(ps.hipR, ps.kneeR, ps.ankR)];
  const n = 36, rad = new Float64Array(n), hem = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, dir = vadd(vmul(pf.f, Math.cos(a)), vmul(pf.r, Math.sin(a)));
    let r = 0.27 + 0.02 * Math.cos(a) ;
    for (const lp of legs) {
      const rel = vsub(lp, hc); rel[1] = 0;
      const along = vdot(rel, dir), perp = vlen(vsub(rel, vmul(dir, along)));
      if (along > 0) r = Math.max(r, along + 0.085 - perp * 0.35);
    }
    rad[i] = r;
  }
  for (let pass = 0; pass < 3; pass++) { const c = rad.slice(); for (let i = 0; i < n; i++) rad[i] = (c[(i + n - 1) % n] + 2 * c[i] + c[(i + 1) % n]) / 4; }
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, dir = vadd(vmul(pf.f, Math.cos(a)), vmul(pf.r, Math.sin(a)));
    const pleat = 0.006 * (i % 2 ? 1 : -1);
    hem.push(vadd(vmad(hc, dir, rad[i] + pleat), [0, 0.01 * Math.max(0, Math.cos(a)) * (rad[i] - 0.27) * 4, 0]));
  }
  const skirt = hull3(waist.concat(hem));
  const c = P2(pel);
  litFill(skirt, lk.skirt, lk.skirtLit, c[0], c[1], Math.max(1.5, 0.012 * S));
  // pleats: lines from waist to hem on the side facing the lens, and the scalloped hem edge
  pen.save(); pen.clip(skirt);
  const toCam = (p) => vnorm(vsub([CAM.x, CAM.y, CAM.z], p));
  const pleatC = cover(lk.skirt, C(0, 0.1, 0.0, 0.2, 0, 0.35));
  for (let i = 0; i < n; i += 2) {
    const a = i / n * TAU, dir = vadd(vmul(pf.f, Math.cos(a)), vmul(pf.r, Math.sin(a)));
    if (vdot(dir, toCam(hem[i])) < 0.05) continue;
    const top = L2W(pf, pel, Math.cos(a) * 0.1, waistY - D.hipH, Math.sin(a) * 0.14);
    const a0 = P2(top), a1 = P2(hem[i]);
    pen.stroke(poly([[a0[0], a0[1]], [lerp(a0[0], a1[0], 0.5), lerp(a0[1], a1[1], 0.5)], [a1[0], a1[1]]], false), pleatC, Math.max(0.8, 0.005 * S), 'put', 0.8);
  }
  // darker inside the hem where it turns away
  const hemPts = hem.map(P2);
  const lowY = Math.max(...hemPts.map(p => p[1]));
  pen.fill(skirt, { lin: [0, lowY - 0.12 * S, 0, lowY], stops: [[0, C(), 0], [1, C(0, 0.05, 0, 0.2, 0, 0.3), 1]] }, 'add');
  pen.restore();
}

function drawTorso(w, ps, lk, id, S) {
  const rings = torsoRings(w, ps, id);
  const body = hull3(rings.flat());
  const c = P2(ps.chest);
  litFill(body, lk.top, lk.topLit, c[0], c[1], Math.max(1.6, 0.013 * S));
  const pf = ps.chestFr, pel = ps.pel, D = w.dims;
  const toCam = vnorm(vsub([CAM.x, CAM.y, CAM.z], ps.chest));
  pen.save(); pen.clip(body);
  // ambient occlusion toward the hem and under the arms
  const hemP = P2(rings[0][0]), topP = P2(rings[4][0]);
  pen.fill(body, { lin: [0, topP[1], 0, hemP[1] + 0.02 * S], stops: [[0, C(), 0], [0.6, C(), 0], [1, C(0, 0.06, 0.02, 0.12, 0, 0.16), 1]] }, 'add');
  if (id === 'hana') {
    // cardigan: open front showing the pale top, a placket on each side
    const V = (a, y, c) => L2W(pf, pel, a, y - D.hipH, c);
    const nk = [V(0.035, 1.415, -0.035), V(0.06, 1.3, -0.02), V(0.1, 1.17, -0.01), V(0.105, 1.1, 0.0),
      V(0.1, 1.17, 0.01), V(0.06, 1.3, 0.02), V(0.035, 1.415, 0.035)];
    if (vdot(pf.f, toCam) > -0.2) {
      const opening = poly(nk.map(P2).map(q => [q[0], q[1]]));
      pen.fill(opening, lk.inner);
      const plk = cover(lk.top, C(0, 0.08, 0.05, 0.1, 0, 0.16));
      for (const sgn of [-1, 1]) {
        const line = [V(0.04, 1.42, sgn * 0.04), V(0.1, 1.2, sgn * 0.012), V(0.108, 1.04, sgn * 0.002), V(0.118, 0.86, sgn * 0.01), V(0.125, 0.77, sgn * 0.02)].map(P2).map(q => [q[0], q[1]]);
        pen.stroke(poly(curve(line, false, 4), false), plk, Math.max(1, 0.012 * S), 'put', 0.85);
      }
    }
  } else {
    const V = (a, y, c) => L2W(pf, pel, a, y - D.hipH, c);
    if (vdot(pf.f, toCam) > -0.2) {
      // sweater at the collar, placket, patch pockets
      const nk = [V(0.045, 1.44, -0.05), V(0.075, 1.36, -0.02), V(0.08, 1.33, 0), V(0.075, 1.36, 0.02), V(0.045, 1.44, 0.05)];
      pen.fill(poly(nk.map(P2).map(q => [q[0], q[1]])), lk.inner);
      const dk = cover(lk.top, C(0, 0.05, 0.05, 0.15, 0.05, 0.3));
      const pl = [V(0.08, 1.33, 0.0), V(0.128, 1.18, 0.0), V(0.118, 1.04, 0.0), V(0.13, 0.86, 0), V(0.132, 0.79, 0)].map(P2).map(q => [q[0], q[1]]);
      pen.stroke(poly(curve(pl, false, 4), false), dk, Math.max(1, 0.006 * S), 'put', 0.9);
      for (const sgn of [-1, 1]) {
        const pk = [V(0.132, 0.98, sgn * 0.04), V(0.132, 0.98, sgn * 0.14), V(0.13, 0.84, sgn * 0.145), V(0.132, 0.84, sgn * 0.04)].map(P2).map(q => [q[0], q[1]]);
        pen.stroke(poly(pk), dk, Math.max(0.9, 0.005 * S), 'put', 0.75);
      }
      // collar points
      for (const sgn of [-1, 1]) {
        const cl = [V(0.02, 1.47, sgn * 0.07), V(0.07, 1.39, sgn * 0.03), V(0.09, 1.34, sgn * 0.075), V(0.03, 1.41, sgn * 0.1)].map(P2).map(q => [q[0], q[1]]);
        pen.fill(poly(cl), cover(lk.top, C(0, 0, 0, 0.05, 0, 0.1)));
        pen.stroke(poly(cl), dk, Math.max(0.8, 0.004 * S), 'put', 0.7);
      }
    }
  }
  pen.restore();
}

/* ── the whole figure ─────────────────────────────────────────────────────── */
function drawFigure(w, id, ps, rimK = 1) {
  const lk = LOOK[id], S = P2(ps.chest)[2];
  SIL = new Path2D();
  // which side faces the lens: the far limbs go first
  const toCam = vsub([CAM.x, CAM.y, CAM.z], ps.pel);
  const nearSide = vdot(ps.chestFr.r, toCam) > 0 ? 1 : -1, farSide = -nearSide;
  drawArm(w, ps, farSide, lk, id, S);
  drawLeg(w, ps, farSide, lk, id, S);
  drawLeg(w, ps, nearSide, lk, id, S);
  if (id === 'hana') drawSkirt(w, ps, lk, S);
  drawTorso(w, ps, lk, id, S);
  drawHead(w, ps, lk, id);
  drawArm(w, ps, nearSide, lk, id, S);
  const c = P2(ps.chest);
  if (rimK > 0) rimPass(SIL, c[0], c[1], Math.max(1.6, 0.013 * S), rimK);
  SIL = null;
}

/* ── cast shadow on the ground, toward the lens from the low sun ───────────
   Each part's ground shadow is its capsule projected along the sunlight onto
   y = 0, clipped before the lens, then projected: perspective-exact.       */
function groundShadowPts(pts3, radii) {
  const cot = 1 / Math.tan(SUN.elev), zc = CAM.z + 1.2;
  const out = [];
  pts3.forEach((p, i) => {
    let gz = p[2] - p[1] * cot, gx = p[0];
    if (gz < zc) gz = zc;
    const r = radii[i];
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; out.push(P2([gx + Math.cos(a) * r, 0, gz + Math.sin(a) * r])); }
  });
  return hull(out.map(q => [q[0], q[1]]));
}
function drawFigureShadow(w, id, ps, col, k = 1) {
  // only the legs and feet print: everything higher falls beyond the frame at this sun
  const parts = new Path2D();
  const legs = [[ps.kneeL, ps.ankL], [ps.kneeR, ps.ankR]];
  for (const [kn, a] of legs) parts.addPath(poly(groundShadowPts([kn, a], [0.05, 0.045])));
  for (const fs of [ps.footL, ps.footR]) {
    const O = footOutline(w, fs);
    parts.addPath(poly(groundShadowPts([O.toWorld(O.heel, -O.ah, 0), O.toeW(O.toe - 0.02, -O.ah + 0.01, 0), fs.ankle], [0.04, 0.04, 0.045])));
  }
  const f = P2([ps.pel[0], 0, ps.pel[2]]);
  // long shadows soften and fade with distance from the feet
  pen.fill(parts, { lin: [0, f[1] - 6, 0, f[1] + 0.32 * f[2]], stops: [[0, C(0.05, 0.3, 0.3, 0.12, 0, 0.5), k], [0.35, C(0.05, 0.25, 0.25, 0.1, 0, 0.4), k * 0.6], [1, C(), 0]] }, 'add');
}
