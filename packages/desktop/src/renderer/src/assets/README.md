# Renderer assets

## `liquid-light.mp4` — NOT IN GIT

The psychedelic stage's backdrop footage: a real 1960s-style liquid light show (oil,
water and aniline dyes on an overhead projector). It's 54 MB and never changes, so it is
gitignored rather than committed — see the entry in the repo root `.gitignore`.

It lives on disk locally and Vite bundles it from there, so `npm run dev` and
`npm run build` both work normally **on a machine that has the file**.

**A fresh clone cannot build the desktop app until you put it back.** The import in
[`../components/LiquidLight.tsx`](../components/LiquidLight.tsx) fails to resolve and
`electron-vite build` errors out with `Could not resolve "../assets/liquid-light.mp4"`.

### Regenerating it

The source is a ~20-minute 2160×2160 square capture (the original was
`videoplayback.webm` in `~/Downloads`). Two things matter about the transform:

- **The crop.** The projector dish is inscribed in the square frame as a *circle*, so a
  naive fit shows black corners. `1527` is the largest square that fits inside that
  circle (2160 / √2), which is what lets `object-fit: cover` fill any aspect ratio — a
  16:9 stage or a portrait phone — with no black anywhere and no runtime zoom hack.
  Cropping at encode time also means the decoder never touches pixels that are about to
  be thrown away.
- **The 180-second window at `-ss 175`.** The first ~3 minutes of the source are a slow
  fade-up with little movement; 175s in, the dye is fully active.

```bash
ffmpeg -nostdin -ss 175 -t 180 -i ~/Downloads/videoplayback.webm \
  -vf "crop=1527:1527:(iw-1527)/2:(ih-1527)/2,scale=1280:1280:flags=lanczos" \
  -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -crf 28 -preset slow \
  -movflags +faststart -an packages/desktop/src/renderer/src/assets/liquid-light.mp4
```

If you change the duration, update `CLIP_SECONDS` in `../components/LiquidLight.tsx` —
it's the fallback used to pick a random start offset before the video's real duration is
known.

### The mobile copy is different

`packages/mobile/assets/video/liquid-light.mp4` **is** committed, and must stay that way:
EAS Build uploads the project through git, so ignoring it would produce a store binary
with a black background. It's a smaller encode (1080², CRF 31 ≈ 33 MB) because it ships
inside the app download:

```bash
ffmpeg -nostdin -ss 175 -t 180 -i ~/Downloads/videoplayback.webm \
  -vf "crop=1527:1527:(iw-1527)/2:(ih-1527)/2,scale=1080:1080:flags=lanczos" \
  -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p -crf 31 -preset slow \
  -movflags +faststart -an packages/mobile/assets/video/liquid-light.mp4
```
