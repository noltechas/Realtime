import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Cyberpunk-specific stylesheet. Equivalent to the legacy `mobileStyles(t)`
// for the cyberpunk branch — sharp corners (every radius forced to 0), neon
// glow shadows on `card`, transparent input wells with translucent green
// tints, monospace + uppercase + extra letterSpacing for the display font.
//
// All static — derived once at module load from CYBERPUNK_MOBILE. Screens read
// these via `ui.styles.{...}` without ever branching on the theme name.
export function buildCyberpunkStyles(t: ThemeTokens): ThemeUIStyles {
  // Neon glow card shadow (iOS). Matches themeShadow(t, 'md') for glow themes.
  const cardGlow: ViewStyle = {
    shadowColor: t.accentGlowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  }

  const sheet = StyleSheet.create({
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
    // The SD Glitch display face has a short cap-height, so it reads smaller
    // than a normal font at the same px — these sizes are bumped up vs the
    // other themes to compensate.
    h1: {
      fontFamily: t.fontDisplay,
      fontSize: 40,
      fontWeight: '900',
      color: t.black,
      letterSpacing: t.displayLetterSpacing,
      textTransform: 'uppercase',
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 28,
      fontWeight: '800',
      color: t.black,
      letterSpacing: t.displayLetterSpacing,
      textTransform: 'uppercase',
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
    card: {
      backgroundColor: t.white,
      borderWidth: t.cardBorderWidth,
      borderColor: t.dimBorder,
      borderRadius: 0,
      padding: 16,
      ...cardGlow,
    },
    input: {
      backgroundColor: 'rgba(0,255,136,0.04)',
      borderWidth: 1,
      borderColor: t.dimBorder,
      borderStyle: 'solid',
      borderRadius: 0,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 18,
      fontFamily: t.fontBody,
      color: t.black,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 0,
      borderWidth: 1,
      borderColor: t.dimBorder,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontWeight: '700',
      fontSize: 12,
      color: t.black,
      letterSpacing: t.displayLetterSpacing,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.black,
      opacity: 0.55,
      marginBottom: 12,
    },
  })

  return sheet
}
