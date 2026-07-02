import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Steampunk stylesheet — the precision-instrument scaffold. Near-black iron
// surfaces, thin brass hairlines, engraved Cinzel labels, IM Fell English
// body text. Depth comes from dark shadows; amber glow is reserved for the
// handful of genuinely lit elements (headings keep only a whisper of it).
const IRON_DEEP = '#120C07'
const IRON_PANEL = '#221711'
const IRON_WELL = '#0D0805'
const PARCH = '#EFE0BE'
const PARCH_DIM = '#B49B72'
const AMBER = '#E8A93B'
const HAIRLINE = 'rgba(200,151,62,0.45)'

export function buildSteampunkStyles(t: ThemeTokens): ThemeUIStyles {
  const sheet = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: IRON_DEEP,
    },
    page: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 48,
      backgroundColor: 'transparent',
      flexGrow: 1,
    },
    h1: {
      fontFamily: t.fontDisplay,
      fontSize: 27,
      color: PARCH,
      letterSpacing: 2.6,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(232,169,59,0.35)',
      textShadowRadius: 12,
      textShadowOffset: { width: 0, height: 0 },
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 19,
      color: PARCH,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      textShadowColor: 'rgba(232,169,59,0.25)',
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 0 },
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 16,
      color: '#DCC69C',
      lineHeight: 24,
      letterSpacing: 0.2,
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 14,
      color: PARCH_DIM,
      letterSpacing: 0.2,
    },
    // Default panel — an instrument plate: iron face, single brass hairline,
    // dark depth shadow. Atoms add their own engraved rules + corner screws.
    card: {
      backgroundColor: IRON_PANEL,
      borderWidth: 1,
      borderColor: HAIRLINE,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 6,
    },
    // Recessed brass-rimmed well.
    input: {
      backgroundColor: IRON_WELL,
      borderWidth: 1,
      borderColor: HAIRLINE,
      borderRadius: 9,
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 16,
      fontFamily: t.fontBody,
      color: PARCH,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 6,
      borderWidth: 1,
      borderColor: HAIRLINE,
      backgroundColor: 'rgba(200,151,62,0.10)',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontSize: 11,
      color: AMBER,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontSize: 11,
      letterSpacing: 3.2,
      color: AMBER,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
  })

  return sheet
}
