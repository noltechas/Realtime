import { SPACE_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildSpaceStyles } from './styles'
import { SpaceButton } from './atoms/Button'
import { SpaceColorPicker } from './atoms/ColorPicker'
import { SpaceGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { SceneLayer } from './atoms/SceneLayer'
import { ItemFloater } from './atoms/ItemFloater'
import { SpaceScreenTitle } from './atoms/ScreenTitle'
import { SpaceSongsSearchBar } from './atoms/SongsSearchBar'
import { SpaceSongCard } from './atoms/SongCard'
import { SpaceQueueRow } from './atoms/QueueRow'
import { SpaceReactionCell } from './atoms/ReactionCell'
import { SpaceStageTabIcon } from './atoms/StageTabIcon'
import { SpaceStagePlayButton } from './atoms/StagePlayButton'
import { SpaceStageToggleBox } from './atoms/StageToggleBox'
import { SpaceYoureUpHero } from './atoms/YoureUpHero'
import { TEXT, TEXT_FAINT } from './atoms/_ship'

// ── SPACE — "FLIGHT DECK" ────────────────────────────────────────────────────
//
// The phone is a panel on a spacecraft's flight deck, with real space behind it.
//
// Three ideas carry every atom, documented in full at the top of
// `atoms/_ship.tsx`:
//   1. Chamfered plates — every surface is a milled panel whose top-left and
//      bottom-right corners are cut at 45°, drawn as a measured SVG silhouette
//      rather than faked with border radius.
//   2. One live light per element — structure is desaturated steel; the only
//      saturated pixels are lamps, and each panel's 2px left system bar is how
//      state gets communicated.
//   3. Physical press — controls tip away from the finger on a perspective
//      transform and settle on a spring. Nothing merely fades.
//
// ── The 3D ───────────────────────────────────────────────────────────────────
// Two Filament scenes, and only ever two:
//   • `SceneLayer` — the outboard viewport. A ring-habitat station whose habitat
//     ring turns while its core holds still, plus a probe on a two-minute pass.
//     Mounted ONCE behind the whole navigator, not per screen.
//   • `TabBar` — the nav console. The selected tab is a machined docking collar
//     that travels the rail on a spring and yaws into its direction of travel,
//     animated entirely on Filament's render thread.
// Everything else that looks dimensional is 2D geometry with native-driver
// perspective transforms. The reasoning, and what it would take to add a third
// scene, is in `_ship.tsx` under "Filament budget".
//
// Geometry comes from `npm run generate:space-models` — committed as a generator
// script rather than as opaque binaries.
//
// Typography diverges from the desktop space theme on purpose: Chakra Petch for
// control legends, Share Tech Mono for every telemetry numeral, Exo 2 for prose.
// Not Orbitron — see the note on SPACE_MOBILE in theme/tokens.ts.
export const SPACE_UI: ThemeUIModule = {
  styles: buildSpaceStyles(SPACE_MOBILE),

  Button: SpaceButton,
  ColorPicker: SpaceColorPicker,
  GenreTabs: SpaceGenreTabs,

  TabBar,
  Backdrop,
  SceneLayer,
  ItemFloater,
  ScreenTitle: SpaceScreenTitle,

  SongsSearchBar: SpaceSongsSearchBar,
  SongCard: SpaceSongCard,

  QueueRow: SpaceQueueRow,

  ReactionCell: SpaceReactionCell,
  StageTabIcon: SpaceStageTabIcon,
  StagePlayButton: SpaceStagePlayButton,
  StageToggleBox: SpaceStageToggleBox,
  YoureUpHero: SpaceYoureUpHero,

  // Reaction cells are black glass over the void, so the Ionicons the Stage
  // screen renders inside them need to be light. The plus glyph on an empty
  // slot drops to the engraved tone so it reads as an affordance, not content.
  reactionIconColors: {
    iconColor: TEXT,
    plusIconColor: TEXT_FAINT,
  },
}
