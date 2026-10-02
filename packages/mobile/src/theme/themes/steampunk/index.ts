import { STEAMPUNK_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildSteampunkStyles } from './styles'
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
import { ProfilePortrait } from './atoms/ProfilePortrait'
import { BRASS_LO, INK } from './atoms/_engine'

// ── STEAMPUNK: "THE VOX ENGINE" ─────────────────────────────────────────────
//
// The phone is a panel of the brass steam engine on the stage. Every metal
// part is a rendered sprite (scripts/generate-steampunk-assets.py), composed
// from the vocabulary in atoms/_engine.tsx:
//
//   • THE ENGINE HOUSE  the out-of-focus hall behind every screen (SceneLayer):
//                       a tall arched window with airships drifting past it,
//                       a train of gears turning along the foot, steam rising
//   • GEARS             real meshing trains, one native-driven clock for all
//                       of them; the tab bar is a rack with a pinion rolling
//                       along it to the active tab
//   • PORTHOLES         songs, queue rows and your profile photo are seen
//                       through riveted brass portholes
//   • PLATES            deep green enamel in riveted brass frames (titles,
//                       cards, tiles); polished brass for primary buttons
//   • INSTRUMENTS       a steam valve hand wheel to play, pressure gauges,
//                       knife-switch toggles, jewel lamps in singers' colours
export const STEAMPUNK_UI: ThemeUIModule = {
  styles: buildSteampunkStyles(STEAMPUNK_MOBILE),

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
  ProfilePortrait,

  // Reaction icons sit on cream glass push-buttons: ink, with the empty
  // tile's "+" in dark brass.
  reactionIconColors: {
    iconColor: INK,
    plusIconColor: BRASS_LO,
  },
}
