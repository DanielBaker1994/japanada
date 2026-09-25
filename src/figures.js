/* ── figures: rig and gait ────────────────────────────────────────────────────
   Two walkers built as 3D skeletons and drawn as projected silhouettes.

   Gait is planned from footsteps, not from a looping cycle: each foot is
   planted on the ground at a footprint and cannot slide while it bears
   weight; the swing foot travels between footprints with heel-strike and
   toe-off roll. Legs are two-bone IK from hip to ankle. The pelvis travels
   a monotone curve through the mid-stance points, and its height is the most
   the stance legs can reach (the compass-gait bob), smoothed. Arms are
   damped pendulums driven by the opposite leg and by the body's acceleration,
   so they keep swinging a little after the stop and settle. Everything is
   precomputed at load into tables sampled by time, so pose(t) is pure.     */

/* ── vector math ──────────────────────────────────────────────────────────── */
const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vmul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
const vnorm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const vlerp = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const vmad = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
function vrot(v, k, th) {           // Rodrigues: rotate v about unit axis k
  const c = Math.cos(th), s = Math.sin(th), kv = vcross(k, v), d = vdot(k, v) * (1 - c);
  return [v[0] * c + kv[0] * s + k[0] * d, v[1] * c + kv[1] * s + k[1] * d, v[2] * c + kv[2] * s + k[2] * d];
}
const UP = [0, 1, 0];
// A body frame: f forward, u up, r the figure's right. Heading h is the angle of f in XZ.
function frameH(h) { return { f: [Math.cos(h), 0, Math.sin(h)], u: [0, 1, 0], r: [-Math.sin(h), 0, Math.cos(h)] }; }
function frameRot(fr, axisName, th) {
  const k = fr[axisName];
  return { f: vrot(fr.f, k, th), u: vrot(fr.u, k, th), r: vrot(fr.r, k, th) };
}
const L2W = (fr, o, a, b, c) => [o[0] + fr.f[0] * a + fr.u[0] * b + fr.r[0] * c,
  o[1] + fr.f[1] * a + fr.u[1] * b + fr.r[1] * c, o[2] + fr.f[2] * a + fr.u[2] * b + fr.r[2] * c];
const angLerp = (a, b, u) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;

/* two-bone IK: root, target, lengths, pole direction → mid joint */
function ik2(root, target, l1, l2, pole) {
  let d = vsub(target, root), dist = vlen(d);
  const maxd = (l1 + l2) * 0.9995, mind = Math.abs(l1 - l2) + 1e-4;
  if (dist > maxd) { target = vmad(root, vnorm(d), maxd); d = vsub(target, root); dist = maxd; }
  if (dist < mind) dist = mind;
  const dn = vnorm(d);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let p = vsub(pole, vmul(dn, vdot(pole, dn)));
  p = vnorm(p);
  return { mid: vadd(vadd(root, vmul(dn, a)), vmul(p, h)), end: target };
}

/* monotone cubic interpolation through (x, y) pairs (Fritsch–Carlson) */
function monotone(xs, ys) {
  const n = xs.length, d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0] + m[0] * (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (x - xs[n - 1]);
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
// Catmull-Rom (cardinal) through (x, y) keys, for signals that change sign
function cardinal(xs, ys) {
  const n = xs.length;
  const m = ys.map((_, i) => i === 0 ? (ys[1] - ys[0]) / (xs[1] - xs[0]) : i === n - 1 ? (ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2])
    : (ys[i + 1] - ys[i - 1]) / (xs[i + 1] - xs[i - 1]));
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
// a sampled track: values at fixed rate, linearly interpolated
function track(t0, t1, rate, fn) {
  const n = Math.ceil((t1 - t0) * rate) + 1, v = new Float64Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(t0 + i / rate);
  const at = (t) => { const x = clamp((t - t0) * rate, 0, n - 1), i = Math.min(n - 2, x | 0), u = x - i; return v[i] * (1 - u) + v[i + 1] * u; };
  at.v = v; at.t0 = t0; at.rate = rate;
  return at;
}
function gaussTrack(tr, sigma) {
  const r = Math.ceil(sigma * tr.rate * 3), k = [];
  for (let i = -r; i <= r; i++) k.push(Math.exp(-0.5 * (i / (sigma * tr.rate)) ** 2));
  const ks = k.reduce((a, b) => a + b, 0), v = tr.v, n = v.length, o = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let j = -r; j <= r; j++) s += v[clamp(i + j, 0, n - 1)] * k[j + r]; o[i] = s / ks; }
  return o;
}

/* ── the two walkers ───────────────────────────────────────────────────────
   Same height, 1.68 m. Proportions from adult anthropometric ratios
   (shoulder ≈ 0.818 H, hip joint ≈ 0.52 H, knee ≈ 0.285 H, chin ≈ 0.87 H). */
const WALKERS = {
  hana: {
    side: -1,                   // walks on the left (Japanese) half
    end: [-0.36, 5.55],         // standing point X, Z
    endHeading: -22 * DEG,      // faces +X, opened slightly toward the lens
    walkHeading: -39 * DEG,     // approach: toward the centre and the lens
    turnLen: 2.2,
    tClose: 12.2,              // the closing step lands
    steady: { len: 0.62, dur: 0.56 },
    decel: [[0.6, 0.575], [0.49, 0.62], [0.33, 0.67]],   // [length, duration] of the last steps
    close: { dur: 0.6, back: 0.05 },
    stanceW: 0.075, standW: 0.085, toeOut: 7 * DEG,
    sway: 0.018, bobExtra: 0.004,
    dims: { hipH: 0.872, hipHalf: 0.083, thigh: 0.405, shin: 0.395, ankleH: 0.072, foot: 0.235,
      waistH: 1.03, chestH: 1.23, shoulderH: 1.372, neckH: 1.43, chinH: 1.462, shoulderHalf: 0.158,
      upperArm: 0.285, forearm: 0.24, headScale: 0.915 },
    armAmp: 15 * DEG, armAbd: 7 * DEG, elbowBase: 14 * DEG, elbowSwing: 16 * DEG,
    notice: 7.25,               // sees him
    // after the stop her hands come together in front of her
    poseArms(side, t, { pel, baseFr }) {
      const k = smoother((t - 12.38) / 1.0);
      if (k <= 0) return null;
      const wrist = L2W(baseFr, [pel[0], 0, pel[2]], 0.155 + (side > 0 ? 0.012 : 0), 0.835 + (side > 0 ? 0.015 : 0), side * 0.028);
      return { wrist, pole: vnorm(vadd(vmul(baseFr.r, side * 0.9), vmul(baseFr.f, -0.4))), k, hand: 'clasp' };
    },
  },
  liam: {
    side: 1,
    end: [0.37, 5.6],
    endHeading: Math.PI + 21 * DEG,
    walkHeading: Math.PI + 39.4 * DEG,
    turnLen: 2.4,
    tClose: 12.26,
    steady: { len: 0.66, dur: 0.59 },
    decel: [[0.63, 0.6], [0.52, 0.64], [0.36, 0.69]],
    close: { dur: 0.62, back: 0.07 },
    stanceW: 0.095, standW: 0.11, toeOut: 9 * DEG,
    sway: 0.022, bobExtra: 0.002,
    dims: { hipH: 0.872, hipHalf: 0.088, thigh: 0.405, shin: 0.395, ankleH: 0.075, foot: 0.26,
      waistH: 1.05, chestH: 1.24, shoulderH: 1.375, neckH: 1.435, chinH: 1.462, shoulderHalf: 0.192,
      upperArm: 0.295, forearm: 0.25, headScale: 0.93 },
    armAmp: 19 * DEG, armAbd: 9 * DEG, elbowBase: 12 * DEG, elbowSwing: 18 * DEG,
    notice: 7.05,
    // after the stop the hand nearest the lens goes into his jacket pocket
    poseArms(side, t, { pel, baseFr }) {
      if (side !== 1) return null;
      const k = smoother((t - 12.75) / 0.85);
      if (k <= 0) return null;
      const wrist = L2W(baseFr, [pel[0], 0, pel[2]], 0.125, 0.95, side * 0.105);
      return { wrist, pole: vnorm(vadd(vmul(baseFr.r, side * 0.8), vmul(baseFr.f, -0.6))), k, hand: 'pocket' };
    },
  },
};

/* ── planning ─────────────────────────────────────────────────────────────── */
function planWalker(w) {
  const D = w.dims;
  // Step schedule, built backwards from the closing step.
  const lens = [], durs = [];
  lens.unshift(0); durs.unshift(w.close.dur);          // closing step: lands beside the lead foot
  for (let i = w.decel.length - 1; i >= 0; i--) { lens.unshift(w.decel[i][0]); durs.unshift(w.decel[i][1]); }
  // durs[k] is the time from strike k-1 to strike k; lens[k] the anchor spacing into k.
  while (lens.length < 24) { lens.unshift(w.steady.len); durs.unshift(w.steady.dur); }
  const N = lens.length;
  const tc = new Array(N);
  tc[N - 1] = w.tClose;
  for (let k = N - 2; k >= 0; k--) tc[k] = tc[k + 1] - durs[k + 1];
  // anchor distances along the path (d increases toward the end point)
  const total = lens.slice(1).reduce((a, b) => a + b, 0);
  const anchor = new Array(N);
  anchor[0] = 0;
  for (let k = 1; k < N; k++) anchor[k] = anchor[k - 1] + lens[k];
  const L = anchor[N - 2] + 0.0;          // lead foot's anchor = the end point
  // Path: integrate backwards from the end so the end pose is exact.
  const ds = 0.005, S = L + 2, pts = [];
  let p = [w.end[0], w.end[1]];
  const headAt = (s) => angLerp(w.endHeading, w.walkHeading, smooth(s / w.turnLen));
  for (let i = 0; i * ds <= S; i++) {
    const s = i * ds, h = headAt(s);
    pts.push({ s, x: p[0], z: p[1], h });
    p = [p[0] - Math.cos(h) * ds, p[1] - Math.sin(h) * ds];
  }
  // path(d): d measured from the start (d = L at the end point; negative d continues back)
  const path = (d) => {
    const s = clamp(L - d, 0, S - ds * 2), x = s / ds, i = Math.min(pts.length - 2, x | 0), u = x - i;
    const a = pts[i], b = pts[i + 1];
    return { x: lerp(a.x, b.x, u), z: lerp(a.z, b.z, u), h: angLerp(a.h, b.h, u) };
  };
  // footprints: foot index alternates; the closing foot sits a little behind, feet apart
  const feet = [];
  for (let k = 0; k < N; k++) feet.push({ k, side: 0, t: tc[k], d: anchor[k] });
  // assign sides so they alternate and the final two differ
  for (let k = 0; k < N; k++) feet[k].side = ((N - 1 - k) % 2 === 0) ? 1 : -1;   // closing foot = right(+1)
  feet[N - 1].d = L - w.close.back;
  for (const f of feet) {
    const pp = path(f.d), fr = frameH(pp.h);
    const width = f.k >= N - 2 ? w.standW : w.stanceW;
    // footprint anchor (ground point under the ankle) and foot yaw
    f.pos = [pp.x + fr.r[0] * f.side * width, 0, pp.z + fr.r[2] * f.side * width];
    f.yaw = pp.h - f.side * w.toeOut;     // toes turn outward (right foot turns clockwise from above)
    // strike speed shapes the roll: slow steps land flatter
    f.speed = f.k > 0 ? lens[f.k] / durs[f.k] : lens[1] / durs[1];
  }
  // stance windows: foot k planted from tc[k] until it lifts, 0.24 of a step after the next strike
  for (let k = 0; k < N; k++) {
    const f = feet[k];
    if (k + 2 < N) {
      const dNext = tc[k + 1] - tc[k];
      f.lift = tc[k + 1] + 0.24 * (tc[k + 2] - tc[k + 1]) * (0.9 + 0.1 * dNext / (tc[k + 2] - tc[k + 1]));
      f.next = feet[k + 2];
    } else { f.lift = Infinity; f.next = null; }
  }
  // pelvis progress: over each anchor at mid-stance, settling between the feet at the end
  const xs = [], ys = [];
  for (let k = 0; k < N - 1; k++) {
    const f = feet[k], stance = Math.min(f.lift, tc[k] + 1.2) - tc[k];
    xs.push(tc[k] + 0.47 * stance); ys.push(f.d);
  }
  xs[N - 2] = Math.min(xs[N - 2], tc[N - 1] - 0.05);
  xs.push(tc[N - 1] + 0.42); ys.push(L - w.close.back * 0.5);
  xs.push(tc[N - 1] + 1.4); ys.push(L - w.close.back * 0.5 + 0.004);
  const Dof = monotone(xs, ys);
  // lateral sway toward the stance foot
  const lx = [], ly = [];
  for (let k = 0; k < N - 1; k++) { lx.push(xs[k]); ly.push(feet[k].side * w.sway * (k >= N - 3 ? 0.7 : 1)); }
  lx.push(tc[N - 1] + 0.5); ly.push(0);
  lx.push(tc[N - 1] + 3); ly.push(0);
  const latOf = cardinal(lx, ly);
  Object.assign(w, { feet, tc, L, path, Dof, latOf, N });
  w.t0 = tc[0] + 0.6;
  return w;
}

/* ── feet ──────────────────────────────────────────────────────────────────
   Foot model (local, metres): ankle at (0, ankleH); heel back at -0.055,
   ball at 0.62 of the length, toe tip at the front. A foot state is the
   ankle position, the rear-foot pitch and the toe bend.                    */
function footGeom(w) {
  const D = w.dims, len = D.foot;
  return { heel: -0.055 * len / 0.235, ball: len * 0.62 - 0.055 * len / 0.235, toe: len - 0.055 * len / 0.235, ah: D.ankleH };
}
function footState(w, foot, t) {
  const G = footGeom(w);
  // planted: roll about heel after strike, flat, then heel rise about the ball
  const planted = (f, t) => {
    const sp = clamp(f.speed / 1.15, 0.3, 1.1);
    const heelP = 12 * DEG * sp, rise = 34 * DEG * sp;
    const fr = frameH(f.yaw);
    const base = f.pos;
    let pitch = 0, pivot = 'flat', u;
    const stanceEnd = f.lift === Infinity ? Infinity : f.lift;
    const dt = t - f.t;
    if (dt < 0.075) { pitch = heelP * (1 - smooth(dt / 0.075)); pivot = 'heel'; }
    else if (stanceEnd !== Infinity && t > stanceEnd - 0.34 * (stanceEnd - f.t)) {
      u = (t - (stanceEnd - 0.34 * (stanceEnd - f.t))) / (0.34 * (stanceEnd - f.t));
      pitch = -rise * Math.pow(clamp(u, 0, 1), 1.3); pivot = 'ball';
    }
    // ankle position from pitch about the pivot (pitch > 0 = toes up)
    const rot = (px) => {            // local (x, y) of ankle relative to the pivot, rotated
      const ax = -px, ay = G.ah;       // ankle relative to pivot on the ground
      const c = Math.cos(pitch), s = Math.sin(pitch);
      return [px + ax * c - ay * s * 1 + 0 * s, ax * s + ay * c];
    };
    let ax, ay;
    if (pivot === 'heel') { const r = rot(G.heel); ax = r[0]; ay = r[1]; }
    else if (pivot === 'ball') {
      // rotate about the ball: rear foot lifts, pitch negative
      const c = Math.cos(pitch), s = Math.sin(pitch), rx = -G.ball, ry = G.ah;
      ax = G.ball + rx * c - ry * s; ay = rx * s + ry * c;
    } else { ax = 0; ay = G.ah; }
    const ankle = [base[0] + fr.f[0] * ax, ay, base[2] + fr.f[2] * ax];
    return { ankle, yaw: f.yaw, pitch, toeBend: pivot === 'ball' ? -pitch : 0, planted: true };
  };
  // which footprint governs this foot at time t
  const feet = w.feet;
  let cur = null;
  for (const f of feet) if (f.side === foot && f.t <= t) cur = f;
  if (!cur) { // before the first strike of this foot: treat as the first
    cur = feet.find(f => f.side === foot);
    return planted(cur, cur.t);
  }
  if (t <= cur.lift || !cur.next) return planted(cur, t);
  // swing from cur (lift) to next (strike)
  const nx = cur.next, t0 = cur.lift, t1 = nx.t;
  const u = clamp((t - t0) / (t1 - t0), 0, 1);
  const a = planted(cur, t0), b = planted(nx, nx.t);
  const e = u * u * (3 - 2 * u) * 0.8 + u * 0.2;             // travel: fast through mid-swing
  const ankle = vlerp(a.ankle, b.ankle, e);
  const sp = clamp(nx.speed / 1.15, 0.25, 1.1);
  ankle[1] += (0.052 * sp + 0.012) * Math.pow(Math.sin(Math.PI * clamp(u * 1.08, 0, 1)), 1.1)
    + 0.02 * sp * Math.max(0, Math.sin(Math.PI * clamp(u / 0.45, 0, 1)));  // early knee lift clears the toe
  const pitch = lerp(a.pitch, b.pitch, smooth((u - 0.05) / 0.9)) + (-6 * DEG * sp) * Math.sin(Math.PI * u);
  const yaw = angLerp(a.yaw, b.yaw, smooth(u));
  const toeBend = a.toeBend * (1 - smooth(u / 0.3));
  return { ankle, yaw, pitch, toeBend, planted: false, u };
}

/* ── precompute tracks ──────────────────────────────────────────────────── */
function prepareWalker(w) {
  planWalker(w);
  const D = w.dims, legL = D.thigh + D.shin;
  const T0 = 1.0, T1 = DUR + 0.2, RATE = 240;
  // pelvis height: highest the stance legs allow
  const hipLocal = (t) => {
    const d = w.Dof(t), pp = w.path(d), fr = frameH(pp.h), lat = w.latOf(t);
    return { pp, fr, lat, d };
  };
  const raw = track(T0, T1, RATE, (t) => {
    const { pp, fr, lat } = hipLocal(t);
    let y = D.hipH - 0.004;
    for (const side of [-1, 1]) {
      const fs = footState(w, side, t);
      // weight-bearing if planted or about to be (near strike)
      if (!fs.planted) continue;
      const hip = [pp.x + fr.r[0] * (lat + side * D.hipHalf), 0, pp.z + fr.r[2] * (lat + side * D.hipHalf)];
      const dx = hip[0] - fs.ankle[0], dz = hip[2] - fs.ankle[2];
      const h2 = dx * dx + dz * dz, reach = legL * 0.992;
      if (h2 < reach * reach) y = Math.min(y, fs.ankle[1] + Math.sqrt(reach * reach - h2));
    }
    return y;
  });
  const sm = gaussTrack(raw, 0.028);
  let over = 0;
  for (let i = 0; i < sm.length; i++) over = Math.max(over, sm[i] - raw.v[i]);
  for (let i = 0; i < sm.length; i++) sm[i] -= over * 0.85;
  raw.v.set(sm);
  w.pelvisY = raw;
  // pelvis velocity/acceleration along the path (for lean, arm and cloth dynamics)
  w.speed = track(T0, T1, RATE, (t) => (w.Dof(t + 0.004) - w.Dof(t - 0.004)) / 0.008);
  const acc = track(T0, T1, RATE, (t) => (w.speed(t + 0.01) - w.speed(t - 0.01)) / 0.02);
  // arm pendulums: target from the opposite foot's forward offset
  const fwdOff = (side, t) => {
    const { pp, fr } = hipLocal(t), fs = footState(w, side, t);
    return (fs.ankle[0] - pp.x) * fr.f[0] + (fs.ankle[2] - pp.z) * fr.f[2];
  };
  for (const side of [-1, 1]) {
    const om = TAU * 1.05, zeta = 0.42, dt = 1 / RATE;
    const n = Math.ceil((T1 - T0) * RATE) + 1, th = new Float64Array(n);
    let a = 0, v = 0;
    // run in from the steady state so the swing is established when it starts
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const t = T0 + i * dt;
        const target = w.armAmp * clamp(fwdOff(-side, t) / (w.steady.len * 0.62), -1.3, 1.3) * clamp(w.speed(t) / 1.0, 0, 1.1);
        const acc2 = om * om * (target - a) - 2 * zeta * om * v - 1.6 * acc(t);
        v += acc2 * dt; a += v * dt;
        if (pass === 1) th[i] = a;
        if (pass === 0 && i > RATE * 1.5) break;
      }
    }
    const tr = (t) => { const x = clamp((t - T0) * RATE, 0, n - 1), i = Math.min(n - 2, x | 0), u = x - i; return th[i] * (1 - u) + th[i + 1] * u; };
    w['arm' + side] = tr;
  }
  // cloth / hair follow-through: a damped spring driven by forward acceleration
  {
    const om = TAU * 1.5, zeta = 0.3, dt = 1 / RATE;
    const n = Math.ceil((T1 - T0) * RATE) + 1, s = new Float64Array(n);
    let x = 0, v = 0;
    for (let i = 0; i < n; i++) {
      const t = T0 + i * dt;
      const f = -acc(t) * 0.05 + (w.speed(t) * -0.035);
      v += (om * om * (f - x) - 2 * zeta * om * v) * dt; x += v * dt; s[i] = x;
    }
    w.lag = (t) => { const xx = clamp((t - T0) * RATE, 0, n - 1), i = Math.min(n - 2, xx | 0), u = xx - i; return s[i] * (1 - u) + s[i + 1] * u; };
  }
  return w;
}

/* ── pose ──────────────────────────────────────────────────────────────────
   Returns world-space joints and frames for time t.                        */
function pose(w, t, other) {
  const D = w.dims;
  const d = w.Dof(t), pp = w.path(d), baseFr = frameH(pp.h);
  const sp = w.speed(t), stand = smooth((t - w.tClose - 0.1) / 0.8);
  const lat = w.latOf(t) + stand * 0.012 * Math.sin(0.9 + 0.45 * (t - w.tClose)) * w.side;
  const py = w.pelvisY(t);
  // feet
  const fl = footState(w, -1, t), fr_ = footState(w, 1, t);
  const fwdOf = (fs) => (fs.ankle[0] - pp.x) * baseFr.f[0] + (fs.ankle[2] - pp.z) * baseFr.f[2];
  const diff = (fwdOf(fr_) - fwdOf(fl)) / Math.max(0.2, w.steady.len);   // right foot ahead → +
  // pelvis: yaw toward the forward leg, drop on the swing side, a slight forward tilt with speed
  const pYaw = -diff * 5.5 * DEG;
  const stanceSide = fl.planted && !fr_.planted ? -1 : fr_.planted && !fl.planted ? 1 : 0;
  const pRoll = -stanceSide * 3.2 * DEG * clamp(sp, 0, 1);
  let pelFr = frameH(pp.h + pYaw);
  pelFr = frameRot(pelFr, 'f', pRoll);
  const pel = [pp.x + baseFr.r[0] * lat, py, pp.z + baseFr.r[2] * lat];
  const hipL = L2W(pelFr, pel, 0, -0.02, -D.hipHalf), hipR = L2W(pelFr, pel, 0, -0.02, D.hipHalf);
  // knees point forward and a little out
  const legPole = (side) => vnorm(vadd(vmul(baseFr.f, 1), vmul(baseFr.r, side * 0.12)));
  const legL = ik2(hipL, fl.ankle, D.thigh, D.shin, legPole(-1));
  const legR = ik2(hipR, fr_.ankle, D.thigh, D.shin, legPole(1));
  // spine: lean with speed, counter-rotate the chest
  const lean = (2.5 + 2.5 * clamp(sp, 0, 1.2)) * DEG + w.lag(t) * 0.6;
  const breath = Math.sin(TAU * 0.27 * t + (w.side > 0 ? 1.7 : 0.2)) * stand;
  let chestFr = frameH(pp.h - pYaw * 0.9);
  chestFr = frameRot(chestFr, 'r', -lean);
  chestFr = frameRot(chestFr, 'f', -pRoll * 0.5);
  const waist = L2W(frameRot(frameH(pp.h), 'r', -lean * 0.5), pel, 0.0, D.waistH - D.hipH, 0);
  const chest = L2W(chestFr, pel, 0.012, D.chestH - D.hipH, 0);
  const neck = L2W(chestFr, pel, -0.01, D.neckH - D.hipH + breath * 0.002, 0);
  const shL = L2W(chestFr, pel, -0.005, D.shoulderH - D.hipH + breath * 0.003, -D.shoulderHalf);
  const shR = L2W(chestFr, pel, -0.005, D.shoulderH - D.hipH + breath * 0.003, D.shoulderHalf);
  // head: stabilised, looks along the path, then at the other walker
  const headC0 = L2W(chestFr, pel, 0.03, D.chinH - D.hipH + 0.105 * D.headScale / 0.915, 0);
  let lookYaw = pp.h, lookPitch = -7 * DEG;
  if (other) {
    const op = other.path(other.Dof(t)), oh = [op.x, 1.57, op.z];
    const dv = vsub(oh, headC0);
    const toYaw = Math.atan2(dv[2], dv[0]), toPitch = Math.atan2(dv[1], Math.hypot(dv[0], dv[2]));
    const k = smoother((t - w.notice) / 0.55);
    lookYaw = angLerp(pp.h, toYaw, k);
    lookPitch = lerp(-7 * DEG, toPitch, k);
  }
  // the head turns at most 60° from the chest; the rest is carried by the eyes
  let hy = Math.atan2(Math.sin(lookYaw - pp.h), Math.cos(lookYaw - pp.h));
  hy = clamp(hy, -60 * DEG, 60 * DEG);
  const headYaw = pp.h + hy * 0.85;
  const nod = -0.012 * Math.sin(TAU * (t - w.tClose) * 0.5) * 0;
  const tilt = (stand * (w.side < 0 ? 4 : -2.5) * DEG) + wander(w.side + 'tilt', t, 0.15) * 1.2 * DEG;
  let headFr = frameH(headYaw);
  headFr = frameRot(headFr, 'r', lookPitch * 0.8 + nod);
  headFr = frameRot(headFr, 'f', tilt);
  const headC = L2W(chestFr, pel, 0.025, D.chinH - D.hipH + 0.108 * D.headScale / 0.915, 0);
  // arms
  const arms = {};
  for (const side of [-1, 1]) {
    const sh = side < 0 ? shL : shR;
    const th = w['arm' + side](t);
    const ua = D.upperArm, fa = D.forearm;
    // swing plane: forward-down, abducted a little
    let dir = vmul(chestFr.u, -1);
    dir = vrot(dir, chestFr.r, th);                  // positive th swings forward
    dir = vrot(dir, chestFr.f, -side * w.armAbd);    // away from the body
    const elbow = vmad(sh, dir, ua);
    const flex = w.elbowBase + Math.max(0, th) * (w.elbowSwing / w.armAmp);
    const fdir = vrot(dir, chestFr.r, flex);
    const wristFK = vmad(elbow, fdir, fa);
    let wrist = wristFK, pole = vadd(vmul(chestFr.f, -1), vmul(chestFr.r, side * 0.5));
    // final pose blend
    const pb = w.poseArms ? w.poseArms(side, t, { pel, chestFr, baseFr: frameH(w.path(w.L).h), sh }) : null;
    if (pb) { wrist = vlerp(wristFK, pb.wrist, pb.k); pole = vnorm(vlerp(pole, pb.pole, pb.k)); }
    const handIn = pb && pb.hand === 'pocket' ? smooth((pb.k - 0.75) / 0.25) : 0;
    const sol = ik2(sh, wrist, ua, fa, pole);
    const handDir = vnorm(vsub(sol.end, sol.mid));
    arms[side] = { sh, elbow: sol.mid, wrist: sol.end, handDir, hand: vmad(sol.end, handDir, 0.075), handIn };
  }
  return {
    t, pp, baseFr, pel, pelFr, chestFr, headFr, headC, waist, chest, neck, shL, shR, hipL, hipR,
    kneeL: legL.mid, kneeR: legR.mid, ankL: legL.end, ankR: legR.end, footL: fl, footR: fr_,
    arms, stand, breath, lookYaw, lookPitch, sp,
  };
}
