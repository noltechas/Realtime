import { BARBIE_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildBarbieStyles } from './styles'
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
import { CANDY, PINK } from './atoms/_barbie'

// ── BARBIE: "BARBIE LAND" ───────────────────────────────────────────────────
//
// A pink, sunny day on a painted movie set: the same town the stage shows,
// held in your hand. Every atom is assembled from the vocabulary in
// atoms/_barbie.tsx and nothing else:
//
//   • PAINTED SKY  the town behind every screen (SceneLayer): flat painted sky,
//                  the sun and its slow sunburst, drifting cumulus, the edge of
//                  town (hills, terrazzo, the pool) under the tab bar
//   • THE SUN      the play button, the queue positions, the toggles (a cloud
//                  slides over the sun to turn one off), and the one GLINT that
//                  crosses every glossy surface at once (`useGlint`)
//   • PLASTIC      glossy pills that squish like jelly (`Gloss`, `Press`), the
//                  pink tray of the tab bar and its jelly bubble
//   • PALM SPRINGS genre tabs as a street of awninged shops, reactions as
//                  poolside cabanas, songs as deckle-edged snapshots
//   • GLITTER      four-point twinkles, never a soft glow
//
// Typography: Shrikhand, sign-painted with a white outline and pink extrusion
// (`RetroText`), for titles; Yellowtail for the odd brush-script flourish;
// Poppins for everything else.
export const BARBIE_UI: ThemeUIModule = {
  styles: buildBarbieStyles(BARBIE_MOBILE),

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

  // Reaction tiles are white cabana doorways, so the Stage screen's Ionicons in
  // them are Barbie pink; the "+" on an empty tile is candy.
  reactionIconColors: {
    iconColor: PINK,
    plusIconColor: CANDY,
  },
}
