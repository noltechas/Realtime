import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Steampunk stylesheet — warm walnut + parchment text on a coal-fire ember
// backdrop. Headings get an amber gas-lamp glow (echoing the desktop steampunk
// theme's brass plaque). The default card is a riveted brass plate: thick
// double border in aged brass, deep mahogany fill, soft amber inner glow.
// Atoms layer their own rivets, gears, and filigree on top.
export function buildSteampunkStyles(t: ThemeTokens): ThemeUIStyles {
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
      color: t.vividYellow,
      letterSpacing: t.displayLetterSpacing + 1.2,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(232,169,59,0.65)',
      textShadowRadius: 14,
      textShadowOffset: { width: 0, height: 0 },
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 22,
      color: '#E8C9A0',
      letterSpacing: t.displayLetterSpacing,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(184,118,45,0.6)',
      textShadowRadius: 10,
      textShadowOffset: { width: 0, height: 1 },
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 16,
      color: '#E8C9A0',
      lineHeight: 23,
      letterSpacing: 0.3,
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 14,
      color: t.muted,
      letterSpacing: 0.2,
    },
    // Default card — a riveted brass plate. Thick double-border feel via
    // borderColor + shadow inset; atoms drop in their own corner rivets.
    card: {
      backgroundColor: '#2A1A0E',
      borderWidth: 2,
      borderColor: '#B8762D',
      borderRadius: 8,
      padding: 16,
      shadowColor: '#E8A93B',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    },
    input: {
      backgroundColor: '#1A0E06',
      borderWidth: 2,
      borderColor: '#B8762D',
      borderRadius: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: t.fontBody,
      color: '#E8C9A0',
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: '#C97D3E',
      backgroundColor: 'rgba(201,125,62,0.12)',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontSize: 12,
      color: '#E8A93B',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontSize: 12,
      letterSpacing: 2.4,
      color: '#E8A93B',
      opacity: 0.95,
      marginBottom: 12,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(232,169,59,0.45)',
      textShadowRadius: 5,
      textShadowOffset: { width: 0, height: 0 },
    },
  })

  return sheet
}
