import type { ThemeTokens } from './tokens'
import { NEO_BRUTAL_TOKENS } from './neo-brutal'
import { CYBERPUNK_TOKENS } from './cyberpunk'
import { SKETCH_TOKENS } from './sketch'
import { URBAN_TOKENS } from './urban'
import { DEEP_SEA_TOKENS } from './deep-sea'

// Lookup map for resolving a session's `theme_name` string to its shared
// token bundle. Mobile uses this to pick the active theme based on the live
// session row. Unknown names fall back to neo-brutal.
export const THEME_TOKENS_BY_NAME: Record<string, ThemeTokens> = {
  'neo-brutal': NEO_BRUTAL_TOKENS,
  cyberpunk: CYBERPUNK_TOKENS,
  sketch: SKETCH_TOKENS,
  urban: URBAN_TOKENS,
  'deep-sea': DEEP_SEA_TOKENS,
}

export function resolveThemeTokens(name: string | null | undefined): ThemeTokens {
  if (!name) return NEO_BRUTAL_TOKENS
  return THEME_TOKENS_BY_NAME[name] ?? NEO_BRUTAL_TOKENS
}
