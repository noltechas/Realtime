import {
  NEO_BRUTAL_TOKENS,
  CYBERPUNK_TOKENS,
  SKETCH_TOKENS,
  URBAN_TOKENS,
  DEEP_SEA_TOKENS,
  PSYCHEDELIC_TOKENS,
  ZEN_TOKENS,
  SPACE_TOKENS,
  STEAMPUNK_TOKENS,
  RETROWAVE_TOKENS,
  COMIC_BOOK_TOKENS,
  TROPICAL_TOKENS,
  resolveThemeTokens,
  type ThemeTokens,
} from '@karaoke/shared'

// React Native ignores CSS variables, so we override the desktop's
// `var(--font-display)` strings with platform-safe font families. The shared
// tokens otherwise pass through verbatim — colors, radii, flags, etc.
// expo-font integration can later swap these for real loaded fonts without
// changing the tokens contract.

function withMobileFonts(tokens: ThemeTokens, display: string, body: string): ThemeTokens {
  return { ...tokens, fontDisplay: display, fontBody: body }
}

// Neo-Brutal-Mobile — system font, otherwise identical to shared tokens.
export const NEO_BRUTAL_MOBILE: ThemeTokens = withMobileFonts(
  NEO_BRUTAL_TOKENS,
  'System',
  'System',
)

// Cyberpunk-Mobile — custom glitch faces loaded via expo-font in App.tsx.
// Display = "SD Glitch" (SDGlitchDemo-Regular.ttf, a corrupted-CRT display
// face, all-caps); body = "Glitch" (Glitch-Regular.ttf), the matching torn /
// datamoshed text face. Both evoke the early-2000s digital-decay aesthetic
// the theme leans into. (Previously fell back to the system Menlo monospace.)
export const CYBERPUNK_MOBILE: ThemeTokens = withMobileFonts(
  CYBERPUNK_TOKENS,
  'SDGlitch',
  'Glitch',
)

// Sketch-Mobile — custom hand-drawn pencil faces loaded via expo-font in
// App.tsx. Display = "Pencil Trace" (PencilTrace-Regular.otf, a traced/outline
// pencil face) for headings; body = "Thin Pencil Handwriting"
// (ThinPencilHandwriting-Regular.ttf), a light handwritten face. Both have full
// glyph coverage. (Previously the Google font Kalam.)
export const SKETCH_MOBILE: ThemeTokens = withMobileFonts(
  SKETCH_TOKENS,
  'PencilTrace',
  'ThinPencil',
)

// Urban-Mobile — display headings use BomberUrban (a heavy graffiti/bomber
// face shipped under assets/fonts/BomberUrban-Regular.otf, loaded via
// expo-font in App.tsx); body falls back to Permanent Marker (the theme's
// previous display face) for a hand-tagged feel.
export const URBAN_MOBILE: ThemeTokens = withMobileFonts(
  URBAN_TOKENS,
  'BomberUrban',
  'PermanentMarker_400Regular',
)

// Deep-Sea-Mobile — the playful "Krabby Patty" face (custom .ttf under
// assets/fonts, loaded via expo-font in App.tsx) is used for ALL text on this
// theme: both display headings and body share it, per request.
export const DEEP_SEA_MOBILE: ThemeTokens = withMobileFonts(
  DEEP_SEA_TOKENS,
  'KrabbyPatty',
  'KrabbyPatty',
)

// Psychedelic-Mobile — Remalos (groovy custom display face shipped under
// assets/fonts/Remalos-Regular.ttf) for headings, Spicy Rice for body. The
// desktop equivalent uses Chicle, but mobile swaps to Remalos per request to
// give the on-device theme a more distinctive psychedelic-poster identity.
export const PSYCHEDELIC_MOBILE: ThemeTokens = withMobileFonts(
  PSYCHEDELIC_TOKENS,
  'Remalos',
  'SpicyRice_400Regular',
)

// Zen-Mobile — Japanese aesthetic typography. Noto Serif JP (Mincho-style
// serif with traditional Japanese stroke shapes) for display headings to
// evoke calligraphy. Zen Kaku Gothic New (modern Japanese geometric sans)
// for body text — clean and meditative.
export const ZEN_MOBILE: ThemeTokens = withMobileFonts(
  ZEN_TOKENS,
  'NotoSerifJP_700Bold',
  'ZenKakuGothicNew_400Regular',
)

// Space-Mobile — sci-fi HUD typography. Orbitron (geometric futuristic sans,
// the universal "spaceship UI" typeface) for headings and buttons, Exo 2 (its
// sister face — slightly humanist, much more readable at body sizes) for the
// content body. Matches the desktop space theme font stack exactly.
export const SPACE_MOBILE: ThemeTokens = withMobileFonts(
  SPACE_TOKENS,
  'Orbitron_700Bold',
  'Exo2_400Regular',
)

// Steampunk-Mobile — Victorian engraved typography. Cinzel (a Roman-capital
// inscriptional serif that reads like an engraved brass plaque) for display
// headings, Special Elite (a typewriter face that evokes the hammered-key
// industrial era) for body text. IM Fell English is loaded as well for any
// atom that wants a more antique chapter-heading feel.
export const STEAMPUNK_MOBILE: ThemeTokens = withMobileFonts(
  STEAMPUNK_TOKENS,
  'Cinzel_700Bold',
  'SpecialElite_400Regular',
)

// Retrowave-Mobile — 80s neon-tube + arcade-cabinet typography. Monoton
// (the iconic double-stroked neon-tube display face — every letter looks
// hand-bent in glass) for headings, Audiowide (rounded angular sci-fi
// display) for body and chrome chips. These pair the way actual 80s VHS
// covers paired display logos with chunky support copy.
export const RETROWAVE_MOBILE: ThemeTokens = withMobileFonts(
  RETROWAVE_TOKENS,
  'Monoton_400Regular',
  'Audiowide_400Regular',
)

// Comic-Book-Mobile — bright pop-art ink theme. Display = Luckiest Guy (the
// Blambot "BadaBoom" display logo face — single weight, so atoms keep
// fontWeight at 'normal' and use a hard ink textShadow for the inked look
// rather than faux-bolding), secondary = "Super Squad". Both are custom .ttf
// loaded via expo-font in App.tsx and match the desktop/web/stage comic theme.
export const COMIC_BOOK_MOBILE: ThemeTokens = withMobileFonts(
  COMIC_BOOK_TOKENS,
  'BadaBoomBB',
  'SuperSquad',
)

// Tropical-Mobile — sun-drenched tiki beach. Display = Pacifico (the surf/beach
// brush-script logo face) for big headings & titles; body = Quicksand (rounded,
// friendly, highly legible) for everything else. Both loaded via expo-font in
// App.tsx and match the desktop/web/stage tropical theme exactly.
export const TROPICAL_MOBILE: ThemeTokens = withMobileFonts(
  TROPICAL_TOKENS,
  'FloridaVibes',
  'TheLastTrunks',
)

const MOBILE_BY_NAME: Record<string, ThemeTokens> = {
  'neo-brutal': NEO_BRUTAL_MOBILE,
  cyberpunk: CYBERPUNK_MOBILE,
  sketch: SKETCH_MOBILE,
  urban: URBAN_MOBILE,
  'deep-sea': DEEP_SEA_MOBILE,
  psychedelic: PSYCHEDELIC_MOBILE,
  zen: ZEN_MOBILE,
  space: SPACE_MOBILE,
  steampunk: STEAMPUNK_MOBILE,
  retrowave: RETROWAVE_MOBILE,
  'comic-book': COMIC_BOOK_MOBILE,
  tropical: TROPICAL_MOBILE,
}

// Resolve a session theme name to the mobile-flavored token bundle. Falls
// back to neo-brutal for unknown names so existing themes that aren't yet
// mobile-ported gracefully degrade to the default.
export function resolveMobileTheme(name: string | null | undefined): ThemeTokens {
  if (!name) return NEO_BRUTAL_MOBILE
  return MOBILE_BY_NAME[name] ?? withMobileFonts(resolveThemeTokens(name), 'System', 'System')
}

// Legacy export — kept for compatibility with files that imported the
// flat MOBILE_TOKENS constant before themes existed. Equivalent to neo-brutal.
export const MOBILE_TOKENS: ThemeTokens = NEO_BRUTAL_MOBILE
