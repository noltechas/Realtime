import { ZEN_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildZenStyles } from './styles'
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

// Zen theme module — Japanese cherry-blossom aesthetic.
//   • Backdrop: night-sky sumi-ink wash with a pale moon, sakura branch,
//     Mt. Fuji silhouette, and continuously falling 5-petal sakura petals.
//   • Cards: washi-paper panels with tatami binding (dark bands on top +
//     bottom with hairline gold threads), bamboo spine on the left edge,
//     enso (incomplete brush circle) album art, sakura branch corner.
//   • Active states: vermillion hanko (ink stamp) with cream double-border,
//     brushstroke ink underlines, sakura blossom indicators.
//   • Animations: blooming sakura on tab focus, gentle drift on backdrop
//     petals, breathing ink wash. No glow halos, no neon — calm.
//   • Fonts: Noto Serif JP (mincho calligraphic serif) for display,
//     Zen Kaku Gothic New (modern Japanese geometric sans) for body.
export const ZEN_UI: ThemeUIModule = {
  styles: buildZenStyles(ZEN_MOBILE),

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

  // Reactions: dark sumi-ink icons on washi cards; add button uses a faded
  // vermillion so it suggests a "stamp here" affordance without shouting.
  reactionIconColors: {
    iconColor: '#1a1814',
    plusIconColor: 'rgba(212,68,42,0.55)',
  },
}
