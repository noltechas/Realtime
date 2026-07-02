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
import { YoureUpHero } from './atoms/YoureUpHero'
import { ArtOverlay } from './atoms/ArtOverlay'

// Steampunk theme module — a Victorian PRECISION INSTRUMENT, machined rather
// than decorated. Near-black iron plates carry thin brass hairlines, engraved
// inner rules, and small machined corner screws; polished brass is reserved
// for the single active element on screen (the seated tab key, the active
// genre plate, the primary button); copper needles and gas-lamp amber mark
// live states only. Gears appear in exactly three places — the backdrop's
// ghosted clockwork, the Stage tab icon, and the Great Engine play button —
// so they stay special. Cinzel is the engraved plate lettering; IM Fell
// English is the Victorian body face. The shared visual vocabulary (palette,
// Plaque, Screw, Gear, GaugeDial, CornerBrackets, motion hooks) lives in
// atoms/_steam.tsx.
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
  YoureUpHero,
  ArtOverlay,

  // Reaction cells are dark iron plates — icons need parchment light; the
  // "+" affordance stays a faint brass etch.
  reactionIconColors: {
    iconColor: '#EFE0BE',
    plusIconColor: 'rgba(200,151,62,0.45)',
  },
}
