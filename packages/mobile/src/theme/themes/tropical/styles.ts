import { StyleSheet } from 'react-native'
import type { ThemeUIStyles } from '../../types'
import {
  HALO,
  INK,
  MUTE,
  SAND,
  alpha,
  lift,
  sans,
  script,
} from './atoms/_tropical'

// Tropical screen scaffolds — the shared type + surface rhythm for everything
// that isn't a bespoke atom (modal sheets, empty-state cards, generic inputs).
//
// Type sizes come from the optically-matched helpers in _tropical: Florida
// Vibes' cap height is 0.57em against Quicksand's 0.70em, so `script(30)` and
// `sans(30)` land at the same APPARENT size — that's what keeps mixed lines
// from looking mis-set. Headings are the surf script with a white halo (they
// sit straight on the drawn sky); body copy is always Quicksand.
//
// The generic card is warm sand paper with a driftwood keyline — quieter than
// the atoms' carved planks on purpose, so modals and empty states read as
// paper ON the island rather than more furniture.
const rawStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SAND, // base under the Backdrop's drawn scene
  },
  page: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 48,
    backgroundColor: 'transparent',
    flexGrow: 1,
  },

  h1: script(30, INK, HALO),
  h2: script(20, INK, HALO),

  body: sans(15, 'semi', INK),
  muted: sans(13, 'medium', MUTE),

  card: {
    backgroundColor: 'rgba(255,250,238,0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(154,100,50,0.4)',
    borderRadius: 20,
    padding: 18,
    ...lift(2),
  },

  input: {
    backgroundColor: '#FFFDF4',
    borderWidth: 1.5,
    borderColor: 'rgba(154,100,50,0.5)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    ...sans(16, 'semi', INK),
    ...lift(1),
  },

  pillBox: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(154,100,50,0.45)',
    backgroundColor: 'rgba(255,197,61,0.3)',
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  pillText: sans(12, 'bold', INK, { letterSpacing: 0.3 }),

  // Small uppercase eyebrow above a list/section. Quicksand rather than the
  // tiki face on purpose: screens feed this arbitrary strings ("Up Next · 4
  // songs") and The Last Trunks has no · ’ … – — in its cmap.
  sectionLabel: {
    ...sans(11.5, 'bold', alpha(INK, 0.6), { letterSpacing: 1.4 }),
    textTransform: 'uppercase',
    marginBottom: 12,
    ...HALO,
  },
})

export const styles: ThemeUIStyles = rawStyles
