import { COMIC_BOOK_MOBILE } from '../../tokens'
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

// Comic-Book — bright modern pop-art. Same hard-offset-shadow family as
// neo-brutal but louder: heavy 3px ink panel borders, INK (#16161D) offset
// drops (not the red accent), Ben-Day halftone backdrop, pop red/yellow/blue,
// and Luckiest Guy uppercase display type. Every atom reads colors directly
// from COMIC_BOOK_MOBILE so there's no per-theme name branching in this folder;
// theme switching swaps the entire ThemeUIModule via the registry.
export const COMIC_BOOK_UI: ThemeUIModule = {
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

  // Reaction cells sit on a white panel with a 3px ink border, so the emoji /
  // chatbubble / camera / image icons need the dark ink foreground for
  // contrast. The `+` glyph in the "Custom Emoji" cell uses the faint tone so
  // it reads as a placeholder.
  reactionIconColors: {
    iconColor: '#16161D',
    plusIconColor: COMIC_BOOK_MOBILE.faint,
  },
}
