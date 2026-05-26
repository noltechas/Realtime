import { URBAN_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildUrbanStyles } from './styles'
import { UrbanButton } from './atoms/Button'
import { UrbanColorPicker } from './atoms/ColorPicker'
import { UrbanGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { UrbanSongsSearchBar } from './atoms/SongsSearchBar'
import { UrbanSongCard } from './atoms/SongCard'
import { UrbanQueueRow } from './atoms/QueueRow'
import { UrbanReactionCell } from './atoms/ReactionCell'
import { UrbanStageTabIcon } from './atoms/StageTabIcon'
import { UrbanStagePlayButton } from './atoms/StagePlayButton'
import { UrbanStageToggleBox } from './atoms/StageToggleBox'

// Urban theme module — toxic green on void, sharp corners, parallelogram skew
// throughout, PermanentMarker + Oswald fonts. Every screen-level structural
// decision (skew transforms, drop-shadow border treatments, sharp swatches,
// shattered-glass tab bar) lives in atoms below. Screens read this module via
// `useTheme().ui` and never branch on `tokens.name`.
export const URBAN_UI: ThemeUIModule = {
  styles: buildUrbanStyles(URBAN_MOBILE),

  Button: UrbanButton,
  ColorPicker: UrbanColorPicker,
  GenreTabs: UrbanGenreTabs,

  TabBar,
  Backdrop,
  ItemFloater,

  SongsSearchBar: UrbanSongsSearchBar,
  SongCard: UrbanSongCard,

  QueueRow: UrbanQueueRow,

  ReactionCell: UrbanReactionCell,
  StageTabIcon: UrbanStageTabIcon,
  StagePlayButton: UrbanStagePlayButton,
  StageToggleBox: UrbanStageToggleBox,

  // Urban cells are dark — emoji/icon foreground must be light. tokens.black
  // resolves to #FFFFFF in this theme. The plus glyph (used for empty
  // reaction slots) is dimmed via `faint`.
  reactionIconColors: {
    iconColor: URBAN_MOBILE.black,
    plusIconColor: URBAN_MOBILE.faint,
  },
}
