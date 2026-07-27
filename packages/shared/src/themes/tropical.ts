import type { ThemeTokens } from './tokens'

// Tropical — sun-drenched tiki beach. Warm sand + lagoon turquoise, hibiscus
// pink, sunset coral and sunshine yellow, framed in bamboo poles and lit by
// flickering tiki torches with swaying palm fronds overhead. A LIGHT theme
// (dark deep-palm ink text on warm sand) — soft, natural, and organic rather
// than the hard-offset neo-brutal/comic family.
//
// Fonts: display = Pacifico (the quintessential surf/beach brush-script logo
// face), body = Quicksand (rounded, friendly, highly legible). Both are free
// Google fonts AND available as Expo font packages, so all three platforms
// (desktop / web / mobile) render the exact same type system.

export const TROPICAL_TOKENS: ThemeTokens = {
  name: 'tropical',
  displayName: 'Tropical',
  nextThemeName: 'neo-brutal', // new tail of the ring → loops back to the start

  // ── Raw colors ─────────────────────────────────────────────────────────────
  black: '#123A33', // deep palm/teal ink — primary text on sand
  white: '#FFFFFF', // panel fill (literal white)
  cream: '#FFF4DE', // warm beach sand (page background)
  creamDark: '#F6E6C2', // shaded sand
  hotRed: '#FF6B3D', // sunset coral
  vividYellow: '#FFC83D', // sunshine
  softViolet: '#7A5CFF', // beach orchid
  mintGreen: '#1FB573', // palm green
  muted: '#5E7D72', // muted sea-glass green-grey text
  faint: '#9DB5AB', // faint driftwood grey-green

  accentA: '#10B7B0', // lagoon turquoise — light enough for dark text on selects
  accentB: '#FFC83D', // sunshine yellow — NOW PLAYING banner bg (dark text) ✓ bright
  accentC: '#FF3D81', // hibiscus pink

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg: '#FFF4DE',
  titlebarBg: '#0E2E29', // deep palm
  titlebarText: '#FFF4DE',

  navBg: '#0E2E29',
  navBorderBottom: '3px solid #C9A24B', // bamboo trim
  navLink: '#FFF4DE',
  navLinkActive: '#FFC83D',
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'rgba(255,255,255,0.08)',

  // ── Borders & Shadows (bamboo keyline + soft warm sun-shadow) ───────────────
  border: '3px solid #0E2E29',
  borderThin: '2px solid #0E2E29',
  borderLight: '1.5px solid rgba(14,46,41,0.18)',
  shadow: '0 8px 22px rgba(14,46,41,0.18)',
  shadowLift: '0 14px 34px rgba(14,46,41,0.26)',
  shadowPressed: '0 3px 10px rgba(14,46,41,0.16)',
  shadowColor: (color: string) => `0 10px 26px ${color}`,

  // ── Radius — rounded, organic ────────────────────────────────────────────
  radius: 18,
  radiusSmall: 12,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder: 'rgba(16,183,176,0.22)',
  spinnerBorderTop: '#10B7B0',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: false, // light sand theme — dark ink text, white-ish panels
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'glow', // soft natural drop (uses accentGlowColor + shadowRadius)
  cardBorderWidth: 3, // bamboo frames are thick
  displayUppercase: true, // mobile display face is The Last Trunks (unicase block)
  displayLetterSpacing: 1.2, // …which is condensed, so it always wants tracking
  accentGlowColor: '#0E2E29', // soft warm palm-shadow under cards
  statusBarStyle: 'dark', // the mobile scene opens on a pale drawn sky

  tabBarBg: 'rgba(231,206,147,0.95)', // bamboo cane
  tabBarBlurTint: 'light',
  tabBarOverlay: 'rgba(255,244,222,0.4)',
  tabBarBorder: '#8F6A32', // bamboo shadow tan
  tabBarPill: '#10B7B0', // lagoon-painted active sign
  tabBarPillFg: '#FFF7E6',
  tabBarFg: '#0E2E29', // deep palm for all inactive tabs (one shared color)

  dimBorder: 'rgba(14,46,41,0.20)',
  pressedOverlay: 'rgba(14,46,41,0.06)',
}
