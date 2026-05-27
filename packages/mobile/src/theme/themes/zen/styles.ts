import { StyleSheet, type ViewStyle, type TextStyle } from 'react-native'
import type { ThemeTokens } from '@karaoke/shared'
import type { ThemeUIStyles } from '../../types'

// Zen page-level styles. The cards/inputs used by screens that don't yet have
// a dedicated atom (Wizard, Profile, Lobby) all share these surfaces. They
// render as washi-paper panels with sumi-ink tatami binding on top + bottom
// instead of generic rounded glow boxes — keeping the screen consistent with
// the SongCard/QueueRow/SongsSearchBar atoms.
export function buildZenStyles(t: ThemeTokens): ThemeUIStyles {
  const sheet = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.appBg,
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
      fontSize: 32,
      fontWeight: '700',
      color: '#F0E6D3',
      letterSpacing: 1.2,
      textAlign: 'center',
      // Faint sumi-ink shadow for calligraphy weight
      textShadowColor: 'rgba(0,0,0,0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    h2: {
      fontFamily: t.fontDisplay,
      fontSize: 22,
      fontWeight: '700',
      color: '#D4B85A',
      letterSpacing: 1,
      textAlign: 'center',
    },
    body: {
      fontFamily: t.fontBody,
      fontSize: 15,
      color: '#F0E6D3',
      lineHeight: 23,
      letterSpacing: 0.2,
    },
    muted: {
      fontFamily: t.fontBody,
      fontSize: 13,
      color: '#B8A898',
      letterSpacing: 0.2,
    },
    // Washi panel — tatami-bound on top and bottom (thick dark bands with
    // gold hairline threads) and a thin sumi-ink frame on the sides.
    card: {
      backgroundColor: '#F0E6D3',
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderLeftColor: '#2a1f15',
      borderRightColor: '#2a1f15',
      borderTopWidth: 5,
      borderBottomWidth: 5,
      borderTopColor: '#2a1f15',
      borderBottomColor: '#2a1f15',
      padding: 20,
      paddingTop: 24,
      paddingBottom: 24,
    },
    input: {
      backgroundColor: '#F0E6D3',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: '#2a1f15',
      borderBottomColor: '#2a1f15',
      borderLeftWidth: 0,
      borderRightWidth: 0,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      fontFamily: t.fontBody,
      color: '#1a1814',
    } as ViewStyle & TextStyle,
    // Pill = small vermillion hanko stamp
    pillBox: {
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#7A2616',
      backgroundColor: '#D4442A',
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    pillText: {
      fontFamily: t.fontDisplay,
      fontSize: 11,
      fontWeight: '800',
      color: '#F0E6D3',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontFamily: t.fontDisplay,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 3,
      color: '#D4B85A',
      opacity: 0.95,
      marginBottom: 12,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  })

  return sheet
}
