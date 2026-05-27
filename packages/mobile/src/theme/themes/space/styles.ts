import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Space stylesheet — HUD-style cool-white text on the deep void. Headings get
// a nebula-magenta + plasma-cyan double glow (echoing the desktop space
// theme's `text-shadow` chain). The flat card is a faint translucent panel
// with a 1px magenta rim and a subtle plasma glow — atoms that want HUD
// brackets or a corner cross-hair render their own ornaments on top.
//
// No structural skew or blob shape — space's identity comes from cosmic
// ornaments (stars, orbits, HUD brackets, scan lines) layered onto otherwise
// clean rectangles, not from warped geometry.
export function buildSpaceStyles(t: ThemeTokens): ThemeUIStyles {
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
    h1: {
      fontFamily: t.fontDisplay,
      fontSize: 30,
      color: t.black,
      letterSpacing: t.displayLetterSpacing + 1,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(224,64,251,0.55)',
      textShadowRadius: 18,
      textShadowOffset: { width: 0, height: 0 },
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 22,
      color: t.black,
      letterSpacing: t.displayLetterSpacing,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(64,224,208,0.5)',
      textShadowRadius: 12,
      textShadowOffset: { width: 0, height: 0 },
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
    // Default card — translucent void panel with a thin magenta rim and a
    // soft cyan glow. Atoms that want HUD-bracket corners or constellation
    // dot patterns render those ornaments on top of this shell.
    card: {
      backgroundColor: 'rgba(21,21,40,0.72)',
      borderWidth: 1,
      borderColor: 'rgba(224,64,251,0.25)',
      borderRadius: 10,
      padding: 16,
    },
    input: {
      backgroundColor: 'rgba(224,64,251,0.06)',
      borderWidth: 1,
      borderColor: 'rgba(224,64,251,0.35)',
      borderRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: t.fontBody,
      color: t.black,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(64,224,208,0.4)',
      backgroundColor: 'rgba(64,224,208,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontSize: 12,
      color: t.accentB,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontSize: 12,
      letterSpacing: 2,
      color: t.accentA,
      opacity: 0.85,
      marginBottom: 12,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(224,64,251,0.45)',
      textShadowRadius: 6,
      textShadowOffset: { width: 0, height: 0 },
    },
  })

  return sheet
}
