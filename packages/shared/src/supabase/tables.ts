// Row shapes for the tables the mobile companion needs. Names match the DB
// columns verbatim so query results can be cast without remapping.

export interface SingerConfig {
  /** Identity reference. When set, the singer's display name AND profile
   *  picture are resolved LIVE from the canonical `karaoke_guests` record
   *  (see `resolveSinger`), so profile edits propagate everywhere. This is
   *  the stable session-scoped guest UUID, immune to name/photo edits. */
  guestId?: string
  /** Display name. Present ONLY for admin/host- or name-only singers that
   *  have no linked guest account (no `guestId`). For guest-linked singers
   *  this is omitted and resolved from `karaoke_guests`. Also tolerated as a
   *  legacy fallback label for pre-refactor rows. */
  name?: string
  /** Per-song slot styling — a deliberate per-song choice (lead vs backing,
   *  colour collision-avoidance, lyric highlighting), NOT profile data, so it
   *  is stored on the config rather than resolved from the guest. */
  color: string
  colorGlow: string
  roleIndices: number[]
  /** Consumed one-time gift attached by the desktop only for the active turn. */
  oneTimeNwordPassGiftId?: string
  /** @deprecated LEGACY ONLY. The "white person" lyric-sanitization flag now
   *  lives on the canonical `karaoke_guests` row (`white_person_check`) and is
   *  toggled per-guest by the host on the Admin screen — guests no longer set
   *  it themselves. New code MUST NOT write this onto the config. Pre-refactor
   *  rows may still carry it; `resolveSinger` reads it only as a fallback for
   *  name-only singers that have no linked guest. */
  whitePersonCheck?: boolean
  /** @deprecated LEGACY ONLY. Avatars live on the canonical `karaoke_guests`
   *  row and are resolved at render time via `resolveSinger`. New code MUST
   *  NOT write this — it duplicates a base64 blob into every row and goes
   *  stale on profile edits. Pre-refactor rows may still carry it; the data
   *  migration strips it, and `resolveSinger` reads it only as a fallback for
   *  rows that have neither a `guestId` nor a migration yet. */
  profilePicture?: string
}

export interface KaraokeSessionRow {
  id: string
  code: string
  name: string | null
  is_active: boolean
  theme_name: string | null
  is_playing: boolean | null
  now_playing_track_id: string | null
  now_playing_name: string | null
  now_playing_artist: string | null
  now_playing_art_url: string | null
  now_playing_singer_configs: SingerConfig[] | null
  now_playing_stage_theme: string | null
  updated_at: string | null
}

export interface KaraokeGuestRow {
  id: string
  session_id: string
  name: string
  profile_picture: string | null
  default_color: string | null
  /** Legacy inverse entitlement flag. FALSE means the host granted this guest
   *  a permanent N-Word Pass; TRUE (the DB default) means affected lyrics are
   *  sanitized. Product code should prefer `guestHasNwordPass()` instead of
   *  exposing this implementation detail in the UI. */
  white_person_check: boolean
  created_at: string
  /** Presence heartbeat stamped by the mobile companion while foregrounded
   *  (NULL when backgrounded/closed). The notify-singer edge function skips
   *  guests whose value is fresh so "it's your turn" pushes only reach users
   *  who are NOT actively in the app. Optional here — most reads don't select it. */
  last_active_at?: string | null
}

export interface KaraokeQueueRow {
  id: string
  session_id: string
  track_id: string
  track_name: string
  track_artist: string
  track_art_url: string | null
  track_duration_ms: number | null
  singer_configs: SingerConfig[]
  added_by_guest_id: string | null
  added_by_name: string | null
  source: 'local' | 'remote'
  stage_theme: string | null
  is_hidden: boolean
  position: number | null
  status: string
  score: number
  bonus_points: number
  locked: boolean
  created_at: string
}
