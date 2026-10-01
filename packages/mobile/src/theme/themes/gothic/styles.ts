import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'
import { BONE, CANDLE, FRAKTUR, GOTHIC_700, PEWTER, SERIF, SERIF_BOLD } from './atoms/_gothic'

// Gothic stylesheet: the type of a cathedral at night, on transparent screens.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING: the nave (windows, moonlight,
// fog, the storm, the watcher) is a single SceneLayer mounted once behind the
// whole navigator. If these painted `appBg` they would cover it.
//
// h1 is the true Fraktur, in title case (screen titles arrive that way). Small
// labels are Grenze Gotisch, which stays legible at 14px where a Fraktur turns to
// lace. Prose is Cormorant Garamond.
export function buildGothicStyles(t: ThemeTokens): ThemeUIStyles {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    page: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 48,
      backgroundColor: 'transparent',
      flexGrow: 1,
    },
    h1: {
      fontFamily: FRAKTUR,
      fontSize: 36,
      lineHeight: 44,
      color: BONE,
      textShadowColor: 'rgba(0,0,0,0.85)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 3,
    },
    h2: {
      fontFamily: GOTHIC_700,
      fontSize: 22,
      color: t.black,
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    body: {
      fontFamily: SERIF,
      fontSize: 16.5,
      color: t.black,
      lineHeight: 23,
    },
    muted: {
      fontFamily: SERIF,
      fontSize: 14.5,
      color: PEWTER,
      lineHeight: 20,
    },
    // Plain-View fallback for the few screens that style a card directly
    // rather than through `Stone`: dark stone, a moonlit hairline.
    card: {
      backgroundColor: 'rgba(24,21,30,0.94)',
      borderWidth: 1,
      borderColor: 'rgba(175,195,234,0.18)',
      borderRadius: 3,
      padding: 16,
    } as ViewStyle,
    input: {
      backgroundColor: 'rgba(11,10,15,0.94)',
      borderWidth: 1,
      borderColor: 'rgba(175,195,234,0.22)',
      borderRadius: 2,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16.5,
      fontFamily: SERIF,
      color: t.black,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 2,
      borderWidth: 1,
      borderColor: 'rgba(227,176,75,0.38)',
      backgroundColor: 'rgba(227,176,75,0.08)',
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    pillText: {
      fontFamily: SERIF_BOLD,
      fontSize: 12,
      color: CANDLE,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: GOTHIC_700,
      fontSize: 15.5,
      letterSpacing: 0.4,
      color: CANDLE,
      marginBottom: 12,
      textShadowColor: 'rgba(227,176,75,0.35)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 6,
    },
  })
}
