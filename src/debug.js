// ?debug=heads: both heads large, at a sweep of view angles, for construction review
function drawHeadsDebug(t) {
  pen.rect(0, 0, W, H, C(0.05, 0.05, 0.08, 0.08, 0.05, 0.05));
  CAM.x = 0; CAM.y = 1.57; CAM.z = 0;
  const yaws = [-90, -60, -30, 0, 30, 60].map(d => d * DEG);
  ['hana', 'liam'].forEach((id, row) => {
    const w = WALKERS[id];
    yaws.forEach((yw, i) => {
      const x = (i - 2.5) * 0.3, y = 1.57 + (row ? -0.2 : 0.2), z = 1.3;
      const facing = -Math.PI / 2 + yw - Math.atan2(x, z);
      const headFr = frameH(facing);
      const ps = { t, headFr, headC: [x, y, z], neck: [x - Math.cos(facing) * 0.01, y - 0.14, z - Math.sin(facing) * 0.01], lookYaw: facing, pel: [x, y - 0.7, z] };
      const sx = SUN.x, sy = SUN.y; SUN.x = 960; SUN.y = 300;
      SIL = new Path2D(); drawHead(w, ps, LOOK[id], id); const hc = P2(ps.headC); rimPass(SIL, hc[0], hc[1], 5); SIL = null;
      SUN.x = sx; SUN.y = sy;
    });
  });
}
