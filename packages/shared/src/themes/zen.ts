import type { ThemeTokens } from './tokens'

export const ZEN_TOKENS: ThemeTokens = {
  name: 'zen',
  displayName: 'Zen',
  nextThemeName: 'space',

  // Raw colors (warm light text on dark earth-tone backgrounds)
  black:       '#F0E6D3',      // primary text — warm light on dark bg
  white:       '#1a1814',      // inverted for "light" blocks
  cream:       '#231f1a',
  creamDark:   '#2e2820',
  hotRed:      '#D4442A',      // Vermillion
  vividYellow: '#D4B85A',      // Kintsugi Gold
  softViolet:  '#9B72CF',
  mintGreen:   '#7BA05B',      // Moss Green
  muted:       '#B8A898',
  faint:       'rgba(201,168,76,0.22)',

  accentA: '#D4442A',
  accentB: '#D4B85A',
  accentC: '#7BA05B',

  // Shell
  appBg:         '#1a1814',
  titlebarBg:    '#1a1814',
  titlebarText:  '#B8A898',

  navBg:           'rgba(26,24,20,0.95)',
  navBorderBottom: '1px solid rgba(201,168,76,0.12)',
  navLink:         '#B8A898',
  navLinkActive:   '#D4442A',
  navLinkActiveBg: 'rgba(212,68,42,0.08)',
  navLinkHoverBg:  'rgba(201,168,76,0.05)',

  border:       '1px solid rgba(201,168,76,0.15)',
  borderThin:   '1px solid rgba(201,168,76,0.10)',
  borderLight:  '1px solid rgba(201,168,76,0.06)',
  shadow:        `0 0 10px rgba(201,168,76,0.1), 0 0 6px rgba(212,68,42,0.06)`,
  shadowLift:    `0 0 18px rgba(201,168,76,0.2), 0 0 12px rgba(212,68,42,0.12)`,
  shadowPressed: `0 0 4px rgba(201,168,76,0.08)`,
  shadowColor:   (color: string) => `0 0 14px ${color}, 0 0 28px ${color}`,

  radius:      10,
  radiusSmall: 6,

  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  spinnerBorder:    'rgba(201,168,76,0.15)',
  spinnerBorderTop: '#D4B85A',

  // ── Mobile flags ────────────────────────────────────────────────────────────
  isDark: true,
  cornerStyle: 'rounded',            // organic, serene
  cardShape: 'box',                  // symmetric, harmonious
  shadowStyle: 'glow',               // subtle glow, kintsugi feel
  cardBorderWidth: 1,
  displayUppercase: false,           // keep typography meditative
  displayLetterSpacing: 1,
  accentGlowColor: '#D4B85A',        // gold kintsugi glow
  statusBarStyle: 'light',

  tabBarBg: '#1a1814',
  tabBarBlurTint: 'dark',
  tabBarOverlay: 'rgba(26,24,20,0.7)',
  tabBarBorder: 'rgba(201,168,76,0.18)',
  tabBarPill: '#D4442A',             // vermillion pill
  tabBarPillFg: '#F0E6D3',           // light text on pill
  tabBarFg: '#B8A898',               // muted for inactive tabs

  dimBorder: 'rgba(201,168,76,0.18)',
  pressedOverlay: 'rgba(201,168,76,0.08)',
}
