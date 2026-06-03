# Realtime Karaoke - Development Guide

## Project Overview

Professional karaoke desktop app built with Electron + React + TypeScript. Features Spotify integration, real-time voice effects, multi-singer support, dual-window stage display, and a mobile companion website for remote queue management via Supabase.

## Architecture

```
src/
  main/           # Electron main process (Node.js)
    index.ts      # Window management, IPC handlers, app lifecycle
    supabase.ts   # Supabase client, session/queue/catalog operations
    audio/
      manager.ts  # Filesystem-based song catalog (~/. realtime-karaoke/songs/)
      stem-cache.ts
  preload/
    index.ts      # Security bridge (contextBridge) - all IPC methods typed
  renderer/src/
    App.tsx        # Router shell, titlebar, top nav
    context/
      AppContext.tsx  # Global state (useReducer), cross-window sync
    hooks/
      useKaraokeSession.ts  # Supabase session lifecycle, remote queue sync
    pages/
      SearchPage.tsx   # Song catalog browser with QR code display
      QueuePage.tsx    # Queue management, singer setup, playback controls
      KaraokePage.tsx  # Stage display (lyrics, singers, effects)
      AdminPage.tsx    # Song import, Spotify search, stem management
    audio/
      AudioEngine.ts          # Dual-stem playback (instrumental + vocals)
      VoiceEffectsEngine.ts   # WebAudio real-time mic processing chain
      VoiceEffectsTypes.ts    # Shared effect type definitions
    styles/
      globals.css    # Design system, CSS variables, layout
      karaoke.css    # Stage-specific styling
```

## Tech Stack

- **Desktop**: Electron 28 + electron-vite
- **UI**: React 18 + React Router v6 (HashRouter) + TypeScript 5.3
- **Styling**: Plain CSS with CSS custom properties (no Tailwind/CSS-in-JS)
- **State**: React Context + useReducer (no Redux)
- **Audio**: Web Audio API for voice effects, HTMLAudioElement for playback
- **Backend**: Supabase (project: sdgame / hnnbxwitjkeijvoldfuv) for companion site
- **Companion Site**: Vanilla JS SPA served via Supabase Edge Function

## Build & Run

```bash
npm run dev      # Start Electron dev server with HMR
npm run build    # Production build to out/
npm run start    # Run production build
```

## TypeScript Rules

- **Strict mode is enabled** in both `tsconfig.node.json` and `tsconfig.web.json`. Keep it that way.
- All new code must be fully typed. No `any` types unless interfacing with untyped external APIs (Spotify responses, etc).
- All IPC methods must be typed in `src/preload/index.ts` on the `ElectronAPI` interface. The preload bridge is the contract between main and renderer.
- Run `npx tsc --noEmit` before committing to catch type errors.

## Code Style

- **Inline styles**: The app uses inline React styles extensively (not CSS classes) for component-level styling. Follow this pattern for consistency.
- **CSS variables**: Use variables from `globals.css` (e.g., `var(--surface-1)`, `var(--violet)`, `var(--font-display)`) rather than hardcoding colors/fonts.
- **No component library**: All UI is custom-built. Do not introduce Material UI, Chakra, shadcn, or similar.
- **Fonts**: Space Grotesk for display/headings, DM Sans for body text.
- **Color palette**: Neon-on-dark aesthetic. Use `NEON_COLORS` array from AppContext for singer/accent colors.

## State Management

- All state flows through `AppContext.tsx` via `useReducer`.
- Actions are dispatched via `dispatch()` which auto-relays to the stage window via IPC.
- When adding new state: add to `AppState` interface, add action to `Action` union type, add reducer case.
- The `isRemoteRef` flag prevents infinite IPC loops between windows.

## Audio Processing

- All audio processing happens locally in the Electron app. The companion website sends only metadata.
- `AudioEngine.ts` handles dual-stem playback (instrumental + optional vocals).
- `VoiceEffectsEngine.ts` handles real-time mic processing (pitch correction, reverb, EQ, etc).
- Audio files are stored at `~/.realtime-karaoke/songs/{trackId}/` with `meta.json` + stem files.

## Supabase Integration

- **Project**: sdgame (hnnbxwitjkeijvoldfuv.supabase.co)
- **Tables**: `karaoke_sessions`, `karaoke_catalog`, `karaoke_guests`, `karaoke_queue`
- **Realtime**: Enabled on `karaoke_queue` and `karaoke_sessions`
- **RLS**: Permissive policies (session code is the access boundary)
- **DO NOT** touch the `supabase-develop` or `supabase-production` MCP servers — those are unrelated projects.

## Companion Website

- **Hosted on GitHub Pages** at `https://noltechas.github.io/Realtime/`.
- GitHub Pages serves from the `docs/` folder. `docs/index.html` is now just the shell; the SPA is split into ES modules under **`docs/js/`** (`main.js`, `themes.js`, `state.js`, `supabase.js`, `wizard.js`, render modules in `docs/js/render/*.js`, …) and styles under **`docs/css/`** (`base.css`, `components.css`, `themes.css`). Theme code lives in `docs/js/themes.js` + `docs/css/themes.css` + the render modules — NOT inline in `index.html`.
- Supabase Edge Functions and Storage **cannot serve HTML** (they force `text/plain` + CSP `sandbox` on shared domains). This is a permanent Supabase security restriction.
- QR code URL format: `https://noltechas.github.io/Realtime/?session=<CODE>`
- The base URL is configured in `src/main/index.ts` as `COMPANION_BASE_URL`.
- The companion JS uses string concatenation (NOT template literals) and loads `@supabase/supabase-js@2` from CDN.
- To edit the companion site: modify the relevant file under `docs/js/` or `docs/css/` (or `docs/index.html` for the shell) and push to GitHub.

## IPC Conventions

- `ipcMain.handle()` for request/response (renderer calls `ipcRenderer.invoke()`)
- `ipcMain.on()` for fire-and-forget (renderer calls `ipcRenderer.send()`)
- Namespace: `window:*`, `stage:*`, `state:*`, `playback:*`, `spotify:*`, `lyrics:*`, `audio:*`, `karaoke:*`

## Testing Changes

1. Run `npx tsc --noEmit` — must pass with no errors
2. Run `npx electron-vite build` — must build cleanly
3. Run `npm run dev` to test in development mode
4. For companion site changes: edit the relevant `docs/js/` or `docs/css/` file (or `docs/index.html` shell), push to GitHub, and test by scanning QR code

## Adding a New Theme

Themes are defined in `src/renderer/src/styles/` and registered in `src/renderer/src/context/ThemeContext.tsx`, as well as in the mobile companion app under `packages/mobile/src/theme/`. Themes should be VERY VERY original and should all have new features, animations, looks, colors, etc. There should be something new with each theme. Every new theme requires changes across multiple files and platforms:

### Design & Aesthetic Rules

1. **Be Structurally Unique**: Don't just swap colors and leave the default generic drop shadows. Inject unique geometric and structural designs. For example, the Urban theme ditches generic glowing shadows entirely in favor of slanted parallelograms (`skewX`) and heavy, solid geometric neon borders.
2. **Font Matching**: If a theme exists on the companion website or mobile app, match the fonts exactly. Load the appropriate Google Fonts and apply them to headings, buttons, and body text to match the theme's specific vibe.
3. **Semantic Colors can be Inverted**: Remember that `tokens.black` and `tokens.white` are semantic, not literal colors. In a dark theme like Urban, `tokens.black` is often used for the literal `#FFFFFF` (white) foreground text, while `tokens.white` represents a dark background card. Always test contrast, especially on navigation bars and input fields, to ensure you haven't accidentally rendered white text on a white/lime background.

### Files to create/modify (Desktop & Web)

1. **Create `src/renderer/src/styles/{theme-name}.ts`** — Implement the full `Theme` interface from `theme.ts`. Use an existing theme (e.g., `cyberpunk.ts`) as a template.
2. **Register in `ThemeContext.tsx`** — Import and add to the `THEMES` map.
3. **Update the theme ring** — Set `nextThemeName` on the previous last theme to point to the new one, and set the new theme's `nextThemeName` to cycle back (currently `neo-brutal`).
4. **Add idle screen in `KaraokePage.tsx`** — Each theme has a hardcoded idle/waiting screen (shown when no song is queued). Add a `if (theme.name === '...')` branch before the fallback. **Idle screens must have lots of character** — add decorative SVG elements, animated backgrounds, thematic flourishes, and atmospheric details. A plain centered heading + QR code is not enough.
5. **Add lyric highlighting in `KaraokePage.tsx`** — Each theme has custom active-line styling in the lyric renderer (~line 1078). Add a branch for the new theme with unique visual effects (glow, animation class, etc.).
6. **Add CSS animation in `karaoke.css`** — Define a keyframe animation and a `.k-line--{theme-name}` class for the stage lyric effect.
7. **Update QR overlay in `KaraokePage.tsx`** — If the theme has a dark background, ensure it gets `'rgba(0,0,0,0.8)'` for the QR backdrop.
8. **Update companion website** — ALWAYS add the new theme to the companion site. Its theme code now lives in **`docs/js/themes.js` + `docs/css/themes.css` + `docs/js/render/*.js`** (NOT inline in `docs/index.html` — that part of this guide is stale):
   - Add any new Google Fonts to the `<link>` tag in `docs/index.html`.
   - Add a new `else if(activeTheme==="theme-name")` branch in `applyTheme()` in `docs/js/themes.js` with the CSS variables + component overrides matching the Electron/mobile theme.
   - Add per-theme structural overrides where needed in `docs/css/themes.css` and the relevant render module (`docs/js/render/songs.js`, `queue.js`, `wizard.js`, etc.).
   - Add a new theme-pick button (in the config render path) with inline preview styles matching the theme's aesthetic.
   - The companion JS still uses string concatenation (NOT template literals).

### Files to create/modify (Mobile App)

The Expo mobile app (`packages/mobile`) uses a **per-theme UI module** architecture — there is **no `tokens.name === ...` branching in screens.** Each theme ships a complete set of presentational atoms; screens (`SongsScreen`, `QueueScreen`, `StageScreen`, `WizardScreen`, …) are pure data containers that read `const { tokens, ui } = useTheme()` and render `ui.SongCard`, `ui.QueueRow`, `ui.Backdrop`, `ui.GenreTabs`, `ui.TabBar`, etc. Switching themes swaps the entire `ThemeUIModule` via the registry, so ALL structural/geometric work lives in the theme's own atoms — never in the screens.

To add (or restyle) a theme on mobile:
1. **Tokens**: add the shared token bundle in `packages/shared/src/themes/<name>.ts`, then the mobile token (wrapped with fonts via `withMobileFonts`) in `packages/mobile/src/theme/tokens.ts`, registered in `MOBILE_BY_NAME`.
2. **Theme folder** `packages/mobile/src/theme/themes/<name>/`:
   - `styles.ts` — the `ThemeUIStyles` scaffold (`screen`/`page`/`h1`/`h2`/`body`/`muted`/`card`/`input`/`pillBox`/`sectionLabel`).
   - `index.ts` — assembles and exports `<NAME>_UI: ThemeUIModule` (every atom + `styles` + `reactionIconColors`).
   - `atoms/` — one file per atom: `Button`, `ColorPicker`, `GenreTabs`, `TabBar`, `Backdrop`, `ItemFloater`, `SongsSearchBar`, `SongCard`, `QueueRow`, `ReactionCell`, `StageTabIcon`, `StagePlayButton`, `StageToggleBox`, `YoureUpHero`. Implement against the `*Props` types in `src/theme/types.ts`.
   - `atoms/_<name>.tsx` — the theme's **shared visual vocabulary** (palette consts, shadow/press helpers, decorative primitives like halftones / bursts / outline-lettering). Compose every atom from these; don't re-invent per atom. Example: `comic-book/atoms/_comic.tsx` exports `INK/PANEL/RED/YELLOW/BLUE`, `inkShadow`, `slam`, `Halftone`, `Burst`/`BurstBadge`, `ComicOutlineText`.
   Copy an existing theme folder (e.g. `comic-book/`) as the template.
3. **Register** the module in `src/theme/registry.ts` (`THEME_UI_BY_NAME`). `resolveThemeUI()` falls back to `neo-brutal` for unknown names. `useTheme()` (`src/theme/ThemeContext.tsx`) returns `{ tokens, ui }`.
4. **Pure helpers** live in `src/theme/helpers.ts` (`hashKey` for stable per-item randomness like issue numbers / rotations, `hexToRgba`, `sketchAngle`, …) — no theme branching there.
5. **Navigation icons**: the theme's `TabBar` atom renders the shared `TAB_ICONS` from `src/navigation/TabIcons.tsx`. **NEVER hand-draw custom nav icons** — use the `Ionicons` names from `TabIcons.tsx`. Only the active tab gets an accent; all inactive tabs share one color (`tokens.tabBarFg`).
6. **Structural transforms** (skew/rotation) belong inside the atoms; counter-transform inner text/icons so they stay upright and legible. For chaotic / hand-drawn looks use `hashKey`/`sketchAngle` for stable organic randomness rather than static extreme rotations (which clip).
7. **Available deps**: `expo-linear-gradient` (scrims/gradients), `react-native-svg` (paths, patterns, gradients), `@expo-google-fonts/*`. Prefer SVG/gradient primitives over images.

### Contrast checklist

- **`black`/`white` are semantic, not literal.** On dark themes, `black` = light text, `white` = dark background.
- **The NOW PLAYING banner** (`NowPlayingBanner` in `QueuePage.tsx`) uses `theme.accentB` as background with hardcoded dark (`#1A1A1A`) text — `accentB` must always be a bright/vivid color that provides good contrast with dark text.
- **Singer count buttons** use `theme.accentA` for the selected state with dark text.
- **Never use `theme.white` as text color on a `theme.card` background** — on light themes they're the same color. Use `theme.black` for text on card backgrounds.
- **The theme dropdown** in `App.tsx` uses `theme.black` for text on the card-colored dropdown.
- Test every page (Search, Queue, Stage, Admin, Wizard) with the new theme to check contrast.

### Google Fonts

Themes load custom fonts via `@import url(...)` in their `globalCss`. Always include fallback fonts in the font family string.

## Per-Song Vocal Effect Customization

**When the user asks you to "set vocal effects for all the [Artist] songs" (or similar)** — i.e., hand-tune per-song, per-role effects beyond the generic artist preset — follow the workflow below. Precedents: [packages/desktop/scripts/travis-per-song.js](packages/desktop/scripts/travis-per-song.js), [packages/desktop/scripts/kanye-per-song.js](packages/desktop/scripts/kanye-per-song.js). **Copy one of those scripts as a template**; don't reinvent the shape.

### Workflow (in order)

1. **Enumerate the library.** Run a Node one-liner against `~/.realtime-karaoke/songs/*/meta.json` to get every track by the artist, including `name`, `albumName`, `roles`, and `trackId`. Don't guess which songs are in the library — the user adds/removes over time.
2. **Honestly assess confidence per track.** Before writing any code, classify each song:
   - **HIGH** — you can name specific sonic features you'd adjust and why (e.g., "goosebumps' slapback delay is iconic — mix 32% vs stock 28%", or "Blame Game's Chris Rock outro is dry spoken-word, not rap — no reverb").
   - **MEDIUM** — you know the era/vibe but would be approximating specific values.
   - **LOW** — you don't have vivid memory of this specific mix.
3. **Report the breakdown to the user** *before* writing the script. They need to know which tracks you'll actually customize vs leave alone. This is not optional — bluffing on LOW-confidence tracks will produce worse results than the generic preset.
4. **Leave LOW-confidence tracks on the generic preset.** List them explicitly in a `LOW_CONFIDENCE` object in the script (for the report output). Don't guess.
5. **Skip "generic-is-already-optimal" tracks.** Some tracks are exactly what the generic preset was tuned for (Heartless → Kanye 808s preset). Customizing adds noise. Note these in `LOW_CONFIDENCE` with a comment like `"Heartless — generic 808s is already optimal"`.
6. **Skip tracks that aren't actually by the artist.** Library artist-filter matches can pull false positives (e.g., a track where the artist is only sampled, not performing). Verify by checking `roles[]` for the artist's name.
7. **Write `packages/desktop/scripts/{artist}-per-song.js`** following the template.
8. **Dry run** (no flags) to verify every role name matches the library's `meta.roles` exactly. Any mismatch = bad role name spelling.
9. **Apply** (`--apply` flag) once the dry run is clean. Each modified `meta.json` gets a `.pertrack.bak` backup on first write.
10. **Verify build**: `npx tsc --noEmit` + `npx electron-vite build` must both pass (these scripts are pure JS and shouldn't affect the app build, but run them to catch any regressions from other recent changes).

### Critical knowledge for picking values

**Signal chain order** (from [VoiceEffectsEngine.ts](src/renderer/src/audio/VoiceEffectsEngine.ts)):
```
input → highpass → compressor → pitchCorrection → EQ → vocoder → distortion → doubler → chorus → delay → reverb → noiseGate → output
```
(`pitchCorrection` is now a TD-PSOLA shifter — clean, formant-preserving, ~32 ms latency, octave-robust; it auto-bypasses when a role's autotune is off.)

**The chorus-after-autotune gotcha** (most common mistake): for mechanical-autotune presets (T-Pain, Travis Scott, Kanye 808s, Future, Playboi Carti), chorus runs *after* pitch correction and creates a pitch-modulated second voice that *undoes* the hard-snap quality. Real records of these artists don't use analog chorus on the vocal — "doubling" is a separately-recorded second take. **Rule of thumb:**
- `pitchCorrection.strength >= 80` → `chorus.enabled: false` (or `mix <= 10`)
- `pitchCorrection.strength 40-80` → `chorus.mix <= 15` if enabled
- `pitchCorrection.strength < 40` or disabled → chorus can go up to ~22 for pop/R&B width

**Exceptions where chorus IS the character, keep it heavy:** Daft Punk (vocoder), Bon Iver (layered harmonies), Tame Impala (psychedelic modulation), Imogen Heap (crystalline harmonizer), Kevin-Parker-produced tracks like SKELETONS.

**The doubler / thickener — the right tool for "the vocal stack" (use it, not chorus).** The chorus gotcha above notes that hard-autotune "doubling" is really a separately-recorded take. The `doubler` block is the effect that *approximates* that: N short-delay, lightly-detuned, panned copies of the tuned voice layered ON TOP of the dry lead. It runs *after* the autotune and does NOT undo the hard-snap (unlike chorus), so it's the correct way to get the thick, wide stack of Travis/T-Pain/Carti/Future/Kanye-808s/Uzi without softening the tune.

When tuning a stacked-vocal / autotune-heavy song, set the doubler on the lead singer's role. Rough map by vibe:
- **Rage / wall-of-vocal** (Carti, Uzi rage, Future "Mask Off", Travis "FE!N"/"NO BYSTANDERS") → `voices 4, detune 18-22, delay 16-20, width 88-96, mix 50-58`.
- **Standard hard-tune stack** (most Travis, way back, Don Toliver) → `voices 3, detune 14-16, delay 24-28, width 80-85, mix 44-50`.
- **Bright club-pop / T-Pain** (T-Pain, Kesha, LMFAO, will.i.am) → `voices 3, detune 12-14, delay 16-20, width 66-74, mix 40-44` (tighter + narrower + brighter than the Travis cavern; brightness comes from EQ, not the doubler).
- **808s / Donda Kanye** → `voices 3, detune 14-16, delay 24-28, width 70-76, mix 40-46` (lush, longer delay).
- **Intimate / low-autotune** (Travis "MY EYES") → `voices 2, detune 8-10, delay 22-26, width 55-60, mix 26-30` (subtle).
- **Lush / psychedelic** (SKELETONS) → `voices 3, detune 16, delay 30, width 80, mix 40-42` (long delay, softer mix — not aggressive).

**Leave the doubler OFF (or omit it) for:** dry rap verses (Kendrick, J. Cole, MF DOOM, Eminem, JAY-Z, Pusha T, etc.), classic rock / oldies, big solo power vocals (Adele, Whitney), and anything where the natural performance isn't a produced stack. On multi-role songs, give melodic guests a moderate double but keep dry-rap features off (e.g. on Monster: Kanye + Bon Iver doubled, Rick Ross/JAY-Z/Nicki dry). **Vocoder tracks (Daft Punk) skip the doubler** — the vocoder is already the vocal character and a doubler muddies it.

**Other parameter guidance:**
- `reverb.mix > 40%` → vocal sounds distant/washy. Use for cavern/hall effects (Travis, Kanye 808s, Bon Iver).
- `reverb.decay > 4.0s` → very atmospheric. Pair with large `preDelay` (30–50ms) for stadium feel.
- `reverb.decay < 1.2s` → tight room. Good for intimate (Billie Eilish), dry (Kendrick, Chris Rock spoken-word), or iconic "close" sounds (T-Pain).
- `delay.feedback` is what turns a slapback into a *trail* (multiple repeats = "ton of echo"). **Keep `feedback <= ~18-20` on any role that also has a `doubler` enabled** — the doubler now provides the thickness that heavy delay used to fake, so high-feedback delay on top just reads as excessive echo. High feedback (>30) is only for deliberate dub/echo effects, not for hard-autotune stacks.
- `delay.mix`: ~`8-15%` = subtle accent (use this when a doubler is doing the stacking); `>20%` = an obvious, present echo. `delay.time 150-220ms` = slapback, `250-350ms` = "tail", `400-550ms` = long echo (Bon Iver, Imogen Heap).
- **Don't double up "doubling" tools.** If a role has the `doubler` on, the delay should be a light accent, not a second thickener — otherwise the mix gets washy/echo-y (the doubler also feeds the delay + reverb, so it amplifies their wetness).
- `distortion.drive > 25` + `mix > 20%` → heavy grit (Playboi Carti, rage-era Travis, Pop Smoke, MF DOOM). Subtle warmth is `drive 4-8 / mix 4-6`.
- `compressor.ratio 6-8` = tight/punchy. `3-4` = gentle. Spoken word / rap clarity benefits from `ratio 6` + fast attack (0.002-0.003).
- `noiseGate.enabled: true` for spoken word, rap without reverb wash, tight-room treatments. `threshold -42 to -48`.

### Role name matching is exact and case-sensitive

The `meta.roles[]` array holds hand-typed strings. They match whatever was entered at import time. Common surprises:
- **Typos preserved**: "Jaimie Foxx" (not "Jamie Foxx") on Slow Jamz, "The Weekend" (not "The Weeknd") on SKELETONS.
- **Formatting**: "JAY Z" (no dash) in library, even though artist credit is "JAY-Z".
- **Mislabels**: Paranoid's second role is "Kid Cudi" but the actual vocalist is Mr Hudson. Apply the *actual vocalist's* treatment, not the role name's.
- **Synthetic roles**: "Girl Tracks" (New Workout Plan), "Otis" (the Otis Redding sample itself).

Verify role names before writing the script:
```js
node -e "const m=JSON.parse(require('fs').readFileSync(require('path').join(require('os').homedir(), '.realtime-karaoke/songs/{trackId}/meta.json')));console.log(m.roles)"
```

If the dry-run reports `Roles skipped (name not found)`, the role-name key in the script doesn't match. Fix the key, don't rename the library.

### Preservation rule (must-have)

Every role's `voiceEffects[i]` entry holds **per-song musical context** that must be preserved across any effect rewrite: `key`, `mode`, `tempo`, and `micLevel`. The script template does this correctly — don't remove it:
```js
const existing = meta.voiceEffects[idx] || {}
const preserved = {}
if ('key' in existing) preserved.key = existing.key
if ('mode' in existing) preserved.mode = existing.mode
if ('tempo' in existing) preserved.tempo = existing.tempo
if ('micLevel' in existing) preserved.micLevel = existing.micLevel
meta.voiceEffects[idx] = { ...preserved, ...newEffects }
```

Losing `key`/`mode` breaks scale-aware autotune for that song — the user's Voice Audition Booth will no longer auto-load the right key when they click the song's role.

### Co-artist strategy

If a co-artist in the song **has their own preset in [VocalPresets.ts](src/renderer/src/audio/VocalPresets.ts)** and the track's mix matches their usual treatment (Rihanna on Famous, Kendrick on goosebumps), **don't override them** — the refined preset is already right. Just omit that role from `TRACK_EFFECTS[trackId]` and comment why in the script:
```js
// goosebumps: Kendrick Lamar → keeps new Kendrick preset (intentional contrast)
```

**Exception:** when the track's production intentionally treats the co-artist differently from their usual sound, write a custom block. Examples:
- The Weeknd on SKELETONS → Kevin-Parker-psychedelic treatment (heavy chorus, huge reverb), not his usual 80s-retro polish.
- Travis Scott on CRUSH (Carti's album) → unusually bright and heavily distorted, playing in Carti-space.

### Don't touch VocalPresets.ts for per-song work

Per-song customization is **only** applied via the script to individual `meta.json` files. Do not modify [VocalPresets.ts](src/renderer/src/audio/VocalPresets.ts) — that file defines global artist presets used everywhere (Admin preset picker, Voice Audition Booth, future imports). Changes there affect all users of the preset, not just one song.

### Full effect parameter reference

From [VoiceEffectsTypes.ts](src/renderer/src/audio/VoiceEffectsTypes.ts) — use these exact ranges:
| Effect | Params | Range |
|---|---|---|
| `pitchCorrection` | `enabled`, `strength` | 0–100 (0=bypass, 100=hard snap) |
| `compressor` | `enabled`, `threshold`, `ratio`, `attack`, `release` | -100..0 dB, 1–20, 0–1s, 0–1s |
| `eq` | `enabled`, `lowGain`, `midGain`, `highGain` | ±24 dB each (3-band) |
| `chorus` | `enabled`, `rate`, `depth`, `mix` | 0–20 Hz, 0–1, 0–100% |
| `delay` | `enabled`, `time`, `feedback`, `mix` | 0–2000 ms, 0–100%, 0–100% |
| `reverb` | `enabled`, `decay`, `preDelay`, `mix` | 0.1–10 s, 0–100 ms, 0–100% |
| `distortion` | `enabled`, `drive`, `mix` | 0–100, 0–100% |
| `noiseGate` | `enabled`, `threshold` | -100..0 dB |
| `vocoder` | `enabled`, `mix`, `brightness`, `sibilance`, `voicing` | 0–100%, 0–100, 0–100, `'triad'\|'power'\|'octaves'` |
| `doubler` | `enabled`, `voices`, `detune`, `delay`, `width`, `mix` | 2–4, 0–30¢, 8–40 ms, 0–100%, 0–100% |

Always include every block in every role — don't partial-update. If you want a block inert, set `enabled: false` and give the other fields neutral values (the existing scripts follow this pattern). `vocoder` and `doubler` are OPTIONAL blocks (newer than the rest) — a missing block is treated as disabled, so older `meta.json` files without them are fine.

**Adding only the `doubler` to existing songs:** the per-song doubler scripts ([scripts/travis-doubler-per-song.js](packages/desktop/scripts/travis-doubler-per-song.js), [tpain-doubler-per-song.js](packages/desktop/scripts/tpain-doubler-per-song.js), [library-doubler-per-song.js](packages/desktop/scripts/library-doubler-per-song.js)) MERGE only a `doubler` block into each role's existing `voiceEffects[i]` (`{ ...existing, doubler }`) rather than rewriting the whole entry — this preserves all prior per-song tuning (key/mode/tempo/micLevel/pitchCorrection/reverb/…). Copy one of these as the template when adding the doubler to more songs; they dry-run by default and write a one-time `.doubler.bak`.

## Common Pitfalls

- When modifying `QueueItem` interface, also update the companion site's queue insert (they must match the DB schema).
- The `source` field on `karaoke_queue` (`'local'` vs `'remote'`) prevents echo in Realtime subscriptions. Always set it correctly.
- The companion site HTML (`docs/index.html`) must NOT use JS template literals — use string concatenation instead for all dynamic HTML rendering.
- `stemsPath`, `songPath`, `lyrics`, and `voiceEffects` are local-only fields on `QueueItem` — they are NOT stored in Supabase. Remote queue items are resolved against the local catalog.
