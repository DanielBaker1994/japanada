"""Score for Halfway: an original piano piece on Salamander Grand Piano V3 samples,
with footsteps, a wind chime and air, rendered to a 15.000 s 48 kHz stereo WAV.

Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0,
https://github.com/sfzinstruments/SalamanderGrandPiano (commit 3382bf9).

Musical idea: two scales that share almost everything. The Japanese side sings in
the miyako-bushi (in) scale on D (D Eb G A Bb), high and ornamented like a koto,
panned a little left. The North American side answers in a folk-hymn major
pentatonic (D E F# A B), open fifths in the left hand, panned a little right.
As the two walk toward each other the Japanese line drifts from in to yo
(D E G A B), the scale the two share, and when they stop the phrases meet in one
open D chord (D A E F#) whose top voice keeps the koto's grace note.

Usage: python3 score.py <events.json> <out.wav>
"""
import json, sys, os, math
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, fftconvolve, butter, sosfilt
import pyloudnorm

SR = 48000
DUR = 15.0
N = int(DUR * SR)
HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, '..', 'out', 'piano')
rng = np.random.default_rng(20260925)

# ── sample bank ──────────────────────────────────────────────────────────────
NAMES = {0: 'C', 3: 'D#', 6: 'F#', 9: 'A'}
LAYERS = (5, 8, 11)
_cache = {}
def load(root, layer):
    key = (root, layer)
    if key in _cache: return _cache[key]
    name = f'{NAMES[root % 12]}{root // 12 - 1}v{layer}.flac'
    d, sr = sf.read(os.path.join(SAMPLES, name), dtype='float32', always_2d=True)
    assert sr == SR, sr
    env = np.max(np.abs(d[:SR]), axis=1)
    w = int(SR * 0.002)
    pw = np.convolve(env ** 2, np.ones(w) / w, mode='same')
    onset = int(np.flatnonzero(pw > max(pw.max() * 0.0025, 1e-10))[0])
    d = d[max(0, onset - int(0.002 * SR)):].copy()
    d -= d.mean(axis=0)
    # match body level across keys so a phrase is voiced by velocity, not by sample luck
    rms = np.sqrt(np.mean(d[int(0.05 * SR):int(0.6 * SR)] ** 2)) + 1e-6
    d *= 0.1 / rms
    _cache[key] = d
    return d

RATIO = {-1: (84, 89), 0: (1, 1), 1: (89, 84)}
_shift = {}
def sample_for(midi, vel):
    root = min(range(21, 97, 3), key=lambda r: abs(r - midi))
    st = midi - root
    layer = LAYERS[0] if vel < 0.34 else LAYERS[1] if vel < 0.62 else LAYERS[2]
    key = (root, layer, st)
    if key not in _shift:
        d = load(root, layer)
        up, down = RATIO[st]
        # playing faster raises pitch: resample to fewer samples
        _shift[key] = d if st == 0 else resample_poly(d, down, up, axis=0).astype(np.float32)
    return _shift[key], layer

# ── piano performance ────────────────────────────────────────────────────────
PEDAL = [(0.0, 3.93), (3.98, 7.22), (7.26, 8.62), (8.66, 9.56), (9.6, 12.16), (12.2, 15.2)]
def pedal_release(t_off):
    """time at which the damper actually stops a key released at t_off"""
    for a, b in PEDAL:
        if a <= t_off < b: return b
    return t_off

notes = []   # (t, midi, vel, hold, pan)
def N_(t, name, vel, hold=0.4, pan=0.0, grace=None):
    notes.append((t, midi_of(name), vel, hold, pan))
    if grace:   # an ornament is lifted at once, even under the pedal (negative hold = dry)
        notes.append((t - 0.065, midi_of(grace), vel * 0.7, -0.1, pan))

def midi_of(name):
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
             'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    p, o = (name[:2], name[2:]) if len(name) > 2 and name[1] in '#b' else (name[:1], name[1:])
    return names[p] + (int(o) + 1) * 12

JP, NA = -0.32, 0.32   # the two worlds sit a little left and right of centre

def compose(ev):
    hana = [s['t'] for s in ev['hana']['steps']]
    # A  0.0–2.0  establishing: a low open fifth, and the koto line falling in the in scale
    N_(0.10, 'D2', 0.30, 3.8); N_(0.16, 'A2', 0.24, 3.8)
    N_(0.62, 'A5', 0.36, 0.5, JP, grace='Bb5')
    N_(1.08, 'G5', 0.30, 0.4, JP)
    N_(1.44, 'Eb5', 0.28, 0.4, JP)
    N_(1.92, 'D5', 0.30, 0.9, JP)
    # B  2.0–4.0  the light comes up: the other world answers, open and major
    N_(2.02, 'D3', 0.30, 1.8); N_(2.28, 'A3', 0.26, 1.6); N_(2.52, 'E4', 0.26, 1.4)
    N_(2.60, 'F#4', 0.38, 0.4, NA); N_(2.98, 'A4', 0.40, 0.35, NA); N_(3.32, 'B4', 0.36, 0.3, NA); N_(3.62, 'A4', 0.34, 0.5, NA)
    # C  4.0–10.5  the approach: a left-hand pulse on her footsteps, the two phrases in turn
    bass = [('D2', 'A2', 'E3', 'A2'), ('D2', 'A2', 'E3', 'A2'), ('B1', 'F#2', 'D3', 'F#2'), ('G1', 'D2', 'A2', 'D2'), ('A1', 'E2', 'A2', 'E2')]
    steps = [t for t in hana if 4.0 <= t < 10.4]
    for i, t in enumerate(steps):
        bar = 0 if t < 5.8 else 1 if t < 7.25 else 2 if t < 8.6 else 3 if t < 9.6 else 4
        nm = bass[bar][i % 4]
        N_(t + 0.01, nm, 0.2 + 0.06 * (i % 4 == 0) + 0.02 * min(i, 6) / 6, 0.5)
    # her line (in scale, rising): D Eb G A, then Bb falling to A
    for t, nm, v in [(4.28, 'D5', 0.34), (4.62, 'Eb5', 0.33), (4.96, 'G5', 0.36), (5.30, 'A5', 0.4)]: N_(t, nm, v, 0.3, JP)
    N_(5.72, 'A5', 0.36, 0.7, JP, grace='Bb5')
    # his answer (major pentatonic): A B D E, resting on F#
    for t, nm, v in [(6.30, 'A4', 0.36), (6.62, 'B4', 0.36), (6.94, 'D5', 0.38), (7.26, 'E5', 0.40)]: N_(t, nm, v, 0.3, NA)
    # 7.05–7.25: they see each other. A high note, and the harmony turns to B minor
    N_(7.08, 'E6', 0.24, 0.6, 0.0); N_(7.36, 'B5', 0.2, 0.6, 0.0)
    N_(7.62, 'F#5', 0.36, 0.8, NA * 0.7)
    # closer: her line now in yo (E, not Eb), his answer right behind it
    for t, nm, v in [(8.02, 'G5', 0.34), (8.30, 'A5', 0.37), (8.64, 'G5', 0.33), (8.92, 'E5', 0.35)]: N_(t, nm, v, 0.3, JP * 0.6)
    N_(8.70, 'D4', 0.26, 0.9); N_(8.72, 'A3', 0.22, 0.9)
    for t, nm, v in [(9.22, 'A4', 0.35), (9.46, 'B4', 0.36)]: N_(t, nm, v, 0.3, NA * 0.6)
    N_(9.64, 'D5', 0.38, 0.4, 0.1); N_(9.98, 'E5', 0.40, 0.5, 0.0)
    N_(9.62, 'E4', 0.26, 0.8); N_(9.66, 'A3', 0.24, 0.8)
    # D  10.5–12.5  they slow: the line slows with them, a falling suspension
    N_(10.58, 'A5', 0.36, 0.6, 0.0); N_(10.60, 'D4', 0.24, 1.5); N_(10.62, 'G4', 0.22, 1.4)
    N_(11.20, 'G5', 0.32, 0.6, 0.0); N_(11.22, 'B3', 0.2, 0.9)
    N_(11.86, 'E5', 0.30, 0.3, 0.0); N_(11.88, 'A3', 0.2, 0.3); N_(11.9, 'C#4', 0.18, 0.3)
    # 12.2: they stop. One open D chord; its top voice keeps the koto's grace note
    tS = ev['hana']['tClose'] + 0.02
    for nm, v, dt in [('D1', 0.2, 0.0), ('D2', 0.24, 0.01), ('A2', 0.22, 0.05), ('F#3', 0.22, 0.09), ('E4', 0.24, 0.13), ('A4', 0.24, 0.17), ('D5', 0.27, 0.21)]:
        N_(tS + dt, nm, v, 2.5)
    N_(tS + 0.3, 'A5', 0.36, 2.0, 0.0, grace='B5')
    # E  12.5–15  hold: the chord opens upward with the two smiles, and rings out
    N_(12.95, 'E5', 0.26, 1.2, JP * 0.4)
    N_(13.26, 'F#5', 0.26, 1.2, NA * 0.4)
    N_(13.72, 'B5', 0.22, 1.2, 0.0)
    N_(14.18, 'D6', 0.2, 1.0, 0.0)

def render_piano():
    L = np.zeros((N + SR, 2), np.float32)
    for t, midi, vel, hold, pan in sorted(notes):
        t += rng.normal(0, 0.004)
        vel = float(np.clip(vel + rng.normal(0, 0.015), 0.05, 1))
        d, layer = sample_for(midi, vel)
        lay_vel = {5: 0.25, 8: 0.5, 11: 0.75}[layer]
        g = (vel / lay_vel) ** 1.3 * 0.9
        end = t - hold if hold < 0 else pedal_release(t + hold)
        n = int((end - t) * SR) + int(0.3 * SR)
        s = d[:n].copy()
        rel0 = int((end - t) * SR)
        if rel0 < len(s):
            r = np.ones(len(s), np.float32)
            k = min(len(s) - rel0, int(0.3 * SR))
            r[rel0:rel0 + k] = np.exp(-np.linspace(0, 6, k))
            r[rel0 + k:] = 0
            s *= r[:, None]
        # constant-power pan by the world the note belongs to; low notes stay central
        pan_eff = pan * float(np.clip((midi - 40) / 30, 0, 1))
        a = (pan_eff + 1) * math.pi / 4
        s = s * g
        s[:, 0] *= math.cos(a) * 1.414; s[:, 1] *= math.sin(a) * 1.414
        i0 = int(t * SR)
        if i0 < 0: s = s[-i0:]; i0 = 0
        m = min(len(s), len(L) - i0)
        L[i0:i0 + m] += s[:m]
    return L[:N + SR]

# ── room ──────────────────────────────────────────────────────────────────────
def reverb(x, seconds=2.6, predelay=0.02, wet=0.22):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2), np.float32)
    for c in range(2):
        noise = rng.normal(0, 1, n).astype(np.float32)
        sos = butter(2, 5200, 'low', fs=SR, output='sos')
        noise = sosfilt(sos, noise)
        ir[:, c] = noise * np.exp(-t * 6.9 / seconds) * (1 - np.exp(-t * 400))
    ir /= np.sqrt(np.sum(ir ** 2, axis=0, keepdims=True))
    pd = int(predelay * SR)
    hp = butter(2, 180, 'high', fs=SR, output='sos')
    src = sosfilt(hp, x, axis=0)
    wetL = fftconvolve(src[:, 0], ir[:, 0])[:len(x)]
    wetR = fftconvolve(src[:, 1], ir[:, 1])[:len(x)]
    w = np.zeros_like(x)
    w[pd:, 0] = wetL[:len(x) - pd]; w[pd:, 1] = wetR[:len(x) - pd]
    return x * (1 - wet * 0.3) + w * wet

# ── ambience and foley ────────────────────────────────────────────────────────
def pan2(mono, pan):
    a = (pan + 1) * math.pi / 4
    return np.stack([mono * math.cos(a), mono * math.sin(a)], axis=1) * 1.414

def air():
    """morning/evening air: slow brown noise, gently gusting"""
    n = N + SR
    out = np.zeros((n, 2), np.float32)
    for c in range(2):
        w = np.cumsum(rng.normal(0, 1, n)).astype(np.float64)
        w -= np.convolve(w, np.ones(4801) / 4801, mode='same')
        sos = butter(2, [120, 900], 'band', fs=SR, output='sos')
        w = sosfilt(sos, w)
        w /= np.max(np.abs(w)) + 1e-9
        t = np.arange(n) / SR
        gust = 0.55 + 0.25 * np.sin(2 * np.pi * 0.11 * t + c) + 0.2 * np.sin(2 * np.pi * 0.23 * t + 1.3 * c)
        out[:, c] = w * gust
    fade = np.clip(np.arange(n) / (SR * 1.5), 0, 1)
    return out * fade[:, None] * 0.018

def leaves(t0, pan, level):
    """a breath of wind through leaves: filtered noise swell"""
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    x = rng.normal(0, 1, n)
    x = sosfilt(butter(2, [1800, 7000], 'band', fs=SR, output='sos'), x)
    env = np.sin(np.pi * t / 2.4) ** 2 * (1 + 0.4 * np.sin(2 * np.pi * 7 * t) * np.sin(np.pi * t / 2.4))
    return int(t0 * SR), pan2((x * env * level).astype(np.float32), pan)

def furin(t0, pan, level, strikes=3):
    """a glass wind bell: clapper strikes exciting inharmonic partials"""
    n = int(4.0 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    f0 = 2380.0
    parts = [(1.0, 1.0, 1.7), (2.32, 0.5, 1.1), (4.25, 0.3, 0.7), (6.63, 0.16, 0.45), (0.51, 0.18, 2.4)]
    tt = 0.0
    for k in range(strikes):
        amp = [1.0, 0.55, 0.35, 0.25][k]
        for ratio, a, dec in parts:
            f = f0 * ratio * (1 + rng.normal(0, 0.002))
            ph = rng.uniform(0, 2 * np.pi)
            sig = np.zeros(n)
            m = t >= tt
            tl = t[m] - tt
            sig[m] = a * amp * np.sin(2 * np.pi * f * tl + ph) * np.exp(-tl / dec) * (1 - np.exp(-tl * 3000))
            out += sig
        tt += 0.11 + rng.uniform(0, 0.08)
    out *= level / (np.max(np.abs(out)) + 1e-9)
    return int(t0 * SR), pan2(out.astype(np.float32), pan)

def footstep(t0, pan, level, surface):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    if surface == 'earth':
        # a soft sole on packed earth and stone: a low thump and a light scuff
        x = rng.normal(0, 1, n)
        thump = sosfilt(butter(2, 380, 'low', fs=SR, output='sos'), x) * np.exp(-t / 0.022) * 3.0
        scuff = sosfilt(butter(2, [900, 3500], 'band', fs=SR, output='sos'), x) * np.exp(-t / 0.035) * 0.35
        sig = thump + scuff
    else:
        # a boot on gravel: a cluster of small stone contacts
        sig = np.zeros(n)
        k = rng.integers(9, 15)
        for i in range(k):
            ti = rng.gamma(2.0, 0.012)
            if ti > 0.12: continue
            i0 = int(ti * SR); ln = int(0.012 * SR)
            if i0 + ln >= n: continue
            g = rng.normal(0, 1, ln) * np.exp(-np.arange(ln) / (0.0025 * SR)) * rng.uniform(0.3, 1)
            sig[i0:i0 + ln] += g
        sig = sosfilt(butter(2, [1200, 6500], 'band', fs=SR, output='sos'), sig) * 1.5
        x = rng.normal(0, 1, n)
        sig += sosfilt(butter(2, 300, 'low', fs=SR, output='sos'), x) * np.exp(-t / 0.02) * 1.6
    sig *= level / (np.max(np.abs(sig)) + 1e-9)
    return int(t0 * SR), pan2(sig.astype(np.float32), pan)

def limit(x, thr, look=0.004, rel=0.15):
    """look-ahead peak limiter: the gain falls ahead of a peak and recovers slowly"""
    a = np.max(np.abs(x), axis=1)
    need = np.minimum(1.0, thr / np.maximum(a, 1e-9))
    L = int(look * SR)
    # the minimum over the look-ahead window, then a smooth release
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(need, size=2 * L + 1, origin=0)
    out = np.empty_like(g); cur = 1.0; k = math.exp(-1 / (rel * SR))
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else g[i] + (cur - g[i]) * k
        out[i] = cur
    out = np.convolve(out, np.ones(L) / L, mode='same')
    return x * out[:, None]

def add(buf, item):
    i0, s = item
    m = min(len(s), len(buf) - i0)
    if m > 0: buf[i0:i0 + m] += s[:m]

def main():
    ev = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    compose(ev)
    piano = render_piano()
    piano = reverb(piano)
    amb = np.zeros_like(piano)
    amb += air()
    for t0, pan, lv in [(1.2, -0.7, 0.012), (5.5, 0.75, 0.010), (9.8, -0.6, 0.009), (12.8, 0.3, 0.008)]:
        add(amb, leaves(t0, pan, lv))
    add(amb, furin(2.72, -0.72, 0.03, 3))
    add(amb, furin(9.35, -0.62, 0.022, 2))
    for who, surface in (('hana', 'earth'), ('liam', 'gravel')):
        for s in ev[who]['steps']:
            if s['t'] < 3.7 or s['t'] > 13: continue
            pan = float(np.clip((s['sx'] - 960) / 960, -1, 1)) * 0.9
            near = float(np.clip(9.5 / s['z'], 0.4, 1.8))
            spd = float(np.clip(s['speed'] / 1.1, 0.35, 1.0))
            edge = float(np.clip((s['t'] - 3.7) / 0.6, 0, 1))
            lv = 0.022 * near * spd * edge * (0.7 if surface == 'earth' else 0.55)
            add(amb, footstep(s['t'], pan, lv, surface))
    amb = reverb(amb, 1.4, 0.01, 0.12)
    mix = piano + amb
    mix = mix[:N]
    # fades: in from nothing, out on the ringing chord
    fi = int(0.02 * SR); mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    fo = int(1.1 * SR); mix[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
    # gentle high cut so the codec has nothing sharp to ring on
    mix = sosfilt(butter(2, 16500, 'low', fs=SR, output='sos'), mix, axis=0)
    meter = pyloudnorm.Meter(SR)
    loud = meter.integrated_loudness(mix)
    g = 10 ** ((-16.0 - loud) / 20)
    for it in range(4):
        y = mix * g
        tp = 20 * np.log10(np.max(np.abs(resample_poly(y, 4, 1, axis=0))) + 1e-12)
        if tp <= -1.0: break
        y = limit(y, 10 ** (-1.6 / 20))
        g *= 10 ** ((-16.0 - meter.integrated_loudness(y)) / 20) if it < 3 else 1
        mix = y / g * 1.0 if False else mix
    mix = y
    tp = 20 * np.log10(np.max(np.abs(resample_poly(mix, 4, 1, axis=0))) + 1e-12)
    if tp > -1.0: mix *= 10 ** ((-1.0 - tp) / 20); tp = -1.0
    print(f'loudness {loud:.1f} LUFS -> -16.0 (gain {20*np.log10(g):+.1f} dB), true peak {tp:.2f} dBTP, notes {len(notes)}')
    print(f'final integrated {meter.integrated_loudness(mix):.2f} LUFS')
    sf.write(out, mix.astype(np.float32), SR, subtype='PCM_24')
    # stems for inspection
    sf.write(out.replace('.wav', '.piano.wav'), (piano[:N] * g).astype(np.float32), SR, subtype='PCM_16')
    sf.write(out.replace('.wav', '.amb.wav'), (amb[:N] * g).astype(np.float32), SR, subtype='PCM_16')

if __name__ == '__main__':
    main()
