import type { ThemeTokens } from './tokens'

// Space / Cosmic — deep-void background with a hot-magenta + plasma-cyan
// accent triad lifted directly from the desktop space theme so per-song
// stage-theme overrides feel consistent across platforms. Hero motifs that
// every space atom touches: twinkling starfields, drifting nebula clouds,
// orbital rings, holographic HUD brackets, shooting stars.
export const SPACE_TOKENS: ThemeTokens = {
  name: 'space',
  displayName: 'Space',
  nextThemeName: 'steampunk',

  // Raw colors — cool light text on deep void
  black:       '#E8E6F0',     // primary text — cool white on void
  white:       '#08080F',     // inverted for "light" blocks
  cream:       '#0E0E1A',
  creamDark:   '#151528',     // panel/card surface
  hotRed:      '#FF4060',     // supernova red
  vividYellow: '#FFC34D',     // pulsar amber (warm beacon highlights)
  softViolet:  '#E040FB',
  mintGreen:   '#40E0D0',     // plasma cyan
  muted:       '#9896A8',     // cool muted gray
  faint:       'rgba(224,64,251,0.22)',

  accentA: '#E040FB',          // nebula magenta — primary
  accentB: '#40E0D0',          // plasma cyan — secondary (bright; dark text reads on it)
  accentC: '#A8C2FF',          // starlight blue — tertiary

  // Shell
  appBg:         '#08080F',
  titlebarBg:    '#08080F',
  titlebarText:  '#9896A8',

  navBg:           'rgba(8,8,15,0.95)',
  navBorderBottom: '1px solid rgba(224,64,251,0.12)',
  navLink:         '#9896A8',
  navLinkActive:   '#E040FB',
  navLinkActiveBg: 'rgba(224,64,251,0.08)',
  navLinkHoverBg:  'rgba(224,64,251,0.05)',

  border:       '1px solid rgba(224,64,251,0.15)',
  borderThin:   '1px solid rgba(224,64,251,0.10)',
  borderLight:  '1px solid rgba(224,64,251,0.06)',
  shadow:        '0 0 10px rgba(224,64,251,0.1), 0 0 6px rgba(64,224,208,0.06)',
  shadowLift:    '0 0 18px rgba(224,64,251,0.2), 0 0 12px rgba(64,224,208,0.12)',
  shadowPressed: '0 0 4px rgba(224,64,251,0.08)',
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  radius:      10,
  radiusSmall: 6,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder:    'rgba(224,64,251,0.15)',
  spinnerBorderTop: '#E040FB',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',            // sci-fi geometric, but not hard-edged
  cardShape: 'box',                  // HUD-rectangles, not blobs
  shadowStyle: 'glow',               // nebula/plasma neon glow
  cardBorderWidth: 1,
  displayUppercase: true,            // Orbitron reads strongest in caps + spacing
  displayLetterSpacing: 1.5,
  accentGlowColor: '#E040FB',        // magenta halo
  statusBarStyle: 'light',

  tabBarBg: '#08080F',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(8,8,15,0.7)',
  tabBarBorder: 'rgba(224,64,251,0.22)',
  tabBarPill: '#E040FB',             // magenta pill behind active tab
  tabBarPillFg: '#08080F',           // void-dark text on the pill
  tabBarFg: '#9896A8',               // cool muted for inactive tabs

  dimBorder: 'rgba(224,64,251,0.20)',
  pressedOverlay: 'rgba(224,64,251,0.08)',
}
