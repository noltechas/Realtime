import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Retrowave stylesheet — Monoton neon-tube headings with chromatic-aberration
// fringes, Audiowide chrome body text, on a deep indigo card. Cards are sharp
// rectangles with a hot-pink magenta rim + a stronger pink/cyan dual glow so
// they read as edge-lit acrylic at night.
export function buildRetrowaveStyles(t: ThemeTokens): ThemeUIStyles {
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
      fontSize: 32,
      color: '#FFFFFF',
      letterSpacing: t.displayLetterSpacing + 0.6,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(255,45,149,0.95)',
      textShadowRadius: 16,
      textShadowOffset: { width: 0, height: 0 },
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 22,
      color: '#F4E8FF',
      letterSpacing: t.displayLetterSpacing,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(0,240,255,0.7)',
      textShadowRadius: 12,
      textShadowOffset: { width: 0, height: 0 },
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 15,
      color: '#F4E8FF',
      lineHeight: 22,
      letterSpacing: 0.4,
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 13,
      color: t.muted,
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: '#1A0A3A',
      borderWidth: 1,
      borderColor: '#FF2D95',
      borderRadius: 0,
      padding: 16,
      shadowColor: '#FF2D95',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
    },
    input: {
      backgroundColor: 'rgba(10,4,32,0.85)',
      borderWidth: 1,
      borderColor: '#00F0FF',
      borderRadius: 0,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: t.fontBody,
      color: '#F4E8FF',
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 0,
      borderWidth: 1,
      borderColor: '#00F0FF',
      backgroundColor: 'rgba(0,240,255,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontBody,
      fontSize: 12,
      color: '#00F0FF',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: t.fontBody,
      fontSize: 12,
      letterSpacing: 3,
      color: '#FF2D95',
      opacity: 1,
      marginBottom: 12,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(255,45,149,0.7)',
      textShadowRadius: 7,
      textShadowOffset: { width: 0, height: 0 },
    },
  })

  return sheet
}
