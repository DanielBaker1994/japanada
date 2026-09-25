# japanada — *Halfway*

A 15-second risograph film: a thatched minka in the Japanese countryside on the left, an Ontario
brick farmhouse on the right. One low sun sits on the seam between them, rising for one house and
setting for the other. A Japanese woman and a Canadian man walk in from either edge and meet in
the corridor of light between their homes.

- **Watch:** [`film/halfway.mp4`](film/halfway.mp4) (1920×1080, 30 fps, AAC stereo, −16 LUFS).
  A smaller copy for messaging is [`film/halfway-share.mp4`](film/halfway-share.mp4).
- **Poster:** [`film/poster.png`](film/poster.png)
- **Design notes:** [`film/FILM.md`](film/FILM.md) · **Audio credits:** [`film/AUDIO-SOURCES.md`](film/AUDIO-SOURCES.md)
- **Source:** [`film/index.html`](film/index.html) is self-contained: open it in a browser and press
  Play. It is assembled from [`src/`](src) by `tools/build.mjs`.

The visual style draws on [sevenevesai/riso-windowseat](https://github.com/sevenevesai/riso-windowseat):

- procedural Canvas 2D, six inks on page-pinned halftone screens;
- registration misses, overprinted darks and a cream paper texture.

Piano: Salamander Grand Piano V3 by Alexander Holm (CC BY 3.0).

## Rebuild

```
cd tools && npm install
node build.mjs
node render.mjs --out ../out/halfway.mp4
```

`tools/score.py` re-renders the music. It needs the Salamander samples in `out/piano/`; see
`film/AUDIO-SOURCES.md` for the source commit.
