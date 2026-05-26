import type { ViewStyle, TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'

// Pure utility helpers used by theme modules. No theme branching lives here —
// each theme picks the helpers it wants and assembles its own styles.

// FNV-1a-ish 32-bit hash. Deterministic, no external deps. Lets per-theme
// renderers stably randomize per-item visual variations (sketch rotations,
// blob corner moulds, etc.) without ever flickering across renders.
export function hashKey(key: string | number | undefined): number {
  if (key === undefined || key === null) return 0
  const s = String(key)
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

// Convert a hex color to rgba. Accepts #RGB or #RRGGBB; returns null on other
// formats so callers can fall back. Used by themes that need to derive faint
// translucent overlays from their accent color.
export function hexToRgba(hex: string, opacity: number): string | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

// Sketch "marker on paper" wobble — returns a small rotation transform. Used
// only by the sketch theme; other themes return [] and the caller spreads it
// into a regular transform array without effect.
export function sketchWobble(variantKey: string | number | undefined): { rotate: string }[] {
  const idx = hashKey(variantKey)
  const angle = (idx % 2 === 0 ? 1.2 : -1.2).toFixed(2)
  return [{ rotate: `${angle}deg` }]
}

// A per-corner radii object that varies based on the caller's key — used by
// sketch's "blob" cards so adjacent cards in a list don't all bend the same
// way. Numerical inputs picked to feel hand-drawn (asymmetric, 6–28px).
export function blobCornerRadii(variantKey?: string | number): ViewStyle {
  const moulds: Array<{
    topLeft: number
    topRight: number
    bottomRight: number
    bottomLeft: number
  }> = [
    { topLeft: 26, topRight: 6,  bottomRight: 22, bottomLeft: 10 },
    { topLeft: 8,  topRight: 24, bottomRight: 8,  bottomLeft: 26 },
    { topLeft: 22, topRight: 10, bottomRight: 26, bottomLeft: 6  },
    { topLeft: 10, topRight: 28, bottomRight: 10, bottomLeft: 22 },
  ]
  const idx = hashKey(variantKey) % moulds.length
  const m = moulds[idx]
  return {
    borderTopLeftRadius: m.topLeft,
    borderTopRightRadius: m.topRight,
    borderBottomRightRadius: m.bottomRight,
    borderBottomLeftRadius: m.bottomLeft,
  }
}

// Stable per-key small rotation in degrees — used by sketch atoms (song cards,
// queue rows, reaction cells, etc.) to make a row of items look hand-placed.
export function sketchAngle(variantKey: string | number | undefined, amplitude = 0.6): number {
  const s = String(variantKey ?? '')
  const hash = s.length + (s.charCodeAt(0) || 0)
  return (hash % 2 === 0 ? 1 : -1) * (amplitude * 0.5 + (hash % 5) * amplitude * 0.16)
}

// ── Token-driven utilities ──────────────────────────────────────────────────
// These take a ThemeTokens bundle and dispatch on its *flags* (shadowStyle,
// cornerStyle, cardShape, displayUppercase) — NOT on the theme name. They're
// used by the pre-session screens (Home, Lobby, Profile, Awards) that don't
// have a per-theme atom set yet, plus the legacy theme/styles.ts before it's
// removed.

export function themeShadow(t: ThemeTokens, intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  if (t.shadowStyle === 'glow') {
    const spread = intensity === 'sm' ? 6 : intensity === 'lg' ? 22 : 12
    const opacity = intensity === 'sm' ? 0.35 : intensity === 'lg' ? 0.7 : 0.55
    return {
      shadowColor: t.accentGlowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: spread,
    }
  }
  const offset = intensity === 'sm' ? 2 : intensity === 'lg' ? 6 : 4
  const elev = intensity === 'sm' ? 2 : intensity === 'lg' ? 6 : 4
  return {
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: elev,
  }
}

export function themePressed(t: ThemeTokens, variantKey?: string | number): ViewStyle {
  if (t.shadowStyle === 'glow') return { opacity: 0.85 }
  const slideX = { translateX: 2 } as const
  const slideY = { translateY: 2 } as const
  const wobble = t.cardShape === 'blob' ? sketchWobble(variantKey) : []
  const transform = wobble.length > 0
    ? [slideX, slideY, ...wobble]
    : [slideX, slideY]
  return {
    transform,
    shadowOpacity: 0,
    elevation: 0,
  }
}

export function themeRadius(t: ThemeTokens, requested?: number): number {
  if (t.cornerStyle === 'sharp') return 0
  return requested ?? t.radius
}

export function themeCardShape(t: ThemeTokens, variantKey?: string | number): ViewStyle {
  if (t.cardShape === 'blob') return blobCornerRadii(variantKey)
  if (t.cornerStyle === 'sharp') return { borderRadius: 0 }
  return { borderRadius: t.radius }
}

export function themeCardBorder(t: ThemeTokens): ViewStyle {
  return {
    borderWidth: t.cardBorderWidth,
    borderColor: t.isDark ? t.dimBorder : t.black,
  }
}

export function themeDisplayText(t: ThemeTokens, base: TextStyle): TextStyle {
  if (t.displayUppercase) {
    return {
      ...base,
      textTransform: 'uppercase',
      letterSpacing: (base.letterSpacing ?? 0) + t.displayLetterSpacing,
    }
  }
  return base
}

export function themeAccentTint(t: ThemeTokens, opacity: number): string {
  return hexToRgba(t.accentA, opacity) ?? `rgba(255,255,255,${opacity})`
}
