import { CYBERPUNK_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildCyberpunkStyles } from './styles'
import { CyberpunkButton } from './atoms/Button'
import { CyberpunkColorPicker } from './atoms/ColorPicker'
import { CyberpunkGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { CyberpunkSongsSearchBar } from './atoms/SongsSearchBar'
import { CyberpunkSongCard } from './atoms/SongCard'
import { CyberpunkQueueRow } from './atoms/QueueRow'
import { CyberpunkReactionCell } from './atoms/ReactionCell'
import { CyberpunkStageTabIcon } from './atoms/StageTabIcon'
import { CyberpunkStagePlayButton } from './atoms/StagePlayButton'
import { CyberpunkStageToggleBox } from './atoms/StageToggleBox'
import { CyberYoureUpHero } from './atoms/YoureUpHero'
import { CyberArtOverlay } from './atoms/Crt'

// Cyberpunk theme UI module. Screens read `useTheme().ui.{atom}` to pull
// these without ever branching on `tokens.name === 'cyberpunk'`. Static
// stylesheet derived once from CYBERPUNK_MOBILE at module load.
//
// reactionIconColors notes: in cyberpunk, `tokens.black` is the *light*
// foreground (WHITE_TINTED) so it's the right color for emoji/chat/camera
// icons inside the reaction grid. `tokens.faint` carries enough neon green
// to keep the empty "+" affordance visible on the dark cell.
export const CYBERPUNK_UI: ThemeUIModule = {
  styles: buildCyberpunkStyles(CYBERPUNK_MOBILE),
  Button: CyberpunkButton,
  ColorPicker: CyberpunkColorPicker,
  GenreTabs: CyberpunkGenreTabs,
  TabBar,
  Backdrop,
  ItemFloater,
  SongsSearchBar: CyberpunkSongsSearchBar,
  SongCard: CyberpunkSongCard,
  QueueRow: CyberpunkQueueRow,
  ReactionCell: CyberpunkReactionCell,
  StageTabIcon: CyberpunkStageTabIcon,
  StagePlayButton: CyberpunkStagePlayButton,
  StageToggleBox: CyberpunkStageToggleBox,
  YoureUpHero: CyberYoureUpHero,
  ArtOverlay: CyberArtOverlay,
  reactionIconColors: {
    iconColor: CYBERPUNK_MOBILE.black,
    plusIconColor: CYBERPUNK_MOBILE.faint,
  },
}
