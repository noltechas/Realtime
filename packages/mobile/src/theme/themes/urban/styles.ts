import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Urban-specific stylesheet. Equivalent to the legacy `mobileStyles(t)`'s
// `isUrban` branch — sharp corners (radius 0), parallelogram cards
// (skewX -8deg), heavy geometric "drop shadow" via right + bottom toxic-green
// borders, PermanentMarker display font in uppercase with 2px letterSpacing,
// Oswald body. No soft glow shadows — the structural skew + accent border
// IS the depth cue.
//
// All static — derived once at module load from URBAN_MOBILE. Screens read
// these via `ui.styles.{...}` without ever branching on the theme name. Note
// that cards/inputs that need a skewed shell render the shell inline (see
// SongCard/QueueRow/etc atoms) rather than spreading `card` — the spread style
// pattern doesn't compose well with the inner counter-skew wrapper that text
// and icons require to stay legible. `card` here is the fallback for callers
// that just want a flat dark surface.
export function buildUrbanStyles(t: ThemeTokens): ThemeUIStyles {
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
      fontWeight: '900',
      color: t.black,
      letterSpacing: t.displayLetterSpacing,
      textTransform: 'uppercase',
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 22,
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
    // Skewed parallelogram card with toxic-green geometric drop shadow.
    // Callers that include text/icons should wrap their inner content in
    // <View style={{ transform: [{ skewX: '8deg' }] }} /> to counter-skew
    // and stay legible.
    card: {
      backgroundColor: t.creamDark,
      borderWidth: 2,
      borderColor: t.dimBorder,
      borderRightWidth: 4,
      borderBottomWidth: 4,
      borderRightColor: t.accentA,
      borderBottomColor: t.accentA,
      transform: [{ skewX: '-8deg' }],
      padding: 16,
    },
    input: {
      backgroundColor: t.creamDark,
      borderWidth: 2,
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
