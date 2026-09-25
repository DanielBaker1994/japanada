/* ── camera ──────────────────────────────────────────────────────────────────
   World metres: X right, Y up, Z away from the lens (positive depth forward).
   The camera only translates, never rotates, so the horizon is the fixed row CY
   (lens rise) and a vertical plane at depth z maps to the screen by one affine
   transform: this is what lets baked cards reproject exactly.               */
const F = 1500, CX = 960, CY = 470;
const CAM = { x: 0, y: 1.8, z: 0 };
function camAt(t) {
  const u = clamp(t / DUR, 0, 1);
  return {
    x: 0,
    // a slow dolly-in over the whole film, easing to rest in the final hold
    z: 1.25 * (1 - Math.cos(Math.PI * u)) / 2,
    // the establishing view settles from a standing-high eye to the walkers' eye line
    y: 1.55 + 0.25 * (1 - smoother(t / 5.5)),
  };
}
function setCamera(t) { Object.assign(CAM, camAt(t)); }
function proj(X, Y, Z) {
  const z = Math.max(0.05, Z - CAM.z);
  return [CX + F * (X - CAM.x) / z, CY - F * (Y - CAM.y) / z, z];
}
// pixels per metre at depth Z
const ppm = (Z) => F / Math.max(0.05, Z - CAM.z);
// canvas transform that maps world (X, Y) on the plane at depth Z to screen
function cardTransform(Z) {
  const s = ppm(Z);
  return [s, 0, 0, -s, CX - s * CAM.x, CY + s * CAM.y];
}
