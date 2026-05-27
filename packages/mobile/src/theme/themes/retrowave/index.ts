import { RETROWAVE_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildRetrowaveStyles } from './styles'
import { RetrowaveButton } from './atoms/Button'
import { RetrowaveColorPicker } from './atoms/ColorPicker'
import { RetrowaveGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { RetrowaveSongsSearchBar } from './atoms/SongsSearchBar'
import { RetrowaveSongCard } from './atoms/SongCard'
import { RetrowaveQueueRow } from './atoms/QueueRow'
import { RetrowaveReactionCell } from './atoms/ReactionCell'
import { RetrowaveStageTabIcon } from './atoms/StageTabIcon'
import { RetrowaveStagePlayButton } from './atoms/StagePlayButton'
import { RetrowaveStageToggleBox } from './atoms/StageToggleBox'

// Retrowave theme module — 1984-on-a-VHS-tape aesthetic.
// Hero motifs woven through every atom: a wireframe perspective grid (full
// scrolling floor in the backdrop, miniature scrolling strip in the tab bar),
// the canonical slatted sun (background, song cards, stage play button, stage
// tab icon), chrome-bevel plates (button primary, active tab indicator,
// vote buttons, toggle thumbs), CRT scanline overlays on every dark surface,
// chromatic-aberration neon text (song titles, queue titles), italic
// Audiowide caps body type, double-stroked Monoton headline display.
//
// Palette: hot-pink magenta (#FF2D95), electric cyan (#00F0FF), electric
// violet (#B967FF), sunset orange (#FFB13B) on deep purple-black (#0A0420).
export const RETROWAVE_UI: ThemeUIModule = {
  styles: buildRetrowaveStyles(RETROWAVE_MOBILE),

  Button: RetrowaveButton,
  ColorPicker: RetrowaveColorPicker,
  GenreTabs: RetrowaveGenreTabs,

  TabBar,
  Backdrop,
  ItemFloater,

  SongsSearchBar: RetrowaveSongsSearchBar,
  SongCard: RetrowaveSongCard,

  QueueRow: RetrowaveQueueRow,

  ReactionCell: RetrowaveReactionCell,
  StageTabIcon: RetrowaveStageTabIcon,
  StagePlayButton: RetrowaveStagePlayButton,
  StageToggleBox: RetrowaveStageToggleBox,

  // Reaction cells sit on hue-tinted indigo with neon rims — icons should be
  // bright lavender white so they read on every hue.
  reactionIconColors: {
    iconColor: '#F4E8FF',
    plusIconColor: RETROWAVE_MOBILE.faint,
  },
}
