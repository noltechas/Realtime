// Theme interface — every visual token any page or shell component may need.
// All themes must implement this shape so the ThemeContext can swap them at runtime.

export interface SingerColor {
  color: string
  colorGlow: string
}

export interface Theme {
  // ── Identity ──────────────────────────────────────────────────────────────
  name: string

  // ── Raw color values (used as-needed) ─────────────────────────────────────
  black: string
  white: string
  cream: string
  creamDark: string
  hotRed: string
  vividYellow: string
  softViolet: string
  mintGreen: string
  muted: string   // secondary / subheading text
  faint: string   // tertiary / placeholder text

  // Accent colors for sliders, focus rings, etc.
  accentA: string  // primary accent (violet-ish)
  accentB: string  // secondary accent (yellow / amber)
  accentC: string  // tertiary accent (green / emerald)

  // ── Shell ─────────────────────────────────────────────────────────────────
  appBg: string
  titlebarBg: string
  titlebarText: string

  navBg: string
  navBorderBottom: string
  navLink: string
  navLinkActive: string
  navLinkActiveBg: string
  navLinkHoverBg: string

  // ── Borders & Shadows ─────────────────────────────────────────────────────
  border: string        // e.g. '3px solid #1A1A1A'
  borderThin: string    // e.g. '2px solid #1A1A1A'
  borderLight: string   // subtle card separator
  shadow: string        // e.g. '4px 4px 0px #1A1A1A'
  shadowLift: string    // on hover
  shadowPressed: string // on active/press
  shadowColor: (color: string) => string

  // ── Radius ────────────────────────────────────────────────────────────────
  radius: number
  radiusSmall: number

  // ── Typography ────────────────────────────────────────────────────────────
  fontDisplay: string
  fontBody: string

  // ── Spinner ───────────────────────────────────────────────────────────────
  spinnerBorder: string
  spinnerBorderTop: string

  // ── Component style objects ───────────────────────────────────────────────
  page: React.CSSProperties

  card: React.CSSProperties

  cardHover: React.CSSProperties   // additional styles applied on hover (merged in)

  input: React.CSSProperties

  select: React.CSSProperties

  btnPrimary: React.CSSProperties
  btnSecondary: React.CSSProperties
  btnOutline: React.CSSProperties

  // Circular icon button (transport controls, etc.)
  iconBtn: React.CSSProperties
  iconBtnHover: React.CSSProperties

  // Sticker / badge label
  stickerLabel: React.CSSProperties

  // ── Singer colors ─────────────────────────────────────────────────────────
  singerColors: SingerColor[]

  // ── Theme switcher ────────────────────────────────────────────────────────
  nextThemeName: string
  displayName: string

  // ── Optional global CSS (keyframes, pseudo-elements, overlays) ────────────
  globalCss?: string
}
