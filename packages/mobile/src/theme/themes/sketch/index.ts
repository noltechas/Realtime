import type { ThemeUIModule } from '../../types'
import { SKETCH_MOBILE } from '../../tokens'
import { buildSketchStyles } from './styles'
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

// Sketch theme module — cream paper, hand-drawn marker aesthetic. Atoms read
// SKETCH_MOBILE tokens via useTheme() so any per-session override flows
// through naturally without re-wiring the registry.
export const SKETCH_UI: ThemeUIModule = {
  styles: buildSketchStyles(SKETCH_MOBILE),
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
  // Sketch cells are paper — black icons read fine against the cream fill.
  // The placeholder `+` glyph fades to 30% black so empty slots feel quiet
  // without losing legibility.
  reactionIconColors: {
    iconColor: SKETCH_MOBILE.black,
    plusIconColor: 'rgba(0,0,0,0.3)',
  },
}
