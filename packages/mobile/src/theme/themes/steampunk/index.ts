import { STEAMPUNK_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildSteampunkStyles } from './styles'
import { SteampunkButton } from './atoms/Button'
import { SteampunkColorPicker } from './atoms/ColorPicker'
import { SteampunkGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { SteampunkSongsSearchBar } from './atoms/SongsSearchBar'
import { SteampunkSongCard } from './atoms/SongCard'
import { SteampunkQueueRow } from './atoms/QueueRow'
import { SteampunkReactionCell } from './atoms/ReactionCell'
import { SteampunkStageTabIcon } from './atoms/StageTabIcon'
import { SteampunkStagePlayButton } from './atoms/StagePlayButton'
import { SteampunkStageToggleBox } from './atoms/StageToggleBox'

// Steampunk theme module — Victorian industrial brass-and-coal aesthetic.
// Hero motifs: rotating clockwork gears woven into every atom (backdrop,
// song cards, tab bar, color picker bezels, play button, stage icons),
// drifting steam plumes in the backdrop, copper rivets at every panel
// corner, polished brass plates with brushed-metal sheen sweeps, gas-lamp
// amber filament glow, swinging pressure-gauge needles, and Cinzel engraved
// plaque typography over Special Elite typewriter body text.
//
// Palette: aged brass (#B8762D) + polished copper (#C97D3E) + verdigris
// teal (#5C8A7A) accents on a coal-fire ember backdrop (#1F1108) with
// parchment-cream foreground text (#F0DDB5).
export const STEAMPUNK_UI: ThemeUIModule = {
  styles: buildSteampunkStyles(STEAMPUNK_MOBILE),

  Button: SteampunkButton,
  ColorPicker: SteampunkColorPicker,
  GenreTabs: SteampunkGenreTabs,

  TabBar,
  Backdrop,
  ItemFloater,

  SongsSearchBar: SteampunkSongsSearchBar,
  SongCard: SteampunkSongCard,

  QueueRow: SteampunkQueueRow,

  ReactionCell: SteampunkReactionCell,
  StageTabIcon: SteampunkStageTabIcon,
  StagePlayButton: SteampunkStagePlayButton,
  StageToggleBox: SteampunkStageToggleBox,

  // Reaction cells sit on a dark mahogany surface with hue-tinted brass rims —
  // icons need to be light parchment.
  reactionIconColors: {
    iconColor: '#F0DDB5',
    plusIconColor: STEAMPUNK_MOBILE.faint,
  },
}
