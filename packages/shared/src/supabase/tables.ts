// Row shapes for the tables the mobile companion needs. Names match the DB
// columns verbatim so query results can be cast without remapping.

export interface SingerConfig {
  name: string
  color: string
  colorGlow: string
  roleIndices: number[]
  profilePicture?: string
  whitePersonCheck?: boolean
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
  created_at: string
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
