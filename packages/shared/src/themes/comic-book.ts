import type { ThemeTokens } from './tokens'

// Comic Book — bright modern pop-art. Ben-Day halftone dots, heavy black ink
// panel borders, hard offset "ink" shadows, primary pop colors (red / yellow /
// sky-blue), speech bubbles and action bursts. A light theme in the
// neo-brutal "offset shadow" family, but louder, dottier, and burstier.
//
// Fonts: display = Luckiest Guy (the quintessential bold comic-poster face),
// body = Nunito (clean, rounded, friendly, highly readable). Both are free
// Google fonts AND already-bundled Expo font packages, so all three platforms
// (desktop / web / mobile) render the exact same type system.

export const COMIC_BOOK_TOKENS: ThemeTokens = {
  name: 'comic-book',
  displayName: 'Comic Book',
  nextThemeName: 'tropical', // comic-book → tropical in the theme ring

  // ── Raw colors ─────────────────────────────────────────────────────────────
  black: '#16161D', // heavy ink — outlines + text
  white: '#FFFFFF', // panel fill (literal white)
  cream: '#FFF7E6', // warm newsprint paper
  creamDark: '#FCEFC9',
  hotRed: '#FF1F4B', // comic action red
  vividYellow: '#FFD400', // comic yellow
  softViolet: '#7C4DFF',
  mintGreen: '#00C853',
  muted: '#5A5A66',
  faint: '#9A9AA6',

  accentA: '#2FA8FF', // ben-day sky blue — light enough for dark text on selects
  accentB: '#FFD400', // comic yellow — NOW PLAYING banner bg (dark text) ✓ bright
  accentC: '#FF1F4B', // comic red

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg: '#FFF7E6',
  titlebarBg: '#16161D',
  titlebarText: '#FFFFFF',

  navBg: '#16161D',
  navBorderBottom: '3px solid #16161D',
  navLink: '#FFFFFF',
  navLinkActive: '#FFD400',
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'rgba(255,255,255,0.08)',

  // ── Borders & Shadows (hard "ink" offset, like a printed panel) ─────────────
  border: '3px solid #16161D',
  borderThin: '2px solid #16161D',
  borderLight: '1.5px solid rgba(22,22,29,0.2)',
  shadow: '4px 4px 0px #16161D',
  shadowLift: '7px 7px 0px #16161D',
  shadowPressed: '2px 2px 0px #16161D',
  shadowColor: (color: string) => `4px 4px 0px ${color}`,

  // ── Radius ─────────────────────────────────────────────────────────────────
  radius: 6,
  radiusSmall: 4,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder: 'rgba(22,22,29,0.15)',
  spinnerBorderTop: '#FF1F4B',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: false,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'offset', // hard ink offset — same family as neo-brutal
  cardBorderWidth: 3,
  displayUppercase: true,
  displayLetterSpacing: 1,
  accentGlowColor: '#FF1F4B',
  statusBarStyle: 'dark', // light paper background

  tabBarBg: '#FFFFFF',
  tabBarBlurTint: 'light',
  tabBarOverlay: 'rgba(255,255,255,0.72)',
  tabBarBorder: '#16161D',
  tabBarPill: '#FF1F4B', // red action pill
  tabBarPillFg: '#FFFFFF', // white text on the red pill
  tabBarFg: '#16161D', // ink for all inactive tabs (one shared color)

  dimBorder: 'rgba(22,22,29,0.25)',
  pressedOverlay: 'rgba(22,22,29,0.06)',
}
