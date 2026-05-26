import { NEO_BRUTAL_MOBILE } from '../../tokens'
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

// Neo-brutal is the default theme — light cream background, hard black
// borders, 4px offset shadows, classic press-into-shadow feedback. Every
// atom in this module reads colors directly from NEO_BRUTAL_MOBILE rather
// than from `useTheme().tokens`, so there is no per-theme name branching
// anywhere in this folder. Theme switching swaps the entire
// ThemeUIModule via the registry.
export const NEO_BRUTAL_UI: ThemeUIModule = {
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

  // Reaction cells sit on a white card with a 3px black border in neo-brutal,
  // so the emoji / chatbubble / camera / image icons need the dark foreground
  // for contrast. The `+` glyph in the "Custom Emoji" cell uses the faint
  // tone so it reads as a placeholder.
  reactionIconColors: {
    iconColor: NEO_BRUTAL_MOBILE.black,
    plusIconColor: NEO_BRUTAL_MOBILE.faint,
  },
}
