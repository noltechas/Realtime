import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './credentials'

export type KaraokeClient = SupabaseClient

export function createKaraokeClient(
  url: string = SUPABASE_URL,
  anonKey: string = SUPABASE_ANON_KEY,
): KaraokeClient {
  return createClient(url, anonKey)
}
