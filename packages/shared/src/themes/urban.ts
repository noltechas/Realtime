import type { ThemeTokens } from './tokens'

export const URBAN_TOKENS: ThemeTokens = {
  name: 'urban',
  displayName: 'Hip Hop',
  nextThemeName: 'deep-sea',

  black: '#FFFFFF',
  white: '#050505',
  cream: '#B0B0B0',
  creamDark: '#111111',
  hotRed: '#FF1E1E',
  vividYellow: 'rgba(212, 255, 0, 0.15)',
  softViolet: '#00F0FF',
  mintGreen: '#D4FF00',
  muted: '#B0B0B0',
  faint: 'rgba(255,255,255,0.1)',

  accentA: '#D4FF00',
  accentB: '#E0E0E0',
  accentC: '#00F0FF',

  appBg: '#030303', // Desktop uses a radial gradient, mobile will use solid void
  titlebarBg: 'rgba(5, 5, 5, 0.4)',
  titlebarText: '#B0B0B0',

  navBg: 'rgba(10, 10, 10, 0.6)',
  navBorderBottom: '1px solid rgba(212, 255, 0, 0.1)',
  navLink: '#B0B0B0',
  navLinkActive: '#D4FF00',
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'transparent',

  border: 'none',
  borderThin: '1px solid rgba(255, 255, 255, 0.1)',
  borderLight: '1px outset rgba(255, 255, 255, 0.05)',
  shadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
  shadowLift: '0 15px 40px rgba(0, 0, 0, 0.95)',
  shadowPressed: '0 2px 10px rgba(0, 0, 0, 0.9)',
  shadowColor: (color: string) => `0 0 12px ${color}40`,

  radius: 0,
  radiusSmall: 0,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder: 'rgba(255, 255, 255, 0.1)',
  spinnerBorderTop: '#D4FF00',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'sharp',
  cardShape: 'box', // Urban uses sharp boxes, not organic blobs
  shadowStyle: 'glow',
  cardBorderWidth: 0,
  displayUppercase: true,
  displayLetterSpacing: 2,
  accentGlowColor: '#D4FF00',
  statusBarStyle: 'light',

  tabBarBg: '#0F0F0F',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(15,15,15,0.7)',
  tabBarBorder: 'rgba(255, 255, 255, 0.05)',
  tabBarPill: '#D4FF00', // Toxic Green pill
  tabBarPillFg: '#050505', // Void text on active pill
  tabBarFg: '#B0B0B0', // Ash grey for inactive icons

  dimBorder: 'rgba(255,255,255,0.1)',
  pressedOverlay: 'rgba(255,255,255,0.05)',
}
