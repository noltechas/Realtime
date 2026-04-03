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

Themes are defined in `src/renderer/src/styles/` and registered in `src/renderer/src/context/ThemeContext.tsx`. Themes should be VERY VERY original and should all have new features, animations, looks, colors, etc. There should be something new with each theme. Every new theme requires changes across multiple files:

### Files to create/modify

1. **Create `src/renderer/src/styles/{theme-name}.ts`** — Implement the full `Theme` interface from `theme.ts`. Use an existing theme (e.g., `cyberpunk.ts`) as a template.
2. **Register in `ThemeContext.tsx`** — Import and add to the `THEMES` map.
3. **Update the theme ring** — Set `nextThemeName` on the previous last theme to point to the new one, and set the new theme's `nextThemeName` to cycle back (currently `neo-brutal`).
4. **Add idle screen in `KaraokePage.tsx`** — Each theme has a hardcoded idle/waiting screen (shown when no song is queued). Add a `if (theme.name === '...')` branch before the Urban fallback (`// ---- Urban (Hip Hop) idle ----`). **Idle screens must have lots of character** — add decorative SVG elements (icons, shapes, patterns), animated backgrounds, thematic flourishes, and atmospheric details that match the theme's personality. Look at existing themes for examples: neo-brutal has colored offset blocks, sketch has hand-drawn SVG doodles, cyberpunk has dot grids and scanlines, urban has spotlight vignettes and grunge noise, deep-sea has jellyfish SVGs and light rays, psychedelic has peace signs and spinning mandalas. A plain centered heading + QR code is not enough.
5. **Add lyric highlighting in `KaraokePage.tsx`** — Each theme has custom active-line styling in the lyric renderer (~line 1078). Add a branch for the new theme with unique visual effects (glow, animation class, etc.). The default `else` branch is generic and boring.
6. **Add CSS animation in `karaoke.css`** — Define a keyframe animation and a `.k-line--{theme-name}` class for the stage lyric effect.
7. **Update QR overlay in `KaraokePage.tsx`** — If the theme has a dark background, ensure it gets `'rgba(0,0,0,0.8)'` for the QR backdrop (light themes are whitelisted: `neo-brutal`, `sketch`).

### Contrast checklist

- **`black`/`white` are semantic, not literal.** On dark themes, `black` = light text, `white` = dark background. On light themes, they're normal. All text using `theme.black` will be readable on `theme.cream`/`theme.appBg`.
- **The NOW PLAYING banner** (`NowPlayingBanner` in `QueuePage.tsx`) uses `theme.accentB` as background with hardcoded dark (`#1A1A1A`) text — `accentB` must always be a bright/vivid color that provides good contrast with dark text. Always preview the Queue page with a song playing to verify the NOW PLAYING card looks good with the theme's accentB.
- **Singer count buttons** use `theme.accentA` for the selected state with dark text.
- **Never use `theme.white` as text color on a `theme.card` background** — on light themes they're the same color. Use `theme.black` for text on card backgrounds.
- **The theme dropdown** in `App.tsx` uses `theme.black` for text on the card-colored dropdown. Don't change this to `navLink`.
- **Hardcoded colors** should only appear in theme-specific idle screens and lyric effects where the exact theme is known.
- Test every page (Search, Queue, Stage, Admin) with the new theme to check contrast.

### Google Fonts

Themes load custom fonts via `@import url(...)` in their `globalCss`. Always include fallback fonts in the font family string.

## Common Pitfalls

- When modifying `QueueItem` interface, also update the companion site's queue insert (they must match the DB schema).
- The `source` field on `karaoke_queue` (`'local'` vs `'remote'`) prevents echo in Realtime subscriptions. Always set it correctly.
- The companion site HTML (`docs/index.html`) must NOT use JS template literals — use string concatenation instead for all dynamic HTML rendering.
- `stemsPath`, `songPath`, `lyrics`, and `voiceEffects` are local-only fields on `QueueItem` — they are NOT stored in Supabase. Remote queue items are resolved against the local catalog.
