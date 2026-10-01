import { GOTHIC_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildGothicStyles } from './styles'
import { Button } from './atoms/Button'
import { ColorPicker } from './atoms/ColorPicker'
import { GenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { SceneLayer } from './atoms/SceneLayer'
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
import { ASH, BONE } from './atoms/_gothic'

// ── GOTHIC: "NOCTURNE" ──────────────────────────────────────────────────────
//
// A cathedral at midnight, during a storm: the same building the stage shows,
// held in your hand. Every atom is assembled from the vocabulary in
// atoms/_gothic.tsx and nothing else:
//
//   • STONE   cusped tablets (`Stone`) with a moonlit top rim, a candle-warm
//             lower lip and a carved groove; pressing one SINKS it (`Press`)
//   • IRON    the churchyard fence and its lantern (TabBar), rules, frames
//   • GLASS   album art glazed into lancet windows (`GlassWindow`), singers as
//             saints in rose roundels (`SingerRoundel`), the colour picker as a
//             whole rose window
//   • FLAME   candles that flicker as noise (`useFlicker`), toggles you light
//             and snuff, the on-deck row's candle, the lantern
//
// One storm for the whole app (`useStorm`): when lightning strikes, every pane
// of glass on every screen flares in the same frame, and the eyes in the dark
// shut. The nave behind it all is a single SceneLayer.
//
// Typography: Fraktur (UnifrakturMaguntia) for titles, never in capitals;
// Grenze Gotisch for names and labels; Cormorant Garamond for prose. Roman
// numerals for every ordinal.
export const GOTHIC_UI: ThemeUIModule = {
  styles: buildGothicStyles(GOTHIC_MOBILE),

  Button,
  ColorPicker,
  GenreTabs,

  TabBar,
  Backdrop,
  SceneLayer,
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

  // Reaction tiles are carved niches over dark stone, so the Ionicons the Stage
  // screen renders in them are bone; the "+" on an empty tile drops to ash.
  reactionIconColors: {
    iconColor: BONE,
    plusIconColor: ASH,
  },
}
