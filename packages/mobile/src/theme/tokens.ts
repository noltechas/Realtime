import {
  NEO_BRUTAL_TOKENS,
  CYBERPUNK_TOKENS,
  SKETCH_TOKENS,
  URBAN_TOKENS,
  DEEP_SEA_TOKENS,
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

// Cyberpunk-Mobile — monospace fallback chain. On iOS, "Menlo" is the
// built-in monospace; "Courier" is the universal fallback.
export const CYBERPUNK_MOBILE: ThemeTokens = withMobileFonts(
  CYBERPUNK_TOKENS,
  'Menlo',
  'Menlo',
)

// Sketch-Mobile — Custom loaded Google fonts (Kalam)
export const SKETCH_MOBILE: ThemeTokens = withMobileFonts(
  SKETCH_TOKENS,
  'Kalam_700Bold',
  'Kalam_400Regular',
)

// Urban-Mobile — Custom loaded Google fonts.
export const URBAN_MOBILE: ThemeTokens = withMobileFonts(
  URBAN_TOKENS,
  'PermanentMarker_400Regular',
  'Oswald_400Regular',
)

// Deep-Sea-Mobile — Custom loaded Google fonts.
export const DEEP_SEA_MOBILE: ThemeTokens = withMobileFonts(
  DEEP_SEA_TOKENS,
  'LuckiestGuy_400Regular',
  'Nunito_400Regular',
)

const MOBILE_BY_NAME: Record<string, ThemeTokens> = {
  'neo-brutal': NEO_BRUTAL_MOBILE,
  cyberpunk: CYBERPUNK_MOBILE,
  sketch: SKETCH_MOBILE,
  urban: URBAN_MOBILE,
  'deep-sea': DEEP_SEA_MOBILE,
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
