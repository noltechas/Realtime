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

## Common Pitfalls

- When modifying `QueueItem` interface, also update the companion site's queue insert (they must match the DB schema).
- The `source` field on `karaoke_queue` (`'local'` vs `'remote'`) prevents echo in Realtime subscriptions. Always set it correctly.
- The companion site HTML (`docs/index.html`) must NOT use JS template literals — use string concatenation instead for all dynamic HTML rendering.
- `stemsPath`, `songPath`, `lyrics`, and `voiceEffects` are local-only fields on `QueueItem` — they are NOT stored in Supabase. Remote queue items are resolved against the local catalog.
