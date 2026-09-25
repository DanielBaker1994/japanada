# Halfway

A 15-second procedural risograph film, 1920 × 1080, 30 fps, with an original piano score.

Two homes share one frame and one sun. On the left is a thatched minka in the Japanese
countryside at sunrise; on the right, a red-brick Ontario farmhouse at sunset. A Japanese woman
walks in from the left edge and a Canadian man from the right. They meet in the corridor of
light between the homes and stop, facing each other.

- Deliverable video: [`halfway.mp4`](halfway.mp4). It is rendered from `index.html` by `tools/render.mjs`.
- Source: [`index.html`](index.html), a single self-contained page (Canvas 2D and embedded Opus
  audio, no network). The readable source is in [`../src`](../src) and is assembled by
  `tools/build.mjs`.
- Style reference: [sevenevesai/riso-windowseat](https://github.com/sevenevesai/riso-windowseat)
  (MIT). The print engine follows that kit's method: live plate coverage, page-pinned halftone
  screens, fixed registration misses, a baked paper texture and overprinted darks with no black ink.

## The idea: one sun on the seam

Japan and Canada are roughly half a day apart, so while one house has its sunrise the other has
its sunset. The film puts that single low sun exactly on the dividing line. It is rising over the
minka and setting over the farmhouse.

That one decision makes the split intentional rather than an editing seam:

- **A sun pillar** (the vertical column of light that stands over a low sun) rises from the sun
  and draws the dividing line in the sky.
- **Glare** runs down the ground below it, a band of light on dew and water.
- **Shadow corridors.** Everything the lens sees is backlit. Each home, tree, lantern and fence
  throws a long shadow strip straight toward the viewer. Because the sun is at infinity on the
  horizon, the strips radiate from the sun's point, like perspective lines. Between the two homes'
  shadows runs one corridor of light down the middle of the frame.
- **The ranges meet in a notch.** The Japanese mountains slope down from the left and the low
  Canadian Shield hills slope down from the right. They meet in the notch where the sun sits.
- **Two paths converge.** Her packed-earth path with stepping stones and his gravel track meet in
  one worn clearing on the seam, where leaves from both maples lie together.

Both walkers start in the shadow of their own home and step into the shared light only as they
arrive. The rim light on their silhouettes comes on as they leave the shadow.

## Timeline

| Time | Passage | What happens |
|---|---|---|
| 0.0–2.0 | Establish | Both homes, the notch and the sun. A slow dolly settles from a standing eye height toward the walkers' eye line. |
| 2.0–4.0 | The light comes up | The sun pillar strengthens, the farmhouse windows light, smoke rises from the minka's gable vent and the chimney, and leaves begin to fall. The North American phrase enters on the piano. |
| 4.0–10.5 | Approach | She enters at the left edge at 4.00 s and he at the right edge at 4.08 s, both at walking speed (1.1 m/s, a 0.56 s and 0.59 s step). She sees him at 7.25 s and he sees her at 7.05 s: the eyes and head turn toward the other, and the music turns with them. |
| 10.5–12.5 | Arrival | Steps shorten and slow (0.60 → 0.49 → 0.33 m), each walker curves to face the other, and a closing step lands at 12.20 s (her) and 12.26 s (him). The arms keep swinging a little and settle, and the skirt swings forward and back. |
| 12.5–15.0 | Hold | Weight shifts and breathing. Her hands come together in front, and his near hand goes into his jacket pocket. A blink each, then a small smile (hers at 12.95 s, his at 13.25 s). The camera's slow dolly eases to rest. |

## Staging and camera

- A real perspective camera (focal length 1500 px) with lens rise, so the horizon is row 470. The
  camera only translates, never rotates, so the sun and horizon never move. It dollies 1.25 m in
  over the film on a cosine ease and cranes down from 1.80 m to 1.55 m by about 5.5 s.
- Everything is modelled in world metres and projected every frame, so the parallax between the
  homes, trees, paths and figures is exact. No screened bitmap is ever resized.
- Both walkers are 1.68 m tall. With the lens at 1.55 m, their eyes stay on the horizon line as
  they approach, and in the final frame the sun sits between their faces.
- Composition: the minka spans roughly the left third and the farmhouse the right third. The
  centre stays open to the sky, the sun and the corridor of light.

## The figures

The figures are 3D skeletons drawn as projected silhouettes.

- **Gait from footsteps.** Each footprint is planted and cannot slide while it bears weight. The
  swing foot travels between footprints with heel-strike and toe-off roll, and the shoe bends at
  the ball. The legs are two-bone IK. The pelvis moves along a monotone curve through each
  mid-stance, and its height is the most the stance legs can reach (the natural compass-gait bob).
  It sways toward the stance foot, and yaws and drops on the swing side. The chest counter-rotates.
- **Arms** are damped pendulums driven by the opposite leg and by the body's deceleration, so they
  keep swinging a little after the stop and settle. The final poses blend in by IK.
- **Cloth and hair follow-through** come from a damped spring driven by forward acceleration.
- **Motion blur**: three shutter samples (a 180° shutter), averaged.
- **Heads**: skull and jaw ellipsoids plus a midline face profile, a hair cap cut at a hairline,
  and features placed on the head surface (eye, iris, brow, nostril, mouth, ear, cheek flush).
  The eyes lead the look.
- **Her**: a shoulder-length dark bob, an oatmeal knit cardigan over a pale top, a pleated indigo
  midi skirt whose hem is pushed by the legs, and white sneakers.
- **Him**: short blond hair, blue eyes, a forest-green chore jacket over a cream sweater,
  straight dark jeans and tan boots.
- Nothing is caricatured: contemporary clothes, natural posture, the same height.
- **Lighting**: parts are filled in their skylit tone. One rim-light pass per figure lights the
  silhouette edge that faces the sun, scaled by how much sun reaches the figure's position.
- **Fine print for faces**: the heads print as continuous ink instead of the 4.6 px screen. At
  about 70 px tall, a face's marks are smaller than one halftone cell and the screen erased them.
  This is a deliberate exception to the kit's all-screened rule.

## Print

Six inks: yellow, fluorescent pink, orange, blue, green and indigo, each on its own screen angle
(0°, 76°, 26.6°, 14°, 63.4° and 45°) at a 4.6 px pitch. Each plate has a fixed 1–2 px
registration miss, and the threshold tables carry mottling, jitter and starvation flecks. Darks
are overprints, and there is no black ink.

Coverage for the six plates is packed into the RGB channels of two canvases that share an alpha.
Source-over is therefore the kit's `put`, and 'screen' and 'multiply' give overprint and partial
knockout. The compositor thresholds per pixel with a soft edge of about 1 px, so dots are
anti-aliased.

## Score

An original piece written for the film, played on the **Salamander Grand Piano V3** sample set
(Yamaha C5, recorded by Alexander Holm, CC BY 3.0). Rendered by `tools/score.py` from the film's
event data (`out/events.json`: footsteps, the look, the stop).

- **Two scales that share almost everything.** The Japanese side sings in the miyako-bushi (in)
  scale on D (D E♭ G A B♭): high, ornamented with koto-like grace notes, panned a little left. The
  North American side answers in a folk-hymn major pentatonic (D E F♯ A B), with open fifths in the
  left hand, panned a little right.
- **The walk.** A soft left-hand pulse lands on her footsteps.
- **The look (7.05–7.25 s).** A high E rings and the harmony turns to B minor. After it, her line
  drifts from the in scale to the yo scale (D E G A B), the notes the two worlds share.
- **The meeting (12.22 s).** They stop on one open D chord (D A E F♯). Its top voice keeps the
  koto's grace note. The chord then opens upward on the two smiles and rings out.
- **Foley and air**: footsteps on packed earth (left) and gravel (right), panned to their screen
  positions and quieter as each walker slows. A glass wind chime (furin) sounds on the Japanese
  side, with wind in the leaves and room air.
- **Level**: −16 LUFS integrated, true peak ≤ −1 dBTP, 48 kHz stereo, exactly 15.000 s.

See [`AUDIO-SOURCES.md`](AUDIO-SOURCES.md) for attribution.

## References

Wikimedia Commons was unreachable from the build environment, so no photographs were inspected.
Architecture, clothing and landscape are drawn from general knowledge:

- **The minka**: yosemune thatch with small ridge-end gables, karasu-odori timbers on the ridge,
  an engawa under deep eaves, shoji, shikkui plaster, and hoshigaki (persimmons) drying under the
  eaves. Around it are hasa-kake rice-drying racks on the terraces and a tōrō stone lantern.
- **The farmhouse**: an Ontario Gothic Revival type, with red brick, a steep centre gable with a
  lancet window, cream bargeboards, a full-width verandah and sash windows with shutters.
- **The Canadian landscape**: spruce, birch, a sugar maple, a split-rail fence, a canoe and a lake.

## Build and render

```
cd tools && npm install
node build.mjs                       # src/*.js + out/score.opus → film/index.html
python3 score.py ../out/events.json ../out/score.wav   # needs the Salamander samples in out/piano
node render.mjs --out ../out/halfway.mp4
node shoot.mjs --times 0,4,8,12,14.5 --sheet   # stills; add --query view=flat for unscreened plates
python3 popscan.py ../out/halfway.mp4          # frame-difference pop scan
```

## What was checked, and what was not

- Checked:
  - Contact sheets at 1 s intervals, 1:1 crops of the figures and the heads.
  - A head debug sheet (`?debug=heads`) at six view angles.
  - Frame strips of the gait at every frame.
  - A pop scan of the encoded MP4, and entry and arrival times measured from the rig.
  - Audio loudness and true peak, and the sample pitch mapping.
- Not checked: the score was measured, not heard. No one on this build could listen to it.
  Listen at 0.6 s (first koto phrase), 2.6 s (the answer), 7.1 s (the look), 12.2 s (the meeting
  chord) and the ring-out.
- Known weaknesses:
  - The faces are simplified and small in the wide frame.
  - The hands are mittens.
  - The walk cycle is procedural and may read as slightly even.
  - The ground in the light corridor is intentionally plain.
