import { Platform } from 'react-native'

// "Oscars" palette — warm black canvas, gilded accents, cream type.
// Deliberately not derived from the host theme so the awards screen reads
// the same regardless of which theme the karaoke session is running.
export const AWARDS_PALETTE = {
  appBg: '#0a0908',
  surface: '#161210',
  surfaceLight: '#1f1a16',
  surfaceDeep: '#0d0a09',

  // Gilding — keep these in tight harmony; the eye should read it as one
  // family of gold, not three competing yellows.
  gold: '#d4af37',
  goldBright: '#f4d35e',
  goldDeep: '#8c6d1f',
  goldShadow: 'rgba(212,175,55,0.18)',
  goldHairline: 'rgba(212,175,55,0.28)',
  goldEdge: 'rgba(212,175,55,0.45)',
  goldWash: 'rgba(212,175,55,0.06)',

  // Type
  cream: '#f5e6c5',
  creamMuted: 'rgba(245,230,197,0.62)',
  creamFaint: 'rgba(245,230,197,0.32)',
  creamGhost: 'rgba(245,230,197,0.10)',

  // Status
  white: '#ffffff',
  red: '#c14a3d',

  // ---- Legacy aliases (used by RevealOverlay + remaining un-migrated
  // call sites). Map old tokens onto the new gold palette so the screen
  // reads as one coherent theme even before every component is rewritten.
  whiteMuted: 'rgba(245,230,197,0.62)',
  whiteFaint: 'rgba(245,230,197,0.32)',
  whiteGhost: 'rgba(245,230,197,0.10)',
  surface1: '#161210',
  surface2: '#1f1a16',
  violet: '#d4af37',
  pink: '#f4d35e',
  amber: '#d4af37',
  amberLight: '#fce8a4',
  violetSoft: 'rgba(212,175,55,0.18)',
  violetGlow: 'rgba(212,175,55,0.25)',

  // 'Bodoni 72' ships on every iOS device — high-contrast didone serif with
  // a confident upright structure. We avoid italic everywhere because at
  // display sizes it can read as cursive, which the user explicitly didn't
  // want. Android falls back to 'serif' (Noto Serif), close enough in spirit.
  // "Delauney" — the gilded display serif loaded via expo-font in App.tsx,
  // matching the desktop awards ceremony font. Falls back to Bodoni/serif.
  fontSerif: Platform.select({ ios: 'Delauney', default: 'Delauney' }) as string,
  fontDisplay: Platform.select({ ios: 'Delauney', default: 'Delauney' }) as string,
  // "Great Vibes" — flowing gilded script, used for award descriptions and
  // ballot prompts so they read as elegant cursive rather than upright serif.
  fontScript: 'GreatVibes_400Regular',
  fontBody: 'System',
}

export type AwardsPalette = typeof AWARDS_PALETTE
