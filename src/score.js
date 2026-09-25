/* ── score ────────────────────────────────────────────────────────────────────
   The music is rendered offline (tools/score.py) from the Salamander Grand
   Piano V3 recordings by Alexander Holm (CC BY 3.0) and embedded below as Opus.
   Its cues read the film's own event data (tools/events.json: footsteps, the
   look, the stop), so picture and sound share one clock.                   */
const MARKS = [0.62, 2.6, 4.28, 7.08, 12.22];
let _score = null;
function scoreBuffer() {
  if (_score) return _score;
  const el = document.getElementById('score');
  if (!el) return (_score = Promise.resolve(null));
  const bin = atob(el.textContent.trim()), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ctx = new OfflineAudioContext(2, 48000 * DUR, 48000);
  _score = ctx.decodeAudioData(bytes.buffer);
  return _score;
}
function buildScore() { return scoreBuffer(); }
function wavBase64(buf) {
  const n = Math.round(DUR * 48000), ch = 2, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true);
  out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, 48000, true); out.setUint32(28, 48000 * ch * 2, true);
  out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [0, 1].map(c => buf.getChannelData(Math.min(c, buf.numberOfChannels - 1)));
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const v = clamp(i < data[c].length ? data[c][i] : 0, -1, 1);
    out.setInt16(44 + (i * ch + c) * 2, v < 0 ? v * 32768 : v * 32767, true);
  }
  let s = ''; const b = new Uint8Array(out.buffer);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
