# Halfway audio sources

The composition, arrangement, foley synthesis and mix are original to this film.

## Piano

The piano is **Salamander Grand Piano V3**, recorded by **Alexander Holm**, licensed under
[Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/).

- Source: [sfzinstruments/SalamanderGrandPiano](https://github.com/sfzinstruments/SalamanderGrandPiano),
  commit `3382bf9496bba2486f5ab0de55a264d1dfc38404`. The recordings are of a Yamaha C5, made at
  48 kHz / 24 bit.
- Used: 78 recordings covering MIDI roots 21–96 in minor thirds, at velocity layers 5, 8 and 11.
  Other notes are transposed by at most one semitone (polyphase resampling).
- Changes made to the recordings:
  - Leading silence trimmed to 2 ms before the attack.
  - DC removed.
  - Per-key body level matched.
  - Damper releases of 0.3 s at pedal changes.
  - A synthesized stereo room added.
  - Mixed and normalised to −16 LUFS.

The film embeds the finished mix (Opus, 160 kb/s) and ships none of the individual samples.
Keep this attribution when redistributing the film or its audio. This use does not imply any
endorsement by the author.

## Everything else

Everything else is synthesized in `tools/score.py`:

- Footsteps on packed earth and gravel: filtered noise contacts.
- The furin: a glass wind bell modelled as inharmonic partials struck by a clapper.
- Wind in the leaves and room air: filtered, gusting noise.

No field recordings are used.
