import { PSYCHEDELIC_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildPsychedelicStyles } from './styles'
import { PsychedelicButton } from './atoms/Button'
import { PsychedelicColorPicker } from './atoms/ColorPicker'
import { PsychedelicGenreTabs } from './atoms/GenreTabs'
import { TabBar } from './atoms/TabBar'
import { Backdrop } from './atoms/Backdrop'
import { SceneLayer } from './atoms/SceneLayer'
import { ItemFloater } from './atoms/ItemFloater'
import { PsychedelicScreenTitle } from './atoms/ScreenTitle'
import { PsychedelicSongsSearchBar } from './atoms/SongsSearchBar'
import { PsychedelicSongCard } from './atoms/SongCard'
import { PsychedelicQueueRow } from './atoms/QueueRow'
import { PsychedelicReactionCell } from './atoms/ReactionCell'
import { PsychedelicStageTabIcon } from './atoms/StageTabIcon'
import { PsychedelicStagePlayButton } from './atoms/StagePlayButton'
import { PsychedelicStageToggleBox } from './atoms/StageToggleBox'
import { PsychedelicYoureUpHero } from './atoms/YoureUpHero'
import { PsychedelicProfilePortrait } from './atoms/ProfilePortrait'
import { INK, INK_SOFT } from './atoms/_glass'

// ── PSYCHEDELIC — "LIQUID LIGHT" ─────────────────────────────────────────────
//
// The background is REAL FOOTAGE of a liquid light show — oil, water and aniline
// dyes on an overhead projector — playing full-bleed behind every screen.
//
// It is film rather than something generated, and that was learned the hard way:
// a lobed-plate vocabulary and then a domain-warped shader both read as computer
// graphics. The dye's actual behaviour — surface tension, refraction at the
// oil/water boundary, how a bubble cluster packs — is not something a noise field
// imitates convincingly.
//
// ── What that means for the interface ────────────────────────────────────────
// The video is saturated, polychrome, high-contrast and moving. Every design rule
// here follows from not competing with it (see atoms/_glass.tsx):
//   1. The footage owns the colour. Chrome is dark glass, white type, white
//      hairlines, and ONE hot accent reserved for state.
//   2. Glass, not paint — translucent enough that the liquid reads through, dark
//      enough that contrast is guaranteed. The footage reaches PURE WHITE, so
//      nothing may depend on its luminance; that is why the active tab pill, the
//      primary button and the play button are all opaque white.
//   3. The interface holds still. Presses settle, nothing loops except the one
//      live indicator on the play button and the "you're up" dot.
//
// ── Performance ─────────────────────────────────────────────────────────────
// One video decode for the whole app (SceneLayer is mounted once by
// ThemeCrossfade, not per screen). Real backdrop blur is reserved for persistent
// chrome — the tab bar and the search bay — because each instance costs a
// full-screen sample and a scrolling list of blurred rows over playing video drops
// frames. List rows use a heavier translucent fill instead.
export const PSYCHEDELIC_UI: ThemeUIModule = {
  styles: buildPsychedelicStyles(PSYCHEDELIC_MOBILE),

  Button: PsychedelicButton,
  ColorPicker: PsychedelicColorPicker,
  GenreTabs: PsychedelicGenreTabs,

  TabBar,
  Backdrop,
  SceneLayer,
  ItemFloater,
  ScreenTitle: PsychedelicScreenTitle,

  SongsSearchBar: PsychedelicSongsSearchBar,
  SongCard: PsychedelicSongCard,

  QueueRow: PsychedelicQueueRow,

  ReactionCell: PsychedelicReactionCell,
  StageTabIcon: PsychedelicStageTabIcon,
  StagePlayButton: PsychedelicStagePlayButton,
  StageToggleBox: PsychedelicStageToggleBox,
  YoureUpHero: PsychedelicYoureUpHero,

  ProfilePortrait: PsychedelicProfilePortrait,

  // Reaction cells are dark glass, so the Ionicons the Stage screen renders inside
  // them need to be white. The plus glyph on an empty slot drops to the faint tone
  // so it reads as an affordance rather than content.
  // Ink, not white: the reaction cells are opaque dye plates now, and StageScreen
  // renders its Ionicons with these colours — white glyphs would all but vanish on
  // mint, amber and cream.
  reactionIconColors: {
    iconColor: INK,
    plusIconColor: INK_SOFT,
  },
}
