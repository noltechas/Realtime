import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'
import { DUST, ETCH, GOLD, GOLD_HI, JOST_300, JOST_400, JOST_500, MONO, STAR } from './atoms/_record'

// Space stylesheet: the type of a deep-field plate, on transparent screens.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING: deep space (the field, the
// breathing stars, Voyager crossing) is a single SceneLayer mounted once
// behind the whole navigator. If these painted `appBg` they would cover it.
//
// Display is Jost light in widely tracked capitals; reading text is Jost; small
// labels and every number are IBM Plex Mono.
export function buildSpaceStyles(t: ThemeTokens): ThemeUIStyles {
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
      fontFamily: JOST_300,
      fontSize: 29,
      lineHeight: 38,
      color: STAR,
      letterSpacing: 6,
      textTransform: 'uppercase',
    },
    h2: {
      fontFamily: JOST_400,
      fontSize: 19,
      lineHeight: 26,
      color: t.black,
      letterSpacing: 3,
      textTransform: 'uppercase',
    },
    body: {
      fontFamily: JOST_400,
      fontSize: 15.5,
      color: t.black,
      lineHeight: 22,
    },
    muted: {
      fontFamily: JOST_400,
      fontSize: 13.5,
      color: DUST,
      lineHeight: 19,
    },
    // Plain-View fallback for screens that style a card directly: black glass
    // with an engraved gold hairline.
    card: {
      backgroundColor: 'rgba(10,12,20,0.92)',
      borderWidth: 1,
      borderColor: ETCH.mid,
      borderRadius: 14,
      padding: 16,
    } as ViewStyle,
    input: {
      backgroundColor: 'rgba(5,6,12,0.92)',
      borderWidth: 1,
      borderColor: ETCH.mid,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: JOST_400,
      color: STAR,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: ETCH.mid,
      backgroundColor: 'rgba(233,196,106,0.07)',
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    pillText: {
      fontFamily: MONO,
      fontSize: 10,
      color: GOLD_HI,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: JOST_500,
      fontSize: 12,
      letterSpacing: 3.6,
      textTransform: 'uppercase',
      color: GOLD,
      marginBottom: 12,
    },
  })
}
