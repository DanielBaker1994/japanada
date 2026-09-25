/* ── the homes ────────────────────────────────────────────────────────────────
   Built as projected planes in world metres, far planes first.            */

/* rim light along an edge that faces the sun: a warm hairline */
function rimLine(pts3, w = 1.6, a = 1) {
  pen.stroke(L3(pts3), C(0.3, 0.45, 0.35, 0.7, 0.7, 0.7), w + 0.8, 'lift', a);
  pen.stroke(L3(pts3), C(0.55, 0.02, 0.25), w, 'add', a);
}

/* ── Japanese minka ─────────────────────────────────────────────────────────
   Hipped thatch (yosemune) with small gables at the ridge ends, a raised
   engawa veranda under deep eaves, shoji lit from inside, plaster and dark
   timber, persimmons drying on strings under the eaves.                  */
const MK = { x0: -15.5, x1: -5.0, zf: 36, zb: 44.5, wallTop: 2.75, eaveZ: 34.0, eaveX0: -16.6, eaveX1: -3.9, eaveY: 2.95,
  ridgeY: 8.1, ridgeX0: -12.8, ridgeX1: -7.7, ridgeZ: 40.3, deckY: 0.55 };
function drawMinka(t) {
  const M = MK;
  // right side wall (faces the seam) and the front wall
  pen.fill(Q3([[M.x1, 0, M.zf], [M.x1, 0, M.zb], [M.x1, M.wallTop, M.zb], [M.x1, M.wallTop, M.zf]]), cmix(PAL.plaster, PAL.wood, 0.2));
  // timber frame on the side wall
  const sideTim = new Path2D();
  for (const z of [M.zf, 38.8, 41.7, M.zb]) sideTim.addPath(Q3([[M.x1, 0.4, z - 0.09], [M.x1, 0.4, z + 0.09], [M.x1, M.wallTop, z + 0.09], [M.x1, M.wallTop, z - 0.09]]));
  sideTim.addPath(Q3([[M.x1, 1.9, M.zf], [M.x1, 1.9, M.zb], [M.x1, 2.05, M.zb], [M.x1, 2.05, M.zf]]));
  pen.fill(sideTim, PAL.wood);
  // side window (lattice) glowing faintly
  pen.fill(rectX(M.x1, 39.5, 41.1, 0.95, 1.8), PAL.shojiDim);
  latticeX(M.x1, 39.5, 41.1, 0.95, 1.8, 5, 3, PAL.wood);
  // stone plinth
  pen.fill(rectZ(M.x0, M.x1, 0, 0.42, M.zf), PAL.stone);
  pen.fill(rectX(M.x1, M.zf, M.zb, 0, 0.42), cmix(PAL.stone, PAL.shadow, 0.3));
  // front wall bays between posts
  const bays = 6, bw = (M.x1 - M.x0) / bays;
  for (let i = 0; i < bays; i++) {
    const a = M.x0 + i * bw, b = a + bw;
    if (i === 0 || i === bays - 1) {        // end bays: plaster over a board wainscot, a small window
      pen.fill(rectZ(a, b, M.deckY, M.wallTop, M.zf), PAL.plaster);
      pen.fill(rectZ(a, b, M.deckY, 1.25, M.zf), PAL.woodLt);
      const boards = new Path2D();
      for (let x = a + 0.18; x < b; x += 0.18) boards.addPath(L3([[x, M.deckY, M.zf], [x, 1.25, M.zf]]));
      pen.stroke(boards, PAL.wood, 1, 'put', 0.7);
      pen.fill(rectZ(a + bw * 0.3, b - bw * 0.3, 1.55, 2.1, M.zf), PAL.shojiDim);
      latticeZ(a + bw * 0.3, b - bw * 0.3, 1.55, 2.1, M.zf, 4, 3, PAL.wood);
    } else {                                // shoji: paper panels lit from inside
      const glow = 0.8 + 0.2 * smoother((t - 1.0) / 2.5) + 0.03 * wz('shoji' + i, t, 1.3, 1);
      pen.fill(rectZ(a, b, M.deckY, 2.2, M.zf), cmix(PAL.shojiDim, PAL.shoji, glow));
      latticeZ(a, b, M.deckY + 0.3, 2.2, M.zf, 4, 6, cmix(PAL.wood, PAL.woodLt, 0.4), 1.1);
      pen.fill(rectZ(a, b, M.deckY, M.deckY + 0.3, M.zf), PAL.woodLt);   // kick panel
      pen.fill(rectZ(a, b, 2.2, M.wallTop, M.zf), PAL.plaster);          // transom
      latticeZ(a + 0.1, b - 0.1, 2.28, 2.65, M.zf, 8, 1, PAL.wood);
    }
  }
  // posts and beams
  const tim = new Path2D();
  for (let i = 0; i <= bays; i++) { const x = M.x0 + i * bw; tim.addPath(rectZ(x - 0.09, x + 0.09, 0.42, M.wallTop, M.zf)); }
  tim.addPath(rectZ(M.x0, M.x1, 2.16, 2.26, M.zf));
  tim.addPath(rectZ(M.x0, M.x1, M.wallTop - 0.14, M.wallTop, M.zf));
  pen.fill(tim, PAL.wood);
  // engawa: deck top, fascia, eave posts at the deck edge
  const dz0 = M.zf - 1.2;
  pen.fill(Q3([[M.x0 - 0.3, M.deckY, dz0], [M.x1 + 0.3, M.deckY, dz0], [M.x1 + 0.3, M.deckY, M.zf], [M.x0 - 0.3, M.deckY, M.zf]]), cmix(PAL.woodLt, PAL.thatchEdge, 0.3));
  pen.fill(rectZ(M.x0 - 0.3, M.x1 + 0.3, M.deckY - 0.18, M.deckY, dz0), PAL.wood);
  const legs = new Path2D();
  for (let x = M.x0; x <= M.x1 + 0.01; x += bw) legs.addPath(rectZ(x - 0.06, x + 0.06, 0.0, M.deckY - 0.18, dz0 + 0.1));
  pen.fill(legs, PAL.wood);
  pen.fill(rectX(M.x1 + 0.3, dz0, M.zf, M.deckY - 0.18, M.deckY), PAL.wood);
  // the eave's deep shade on the wall top
  pen.fill(Q3([[M.x0, M.wallTop, M.zf], [M.x1, M.wallTop, M.zf], [M.x1, M.wallTop - 0.9, M.zf], [M.x0, M.wallTop - 0.9, M.zf]]),
    { lin: [0, pj(0, M.wallTop, M.zf)[1], 0, pj(0, M.wallTop - 0.9, M.zf)[1]], stops: [[0, PAL.shadow, 1], [1, PAL.shadow, 0]] }, 'add');
  // persimmons drying on strings under the eaves (hoshigaki)
  const kaki = new Path2D(), cord = new Path2D();
  const rk = rngFor('kaki');
  for (let s = 0; s < 9; s++) {
    const x = M.x0 + 1.4 + s * 0.42 + (s > 4 ? 3.6 : 0), z = M.zf - 0.95;
    const sway = wz('kaki' + s, t, 0.35, 0.012);
    cord.addPath(L3([[x, M.eaveY - 0.1, z], [x + sway, 1.35, z]]));
    for (let k = 0; k < 9; k++) {
      const y = M.eaveY - 0.35 - k * 0.15 - rk() * 0.02, p = pj(x + sway * (1 - y / 3) + (k % 2 ? 0.03 : -0.03), y, z);
      const s2 = ppm(z) * 0.042;
      kaki.addPath(ellipsePath(p[0], p[1], s2, s2 * 1.12));
    }
  }
  pen.stroke(cord, PAL.wood, 0.8);
  pen.fill(kaki, C(0.45, 0.35, 0.9, 0, 0, 0.12));
  // roof: thick thatch with a cut edge at the eaves
  const e = M;
  const front = [[e.eaveX0 + 0.6, e.eaveY + 0.5, e.eaveZ], [e.eaveX1 - 0.6, e.eaveY + 0.5, e.eaveZ], [e.ridgeX1, e.ridgeY - 1.6, e.ridgeZ - 1.6], [e.ridgeX0, e.ridgeY - 1.6, e.ridgeZ - 1.6]];
  const hipR = [[e.eaveX1 - 0.6, e.eaveY + 0.5, e.eaveZ], [e.eaveX1, e.eaveY + 0.5, e.zb + 1.6], [e.ridgeX1, e.ridgeY - 1.6, e.ridgeZ + 1.6], [e.ridgeX1, e.ridgeY - 1.6, e.ridgeZ - 1.6]];
  // upper roof above the gable line
  const upper = [[e.ridgeX0 - 0.4, e.ridgeY - 1.6, e.ridgeZ - 1.6], [e.ridgeX1 + 0.4, e.ridgeY - 1.6, e.ridgeZ - 1.6], [e.ridgeX1 + 0.1, e.ridgeY, e.ridgeZ], [e.ridgeX0 - 0.1, e.ridgeY, e.ridgeZ]];
  // hip end: the right side (seam side) slope, visible in perspective
  pen.fill(Q3(hipR), cmix(PAL.thatch, PAL.thatchDk, 0.25));
  pen.fill(Q3(front), PAL.thatch);
  pen.fill(Q3(upper), cmix(PAL.thatch, PAL.thatchEdge, 0.2));
  // gable at the right ridge end: dark timber lattice with the smoke vent
  const gab = [[e.ridgeX1 + 0.4, e.ridgeY - 1.6, e.ridgeZ - 1.6], [e.ridgeX1 + 0.4, e.ridgeY - 1.6, e.ridgeZ + 1.6], [e.ridgeX1 + 0.1, e.ridgeY, e.ridgeZ]];
  pen.fill(Q3(gab), PAL.wood);
  latticeTri(gab, 5, cmix(PAL.woodLt, PAL.thatchEdge, 0.5));
  // thatch texture: bundles running down the slope, darker in the courses
  thatchStrokes(front, 'tf', 150, 1.1);
  thatchStrokes(hipR, 'th', 70, 1.0);
  thatchStrokes(upper, 'tu', 50, 0.9);
  // eave cut edge: the thick lighter band of cut bundle ends
  const edge = Q3([[e.eaveX0 + 0.6, e.eaveY + 0.5, e.eaveZ], [e.eaveX1 - 0.6, e.eaveY + 0.5, e.eaveZ], [e.eaveX1 - 0.3, e.eaveY - 0.12, e.eaveZ - 0.1], [e.eaveX0 + 0.3, e.eaveY - 0.12, e.eaveZ - 0.1]]);
  pen.fill(edge, PAL.thatchEdge);
  const ends = new Path2D(), re = rngFor('ends');
  for (let x = e.eaveX0 + 0.5; x < e.eaveX1 - 0.4; x += 0.09 + re() * 0.05) ends.addPath(L3([[x, e.eaveY + 0.45, e.eaveZ], [x + (re() - 0.5) * 0.05, e.eaveY - 0.08, e.eaveZ - 0.1]]));
  pen.stroke(ends, cmix(PAL.thatchEdge, PAL.thatchDk, 0.5), 1, 'put', 0.7);
  const edgeR = Q3([[e.eaveX1 - 0.6, e.eaveY + 0.5, e.eaveZ], [e.eaveX1, e.eaveY + 0.5, e.zb + 1.6], [e.eaveX1 + 0.1, e.eaveY - 0.12, e.zb + 1.6], [e.eaveX1 - 0.3, e.eaveY - 0.12, e.eaveZ - 0.1]]);
  pen.fill(edgeR, cmix(PAL.thatchEdge, PAL.thatchDk, 0.3));
  // ridge cap with its crossed timbers (karasu-odori)
  const rc = [[e.ridgeX0 - 0.2, e.ridgeY - 0.05, e.ridgeZ], [e.ridgeX1 + 0.2, e.ridgeY - 0.05, e.ridgeZ], [e.ridgeX1 + 0.2, e.ridgeY + 0.35, e.ridgeZ], [e.ridgeX0 - 0.2, e.ridgeY + 0.35, e.ridgeZ]];
  pen.fill(Q3(rc), PAL.wood);
  const xs = new Path2D();
  for (let x = e.ridgeX0 + 0.1; x <= e.ridgeX1; x += 0.72) {
    xs.addPath(L3([[x - 0.22, e.ridgeY + 0.75, e.ridgeZ - 0.05], [x + 0.22, e.ridgeY + 0.05, e.ridgeZ - 0.05]]));
    xs.addPath(L3([[x + 0.22, e.ridgeY + 0.75, e.ridgeZ - 0.05], [x - 0.22, e.ridgeY + 0.05, e.ridgeZ - 0.05]]));
  }
  pen.stroke(xs, PAL.wood, Math.max(1.5, ppm(e.ridgeZ) * 0.07));
  // backlight catches the ridge and the hip edge that faces the sun
  rimLine([[e.ridgeX0 - 0.2, e.ridgeY + 0.35, e.ridgeZ], [e.ridgeX1 + 0.2, e.ridgeY + 0.35, e.ridgeZ]], 2);
  rimLine([[e.ridgeX1 + 0.1, e.ridgeY, e.ridgeZ], [e.ridgeX1 + 0.4, e.ridgeY - 1.6, e.ridgeZ + 1.6], [e.eaveX1, e.eaveY + 0.5, e.zb + 1.6]], 2.2);
  // smoke from the irori, leaking out of the gable vent
  smoke(t, [e.ridgeX1 + 0.3, e.ridgeY - 0.7, e.ridgeZ], 'minka', 0.9, -0.2);
}
function latticeZ(x0, x1, y0, y1, z, nx, ny, col, w = 1) {
  const p = new Path2D();
  for (let i = 1; i < nx; i++) { const x = lerp(x0, x1, i / nx); p.addPath(L3([[x, y0, z], [x, y1, z]])); }
  for (let j = 1; j < ny; j++) { const y = lerp(y0, y1, j / ny); p.addPath(L3([[x0, y, z], [x1, y, z]])); }
  pen.stroke(p, col, Math.max(0.8, ppm(z) * 0.03 * w));
}
function latticeX(x, z0, z1, y0, y1, nz, ny, col) {
  const p = new Path2D();
  for (let i = 1; i < nz; i++) { const z = lerp(z0, z1, i / nz); p.addPath(L3([[x, y0, z], [x, y1, z]])); }
  for (let j = 1; j < ny; j++) { const y = lerp(y0, y1, j / ny); p.addPath(L3([[x, y, z0], [x, y, z1]])); }
  pen.stroke(p, col, Math.max(0.8, ppm(z0) * 0.03));
}
function latticeTri(tri, n, col) {
  const [a, b, c] = tri, p = new Path2D();
  for (let i = 1; i < n; i++) { const u = i / n; p.addPath(L3([vlerp(a, b, u), vlerp(c, vlerp(a, b, u), 0.25)])); }
  for (let j = 1; j < 3; j++) { const u = j / 3; p.addPath(L3([vlerp(a, c, u), vlerp(b, c, u)])); }
  pen.stroke(p, col, 1.2);
}
function thatchStrokes(quad, key, n, w) {
  const [a, b, c, d] = quad, r = rngFor(key), p = new Path2D(), q = new Path2D();
  const at = (u, v) => vlerp(vlerp(a, b, u), vlerp(d, c, u), v);
  for (let i = 0; i < n; i++) {
    const u = r(), v = r() * 0.95, len = 0.05 + r() * 0.12;
    (i % 3 ? p : q).addPath(L3([at(u, v), at(u + (r() - 0.5) * 0.01, Math.min(1, v + len))]));
  }
  pen.stroke(p, PAL.thatchDk, w, 'put', 0.55);
  pen.stroke(q, C(0.55, 0.12, 0.35), w * 0.9, 'put', 0.45);
  // horizontal courses
  const cp = new Path2D();
  for (let k = 1; k < 5; k++) { const v = k / 5 + (r() - 0.5) * 0.03; cp.addPath(L3([at(0.02, v), at(0.98, v)])); }
  pen.stroke(cp, PAL.thatchDk, w * 1.1, 'put', 0.35);
}
/* smoke: soft puffs rising and spreading, each on its own life cycle */
function smoke(t, base, key, amount = 1, drift = 0.3) {
  const n = 9, p = new Path2D();
  for (let i = 0; i < n; i++) {
    const period = 6.5, age = fract(t / period + i / n) * period, u = age / period;
    const life = Math.sin(Math.PI * u) ** 1.5;
    const x = base[0] + drift * age * 0.5 + wz(key + 'sx' + i, t, 0.25, 0.25) * u, y = base[1] + age * 0.55, z = base[2];
    const r = (0.25 + age * 0.22) * ppm(z);
    const s = pj(x, y, z);
    p.addPath(ellipsePath(s[0], s[1], r * 1.2, r * 0.8));
    if (life > 0.02) pen.fill(ellipsePath(s[0], s[1], r * 1.2, r * 0.8), C(0.2, 0.2, 0.2, 0.1, 0, 0.1), 'mix', 0.18 * life * amount);
  }
}

/* ── Ontario farmhouse ──────────────────────────────────────────────────────
   Red brick Gothic Revival: side-gabled roof with a steep centre gable and
   a lancet window, cream trim and bargeboards, a full-width verandah on
   turned posts, tall sash windows lit for the evening, brick chimneys.   */
const FH = { x0: 5.2, x1: 14.8, zf: 37.0, zb: 44.5, eaveY: 5.0, ridgeY: 8.3, ridgeZ: 40.75, over: 0.4 };
function drawFarmhouse(t) {
  const F_ = FH;
  // gable end facing the seam (x0 plane): wall, gable triangle
  pen.fill(Q3([[F_.x0, 0, F_.zf], [F_.x0, 0, F_.zb], [F_.x0, F_.eaveY, F_.zb], [F_.x0, F_.ridgeY, F_.ridgeZ], [F_.x0, F_.eaveY, F_.zf]]), PAL.brickDk);
  brickCourses('x', F_.x0, F_.zf, F_.zb, 0.5, F_.eaveY, 'bx');
  pen.fill(rectX(F_.x0, F_.zf, F_.zb, 0, 0.5), PAL.stone);
  sashX(F_.x0, 39.8, 41.6, 1.3, 3.0, t, 'sx1');
  sashX(F_.x0, 40.2, 41.3, 5.3, 6.6, t, 'sx2', true);
  // front wall
  pen.fill(rectZ(F_.x0, F_.x1, 0.5, F_.eaveY, F_.zf), PAL.brick);
  brickCourses('z', F_.zf, F_.x0, F_.x1, 0.5, F_.eaveY, 'bz');
  pen.fill(rectZ(F_.x0, F_.x1, 0, 0.5, F_.zf), PAL.stone);
  // centre gable wall rising through the roof
  const gx = (F_.x0 + F_.x1) / 2, gw = 1.7, gTop = 8.05;
  pen.fill(Q3([[gx - gw, F_.eaveY, F_.zf], [gx + gw, F_.eaveY, F_.zf], [gx + gw, F_.eaveY + 0.3, F_.zf], [gx, gTop, F_.zf], [gx - gw, F_.eaveY + 0.3, F_.zf]]), PAL.brick);
  // front roof slopes on each side of the gable
  const rf = (xa, xb) => Q3([[xa, F_.eaveY, F_.zf - F_.over], [xb, F_.eaveY, F_.zf - F_.over], [xb, F_.ridgeY, F_.ridgeZ], [xa, F_.ridgeY, F_.ridgeZ]]);
  pen.fill(rf(F_.x0 - F_.over, F_.x1 + F_.over), PAL.shingle);
  shingleLines(F_.x0 - F_.over, F_.x1 + F_.over, t);
  // re-draw the gable wall over the slope, with its own steep little roof
  const gab = Q3([[gx - gw, F_.eaveY, F_.zf], [gx + gw, F_.eaveY, F_.zf], [gx + gw, F_.eaveY + 0.3, F_.zf], [gx, gTop, F_.zf], [gx - gw, F_.eaveY + 0.3, F_.zf]]);
  pen.fill(gab, PAL.brick);
  // the gable's own roof edge: a thin band of shingle above the bargeboard
  pen.fill(Q3([[gx - gw - 0.3, F_.eaveY + 0.1, F_.zf - 0.3], [gx, gTop + 0.3, F_.zf - 0.3], [gx, gTop + 0.55, F_.zf - 0.25], [gx - gw - 0.45, F_.eaveY + 0.3, F_.zf - 0.25]]), PAL.shingle);
  pen.fill(Q3([[gx + gw + 0.3, F_.eaveY + 0.1, F_.zf - 0.3], [gx, gTop + 0.3, F_.zf - 0.3], [gx, gTop + 0.55, F_.zf - 0.25], [gx + gw + 0.45, F_.eaveY + 0.3, F_.zf - 0.25]]), PAL.shingle);
  // bargeboard: cream trim with a scalloped edge
  const bb = (a, b) => {
    const pts = []; for (let i = 0; i <= 14; i++) pts.push(vlerp(a, b, i / 14));
    pen.stroke(L3(pts), PAL.trim, Math.max(2, ppm(F_.zf) * 0.16));
    const sc = new Path2D();
    for (let i = 0; i < 14; i++) { const p = pj(...vlerp(a, b, (i + 0.5) / 14)); sc.addPath(ellipsePath(p[0], p[1] + ppm(F_.zf) * 0.12, ppm(F_.zf) * 0.07, ppm(F_.zf) * 0.07)); }
    pen.fill(sc, PAL.trim);
  };
  bb([gx - gw - 0.3, F_.eaveY + 0.1, F_.zf - 0.3], [gx, gTop + 0.3, F_.zf - 0.3]);
  bb([gx + gw + 0.3, F_.eaveY + 0.1, F_.zf - 0.3], [gx, gTop + 0.3, F_.zf - 0.3]);
  // lancet window in the gable
  const lw = 0.45, lb = 5.35, lt = 6.9, lz = F_.zf - 0.01;
  const arch = [];
  for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI; arch.push([gx - lw * Math.cos(a), lt - 0.6 + Math.pow(Math.sin(a), 0.6) * 0.6, lz]); }
  const lancet = Q3([[gx - lw, lb, lz], [gx + lw, lb, lz]].concat(arch.reverse()).map(p => p));
  pen.fill(lancet, PAL.trim);
  const lancetIn = Q3([[gx - lw + 0.1, lb + 0.1, lz], [gx + lw - 0.1, lb + 0.1, lz]].concat(arch.map(([x, y, z]) => [gx + (x - gx) * 0.78, lb + 0.1 + (y - lb - 0.1) * 0.93, z])));
  pen.fill(lancetIn, cmix(PAL.glow, PAL.brickDk, 0.35 - 0.15 * smoother((t - 2) / 3)));
  pen.stroke(L3([[gx, lb + 0.1, lz], [gx, lt - 0.1, lz]]), PAL.trim, 1.4);
  // fascia/soffit along the front eave
  pen.fill(Q3([[F_.x0 - F_.over, F_.eaveY - 0.25, F_.zf - F_.over], [F_.x1 + F_.over, F_.eaveY - 0.25, F_.zf - F_.over], [F_.x1 + F_.over, F_.eaveY + 0.05, F_.zf - F_.over], [F_.x0 - F_.over, F_.eaveY + 0.05, F_.zf - F_.over]]), PAL.trim);
  // gable end roof edge (seam side) with its bargeboard
  bb([F_.x0 - F_.over, F_.eaveY, F_.zf - F_.over], [F_.x0 - F_.over, F_.ridgeY + 0.1, F_.ridgeZ]);
  // chimneys
  chimney(F_.x0 + 0.5, F_.ridgeZ, F_.ridgeY, t, true);
  chimney(F_.x1 - 0.5, F_.ridgeZ, F_.ridgeY, t, false);
  // ground-floor windows and door
  for (const x of [6.6, 8.2, 11.8, 13.4]) sashZ(x - 0.45, x + 0.45, 1.2, 3.0, F_.zf, t, 'w' + x);
  for (const x of [6.6, 8.2, 11.8, 13.4]) sashZ(x - 0.4, x + 0.4, 3.7, 4.6, F_.zf, t, 'u' + x, true);
  pen.fill(rectZ(gx - 0.55, gx + 0.55, 0.55, 3.0, F_.zf), PAL.trim);
  pen.fill(rectZ(gx - 0.42, gx + 0.42, 0.6, 2.85, F_.zf), cmix(PAL.shutter, PAL.wood, 0.3));
  pen.fill(rectZ(gx - 0.3, gx + 0.3, 2.3, 2.75, F_.zf), cmix(PAL.glow, PAL.brickDk, 0.2));
  // verandah
  const vz = F_.zf - 2.2, vy = 3.15;
  pen.fill(Q3([[F_.x0 + 0.5, 0.55, vz], [F_.x1 - 0.5, 0.55, vz], [F_.x1 - 0.5, 0.55, F_.zf], [F_.x0 + 0.5, 0.55, F_.zf]]), cmix(PAL.trim, PAL.woodLt, 0.4));
  pen.fill(rectZ(F_.x0 + 0.5, F_.x1 - 0.5, 0.25, 0.55, vz), PAL.trim);
  // porch roof and its shade on the wall
  pen.fill(Q3([[F_.x0 + 0.3, vy, vz - 0.2], [F_.x1 - 0.3, vy, vz - 0.2], [F_.x1 - 0.3, vy + 0.6, F_.zf], [F_.x0 + 0.3, vy + 0.6, F_.zf]]), PAL.shingle);
  pen.fill(Q3([[F_.x0 + 0.5, 0.55, F_.zf - 0.01], [F_.x1 - 0.5, 0.55, F_.zf - 0.01], [F_.x1 - 0.5, vy, F_.zf - 0.01], [F_.x0 + 0.5, vy, F_.zf - 0.01]]),
    { lin: [0, pj(0, vy, F_.zf)[1], 0, pj(0, 0.55, F_.zf)[1]], stops: [[0, PAL.shadow, 0.9], [1, PAL.shadow, 0.2]] }, 'add');
  pen.fill(rectZ(F_.x0 + 0.3, F_.x1 - 0.3, vy - 0.22, vy + 0.02, vz - 0.2), PAL.trim);
  // posts with brackets and a rail
  const posts = new Path2D(), brackets = new Path2D();
  for (let i = 0; i <= 4; i++) {
    const x = lerp(F_.x0 + 0.7, F_.x1 - 0.7, i / 4);
    posts.addPath(rectZ(x - 0.07, x + 0.07, 0.55, vy - 0.2, vz));
    for (const s of [-1, 1]) brackets.addPath(Q3([[x, vy - 0.22, vz], [x + s * 0.4, vy - 0.22, vz], [x + s * 0.05, vy - 0.6, vz]]));
  }
  pen.fill(posts, PAL.trim); pen.fill(brackets, PAL.trim);
  const rail = new Path2D();
  rail.addPath(rectZ(F_.x0 + 0.6, gx - 0.8, 1.35, 1.42, vz));
  rail.addPath(rectZ(gx + 0.8, F_.x1 - 0.6, 1.35, 1.42, vz));
  for (let x = F_.x0 + 0.8; x < F_.x1 - 0.6; x += 0.16) if (Math.abs(x - gx) > 0.8) rail.addPath(rectZ(x - 0.02, x + 0.02, 0.6, 1.36, vz));
  pen.fill(rail, PAL.trim);
  // backlight on the roof ridge and the gable edges facing the sun
  rimLine([[F_.x0 - F_.over, F_.ridgeY + 0.1, F_.ridgeZ], [F_.x1 + F_.over, F_.ridgeY + 0.1, F_.ridgeZ]], 2);
  rimLine([[F_.x0 - F_.over, F_.eaveY, F_.zf - F_.over], [F_.x0 - F_.over, F_.ridgeY + 0.1, F_.ridgeZ]], 1.8, 0.8);
  rimLine([[gx - gw - 0.3, F_.eaveY + 0.1, F_.zf - 0.3], [gx, gTop + 0.3, F_.zf - 0.3]], 1.6, 0.7);
}
function brickCourses(axis, c, a0, a1, y0, y1, key) {
  const p = new Path2D(), r = rngFor(key);
  for (let y = y0 + 0.3; y < y1; y += 0.3) {
    p.addPath(axis === 'z' ? L3([[a0, y, c], [a1, y, c]]) : L3([[c, y, a0], [c, y, a1]]));
  }
  pen.stroke(p, PAL.brickDk, 0.9, 'put', 0.45);
  // a few darker bricks for texture
  const b = new Path2D();
  for (let i = 0; i < 90; i++) {
    const u = lerp(a0, a1, r()), y = y0 + Math.floor(r() * (y1 - y0) / 0.3) * 0.3 + 0.15;
    b.addPath(axis === 'z' ? rectZ(u, u + 0.24, y - 0.1, y + 0.1, c) : rectX(c, u, u + 0.24, y - 0.1, y + 0.1));
  }
  pen.fill(b, cmix(PAL.brick, PAL.brickDk, 0.6), 'put', 0.7);
}
function shingleLines(x0, x1, t) {
  const p = new Path2D();
  for (let k = 1; k < 12; k++) {
    const u = k / 12, y = lerp(FH.eaveY, FH.ridgeY, u), z = lerp(FH.zf - FH.over, FH.ridgeZ, u);
    p.addPath(L3([[x0, y, z], [x1, y, z]]));
  }
  pen.stroke(p, cmix(PAL.shingle, PAL.shadow, 0.6), 0.9, 'put', 0.6);
}
function sashZ(x0, x1, y0, y1, z, t, key, upper) {
  pen.fill(rectZ(x0 - 0.08, x1 + 0.08, y0 - 0.1, y1 + 0.12, z - 0.01), PAL.trim);
  const lit = upper ? 0.35 : 0.85 * smoother((t - 1.4 - (key.length % 3) * 0.4) / 1.8) + 0.12;
  pen.fill(rectZ(x0, x1, y0, y1, z - 0.02), cmix(C(0.1, 0.2, 0.12, 0.3, 0.05, 0.45), PAL.glow, lit));
  const p = new Path2D();
  p.addPath(L3([[x0, (y0 + y1) / 2, z - 0.02], [x1, (y0 + y1) / 2, z - 0.02]]));
  p.addPath(L3([[(x0 + x1) / 2, y0, z - 0.02], [(x0 + x1) / 2, y1, z - 0.02]]));
  pen.stroke(p, PAL.trim, Math.max(1, ppm(z) * 0.05));
  if (!upper) { // shutters
    pen.fill(rectZ(x0 - 0.46, x0 - 0.1, y0, y1, z - 0.01), PAL.shutter);
    pen.fill(rectZ(x1 + 0.1, x1 + 0.46, y0, y1, z - 0.01), PAL.shutter);
  }
}
function sashX(x, z0, z1, y0, y1, t, key, upper) {
  pen.fill(rectX(x - 0.01, z0 - 0.1, z1 + 0.1, y0 - 0.1, y1 + 0.12), PAL.trim);
  const lit = upper ? 0.3 : 0.7 * smoother((t - 2.2) / 2) + 0.15;
  pen.fill(rectX(x - 0.02, z0, z1, y0, y1), cmix(C(0.1, 0.2, 0.12, 0.3, 0.05, 0.45), PAL.glow, lit));
  pen.stroke(L3([[x - 0.02, (y0 + y1) / 2, z0], [x - 0.02, (y0 + y1) / 2, z1]]), PAL.trim, 1.2);
}
function chimney(x, z, y, t, smokes) {
  const w = 0.35, top = y + 1.0;
  pen.fill(Q3([[x - w, y - 0.6, z - w], [x + w, y - 0.6, z - w], [x + w, top, z - w], [x - w, top, z - w]]), PAL.brickDk);
  pen.fill(Q3([[x - w, y - 0.6, z - w], [x - w, y - 0.6, z + w], [x - w, top, z + w], [x - w, top, z - w]]), cmix(PAL.brickDk, PAL.shadow, 0.3));
  pen.fill(rectZ(x - w - 0.06, x + w + 0.06, top - 0.12, top, z - w - 0.05), PAL.brickDk);
  rimLine([[x - w, top, z - w], [x + w, top, z - w]], 1.4, 0.7);
  if (smokes) smoke(t, [x, top + 0.2, z], 'chim', 1, 0.35);
}

/* ── trees ──────────────────────────────────────────────────────────────────── */
// canopy leaves as clusters in a volume; the wind moves each cluster
function leafCloud(key, cx, cy, cz, rx, ry, rz, n, t, cols, opts = {}) {
  const r = rngFor(key), groups = cols.map(() => new Path2D());
  const size = opts.size || 0.22, tiers = opts.tiers || 0;
  for (let i = 0; i < n; i++) {
    let u = r() * 2 - 1, v = r() * 2 - 1, w = r() * 2 - 1;
    if (u * u + v * v + w * w > 1) { i--; continue; }
    if (tiers) v = Math.round((v + 1) * tiers / 2) / (tiers / 2) - 1 + (r() - 0.5) * 0.25;
    const x = cx + u * rx, y = cy + v * ry, z = cz + w * rz;
    const sway = wz(key + (i % 7), t, 0.45, 0.06) * (0.3 + (v + 1) * 0.5);
    const p = pj(x + sway, y + sway * 0.3, z), s = ppm(z) * size * (0.6 + r() * 0.8);
    // light side: leaves toward the sun (and the top) are brighter
    const litK = clamp(0.5 + (opts.sunSide || 0) * u * 0.5 + v * 0.35 + (r() - 0.5) * 0.5, 0, 0.999);
    const gi = Math.floor(litK * cols.length);
    const ang = r() * Math.PI;
    groups[gi].addPath(ellipsePath(p[0], p[1], s, s * (0.55 + r() * 0.3), ang));
  }
  groups.forEach((g, i) => pen.fill(g, cols[i]));
}
function trunk(pts3, radii, col) {
  pen.fill(capsule(pts3, radii), col);
}
function drawMomiji(t) {    // Japanese maple: low, spreading, layered, fine red leaves
  const x = -4.75, z = 26;
  trunk([[x, 0, z], [x + 0.15, 1.3, z], [x - 0.35, 2.4, z]], [0.16, 0.12, 0.07], PAL.bark);
  trunk([[x + 0.15, 1.3, z], [x + 0.9, 2.3, z + 0.2]], [0.08, 0.05], PAL.bark);
  trunk([[x + 0.1, 1.0, z], [x - 1.1, 1.9, z - 0.2]], [0.07, 0.04], PAL.bark);
  leafCloud('momiji', x - 0.1, 2.7, z, 1.75, 0.9, 1.3, 1300, t, [PAL.momijiDk, PAL.momiji, PAL.momiji, PAL.momijiLt], { size: 0.1, tiers: 3, sunSide: 1 });
}
function drawKaki(t) {      // persimmon: bare-ish branches heavy with orange fruit
  const x = -17.3, z = 30;
  trunk([[x, 0, z], [x + 0.2, 2.6, z], [x - 0.3, 4.2, z]], [0.22, 0.16, 0.08], PAL.bark);
  const br = rngFor('kakibr');
  for (let i = 0; i < 9; i++) {
    const a = -1.2 + i * 0.3, l = 1.2 + br() * 1.5, y0 = 1.8 + br() * 2;
    trunk([[x + 0.1, y0, z], [x + Math.sin(a) * l, y0 + Math.cos(a) * l * 0.7, z + (br() - 0.5)]], [0.06, 0.02], PAL.bark);
  }
  leafCloud('kakil', x, 3.6, z, 2.0, 1.5, 1.2, 260, t, [C(0.3, 0.2, 0.3, 0.3, 0.5, 0.5), C(0.45, 0.3, 0.55, 0.1, 0.3, 0.3)], { size: 0.18, sunSide: 1 });
  const fr = rngFor('kakif'), fruit = new Path2D();
  for (let i = 0; i < 40; i++) {
    const a = fr() * TAU, rr = Math.sqrt(fr());
    const p = pj(x + Math.cos(a) * 1.9 * rr, 3.4 + Math.sin(a) * 1.3 * rr, z - 0.8);
    fruit.addPath(ellipsePath(p[0], p[1], ppm(z) * 0.07, ppm(z) * 0.065));
  }
  pen.fill(fruit, C(0.55, 0.25, 0.95, 0, 0, 0.05));
}
function drawLantern(t) {   // stone lantern (tōrō)
  const x = -6.44, z = 18, s = C(0.22, 0.1, 0.2, 0.15, 0, 0.42), sd = C(0.2, 0.12, 0.2, 0.22, 0, 0.55);
  pen.fill(Q3([[x - 0.3, 0, z], [x + 0.3, 0, z], [x + 0.25, 0.15, z], [x - 0.25, 0.15, z]]), sd);
  pen.fill(rectZ(x - 0.08, x + 0.08, 0.15, 0.85, z), s);
  pen.fill(Q3([[x - 0.25, 0.85, z], [x + 0.25, 0.85, z], [x + 0.2, 0.95, z], [x - 0.2, 0.95, z]]), s);
  pen.fill(rectZ(x - 0.17, x + 0.17, 0.95, 1.3, z), s);
  pen.fill(rectZ(x - 0.07, x + 0.07, 1.03, 1.22, z - 0.01), C(0.55, 0.05, 0.3));
  pen.fill(Q3([[x - 0.36, 1.3, z], [x + 0.36, 1.3, z], [x + 0.12, 1.52, z], [x - 0.12, 1.52, z]]), sd);
  pen.fill(ellipsePath(...pj(x, 1.58, z), ppm(z) * 0.06, ppm(z) * 0.07), sd);
}
function drawRacks(t) {     // hasa-kake: rice sheaves drying on wooden racks in the terraces
  const racks = [[-9.5, -5.2, 58], [-12, -7, 70], [-8.5, -4.8, 82], [-18, -11, 95]];
  const rk = rngFor('racks');
  for (const [x0, x1, z] of racks) {
    const k = clamp((z - 40) / 200, 0, 1);
    const col = cmix(C(0.55, 0.3, 0.55, 0.05, 0.02, 0.22), PAL.haze, 0.25 + k);
    const poles = new Path2D();
    for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 3) poles.addPath(rectZ(x - 0.05, x + 0.05, 0, 1.9, z));
    pen.fill(poles, cmix(PAL.wood, PAL.haze, 0.3 + k));
    const sheaves = new Path2D();
    for (let x = x0; x < x1; x += 0.13) sheaves.addPath(Q3([[x - 0.02, 1.7, z], [x + 0.14, 1.7, z], [x + 0.12, 0.85 + rk() * 0.1, z], [x, 0.85 + rk() * 0.1, z]]));
    pen.fill(sheaves, col);
    pen.stroke(L3([[x0, 1.72, z], [x1, 1.72, z]]), cmix(PAL.wood, PAL.haze, 0.3 + k), 1);
  }
}
function drawVillage(t) {   // far farmhouses and cedars on the slopes of the Japanese valley
  const r = rngFor('village');
  for (let i = 0; i < 7; i++) {
    const z = 160 + r() * 180, x = -22 - r() * 110, w = 5 + r() * 4;
    const k = clamp(z / 400, 0, 1);
    pen.fill(Q3([[x - w / 2, 0, z], [x + w / 2, 0, z], [x + w / 2, 2.5, z], [x - w / 2, 2.5, z]]), cmix(PAL.wood, PAL.haze, 0.5 + k * 0.4));
    pen.fill(Q3([[x - w / 2 - 0.8, 2.5, z], [x + w / 2 + 0.8, 2.5, z], [x + w * 0.2, 6, z], [x - w * 0.2, 6, z]]), cmix(PAL.thatch, PAL.haze, 0.45 + k * 0.4));
  }
  const cd = new Path2D();
  for (let i = 0; i < 40; i++) {
    const z = 170 + r() * 240, x = -24 - r() * 160, h = 12 + r() * 8, w = h * 0.22;
    cd.addPath(Q3([[x - w, 0, z], [x + w, 0, z], [x, h, z]]));
  }
  pen.fill(cd, cmix(PAL.cedar, PAL.haze, 0.55));
}
function drawSugarMaple(t) {
  const x = 4.85, z = 27;
  trunk([[x, 0, z], [x - 0.1, 2.2, z], [x + 0.2, 4.2, z]], [0.3, 0.22, 0.12], PAL.bark);
  trunk([[x - 0.1, 2.2, z], [x - 1.3, 3.8, z - 0.2]], [0.12, 0.06], PAL.bark);
  trunk([[x, 2.8, z], [x + 1.4, 4.3, z + 0.2]], [0.11, 0.05], PAL.bark);
  leafCloud('sugar', x, 4.9, z, 2.3, 1.9, 1.8, 1500, t, [PAL.sugarDk, PAL.sugar, PAL.sugar, PAL.sugarLt], { size: 0.15, sunSide: -1 });
}
function drawBirches(t) {
  const r = rngFor('birch');
  for (let i = 0; i < 5; i++) {
    const x = 16.0 + i * 0.8 + r() * 0.3, z = 29.5 + r() * 1.5, h = 7 + r() * 3, lean = (r() - 0.5) * 0.6;
    trunk([[x, 0, z], [x + lean * 0.5, h * 0.5, z], [x + lean, h, z]], [0.13, 0.1, 0.05], PAL.birch);
    const marks = new Path2D();
    for (let k = 0; k < 12; k++) { const y = r() * h * 0.9, p = pj(x + lean * y / h, y, z); marks.addPath(ellipsePath(p[0], p[1], ppm(z) * 0.07, ppm(z) * 0.018)); }
    pen.fill(marks, C(0.1, 0.2, 0.2, 0.3, 0, 0.7));
    leafCloud('birchl' + i, x + lean, h * 0.78, z, 1.1, 1.8, 0.9, 170, t, [C(0.55, 0.12, 0.45, 0.04, 0.12, 0.2), C(0.7, 0.05, 0.3), C(0.85, 0.0, 0.2)], { size: 0.13, sunSide: -1 });
  }
}
function drawSpruces(t) {
  const r = rngFor('spruces');
  const list = [];
  for (let i = 0; i < 24; i++) list.push([7 + r() * 30, 47 + r() * 16, 9 + r() * 7]);
  list.sort((a, b) => b[1] - a[1]);
  const rr = rngFor('spruceShape');
  // the forest mass behind the single trees, so their gaps show woods, not sky
  const band = [[5.5, 0, 66]];
  for (let x = 5.5; x <= 48; x += 0.9) band.push([x, 4.2 + rr() * 2.2 + (Math.floor(x / 0.9) % 2) * 1.4, 66]);
  band.push([48, 0, 66]);
  pen.fill(Q3(band), cmix(PAL.spruce, PAL.haze, 0.25));
  for (const [x, z, h] of list) {
    // a narrow spire over drooping tiers of branches, each tier a little ragged
    const tiers = 9 + Math.floor(rr() * 5), left = [], right = [];
    for (let k = 0; k < tiers; k++) {
      const u = k / tiers, y = h * (0.08 + 0.9 * u), th = h * 0.9 / tiers;
      const w = Math.pow(1 - u, 0.85) * h * 0.2 + 0.12;
      const jl = 0.85 + rr() * 0.3, jr = 0.85 + rr() * 0.3;
      left.push([x - w * jl, y - th * 0.35, z], [x - w * 0.32, y + th * 0.3, z]);
      right.push([x + w * jr, y - th * 0.35, z], [x + w * 0.32, y + th * 0.3, z]);
    }
    const outline = [[x - 0.12, 0, z]].concat(left, [[x, h + 0.6, z]], right.reverse(), [[x + 0.12, 0, z]]);
    pen.fill(Q3(outline), PAL.spruce);
  }
}
function drawFence(t) {     // split-rail fence along the lawn
  const p = new Path2D(), rails = new Path2D();
  const z0 = 22;
  let prev = null;
  for (let i = 0; i <= 6; i++) {
    const x = 6.4 + i * 2.4, z = z0 + (i % 2 ? 0.35 : -0.35);
    p.addPath(Q3([[x - 0.06, 0, z], [x + 0.06, 0, z], [x + 0.06, 1.3, z], [x - 0.06, 1.3, z]]));
    if (prev) for (const y of [0.55, 1.05]) rails.addPath(Q3([[prev[0], y, prev[1]], [x, y + 0.03, z], [x, y + 0.13, z], [prev[0], y + 0.1, prev[1]]]));
    prev = [x, z];
  }
  pen.fill(rails, cmix(PAL.woodLt, PAL.shadow, 0.2)); pen.fill(p, PAL.wood);
}
function drawCanoe(t) {     // a red canoe turned over on two sawhorses by the lake path
  const z = 17.5, x0 = 14.2, x1 = 18.6, y = 0.78;
  const hull = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16, x = lerp(x0, x1, u); hull.push([x, y + 0.28 * Math.sin(Math.PI * u) ** 0.6 + 0.12 * (Math.abs(u - 0.5) * 2) ** 3, z]); }
  const bottom = []; for (let i = 16; i >= 0; i--) { const u = i / 16; bottom.push([lerp(x0, x1, u), y + 0.03 * Math.sin(Math.PI * u) + 0.2 * (Math.abs(u - 0.5) * 2) ** 3, z]); }
  const legs = new Path2D();
  for (const x of [x0 + 1.0, x1 - 1.0]) { legs.addPath(L3([[x - 0.3, 0, z], [x, y, z]])); legs.addPath(L3([[x + 0.3, 0, z], [x, y, z]])); }
  pen.stroke(legs, PAL.wood, 2);
  pen.fill(Q3(hull.concat(bottom)), C(0.2, 0.75, 0.8, 0.05, 0, 0.2));
  pen.stroke(L3(bottom), C(0.1, 0.1, 0.1, 0.2, 0, 0.3), 1.2);
}
function drawDock(t) {
  pen.fill(groundPoly([[1.4, 76], [2.4, 76], [2.4, 62], [1.4, 62]], 0.35), PAL.woodLt);
  const p = new Path2D();
  for (let z = 63; z < 76; z += 2) p.addPath(rectZ(1.45, 1.55, -0.3, 0.35, z));
  pen.fill(p, PAL.wood);
}
