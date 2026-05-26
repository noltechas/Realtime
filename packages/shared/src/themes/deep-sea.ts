import type { ThemeTokens } from './tokens'

export const DEEP_SEA_TOKENS: ThemeTokens = {
  name: 'deep-sea',
  displayName: 'Deep Sea',
  nextThemeName: 'neo-brutal', // Cycle back to neo-brutal

  black: '#e0fff8', // Light text on dark bg
  white: '#040918', // Very dark background
  cream: '#8ecfc2', // Muted text
  creamDark: 'rgba(12,29,66,0.8)', // Translucent card background
  hotRed: '#ff6b8a',
  vividYellow: 'rgba(0, 255, 200, 0.1)', // Light cyan background tint
  softViolet: '#b44dff',
  mintGreen: '#00ffc8',
  muted: '#8ecfc2',
  faint: 'rgba(0,255,200,0.1)',

  accentA: '#00ffc8', // Cyan
  accentB: '#b44dff', // Purple
  accentC: '#ffc857', // Gold

  appBg: '#040918',
  titlebarBg: 'rgba(4, 9, 24, 0.8)',
  titlebarText: '#8ecfc2',

  navBg: 'rgba(12, 29, 66, 0.6)',
  navBorderBottom: '1px solid rgba(0, 255, 200, 0.2)',
  navLink: '#8ecfc2',
  navLinkActive: '#00ffc8',
  navLinkActiveBg: 'rgba(0, 255, 200, 0.1)',
  navLinkHoverBg: 'rgba(0, 255, 200, 0.05)',

  border: '1px solid rgba(0, 255, 200, 0.45)',
  borderThin: '1px solid rgba(0, 255, 200, 0.2)',
  borderLight: '1px solid rgba(0, 255, 200, 0.1)',
  shadow: '0 0 10px rgba(0, 255, 200, 0.12), 0 0 22px rgba(0, 255, 200, 0.06)',
  shadowLift: '0 0 16px rgba(0, 255, 200, 0.2), 0 0 32px rgba(0, 255, 200, 0.1)',
  shadowPressed: '0 0 4px rgba(0, 255, 200, 0.1)',
  shadowColor: (color: string) => `0 0 12px ${color}66`,

  radius: 12,
  radiusSmall: 6,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder: 'rgba(0, 255, 200, 0.2)',
  spinnerBorderTop: '#00ffc8',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',
  cardShape: 'box',
  shadowStyle: 'glow',
  cardBorderWidth: 1,
  displayUppercase: false,
  displayLetterSpacing: 0,
  accentGlowColor: '#00ffc8',
  statusBarStyle: 'light',

  tabBarBg: 'rgba(4, 9, 24, 0.85)',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(12, 29, 66, 0.5)',
  tabBarBorder: 'rgba(0, 255, 200, 0.3)',
  tabBarPill: '#00ffc8',
  tabBarPillFg: '#040918',
  tabBarFg: '#8ecfc2',

  dimBorder: 'rgba(0, 255, 200, 0.2)',
  pressedOverlay: 'rgba(0, 255, 200, 0.1)',
}
