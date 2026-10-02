import { SKETCH_MOBILE } from '../../tokens'
import type { ThemeUIModule } from '../../types'
import { buildSketchStyles } from './styles'
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
import { GRAPHITE_SOFT, INK } from './atoms/_pencil'

// ── SKETCH: "FOLLOW THE BOUNCING BALL" ──────────────────────────────────────
//
// The phone is the animator's desk beside the stage's light table. Every mark
// is a drawn sprite (scripts/generate-sketch-assets.py), composed from the
// vocabulary in atoms/_pencil.tsx:
//
//   • THE SHEET        animation bond lit from underneath, behind every screen
//                      (SceneLayer), its fibres and erased roughs baked in
//   • THE BALL         the hero: it waits on each screen's title, it IS the
//                      play button (bouncing with its onion skins while the
//                      song plays), and it hops along the tab bar to the
//                      active tab
//   • THE EXPOSURE SHEET   the queue as printed teal form strips, filled in
//                      by hand; the tab bar is its foot
//   • PENCIL MARKS     boxes with overshooting corners, rings, swashes, ticks
//                      and tally marks; red for what matters, blue for roughs
//   • THE DESK         album art and photos as prints taped up with masking
//                      tape; the primary button is a strip of tape
export const SKETCH_UI: ThemeUIModule = {
  styles: buildSketchStyles(SKETCH_MOBILE),

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

  // Reaction icons sit inside pencilled boxes on the sheet: ink, with the
  // empty tile's "+" in pencil grey.
  reactionIconColors: {
    iconColor: INK,
    plusIconColor: GRAPHITE_SOFT,
  },
}
