export interface SingerColor {
  color: string
  colorGlow: string
}

// Raw theme tokens — platform-agnostic values shared between desktop (web/Electron)
// and mobile (React Native). Strings like `border: '3px solid #1A1A1A'` are
// DOM-shaped CSS shorthand; mobile builders parse what they need and ignore the
// rest. The full React.CSSProperties style blocks (page, card, btnPrimary, etc.)
// live in the desktop's Theme interface and are not portable to RN.
export interface ThemeTokens {
  name: string
  displayName: string
  nextThemeName: string

  // Raw colors
  black: string
  white: string
  cream: string
  creamDark: string
  hotRed: string
  vividYellow: string
  softViolet: string
  mintGreen: string
  muted: string
  faint: string

  accentA: string
  accentB: string
  accentC: string

  // Shell
  appBg: string
  titlebarBg: string
  titlebarText: string

  navBg: string
  navBorderBottom: string
  navLink: string
  navLinkActive: string
  navLinkActiveBg: string
  navLinkHoverBg: string

  // Borders & shadows (CSS shorthand strings — desktop uses verbatim, mobile parses)
  border: string
  borderThin: string
  borderLight: string
  shadow: string
  shadowLift: string
  shadowPressed: string
  shadowColor: (color: string) => string

  // Radius
  radius: number
  radiusSmall: number

  // Typography
  fontDisplay: string
  fontBody: string

  // Spinner
  spinnerBorder: string
  spinnerBorderTop: string

  // ── Mobile-specific flags ───────────────────────────────────────────────────
  // These drive how React Native styles render. Desktop ignores them — the
  // desktop Theme interface in packages/desktop/src/renderer/src/styles/theme.ts
  // provides its own CSSProperties blocks.

  // Whether this is a dark-background theme. Drives StatusBar style, BlurView
  // tint, default text colors on overlays, etc.
  isDark: boolean

  // 'rounded' uses `radius`/`radiusSmall` verbatim. 'sharp' forces every radius
  // to 0 for hard-edged aesthetics (cyberpunk, urban, retrowave).
  cornerStyle: 'rounded' | 'sharp'

  // 'box' renders cards as plain rounded rectangles (the default).
  // 'blob' assigns asymmetric per-corner radii so cards look hand-drawn, like
  // an organic blob — used for the sketch theme. Mobile reads this via
  // themeCardShape() to produce a per-corner radii object instead of a single
  // `borderRadius` value.
  cardShape: 'box' | 'blob'

  // 'offset' — classic neo-brutal hard offset shadow (e.g. 4px 4px 0px black).
  // 'glow'   — neon glow shadow (uses iOS shadowRadius + accentGlowColor).
  shadowStyle: 'offset' | 'glow'

  // Border width on cards/buttons. Neo-brutal = 3, cyberpunk = 1, etc.
  cardBorderWidth: number

  // Whether display-font headings use uppercase + extra letter-spacing.
  // Cyberpunk/urban set this true; neo-brutal/sketch leave it off.
  displayUppercase: boolean
  displayLetterSpacing: number

  // The accent color used for neon glow shadows when shadowStyle='glow'. iOS
  // renders this as the `shadowColor` with shadowRadius=glowSpread.
  accentGlowColor: string

  // StatusBar style — 'light' content on dark bg, 'dark' on light.
  statusBarStyle: 'light' | 'dark'

  // ── Tab bar (LiquidGlassTabBar) ─────────────────────────────────────────────
  // Solid base color for the floating tab bar capsule.
  tabBarBg: string
  // BlurView tint ('light' | 'dark' | 'default'). Use 'dark' for dark themes.
  tabBarBlurTint: 'light' | 'dark' | 'default'
  // The translucent overlay color that rides on top of the BlurView for tint.
  tabBarOverlay: string
  // Border color around the tab bar pill.
  tabBarBorder: string
  // Color of the active-tab indicator pill behind icons.
  tabBarPill: string
  // Color of the icon/label when sitting on top of the active pill.
  tabBarPillFg: string
  // Color of the icon/label when NOT active (sitting on the tab bar bg).
  tabBarFg: string

  // Generic "dim border" — rgba border used for inactive pills, dashed
  // outlines, marquee separators, etc. Neo-brutal = 'rgba(26,26,26,0.2)';
  // cyberpunk = 'rgba(0,255,136,0.18)'.
  dimBorder: string
  // Faint pressed-state background overlay for ghost buttons / row taps.
  pressedOverlay: string
}
