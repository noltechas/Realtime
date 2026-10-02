import { StyleSheet } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'
import { FORM, GRAPHITE, GRAPHITE_SOFT, INK, LETTER, LETTER_M, SHEET } from './atoms/_pencil'

// Sketch stylesheet: ink lettering on transparent screens.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING: the sheet of animation
// bond is a single SceneLayer mounted once behind the whole navigator. If
// these painted `appBg` they would cover its paper.
export function buildSketchStyles(t: ThemeTokens): ThemeUIStyles {
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
      fontFamily: LETTER,
      fontSize: 34,
      lineHeight: 42,
      color: INK,
    },
    h2: {
      fontFamily: LETTER,
      fontSize: 22,
      lineHeight: 28,
      color: INK,
    },
    body: {
      fontFamily: LETTER_M,
      fontSize: 15.5,
      color: INK,
      lineHeight: 23,
    },
    muted: {
      fontFamily: LETTER_M,
      fontSize: 14,
      color: GRAPHITE_SOFT,
      lineHeight: 20,
    },
    // Plain-View fallback for screens that style a card directly: a fresh
    // sheet laid on the desk.
    card: {
      backgroundColor: SHEET,
      borderRadius: 2,
      padding: 16,
      shadowColor: '#2A2218',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 6,
      elevation: 3,
    },
    // A field filled in by hand: the line you write on.
    input: {
      backgroundColor: 'rgba(250,248,242,0.7)',
      borderBottomWidth: 2,
      borderBottomColor: GRAPHITE,
      borderRadius: 0,
      paddingHorizontal: 6,
      paddingVertical: 10,
      fontFamily: LETTER_M,
      fontSize: 16,
      color: INK,
    },
    pillBox: {
      borderWidth: 1.5,
      borderColor: 'rgba(60,60,65,0.55)',
      borderRadius: 2,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: 'rgba(250,248,242,0.6)',
    },
    pillText: {
      fontFamily: LETTER_M,
      fontSize: 14,
      color: GRAPHITE,
    },
    // The exposure sheet's printed labels.
    sectionLabel: {
      fontFamily: 'System',
      fontWeight: '700',
      fontSize: 11,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
      color: FORM,
    },
  })
}
