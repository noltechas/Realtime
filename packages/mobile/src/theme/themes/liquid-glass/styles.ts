import { StyleSheet } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'
import { FAINT, SOFT, WHITE } from './atoms/_glass'

// Liquid Glass stylesheet: system type on transparent screens.
//
// TRANSPARENT `screen` AND `page` ARE LOAD-BEARING: the wallpaper the glass
// floats over is a single SceneLayer mounted once behind the whole
// navigator. If these painted `appBg` they would cover it.
export function buildLiquidGlassStyles(t: ThemeTokens): ThemeUIStyles {
  const lift = { textShadowColor: 'rgba(0,0,0,0.28)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }
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
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
      color: WHITE,
      ...lift,
    },
    h2: {
      fontSize: 22,
      fontWeight: '700',
      letterSpacing: -0.4,
      color: WHITE,
      ...lift,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      color: WHITE,
      lineHeight: 22,
    },
    muted: {
      fontSize: 14,
      fontWeight: '400',
      color: SOFT,
      lineHeight: 20,
    },
    // Plain-View fallback for screens that style a card directly: a pane of
    // frosted glass (the atoms use real glass).
    card: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: t.radius,
      borderWidth: StyleSheet.hairlineWidth * 1.5,
      borderColor: 'rgba(255,255,255,0.3)',
      padding: 16,
    },
    input: {
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth * 1.5,
      borderColor: 'rgba(255,255,255,0.24)',
      paddingHorizontal: 16,
      paddingVertical: 13,
      fontSize: 17,
      color: WHITE,
    },
    pillBox: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: StyleSheet.hairlineWidth * 1.5,
      borderColor: 'rgba(255,255,255,0.24)',
    },
    pillText: {
      fontSize: 14,
      fontWeight: '600',
      color: WHITE,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: FAINT,
    },
  })
}
