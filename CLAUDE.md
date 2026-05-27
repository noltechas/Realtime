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
- The HTML file lives at `docs/index.html` (GitHub Pages serves from the `docs/` folder).
- Supabase Edge Functions and Storage **cannot serve HTML** (they force `text/plain` + CSP `sandbox` on shared domains). This is a permanent Supabase security restriction.
- QR code URL format: `https://noltechas.github.io/Realtime/?session=<CODE>`
- The base URL is configured in `src/main/index.ts` as `COMPANION_BASE_URL`.
- The companion JS uses string concatenation (NOT template literals) and loads `@supabase/supabase-js@2` from CDN.
- To edit the companion site: modify `docs/index.html` and push to GitHub.

## IPC Conventions

- `ipcMain.handle()` for request/response (renderer calls `ipcRenderer.invoke()`)
- `ipcMain.on()` for fire-and-forget (renderer calls `ipcRenderer.send()`)
- Namespace: `window:*`, `stage:*`, `state:*`, `playback:*`, `spotify:*`, `lyrics:*`, `audio:*`, `karaoke:*`

## Testing Changes

1. Run `npx tsc --noEmit` — must pass with no errors
2. Run `npx electron-vite build` — must build cleanly
3. Run `npm run dev` to test in development mode
4. For companion site changes: edit `docs/index.html`, push to GitHub, and test by scanning QR code

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
8. **Update companion website in `docs/index.html`** — ALWAYS add the new theme to the companion website:
   - Add any new Google Fonts to the `<link>` tag.
   - Add a new `else if(S.theme_name==="theme-name")` block in `applyTheme()` with CSS variables and component overrides matching the Electron theme.
   - Add a new `<button class="theme-pick-btn">` in `renderConfig()` with inline preview styles matching the theme's aesthetic.

### Files to create/modify (Mobile App)

When extending the theme to the Expo mobile app (`packages/mobile`), you must inject your structural and geometric changes into the mobile UI components directly:
1. **Define the Theme**: Create the theme token file in `packages/mobile/src/theme/themes/` and register it in `tokens.ts`.
2. **Update Core Screens**: Apply conditional logic (`tokens.name === 'your-theme'`) to alter structural styles in:
   - `screens/SongsScreen.tsx` (Song cards - apply structural transforms here)
   - `screens/QueueScreen.tsx` (Queue rows, row numbers, singer pills, upvote/downvote buttons, locked tags, voted tags)
   - `screens/StageScreen.tsx` (Play buttons, reaction grid cells, toggles)
   - `screens/WizardScreen.tsx` (Song setup cards, role assignment cards, and ensure footer action buttons are themed)
3. **Update Shared Components**: Don't forget to update shared UI elements:
   - `components/GenreTabs.tsx` (Genre Selection Tabs, container transforms, and active text color visibility)
   - `components/PrimaryButton.tsx` (Base button styles used across screens like WizardScreen)
4. **Update Navigation**: Check `navigation/<Theme>TabBar.tsx` and `navigation/TabIcons.tsx` to ensure custom icons fit the theme and active/inactive tab text contrast is readable against the background, remembering that `tokens.black` might mean white.
   - **NEVER create custom SVG icons for the nav bar.** Always use `Ionicons` from `@expo/vector-icons`. The canonical icon names are defined in `navigation/TabIcons.tsx` — use those same Ionicons names (e.g. `musical-notes` for Songs, `fish` for Profile). Custom-drawn nav icons are inconsistent with the icon library and will be rejected.
5. **Organic Randomness**: If your theme calls for a chaotic or hand-drawn look (like the Sketch theme), make sure to add organic randomness (e.g., slight rotations using string hashes) instead of extreme static rotations, which can cause clipping or look artificial.
6. **Unskew / Counter-transform**: If your theme uses structural transformations (like `skewX` in the Urban theme), you must safely counter-transform (e.g., `skewX: '8deg'`) the inner text and icons so they remain perfectly upright and legible inside their warped containers.

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
input → compressor → pitchCorrection → EQ → distortion → chorus → delay → reverb → noiseGate → output
```

**The chorus-after-autotune gotcha** (most common mistake): for mechanical-autotune presets (T-Pain, Travis Scott, Kanye 808s, Future, Playboi Carti), chorus runs *after* pitch correction and creates a pitch-modulated second voice that *undoes* the hard-snap quality. Real records of these artists don't use analog chorus on the vocal — "doubling" is a separately-recorded second take. **Rule of thumb:**
- `pitchCorrection.strength >= 80` → `chorus.enabled: false` (or `mix <= 10`)
- `pitchCorrection.strength 40-80` → `chorus.mix <= 15` if enabled
- `pitchCorrection.strength < 40` or disabled → chorus can go up to ~22 for pop/R&B width

**Exceptions where chorus IS the character, keep it heavy:** Daft Punk (vocoder), Bon Iver (layered harmonies), Tame Impala (psychedelic modulation), Imogen Heap (crystalline harmonizer), Kevin-Parker-produced tracks like SKELETONS.

**Other parameter guidance:**
- `reverb.mix > 40%` → vocal sounds distant/washy. Use for cavern/hall effects (Travis, Kanye 808s, Bon Iver).
- `reverb.decay > 4.0s` → very atmospheric. Pair with large `preDelay` (30–50ms) for stadium feel.
- `reverb.decay < 1.2s` → tight room. Good for intimate (Billie Eilish), dry (Kendrick, Chris Rock spoken-word), or iconic "close" sounds (T-Pain).
- `delay.mix > 20%` → obvious echo; pair with `feedback > 30%` for slapback trails (Travis Scott, goosebumps).
- `delay.time 150-220ms` = slapback. `250-350ms` = "tail". `400-550ms` = long echo (Bon Iver, Imogen Heap).
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

Always include every block in every role — don't partial-update. If you want a block inert, set `enabled: false` and give the other fields neutral values (the existing scripts follow this pattern).

## Common Pitfalls

- When modifying `QueueItem` interface, also update the companion site's queue insert (they must match the DB schema).
- The `source` field on `karaoke_queue` (`'local'` vs `'remote'`) prevents echo in Realtime subscriptions. Always set it correctly.
- The companion site HTML (`docs/index.html`) must NOT use JS template literals — use string concatenation instead for all dynamic HTML rendering.
- `stemsPath`, `songPath`, `lyrics`, and `voiceEffects` are local-only fields on `QueueItem` — they are NOT stored in Supabase. Remote queue items are resolved against the local catalog.
