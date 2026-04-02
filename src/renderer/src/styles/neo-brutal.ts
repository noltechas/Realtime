// Neo-Brutalism Design System
// A raw, high-contrast aesthetic with cream backgrounds, thick black borders,
// hard offset shadows, clashing vibrant colors, and heavy typography.

import type { Theme } from './theme'

const SINGER_COLORS = [
  { color: '#22d3ee', colorGlow: 'rgba(34, 211, 238, 0.3)' },
  { color: '#f472b6', colorGlow: 'rgba(244, 114, 182, 0.3)' },
  { color: '#fbbf24', colorGlow: 'rgba(251, 191, 36, 0.3)' },
  { color: '#a78bfa', colorGlow: 'rgba(167, 139, 250, 0.3)' },
  { color: '#34d399', colorGlow: 'rgba(52, 211, 153, 0.3)' },
  { color: '#818cf8', colorGlow: 'rgba(129, 140, 248, 0.3)' },
  { color: '#ef4444', colorGlow: 'rgba(239, 68, 68, 0.3)' },
  { color: '#f97316', colorGlow: 'rgba(249, 115, 22, 0.3)' },
  { color: '#84cc16', colorGlow: 'rgba(132, 204, 22, 0.3)' },
  { color: '#14b8a6', colorGlow: 'rgba(20, 184, 166, 0.3)' },
  { color: '#3b82f6', colorGlow: 'rgba(59, 130, 246, 0.3)' },
  { color: '#d946ef', colorGlow: 'rgba(217, 70, 239, 0.3)' },
  { color: '#e11d48', colorGlow: 'rgba(225, 29, 72, 0.3)' },
]

export const NEO: Theme = {
  name: 'neo-brutal',
  nextThemeName: 'cyberpunk',
  displayName: 'Neo Brutal',

  // ── Raw colors ─────────────────────────────────────────────────────────────
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

  // ── Shell ──────────────────────────────────────────────────────────────────
  appBg: '#FFF8EE',
  titlebarBg: '#1A1A1A',
  titlebarText: '#FFFFFF',

  navBg: '#1A1A1A',
  navBorderBottom: '3px solid #1A1A1A',
  navLink: '#FFFFFF',
  navLinkActive: '#FFD60A',
  navLinkActiveBg: 'transparent',
  navLinkHoverBg: 'rgba(255,255,255,0.06)',

  // ── Borders & Shadows ──────────────────────────────────────────────────────
  border: '3px solid #1A1A1A',
  borderThin: '2px solid #1A1A1A',
  borderLight: '1px solid rgba(26,26,26,0.15)',
  shadow: '4px 4px 0px #1A1A1A',
  shadowLift: '6px 6px 0px #1A1A1A',
  shadowPressed: '2px 2px 0px #1A1A1A',
  shadowColor: (color: string) => `4px 4px 0px ${color}`,

  // ── Radius ─────────────────────────────────────────────────────────────────
  radius: 8,
  radiusSmall: 4,

  // ── Typography ─────────────────────────────────────────────────────────────
  fontDisplay: 'var(--font-display)',
  fontBody: 'var(--font-body)',

  // ── Spinner ────────────────────────────────────────────────────────────────
  spinnerBorder: 'rgba(26,26,26,0.15)',
  spinnerBorderTop: '#FF3B30',

  // ── Component styles ───────────────────────────────────────────────────────
  page: {
    background: '#FFF8EE',
    color: '#1A1A1A',
    minHeight: '100%',
    padding: '32px 40px 64px',
    maxWidth: 960,
    margin: '0 auto',
    fontFamily: 'var(--font-body)',
  },

  card: {
    background: '#FFFFFF',
    border: '3px solid #1A1A1A',
    borderRadius: 8,
    boxShadow: '4px 4px 0px #1A1A1A',
  },

  cardHover: {
    boxShadow: '6px 6px 0px #1A1A1A',
    transform: 'translate(-1px, -1px)',
  },

  input: {
    background: '#F5ECDC',
    border: '2px solid #1A1A1A',
    borderRadius: 6,
    color: '#1A1A1A',
    fontFamily: 'var(--font-body)',
    outline: 'none',
  },

  select: {
    background: '#FFFFFF',
    border: '2px solid #1A1A1A',
    borderRadius: 6,
    color: '#1A1A1A',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
  },

  btnPrimary: {
    background: '#FF3B30',
    color: '#FFFFFF',
    border: '3px solid #1A1A1A',
    boxShadow: '4px 4px 0px #1A1A1A',
    borderRadius: 8,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },

  btnSecondary: {
    background: '#B388FF',
    color: '#1A1A1A',
    border: '3px solid #1A1A1A',
    boxShadow: '4px 4px 0px #1A1A1A',
    borderRadius: 8,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },

  btnOutline: {
    background: 'transparent',
    color: '#FF3B30',
    border: '2px solid #FF3B30',
    borderRadius: 8,
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.1s',
  },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '2px solid #1A1A1A',
    background: '#F5ECDC',
    color: '#1A1A1A',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s, box-shadow 0.1s',
    boxShadow: '2px 2px 0px #1A1A1A',
  },

  iconBtnHover: {
    transform: 'translate(-1px, -1px)',
    boxShadow: '4px 4px 0px #1A1A1A',
  },

  stickerLabel: {
    position: 'absolute',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 10,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    padding: '4px 12px',
    border: '2px solid #1A1A1A',
    boxShadow: '2px 2px 0px #1A1A1A',
  },

  singerColors: SINGER_COLORS,
}
