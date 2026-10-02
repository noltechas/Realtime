import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'
import { BODY_600, BODY_700, CANDY, DISPLAY, MUTED, PINK, PLUM, RASPBERRY, WHITE } from './atoms/_barbie'

// Barbie stylesheet: the type of a sunny day, on transparent screens.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING: Barbie Land (the painted
// sky, the sun, the clouds, the edge of town) is a single SceneLayer mounted
// once behind the whole navigator. If these painted `appBg` they would cover it.
//
// h1 is sign-painted Shrikhand with its pink extrusion (one shadow is all a
// Text gets; the full outline lives in RetroText / ScreenTitle). Labels are
// Shrikhand with a white edge so they hold up on the sky; prose is Poppins.
export function buildBarbieStyles(t: ThemeTokens): ThemeUIStyles {
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
      fontFamily: DISPLAY,
      fontSize: 32,
      lineHeight: 42,
      color: PINK,
      paddingRight: 4,
      textShadowColor: RASPBERRY,
      textShadowOffset: { width: 1, height: 3 },
      textShadowRadius: 0,
    },
    h2: {
      fontFamily: DISPLAY,
      fontSize: 21,
      lineHeight: 28,
      color: PINK,
      paddingRight: 3,
      textShadowColor: 'rgba(255,255,255,0.9)',
      textShadowOffset: { width: 0, height: 1.5 },
      textShadowRadius: 0,
    },
    body: {
      fontFamily: BODY_600,
      fontSize: 15.5,
      color: t.black,
      lineHeight: 22,
    },
    muted: {
      fontFamily: BODY_600,
      fontSize: 13.5,
      color: MUTED,
      lineHeight: 19,
    },
    // Plain-View fallback for screens that style a card directly: white
    // plastic with a candy rim and a soft pink drop.
    card: {
      backgroundColor: WHITE,
      borderWidth: 2,
      borderColor: '#FFD3E8',
      borderRadius: 22,
      padding: 16,
      shadowColor: RASPBERRY,
      shadowOpacity: 0.18,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    } as ViewStyle,
    input: {
      backgroundColor: WHITE,
      borderWidth: 2,
      borderColor: CANDY,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: BODY_600,
      color: PLUM,
    } as ViewStyle & TextStyle,
    pillBox: {
      borderRadius: 999,
      borderWidth: 2,
      borderColor: WHITE,
      backgroundColor: PINK,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    pillText: {
      fontFamily: BODY_700,
      fontSize: 11,
      color: WHITE,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: DISPLAY,
      fontSize: 18,
      lineHeight: 24,
      color: PINK,
      paddingRight: 3,
      marginBottom: 10,
      textShadowColor: 'rgba(255,255,255,0.95)',
      textShadowOffset: { width: 0, height: 1.5 },
      textShadowRadius: 0,
    },
  })
}
