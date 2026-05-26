import type { ThemeTokens } from './tokens'

export const NEO_BRUTAL_TOKENS: ThemeTokens = {
  name: 'neo-brutal',
  displayName: 'Neo Brutal',
  nextThemeName: 'cyberpunk',

  black: '#1A1A1A',
  white: '#FFFFFF',
  cream: '#FFF8EE',
  creamDark: '#F5ECDC',
  hotRed: '#FF3B30',
  vividYellow: '#FFD60A',
  softViolet: '#B388FF',
  mintGreen: '#00E676',
  muted: '#555555',
  faint: '#888888',

  accentA: '#B388FF',
  accentB: '#FFD60A',
  accentC: '#00E676',

  appBg: '#FFF8EE',
  titlebarBg: '#1A1A1A',
  titlebarText: '#FFFFFF',

  navBg: '#1A1A1A',
  navBorderBottom: '3px solid #1A1A1A',
  navLink: '#FFFFFF',
  navLinkActive: '#FFD60A',
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'rgba(255,255,255,0.06)',

  border: '3px solid #1A1A1A',
  borderThin: '2px solid #1A1A1A',
  borderLight: '1px solid rgba(26,26,26,0.15)',
  shadow: '4px 4px 0px #1A1A1A',
  shadowLift: '6px 6px 0px #1A1A1A',
  shadowPressed: '2px 2px 0px #1A1A1A',
  shadowColor: (color: string) => `4px 4px 0px ${color}`,

  radius: 8,
  radiusSmall: 4,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder: 'rgba(26,26,26,0.15)',
  spinnerBorderTop: '#FF3B30',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: false,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'offset',
  cardBorderWidth: 3,
  displayUppercase: false,
  displayLetterSpacing: 0,
  accentGlowColor: '#1A1A1A',
  statusBarStyle: 'dark',

  tabBarBg: '#FFF8EE',
  tabBarBlurTint: 'light',
  tabBarOverlay: 'rgba(255,248,238,0.55)',
  tabBarBorder: 'rgba(26,26,26,0.15)',
  tabBarPill: '#1A1A1A',
  tabBarPillFg: '#FFFFFF',
  tabBarFg: '#1A1A1A',

  dimBorder: 'rgba(26,26,26,0.2)',
  pressedOverlay: 'rgba(26,26,26,0.05)',
}
