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
import { YoureUpHero } from './atoms/YoureUpHero'

// Tropical / Tiki Beach — a sun-drenched island getaway over a full-bleed photo
// backdrop. Warm sand panels framed in bamboo, lagoon-turquoise accents, sunset
// + hibiscus pops, flickering tiki-torch flames and Pacifico surf-script
// headings. Every atom reads colors directly from the shared tropical vocabulary
// (_tropical.tsx) so there's no per-theme name branching here; switching themes
// swaps the entire ThemeUIModule via the registry.
export const TROPICAL_UI: ThemeUIModule = {
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
  YoureUpHero,

  // Reaction cells punch the emoji / chatbubble / camera / image icons onto a
  // bright lei-medallion disc; deep-palm ink keeps them legible across the
  // sunshine/lagoon/palm spot colors. The "+" custom-emoji glyph uses the faint
  // driftwood tone so it reads as a placeholder.
  reactionIconColors: {
    iconColor: '#123A33',
    plusIconColor: '#9DB5AB',
  },
}
