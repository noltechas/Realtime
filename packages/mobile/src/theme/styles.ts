import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'

// Translate a shared ThemeTokens bundle into React Native StyleSheet objects
// the screens consume. Branches on the tokens' `shadowStyle` / `cornerStyle` /
// `displayUppercase` flags so cyberpunk gets neon glow + sharp edges + caps
// while neo-brutal keeps its hard offset shadows + soft uppercase.
//
// Desktop equivalents live as React.CSSProperties under
// packages/desktop/src/renderer/src/styles/. Visual parity is best-effort —
// RN has no `boxShadow` (we approximate with shadowColor/shadowRadius for
// glow and shadowOffset+shadowOpacity for hard offsets).
//
// The helpers below (themeShadow, themeRadius, themeCardBorder, etc.) are
// also exported so screens can match the same visual rules outside this
// stylesheet — e.g. an inline `<Pressable>` in HomeScreen builds its card
// using these primitives so the cyberpunk treatment carries through.
export function themeShadow(t: ThemeTokens, intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  if (t.shadowStyle === 'glow') {
    // iOS neon glow: shadowColor=accent, shadowOpacity tuned per intensity,
    // shadowRadius=spread. Android can't render colored glows easily so we
    // intentionally leave `elevation` off — the card border + dark theme
    // gives enough separation that the lack of glow isn't visually broken.
    const spread = intensity === 'sm' ? 6 : intensity === 'lg' ? 22 : 12
    const opacity = intensity === 'sm' ? 0.35 : intensity === 'lg' ? 0.7 : 0.55
    return {
      shadowColor: t.accentGlowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: opacity,
      shadowRadius: spread,
    }
  }
  // Offset (neo-brutal): hard pixel offset shadow.
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

// Returns the press-time transform/shadow adjustments that match the resting
// shadow. For 'offset' themes we slide the element into its shadow (classic
// neo-brutal "press"); for 'glow' themes we dim the glow instead. For blob
// (sketch) we keep the slide and layer a small rotation on top for the
// hand-drawn wobble — `variantKey` seeds the rotate direction so adjacent
// pressed elements don't all tilt the same way.
export function themePressed(
  t: ThemeTokens,
  variantKey?: string | number,
): ViewStyle {
  // Glow themes dim instead of sliding — no offset shadow to slide into.
  if (t.shadowStyle === 'glow') {
    return { opacity: 0.85 }
  }
  // RN's transform array requires each element to have exactly one transform
  // key — pre-build matching arrays so we can spread cleanly without a union
  // of partial types that the type checker rejects.
  const slideX = { translateX: 2 } as const
  const slideY = { translateY: 2 } as const
  const wobble = themeWobble(t, variantKey)
  const transform = wobble.length > 0
    ? [slideX, slideY, ...wobble]
    : [slideX, slideY]
  return {
    transform,
    shadowOpacity: 0,
    elevation: 0,
  }
}

// Resolve the effective corner radius — sharp themes (cyberpunk) force 0
// regardless of the requested radius value. NOTE: this returns a single
// scalar; for cards that should use the theme's blob shape (sketch), use
// themeCardShape() instead, which spreads per-corner radii.
export function themeRadius(t: ThemeTokens, requested?: number): number {
  if (t.cornerStyle === 'sharp') return 0
  return requested ?? t.radius
}

// Returns a borderRadius style fragment for *card-sized* surfaces. For
// 'blob' card shapes (sketch), we assign asymmetric per-corner radii so the
// card reads as hand-drawn rather than a uniform rounded rectangle. Multiple
// blob "moulds" rotate based on a stable hash of the caller's key so adjacent
// cards in a list don't all bend the same way — looks more organic.
//
// Spread the result into a style object: `{ ...themeCardShape(t, key) }`.
export function themeCardShape(
  t: ThemeTokens,
  variantKey?: string | number,
): ViewStyle {
  if (t.cardShape === 'blob') {
    const moulds = [
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
  if (t.cornerStyle === 'sharp') return { borderRadius: 0 }
  return { borderRadius: t.radius }
}

// Returns a `transform` rotate fragment for press feedback on hand-drawn
// themes. Tabs / cards / buttons can spread this in addition to their own
// transforms — the sketch theme adds a subtle wobble (~1.2°) on press that
// reinforces the "marker on paper" feel; other themes return no rotation.
//
// `variantKey` lets adjacent elements rotate in different directions so a
// row of pressed pills doesn't all tilt the same way. Stable per-key.
export function themeWobble(
  t: ThemeTokens,
  variantKey?: string | number,
): { rotate: string }[] {
  if (t.cardShape !== 'blob') return []
  const idx = hashKey(variantKey)
  const angle = (idx % 2 === 0 ? 1.2 : -1.2).toFixed(2)
  return [{ rotate: `${angle}deg` }]
}

// Returns an `rgba(...)` string built from the theme's primary accent color
// at the requested opacity. Used in dark-theme branches that need a tinted
// translucent overlay (active pill bg, focus halo, etc.) — cyberpunk produces
// neon-green tints, urban produces toxic-green-yellow tints, etc. Falls back
// to a neutral white tint if the accent isn't a parseable hex.
export function themeAccentTint(t: ThemeTokens, opacity: number): string {
  return hexToRgba(t.accentA, opacity) ?? `rgba(255,255,255,${opacity})`
}

function hexToRgba(hex: string, opacity: number): string | null {
  // Accept #RGB, #RRGGBB; tolerate leading whitespace. Other formats (rgba,
  // hsl, named colors) bail to null and the caller's fallback kicks in.
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

// FNV-1a-ish 32-bit hash. Deterministic, no external deps, fine for picking
// a mould index from a string/number caller key.
function hashKey(key: string | number | undefined): number {
  if (key === undefined || key === null) return 0
  const s = String(key)
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

// Card border — width comes from the theme, color from the theme's primary
// edge color. Neo-brutal = 3px solid black; cyberpunk/urban (dark themes) =
// thin translucent stroke; sketch = 2.5px graphite.
export function themeCardBorder(t: ThemeTokens): ViewStyle {
  return {
    borderWidth: t.cardBorderWidth,
    borderColor: t.isDark ? t.dimBorder : t.black,
  }
}

// Display-font text styling (uppercase + letterSpacing for cyberpunk; plain
// for neo-brutal). Pass the desired baseline weight/size — the helper layers
// the per-theme transforms on top.
export function themeDisplayText(
  t: ThemeTokens,
  base: TextStyle,
): TextStyle {
  if (t.displayUppercase) {
    return {
      ...base,
      textTransform: 'uppercase',
      letterSpacing: (base.letterSpacing ?? 0) + t.displayLetterSpacing,
    }
  }
  return base
}

export function mobileStyles(t: ThemeTokens) {
  // Theme intent flags — clearer than branching on `shadowStyle` everywhere.
  const isDark = t.isDark
  const isCyberpunk = t.name === 'cyberpunk'
  const isSketch = t.name === 'sketch'

  // Per-surface palette varies by theme — pre-compute the bits that the
  // builders below would otherwise have to recompute inline.
  const cardBorderColor = isDark ? t.dimBorder : t.black
  const inputBg = isCyberpunk ? 'rgba(0,255,136,0.04)' : t.creamDark

  const baseCard: ViewStyle = {
    backgroundColor: t.white,
    borderWidth: t.cardBorderWidth,
    borderColor: cardBorderColor,
    ...themeCardShape(t, 'baseCard'),
    padding: 16,
    ...themeShadow(t, 'md'),
  }

  const baseBtn: ViewStyle = {
    ...themeCardShape(t, 'baseBtn'),
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...themeShadow(t, 'md'),
  }

  // Each theme defines its own primary button silhouette:
  //   neo-brutal — solid hot-red bg, black border, white label
  //   cyberpunk  — transparent bg, neon-green stroke, neon-green label
  //   sketch     — solid hot-red bg, graphite border, white label (blob radii
  //                supply the differentiator vs neo-brutal)
  const btnPrimaryFill = isCyberpunk ? 'transparent' : t.hotRed
  const btnPrimaryBorderColor = isCyberpunk ? t.accentA : t.black
  const btnPrimaryBorderWidth = isCyberpunk ? 1 : t.cardBorderWidth
  const btnPrimaryFg = isCyberpunk ? t.accentA : t.white

  // Secondary (used for "in-flow" actions) — mirrors primary's structure but
  // with a calmer fill so the two buttons read as a pair without competing.
  const btnSecondaryFill = isCyberpunk ? 'transparent' : t.accentA
  const btnSecondaryBorderColor = isCyberpunk ? t.accentB : t.black
  const btnSecondaryBorderWidth = isCyberpunk ? 1 : t.cardBorderWidth
  const btnSecondaryFg = isCyberpunk ? t.accentB : t.black

  // Outline — destructive/cautionary intent (Cancel/back). Hot-red on light
  // themes, accentC (cyan) on cyberpunk for the neon stroke.
  const btnOutlineColor = isCyberpunk ? t.accentC : t.hotRed
  const btnOutlineBorderWidth = isCyberpunk ? 1 : t.cardBorderWidth

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.appBg,
    },
    page: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 48,
      backgroundColor: t.appBg,
      flexGrow: 1,
    },
    h1: {
      fontFamily: t.fontDisplay,
      fontSize: 32,
      fontWeight: '900',
      color: t.black,
      letterSpacing: t.displayUppercase ? t.displayLetterSpacing : -0.5,
      textTransform: t.displayUppercase ? 'uppercase' : 'none',
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 22,
      fontWeight: '800',
      color: t.black,
      letterSpacing: t.displayUppercase ? t.displayLetterSpacing : 0,
      textTransform: t.displayUppercase ? 'uppercase' : 'none',
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 16,
      color: t.black,
      lineHeight: 22,
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 14,
      color: t.muted,
    },
    card: baseCard,
    input: {
      backgroundColor: inputBg,
      // Sketch wants dashed borders for the "fill-in-the-blank" feel.
      borderWidth: isDark ? 1 : 2,
      borderColor: isDark ? t.dimBorder : isSketch ? t.dimBorder : t.black,
      borderStyle: isSketch ? 'dashed' : 'solid',
      ...themeCardShape(t, 'input'),
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontFamily: t.fontBody,
      color: t.black,
    },
    btnPrimary: {
      ...baseBtn,
      backgroundColor: btnPrimaryFill,
      borderWidth: btnPrimaryBorderWidth,
      borderColor: btnPrimaryBorderColor,
    },
    btnPrimaryLabel: {
      color: btnPrimaryFg,
      fontFamily: t.fontDisplay,
      fontWeight: '800',
      fontSize: 18,
      letterSpacing: t.displayUppercase ? 2 : 0.5,
      textTransform: t.displayUppercase ? 'uppercase' : 'none',
    },
    btnSecondary: {
      ...baseBtn,
      backgroundColor: btnSecondaryFill,
      borderWidth: btnSecondaryBorderWidth,
      borderColor: btnSecondaryBorderColor,
    },
    btnSecondaryLabel: {
      color: btnSecondaryFg,
      fontFamily: t.fontDisplay,
      fontWeight: '800',
      fontSize: 18,
      letterSpacing: t.displayUppercase ? 1.5 : 0.5,
      textTransform: t.displayUppercase ? 'uppercase' : 'none',
    },
    btnOutline: {
      // Same box dimensions as btnPrimary so neighboring buttons line up. The
      // border-width difference is absorbed by the contrast — visually they
      // read as same size.
      backgroundColor: 'transparent',
      borderWidth: btnOutlineBorderWidth,
      borderColor: btnOutlineColor,
      ...themeCardShape(t, 'btnOutline'),
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnOutlineLabel: {
      color: btnOutlineColor,
      fontFamily: t.fontDisplay,
      fontWeight: '800',
      fontSize: 18,
      letterSpacing: t.displayUppercase ? 1.5 : 0.5,
      textTransform: t.displayUppercase ? 'uppercase' : 'none',
    },
    pill: {
      // Sharp-corner themes (cyberpunk, urban) get rectangular pills.
      borderRadius: t.cornerStyle === 'sharp' ? 0 : 999,
      borderWidth: isDark ? 1 : 2,
      borderColor: isDark ? t.dimBorder : t.black,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontWeight: '700',
      fontSize: 12,
      color: t.black,
      letterSpacing: t.displayUppercase ? 1.5 : 0.5,
      textTransform: t.displayUppercase ? 'uppercase' : 'none',
    },
  })
}

export type MobileStyles = ReturnType<typeof mobileStyles>
