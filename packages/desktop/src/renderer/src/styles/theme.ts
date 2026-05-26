// Theme interface — every visual token any page or shell component may need.
// All themes must implement this shape so the ThemeContext can swap them at runtime.
//
// Raw tokens (colors, radii, fonts, singer palette, border/shadow strings) live
// in @karaoke/shared as `ThemeTokens` so the React Native companion can reuse
// them. The CSS-shaped style blocks below are DOM-only (React.CSSProperties)
// and remain in the desktop package.

import type { ThemeTokens, SingerColor } from '@karaoke/shared'

export type { ThemeTokens, SingerColor }

export interface Theme extends ThemeTokens {
  // ── DOM-only component style objects ─────────────────────────────────────
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

  // ── Optional global CSS (keyframes, pseudo-elements, overlays) ───────────
  globalCss?: string
}
