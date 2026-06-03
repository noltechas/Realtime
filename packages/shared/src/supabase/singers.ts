import type { KaraokeGuestRow, SingerConfig } from './tables'

/**
 * A lookup from `guestId` -> canonical guest record. Accepts whatever shape a
 * given platform already holds its guest list in: a `Map`, a plain id-keyed
 * object, or a resolver function.
 */
export type GuestLookup =
  | Map<string, KaraokeGuestRow>
  | Record<string, KaraokeGuestRow>
  | ((id: string) => KaraokeGuestRow | undefined)

/** The render-ready values for a singer, after live identity resolution. */
export interface ResolvedSinger {
  /** Present when this singer references a known guest. */
  guestId?: string
  name: string
  profilePicture: string | null
  color: string
  colorGlow: string
  roleIndices: number[]
  whitePersonCheck?: boolean
}

function lookupGuest(
  guests: GuestLookup | undefined,
  id: string,
): KaraokeGuestRow | undefined {
  if (!guests) return undefined
  if (typeof guests === 'function') return guests(id)
  if (guests instanceof Map) return guests.get(id)
  return guests[id]
}

/**
 * Resolve a stored {@link SingerConfig} into the values needed to render it.
 *
 * Identity (name + picture) is resolved LIVE from the canonical
 * `karaoke_guests` record whenever the config carries a `guestId`, so a user's
 * profile edits (name / photo) propagate to every queued song, the now-playing
 * banner, the stage, and awards without re-queueing. Admin/host- or name-only
 * singers (no `guestId`) fall back to their inline `name`. Per-song slot
 * styling (`color`/`colorGlow`/`roleIndices`) always comes from the config.
 *
 * The "white person" lyric-sanitization flag (`whitePersonCheck`) is ALSO
 * resolved live from the guest record (`white_person_check`), so the host
 * toggling it on the Admin screen re-censors every song that guest is in.
 * Everyone defaults to "white" (sanitized): a known guest uses their stored
 * flag, and singers with no linked guest fall back to true.
 *
 * The `profilePicture` read off the config is a LEGACY fallback for
 * pre-refactor rows that still embed base64; new rows never store it, and the
 * one-time data migration strips it from existing rows.
 */
export function resolveSinger(
  config: SingerConfig,
  guests?: GuestLookup,
): ResolvedSinger {
  const guest = config.guestId ? lookupGuest(guests, config.guestId) : undefined
  return {
    guestId: config.guestId,
    name: guest?.name ?? config.name ?? 'Singer',
    profilePicture: guest ? guest.profile_picture ?? null : config.profilePicture ?? null,
    color: config.color,
    colorGlow: config.colorGlow,
    roleIndices: Array.isArray(config.roleIndices) ? config.roleIndices : [],
    // Everyone defaults to "white" (sanitized). A known guest uses their live
    // flag; name-only singers (no guest) fall back to the legacy config flag,
    // then to true.
    whitePersonCheck: guest
      ? guest.white_person_check !== false
      : config.whitePersonCheck ?? true,
  }
}

/** Build a `Map<guestId, KaraokeGuestRow>` from a guest list. */
export function guestsById(
  guests: readonly KaraokeGuestRow[] | null | undefined,
): Map<string, KaraokeGuestRow> {
  const map = new Map<string, KaraokeGuestRow>()
  for (const g of guests ?? []) map.set(g.id, g)
  return map
}
