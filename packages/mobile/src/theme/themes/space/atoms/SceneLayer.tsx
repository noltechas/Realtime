import React, { useMemo } from 'react'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Rect,
  Stop,
} from 'react-native-svg'
import {
  filamentAvailable,
  Camera,
  FilamentScene,
  FilamentView,
  Light,
  ModelRenderer,
  RenderCallbackContext,
  getAssetFromModel,
  useFilamentContext,
  useModel,
  type Entity,
} from '../../../../native/optional'
import {
  BreathingStar,
  ICE,
  PlanetLimb,
  StarField,
  VOID,
  buildStarField,
  pxPerWorldUnit,
  useIsForeground,
  useIsOutboardOwner,
  useSvgId,
} from './_ship'

// ── The outboard viewport ───────────────────────────────────────────────────
//
// One full-screen layer, mounted ONCE behind the entire navigator (see
// theme/types.ts `SceneLayer` and ThemeContext's crossfade). It is what makes
// the flight-deck premise land: every screen in the theme is a panel with real
// space behind it, not a dark rectangle.
//
// Composited bottom to top:
//   1. deep-space gradient base
//   2. the planet the ship is holding station over — 2D, because an
//      atmospheric limb is a fresnel gradient and SVG does that in two stops
//   3. star field (static SVG) + a handful of breathing stars
//   4. THE 3D: a ring-habitat station whose habitat ring turns while its core
//      stays fixed, and a probe drifting across on a two-minute pass
//   5. a hairline viewport frame at the extreme screen edges
//
// The 3D is layer 4 of 5 on purpose: 2D handles gradients and glow, Filament
// handles machined metal and specular. Each medium does what it is good at, and
// the whole thing still works if the engine never comes up — see the `fallback`
// on FilamentScene and the owner check below.

const OUTBOARD_MODEL = require('../../../../../assets/models/space-outboard.glb')

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

// Camera rig. Everything is placed on the z = 0 plane so screen pixels convert
// to world units with the single factor below (see `pxPerWorldUnit`); objects
// still foreshorten from their own depth, which is where the solidity comes
// from. Move an object off z = 0 and its screen placement will drift.
const FOCAL_MM = 32
const CAMERA_Z = 6
const PIXELS_PER_UNIT = pxPerWorldUnit(SCREEN_H, FOCAL_MM, CAMERA_Z)

/** Screen x in px (origin top-left) → world X on the z = 0 plane. */
function worldX(pixelX: number): number {
  return (pixelX - SCREEN_W / 2) / PIXELS_PER_UNIT
}
/** Screen y in px (origin top-left) → world Y on the z = 0 plane. */
function worldY(pixelY: number): number {
  return (SCREEN_H / 2 - pixelY) / PIXELS_PER_UNIT
}
/** Desired on-screen px → world scale for a model that spans `modelSpan` units. */
function scaleForPixels(pixels: number, modelSpan: number): number {
  return pixels / PIXELS_PER_UNIT / modelSpan
}

// ── Composition ──────────────────────────────────────────────────────────────
// Read as a photograph: the station sits high and right, beside where every
// screen puts its header; the planet fills the lower left. The middle of the
// screen, where content lives, is deliberately the emptiest region.

const STATION_SPAN = 2.17 // ring outer diameter in model units
// Sized and placed to sit in the corner NEXT TO a screen's header, not behind
// it. At 132px in from 79% width it collided with the Queue title and pushed
// its solar arrays through the Songs genre chips — the station is scenery, and
// scenery that fights the type has to lose.
const STATION_PIXELS = 96
const STATION_X = worldX(SCREEN_W * 0.85)
const STATION_Y = worldY(SCREEN_H * 0.115)
const STATION_SCALE = scaleForPixels(STATION_PIXELS, STATION_SPAN)
// Tilt the ring well off face-on so it reads as a disc in perspective rather
// than a drawn circle. Applied after the spin so the ring turns about its own
// axis instead of precessing (transform order is documented in the render
// callback below).
const STATION_TILT_X = -1.02
const STATION_TILT_Z = 0.2
const STATION_SPIN_PERIOD = 78 // seconds per revolution — slow enough to feel massive

const PROBE_SPAN = 0.62
const PROBE_PIXELS = 30
const PROBE_SCALE = scaleForPixels(PROBE_PIXELS, PROBE_SPAN)
const PROBE_FROM_X = worldX(SCREEN_W * 1.18)
const PROBE_TO_X = worldX(-SCREEN_W * 0.18)
const PROBE_FROM_Y = worldY(SCREEN_H * 0.63)
const PROBE_TO_Y = worldY(SCREEN_H * 0.47)
const PROBE_PASS_SECONDS = 132

// Renderer settings. `interval: 2` runs the scene at half the display refresh
// rate — this is a slowly drifting background, 30fps is indistinguishable from
// 60, and it halves the GPU cost of the one always-on scene in the app.
const OUTBOARD_FRAME_RATE = {
  interval: 2,
  headRoomRatio: 0.2,
  scaleRate: 0.32,
  history: 8,
}

// Android spans a much wider GPU range than iOS, so let Filament drop internal
// resolution before it drops frames. At this scene's contrast — dark metal on
// black — the downscale is invisible.
const OUTBOARD_DYNAMIC_RESOLUTION = {
  enabled: true,
  homogeneousScaling: true,
  minScale: [0.6, 0.6] as [number, number],
  maxScale: [1, 1] as [number, number],
  sharpness: 0.8,
  quality: 'MEDIUM' as const,
}

export function SceneLayer(): React.ReactElement {
  const isOwner = useIsOutboardOwner()
  const baseId = useSvgId('outboardBase')

  const stars = useMemo(() => buildStarField(90210, 118, SCREEN_W, SCREEN_H), [])
  const brightStars = useMemo(() => buildStarField(4477, 14, SCREEN_W, SCREEN_H), [])

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* 1 — deep space. Slightly warmer toward the planet in the lower left. */}
      <Svg width={SCREEN_W} height={SCREEN_H} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id={baseId} x1="0.9" y1="0" x2="0.1" y2="1">
            <Stop offset="0" stopColor={VOID} />
            <Stop offset="0.45" stopColor="#060B14" />
            <Stop offset="0.8" stopColor="#08111C" />
            <Stop offset="1" stopColor="#040810" />
          </SvgLinearGradient>
        </Defs>
        <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill={`url(#${baseId})`} />
      </Svg>

      {/* 2 — the planet, mostly out of frame. */}
      <PlanetLimb
        size={SCREEN_W * 1.9}
        left={-SCREEN_W * 0.62}
        top={SCREEN_H * 0.58}
      />

      {/* 3 — stars. */}
      <StarField stars={stars} width={SCREEN_W} height={SCREEN_H} />
      {brightStars.map((star, index) => (
        <BreathingStar key={index} spec={star} period={3400 + index * 420} />
      ))}

      {/* 4 — the 3D. Only the first SceneLayer to mount runs an engine; the
          Wizard and Request modals bring their own themed subtree and would
          otherwise stand up a second full-screen renderer on top of this one. */}
      {/* Filament is native, so binaries older than 1.0.2 don't have it (see
          src/native/optional.ts). Gated here rather than inside OutboardScene because
          OutboardBody calls Filament's hooks, and hooks can't be skipped conditionally.
          Without the module the SVG star field and gradient above still render, so Space
          degrades to a flat backdrop — and those binaries never had the 3D version. */}
      {isOwner && filamentAvailable() ? <OutboardScene /> : null}

      {/* 5 — viewport frame: two hairlines at the extreme edges, enough to
          suggest we are looking through structure without eating any margin. */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(91,233,255,0.10)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: 'rgba(91,233,255,0.07)',
        }}
      />
    </View>
  )
}

function OutboardScene(): React.ReactElement {
  const foreground = useIsForeground()
  return (
    <FilamentScene
      antiAliasing="FXAA"
      dithering="none"
      // No shadow maps and no screen-space refraction: there is nothing here to
      // cast onto, and both are pure cost.
      shadowing={false}
      screenSpaceRefraction={false}
      frameRateOptions={OUTBOARD_FRAME_RATE}
      dynamicResolutionOptions={
        Platform.OS === 'android' ? OUTBOARD_DYNAMIC_RESOLUTION : undefined
      }
      // If the engine can't start, the 2D layers below are a complete look on
      // their own — the theme degrades, it doesn't break.
      fallback={<View />}
    >
      <OutboardBody paused={!foreground} />
    </FilamentScene>
  )
}

function OutboardBody({ paused }: { paused: boolean }): React.ReactElement | null {
  const model = useModel(OUTBOARD_MODEL)
  const asset = getAssetFromModel(model)
  const { transformManager, nameComponentManager, choreographer } = useFilamentContext()

  // Resolve the named nodes once. Driving `transformManager` directly rather
  // than going through <EntitySelector transform={…}> is deliberate: each of
  // these needs several transform steps in a guaranteed order, and
  // EntitySelector applies scale/rotate/translate from independent listeners
  // whose relative order isn't defined when more than one changes per frame.
  const parts = useMemo(() => {
    if (asset == null) return null
    const instance = asset.getAssetInstances()[0]
    if (instance == null) return null
    const entities = instance.getEntities()
    const byName = (name: string): Entity | undefined =>
      entities.find((entity) => nameComponentManager.getEntityName(entity) === name)
    const ring = byName('StationRing')
    const core = byName('StationCore')
    const probe = byName('Probe')
    if (!ring || !core || !probe) return null
    return { ring, core, probe }
  }, [asset, nameComponentManager])

  // Everything animates on Filament's own render thread. Nothing here touches
  // the JS thread per frame, which is why a list can scroll at 60fps with a
  // live 3D scene behind it.
  RenderCallbackContext.useRenderCallback(
    ({ passedSeconds }) => {
      'worklet'
      if (parts == null) return

      const spin = ((passedSeconds % STATION_SPIN_PERIOD) / STATION_SPIN_PERIOD) * Math.PI * 2
      // Probe pass, with a long dark gap between runs so it stays an event.
      const passProgress = (passedSeconds % PROBE_PASS_SECONDS) / PROBE_PASS_SECONDS
      const probeX = PROBE_FROM_X + (PROBE_TO_X - PROBE_FROM_X) * passProgress
      const probeY = PROBE_FROM_Y + (PROBE_TO_Y - PROBE_FROM_Y) * passProgress
      const probeTumble = passedSeconds * 0.16

      transformManager.openLocalTransformTransaction()

      // TRANSFORM ORDER. `updateTransform` PRE-multiplies
      // (new * current), so the vertex-space order is the reverse of the call
      // order: the last call applied is the outermost. Calling
      // scale → spin → tilt → translate therefore yields
      // T * Tilt * Spin * S, i.e. scale the model, spin it about its own axis,
      // then tip that spinning assembly over and move it into frame. Calling
      // tilt before spin instead would rotate about world Z and make the ring
      // precess like a wobbling coin.
      transformManager.setEntityScale(
        parts.ring,
        [STATION_SCALE, STATION_SCALE, STATION_SCALE],
        false,
      )
      transformManager.setEntityRotation(parts.ring, spin, [0, 0, 1], true)
      transformManager.setEntityRotation(parts.ring, STATION_TILT_X, [1, 0, 0], true)
      transformManager.setEntityRotation(parts.ring, STATION_TILT_Z, [0, 0, 1], true)
      transformManager.setEntityPosition(parts.ring, [STATION_X, STATION_Y, 0], true)

      // The core shares the ring's placement and tilt but never spins — that
      // contrast is what makes the ring read as centrifugal habitation rather
      // than a decorative hoop.
      transformManager.setEntityScale(
        parts.core,
        [STATION_SCALE, STATION_SCALE, STATION_SCALE],
        false,
      )
      transformManager.setEntityRotation(parts.core, STATION_TILT_X, [1, 0, 0], true)
      transformManager.setEntityRotation(parts.core, STATION_TILT_Z, [0, 0, 1], true)
      transformManager.setEntityPosition(parts.core, [STATION_X, STATION_Y, 0], true)

      transformManager.setEntityScale(
        parts.probe,
        [PROBE_SCALE, PROBE_SCALE, PROBE_SCALE],
        false,
      )
      transformManager.setEntityRotation(parts.probe, probeTumble, [0, 1, 0], true)
      transformManager.setEntityRotation(parts.probe, -0.55, [1, 0, 0], true)
      transformManager.setEntityPosition(parts.probe, [probeX, probeY, 0], true)

      transformManager.commitLocalTransformTransaction()
    },
    [parts, transformManager],
  )

  // Stop rendering entirely when the app is backgrounded. Filament will
  // otherwise keep the render loop alive and quietly drain the battery.
  React.useEffect(() => {
    if (paused) choreographer.stop()
    else choreographer.start()
  }, [choreographer, paused])

  if (model.state !== 'loaded') return null

  return (
    <FilamentView
      pointerEvents="none"
      enableTransparentRendering
      style={StyleSheet.absoluteFill}
    >
      <Camera
        cameraPosition={[0, 0, CAMERA_Z]}
        cameraTarget={[0, 0, 0]}
        focalLengthInMillimeters={FOCAL_MM}
        near={0.5}
        far={40}
      />
      {/* Key light — the system's star, high and to the right, matching where
          the planet's terminator is drawn in PlanetLimb. */}
      <Light
        type="directional"
        direction={[-0.46, -0.52, -0.72]}
        intensity={72_000}
        colorKelvin={6_200}
      />
      {/* Fill — cold bounce off the planet below. Without this the unlit sides
          of the hull go completely black, since there is no IBL in this scene. */}
      <Light
        type="directional"
        direction={[0.52, 0.42, -0.74]}
        intensity={13_000}
        colorKelvin={9_600}
      />
      <ModelRenderer model={model} />
    </FilamentView>
  )
}

export const SPACE_SCENE_ACCENT = ICE
