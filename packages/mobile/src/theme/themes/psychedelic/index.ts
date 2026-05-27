import { PSYCHEDELIC_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildPsychedelicStyles } from './styles'
import { PsychedelicButton } from './atoms/Button'
import { PsychedelicColorPicker } from './atoms/ColorPicker'
import { PsychedelicGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { PsychedelicSongsSearchBar } from './atoms/SongsSearchBar'
import { PsychedelicSongCard } from './atoms/SongCard'
import { PsychedelicQueueRow } from './atoms/QueueRow'
import { PsychedelicReactionCell } from './atoms/ReactionCell'
import { PsychedelicStageTabIcon } from './atoms/StageTabIcon'
import { PsychedelicStagePlayButton } from './atoms/StagePlayButton'
import { PsychedelicStageToggleBox } from './atoms/StageToggleBox'

// Psychedelic theme module — deep-purple void with a hot-pink / lime /
// tangerine triad. The hero feature is the bottom tab bar's lava-lamp orb
// (gooey orange/yellow blob with a trailing satellite drip that flows across
// tabs with viscous spring overshoot). Cards breathe, genre pills bob, list
// rows have an aurora gradient sweep, reaction cells ripple on press, and the
// stage play button is a multi-layered sonar-pulsing wax bubble.
//
// Mirrors the existing desktop psychedelic theme — same palette, fonts
// (Chicle + Spicy Rice), motifs (blob morph, peace sign, mandala ring, hue
// cycling, chromatic aberration). No `tokens.name ===` branching in screens;
// each atom owns its own structural psychedelic character.
export const PSYCHEDELIC_UI: ThemeUIModule = {
  styles: buildPsychedelicStyles(PSYCHEDELIC_MOBILE),

  Button: PsychedelicButton,
  ColorPicker: PsychedelicColorPicker,
  GenreTabs: PsychedelicGenreTabs,

  TabBar,
  Backdrop,
  ItemFloater,

  SongsSearchBar: PsychedelicSongsSearchBar,
  SongCard: PsychedelicSongCard,

  QueueRow: PsychedelicQueueRow,

  ReactionCell: PsychedelicReactionCell,
  StageTabIcon: PsychedelicStageTabIcon,
  StagePlayButton: PsychedelicStagePlayButton,
  StageToggleBox: PsychedelicStageToggleBox,

  // Reaction cell surface is dark translucent purple — icons need to read
  // light. tokens.black resolves to '#f5ecff' (lavender-white) on this theme.
  reactionIconColors: {
    iconColor: PSYCHEDELIC_MOBILE.black,
    plusIconColor: PSYCHEDELIC_MOBILE.faint,
  },
}
