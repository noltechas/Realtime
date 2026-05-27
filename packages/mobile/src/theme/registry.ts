import type { ThemeUIModule } from './types'
import { NEO_BRUTAL_UI } from './themes/neo-brutal'
import { CYBERPUNK_UI } from './themes/cyberpunk'
import { SKETCH_UI } from './themes/sketch'
import { URBAN_UI } from './themes/urban'
import { DEEP_SEA_UI } from './themes/deep-sea'
import { ZEN_UI } from './themes/zen'
import { PSYCHEDELIC_UI } from './themes/psychedelic'
import { SPACE_UI } from './themes/space'
import { STEAMPUNK_UI } from './themes/steampunk'
import { RETROWAVE_UI } from './themes/retrowave'

// Active-theme dispatch. Picks the right ThemeUIModule per theme name.
// Unknown / not-yet-implemented themes fall back to neo-brutal so the app
// keeps rendering instead of crashing — same fallback behavior as
// resolveMobileTheme().
const THEME_UI_BY_NAME: Record<string, ThemeUIModule> = {
  'neo-brutal': NEO_BRUTAL_UI,
  cyberpunk:    CYBERPUNK_UI,
  sketch:       SKETCH_UI,
  urban:        URBAN_UI,
  'deep-sea':   DEEP_SEA_UI,
  zen:          ZEN_UI,
  psychedelic:  PSYCHEDELIC_UI,
  space:        SPACE_UI,
  steampunk:    STEAMPUNK_UI,
  retrowave:    RETROWAVE_UI,
}

export function resolveThemeUI(name: string | null | undefined): ThemeUIModule {
  if (!name) return NEO_BRUTAL_UI
  return THEME_UI_BY_NAME[name] ?? NEO_BRUTAL_UI
}
