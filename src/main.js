/* ── player and contract ─────────────────────────────────────────────────── */
const Q = new URLSearchParams(location.search);
const OUT = document.getElementById('c');
const OCTX = OUT.getContext('2d');
if (Q.get('capture')) {
  document.body.style.margin = '0';
  OUT.style.width = '1920px'; OUT.style.height = '1080px'; OUT.style.maxWidth = 'none';
  document.querySelector('nav').hidden = true; document.querySelector('small').hidden = true;
}
const VIEW = Q.get('view') || 'print';

function renderFrame(t) {
  t = clamp(t, 0, DUR);
  setCamera(t);
  pen.clear(); fineClear();
  pen.setTransform(1, 0, 0, 1, PAD, PAD);
  drawScene(t);
  if (VIEW === 'flat') composeFlat(OCTX); else compose(OCTX);
}

let audioBuf = null, actx = null, src = null, playing = false, muted = true, t0 = 0, tStart = 0, cur = 0;
async function boot() {
  initCompositor(OCTX);
  await bakeScene();
  renderFrame(Number(Q.get('t') || 0));
  window.__riso.ready = true;
}
window.__riso = {
  duration: DUR, ready: false,
  seek(t) { cur = t; renderFrame(t); },
  renderAudio: typeof buildScore === 'function' ? async () => wavBase64(await scoreBuffer()) : undefined,
  marks: typeof MARKS !== 'undefined' ? MARKS : [],
};

// in-page player: buffers frames once, then plays them back in time
const scrub = document.getElementById('scrub'), out = document.getElementById('time');
const cache = [];
function frameIndex(t) { return clamp(Math.round(t * FPS), 0, Math.round(DUR * FPS) - 1); }
function show(t) {
  const i = frameIndex(t);
  if (!cache[i]) { renderFrame(i / FPS); cache[i] = OCTX.getImageData(0, 0, W, H); }
  else OCTX.putImageData(cache[i], 0, 0);
  scrub.value = t; out.textContent = t.toFixed(2);
}
function tick() {
  if (!playing) return;
  const t = tStart + (performance.now() - t0) / 1000;
  if (t >= DUR) { playing = false; document.getElementById('play').textContent = 'Play'; stopAudio(); return; }
  show(t);
  requestAnimationFrame(tick);
}
function stopAudio() { if (src) { try { src.stop(); } catch (e) {} src = null; } }
async function startAudio(at) {
  stopAudio();
  if (muted || typeof scoreBuffer !== 'function') return;
  const buf = await scoreBuffer();
  actx = actx || new AudioContext();
  const ab = actx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
  for (let c = 0; c < buf.numberOfChannels; c++) ab.copyToChannel(buf.getChannelData(c), c);
  src = actx.createBufferSource(); src.buffer = ab; src.connect(actx.destination); src.start(0, at);
}
document.getElementById('play').onclick = async () => {
  playing = !playing;
  document.getElementById('play').textContent = playing ? 'Pause' : 'Play';
  if (playing) {
    tStart = Number(scrub.value) >= DUR - 0.05 ? 0 : Number(scrub.value);
    // buffer every frame first so playback is smooth even though a frame takes ~0.2 s to print
    for (let i = frameIndex(tStart); i < Math.round(DUR * FPS); i++) if (!cache[i]) { show(i / FPS); if (i % 10 === 0) await new Promise(r => setTimeout(r)); }
    await startAudio(tStart);
    t0 = performance.now(); tick();
  } else stopAudio();
};
document.getElementById('mute').onclick = () => { muted = !muted; document.getElementById('mute').textContent = muted ? 'Sound on' : 'Sound off'; };
scrub.oninput = () => { playing = false; stopAudio(); document.getElementById('play').textContent = 'Play'; show(Number(scrub.value)); };
boot();
