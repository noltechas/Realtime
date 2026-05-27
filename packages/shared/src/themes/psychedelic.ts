import type { ThemeTokens } from './tokens'

// Psychedelic / Lava Lamp — 1960s acid-trip palette: deep-purple void with a
// hot-pink / electric-lime / tangerine triad. Mirrors the desktop psychedelic
// theme (packages/desktop/src/renderer/src/styles/psychedelic.ts) so per-song
// stage-theme overrides feel consistent across platforms.
export const PSYCHEDELIC_TOKENS: ThemeTokens = {
  name: 'psychedelic',
  displayName: 'Psychedelic',
  nextThemeName: 'zen',

  // Raw colors — high contrast: lavender-white text on deep purple
  black: '#f5ecff',                  // primary text (light on dark)
  white: '#1a0a2e',                  // inverted for "light" blocks
  cream: '#241040',
  creamDark: '#2a1450',              // panel/card surface
  hotRed: '#ff2d95',                 // hot pink (accentA twin)
  vividYellow: '#ff8c2d',            // tangerine (used by NOW PLAYING banner)
  softViolet: '#952dff',
  mintGreen: '#b6ff2d',              // electric lime
  muted: '#c8a8e8',                  // mid-contrast lavender body text
  faint: 'rgba(200,168,232,0.35)',

  accentA: '#ff2d95',                // primary — hot pink
  accentB: '#b6ff2d',                // secondary — electric lime (bright; safe for banners with dark text)
  accentC: '#ff8c2d',                // tertiary — tangerine (lava-orb color)

  appBg: '#1a0a2e',                  // deep purple void
  titlebarBg: '#1a0a2e',
  titlebarText: '#c8a8e8',

  navBg: 'rgba(26,10,46,0.95)',
  navBorderBottom: '1px solid rgba(255,45,149,0.15)',
  navLink: '#c8a8e8',
  navLinkActive: '#ff2d95',
  navLinkActiveBg: 'rgba(255,45,149,0.1)',
  navLinkHoverBg: 'rgba(255,45,149,0.06)',

  border: '1px solid rgba(255,45,149,0.15)',
  borderThin: '1px solid rgba(255,45,149,0.10)',
  borderLight: '1px solid rgba(255,45,149,0.06)',
  shadow: '0 0 8px rgba(255,45,149,0.1), 0 0 6px rgba(182,255,45,0.06)',
  shadowLift: '0 0 16px rgba(255,45,149,0.2), 0 0 12px rgba(182,255,45,0.12)',
  shadowPressed: '0 0 4px rgba(255,45,149,0.08)',
  shadowColor: (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  radius: 16,
  radiusSmall: 10,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder: 'rgba(255,45,149,0.15)',
  spinnerBorderTop: '#ff2d95',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',            // organic, not sharp
  cardShape: 'blob',                 // asymmetric corners via blobCornerRadii
  shadowStyle: 'glow',               // neon glow, not offset
  cardBorderWidth: 1,
  displayUppercase: false,           // Chicle is already chunky/bubbly; caps would ruin it
  displayLetterSpacing: 0,
  accentGlowColor: '#ff2d95',        // hot pink halo
  statusBarStyle: 'light',

  tabBarBg: '#1a0a2e',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(26,10,46,0.7)',
  tabBarBorder: 'rgba(255,45,149,0.18)',
  tabBarPill: '#ff8c2d',             // tangerine — base color of the lava orb
  tabBarPillFg: '#1a0a2e',           // deep purple text on the orb
  tabBarFg: '#c8a8e8',               // muted lavender for inactive tabs

  dimBorder: 'rgba(255,45,149,0.18)',
  pressedOverlay: 'rgba(255,45,149,0.08)',
}
