import { SPACE_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildSpaceStyles } from './styles'
import { SpaceButton } from './atoms/Button'
import { SpaceColorPicker } from './atoms/ColorPicker'
import { SpaceGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { SpaceSongsSearchBar } from './atoms/SongsSearchBar'
import { SpaceSongCard } from './atoms/SongCard'
import { SpaceQueueRow } from './atoms/QueueRow'
import { SpaceReactionCell } from './atoms/ReactionCell'
import { SpaceStageTabIcon } from './atoms/StageTabIcon'
import { SpaceStagePlayButton } from './atoms/StagePlayButton'
import { SpaceStageToggleBox } from './atoms/StageToggleBox'

// Space theme module — sci-fi HUD aesthetic on a deep cosmic void.
// Hero motifs: twinkling starfield + drifting nebula clouds + shooting stars
// in the backdrop, a magenta planet pill with an orbiting cyan satellite in
// the tab bar, HUD corner brackets on every card, an aurora gradient sweep
// across queue rows, holographic scan lines on inputs and reaction cells,
// orbital rings + sonar pulses on the stage play button, and planets with
// tilted rings as color swatches.
//
// Matches the desktop space theme — same palette (#E040FB magenta + #40E0D0
// plasma cyan + #08080F void), same Orbitron + Exo 2 typography, same
// constellation / nebula / aurora language carried into every atom.
export const SPACE_UI: ThemeUIModule = {
  styles: buildSpaceStyles(SPACE_MOBILE),

  Button: SpaceButton,
  ColorPicker: SpaceColorPicker,
  GenreTabs: SpaceGenreTabs,

  TabBar,
  Backdrop,
  ItemFloater,

  SongsSearchBar: SpaceSongsSearchBar,
  SongCard: SpaceSongCard,

  QueueRow: SpaceQueueRow,

  ReactionCell: SpaceReactionCell,
  StageTabIcon: SpaceStageTabIcon,
  StagePlayButton: SpaceStagePlayButton,
  StageToggleBox: SpaceStageToggleBox,

  // Reaction cells sit on a void background with hue-tinted glass — icons
  // need to be light. tokens.black = '#E8E6F0' (cool white) reads cleanly.
  reactionIconColors: {
    iconColor: SPACE_MOBILE.black,
    plusIconColor: SPACE_MOBILE.faint,
  },
}
