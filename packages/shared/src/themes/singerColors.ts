import type { SingerColor } from './tokens'

// Universal singer palette — every theme on every platform shows the same 13
// swatches. Picking a color is a user-identity choice, not a visual one, so
// it must not change as the user flips themes mid-session.
export const UNIVERSAL_SINGER_COLORS: SingerColor[] = [
  { color: '#22d3ee', colorGlow: 'rgba(34, 211, 238, 0.3)' },
  { color: '#f472b6', colorGlow: 'rgba(244, 114, 182, 0.3)' },
  { color: '#fbbf24', colorGlow: 'rgba(251, 191, 36, 0.3)' },
  { color: '#a78bfa', colorGlow: 'rgba(167, 139, 250, 0.3)' },
  { color: '#34d399', colorGlow: 'rgba(52, 211, 153, 0.3)' },
  { color: '#818cf8', colorGlow: 'rgba(129, 140, 248, 0.3)' },
  { color: '#ef4444', colorGlow: 'rgba(239, 68, 68, 0.3)' },
  { color: '#f97316', colorGlow: 'rgba(249, 115, 22, 0.3)' },
  { color: '#84cc16', colorGlow: 'rgba(132, 204, 22, 0.3)' },
  { color: '#14b8a6', colorGlow: 'rgba(20, 184, 166, 0.3)' },
  { color: '#3b82f6', colorGlow: 'rgba(59, 130, 246, 0.3)' },
  { color: '#d946ef', colorGlow: 'rgba(217, 70, 239, 0.3)' },
  { color: '#e11d48', colorGlow: 'rgba(225, 29, 72, 0.3)' },
]

// Resolve a saved hex color back to its index in the universal palette.
// Returns 0 if missing or unknown — that is, the user's old per-theme color
// won't survive the migration if it wasn't in the universal set, but they
// land on a valid default rather than nothing.
export function findColorIndex(color: string | undefined | null): number {
  if (!color) return 0
  const idx = UNIVERSAL_SINGER_COLORS.findIndex(
    (c) => c.color.toLowerCase() === color.toLowerCase(),
  )
  return idx >= 0 ? idx : 0
}
