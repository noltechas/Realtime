import type { ThemeUIModule } from '../../types'
import { styles } from './styles'
import { Button } from './atoms/Button'
import { ColorPicker } from './atoms/ColorPicker'
import { GenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { ItemFloater } from './atoms/ItemFloater'
import { ScreenTitle } from './atoms/ScreenTitle'
import { SongsSearchBar } from './atoms/SongsSearchBar'
import { SongCard } from './atoms/SongCard'
import { QueueRow } from './atoms/QueueRow'
import { ReactionCell } from './atoms/ReactionCell'
import { StageTabIcon } from './atoms/StageTabIcon'
import { StagePlayButton } from './atoms/StagePlayButton'
import { StageToggleBox } from './atoms/StageToggleBox'
import { YoureUpHero } from './atoms/YoureUpHero'
import { ArtOverlay } from './atoms/ArtOverlay'

// Tropical — "Lagoon". A bright, airy, modern beach: a drawn sky→sand scene with
// water drifting across the bottom, frosted sea-glass surfaces floating on soft
// tinted shadows, one confident lagoon accent doing the work, and dimensional lit
// objects (sun, beads, chrome mic) where the theme needs presence.
//
// Every colour, type ramp, shadow, spring and object comes from the shared
// vocabulary in atoms/_tropical.tsx — no atom invents its own. Switching themes
// swaps this whole module through the registry, so nothing here branches on the
// theme name.
export const TROPICAL_UI: ThemeUIModule = {
  styles,

  Button,
  ColorPicker,
  GenreTabs,

  TabBar,
  Backdrop,
  ItemFloater,

  ScreenTitle,

  SongsSearchBar,
  SongCard,

  QueueRow,

  ReactionCell,
  StageTabIcon,
  StagePlayButton,
  StageToggleBox,
  YoureUpHero,
  ArtOverlay,

  // Reaction tiles are frosted glass over a pale tide-pool wash, so the
  // screen-owned Ionicons inside them take the theme's soft ink; the "+" on an
  // empty custom-emoji tile drops to driftwood so it reads as a placeholder.
  reactionIconColors: {
    iconColor: '#2F6B62',
    plusIconColor: '#A3C0B9',
  },
}
