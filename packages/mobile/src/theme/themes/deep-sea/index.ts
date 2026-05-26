import { DEEP_SEA_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { styles } from './styles'

import { Button } from './atoms/Button'
import { ColorPicker } from './atoms/ColorPicker'
import { GenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { SongsSearchBar } from './atoms/SongsSearchBar'
import { SongCard } from './atoms/SongCard'
import { QueueRow } from './atoms/QueueRow'
import { ReactionCell } from './atoms/ReactionCell'
import { StageTabIcon } from './atoms/StageTabIcon'
import { StagePlayButton } from './atoms/StagePlayButton'
import { StageToggleBox } from './atoms/StageToggleBox'

// Deep-Sea theme module. Implements the full `ThemeUIModule` contract so the
// session ThemeContext can swap deep-sea in/out without screens ever having
// to branch on the active theme name. Reaction icons inside the stage's
// reaction cells render on a translucent navy surface, so the foreground
// icon color is white and the "plus" glyph in the empty-emoji cell uses
// cyan (accentA) for the bioluminescent feel.
export const DEEP_SEA_UI: ThemeUIModule = {
  styles,

  Button,
  ColorPicker,
  GenreTabs,

  TabBar,
  Backdrop,
  ItemFloater,

  SongsSearchBar,
  SongCard,

  QueueRow,

  ReactionCell,
  StageTabIcon,
  StagePlayButton,
  StageToggleBox,

  reactionIconColors: {
    iconColor: '#FFFFFF',
    plusIconColor: DEEP_SEA_MOBILE.accentA,
  },
}

// Re-export RealisticBubble — defined alongside the TabBar atom — so
// other deep-sea atoms can import it via the module root rather than
// reaching into atoms/TabBar.tsx directly. Outside callers (e.g. the
// WizardScreen, until that screen is itself refactored to consume an
// atom from the theme module) can also import it from here.
export { RealisticBubble } from './atoms/TabBar'
