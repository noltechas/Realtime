import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { BlurView } from 'expo-blur'
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useSharedValue } from 'react-native-worklets-core'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import {
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
} from 'react-native-filament'
import { TAB_ICONS } from '../../../../navigation/TabIcons'
import { useTheme } from '../../../ThemeContext'
import { useSession } from '../../../../hooks/useSession'
import { useSessionRow, guestIsUp } from '../../../../hooks/useSessionRow'
import {
  CUT_PLATE,
  GlowHalo,
  HexBolt,
  ICE,
  MILLED,
  STEEL_HI,
  TickLadder,
  VOID,
  chamferPath,
  pxPerWorldUnit,
  useIsForeground,
  useSvgId,
} from './_ship'

// ── The nav console ─────────────────────────────────────────────────────────
//
// A machined rail across the bottom of the deck. The selected tab is marked by a
// REAL 3D object: a milled KEY PLATE, cut to the exact chamfered outline every
// card in this theme uses, with a lit ice face, a polished 45° bevel, and dark
// titanium side walls. It travels the rail on a spring, and the specular
// crawling across that bevel as it moves is the entire reason this is 3D.
//
// It started out as a hex collar with a glowing iris and read as an
// unidentifiable blob — the shape said nothing, and a continuous roll plus a
// steep pitch and a big velocity yaw turned it to mush at 44px. Three rules came
// out of that, and they are why the numbers below are as small as they are:
//   1. The silhouette must be the theme's own panel outline. Recognition comes
//      from matching the cards, not from being interesting.
//   2. NO idle rotation. The plate holds a fixed, deliberate orientation; the
//      only thing that moves it is the user selecting a tab.
//   3. Bank is a hint, not a stunt. Long travel to an outer tab used to swing it
//      violently; the yaw is now clamped to a few degrees.
//
// This is the second and last Filament scene in the theme (the first is the
// outboard viewport behind every screen). The view is only ~68px tall, so even
// at the full display refresh rate it is close to free — see the budget note in
// _ship.tsx for why the count stops at two.
//
// The pod's motion runs entirely on Filament's render thread: React writes a
// target position into a shared value exactly once per tab change, and a spring
// integrator inside the render callback does the rest. Tab switches therefore
// cost the JS thread one assignment, no matter how much is animating.

const NAVPOD_MODEL = require('../../../../../assets/models/space-navpod.glb')

const BAR_HEIGHT = 68
const BAR_INSET = 14
/** Plate width on screen (the model is 1.0 units wide), and the y of its centre
 *  inside the rail. The plate is 0.8 units tall, so at 46px wide it stands 37px
 *  and clears the cell's label beneath it. */
const POD_PIXELS = 44
const POD_CENTER_Y = 24
const POD_FOCAL_MM = 30
const POD_CAMERA_Z = 1.9

// The pod scene is small enough to run at full refresh, and it should: the
// travel spring is a foreground interaction and half-rate makes it look cheap.
const POD_FRAME_RATE = { interval: 1, headRoomRatio: 0.1, scaleRate: 0.3, history: 6 }

function useStageLabel(): string {
  const { session } = useSession()
  const row = useSessionRow(session?.sessionId)
  return guestIsUp(row, session?.guestName, session?.guestId) ? 'Stage' : 'React'
}

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { tokens } = useTheme()
  const stageLabel = useStageLabel()
  const [trackWidth, setTrackWidth] = useState(0)
  const railId = useSvgId('navRail')

  const tabCount = state.routes.length
  const tabWidth = trackWidth > 0 ? trackWidth / tabCount : 0
  const activeIndex = state.index
  const activeCenter = tabWidth * (activeIndex + 0.5)

  // The 2D halo is sprung on the JS side rather than read back from the render
  // thread. A soft glow a frame or two behind crisp geometry is invisible, and
  // reading a shared value back into React every frame would undo the whole
  // point of animating the pod off-thread.
  const haloX = useRef(new Animated.Value(0)).current
  const haloPositioned = useRef(false)
  useEffect(() => {
    if (tabWidth <= 0) return
    if (!haloPositioned.current) {
      haloPositioned.current = true
      haloX.setValue(activeCenter)
      return
    }
    Animated.spring(haloX, {
      toValue: activeCenter,
      stiffness: 200,
      damping: 22,
      mass: 1,
      useNativeDriver: true,
    }).start()
  }, [activeCenter, haloX, tabWidth])

  // Kept tight and low-intensity. A wide, bright halo bled across the whole
  // rail and read as a smudge under the pod rather than light coming off it.
  const haloSize = POD_PIXELS * 1.7

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingHorizontal: BAR_INSET,
      }}
    >
      <View
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        style={{
          height: BAR_HEIGHT,
          overflow: 'hidden',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.55,
          shadowRadius: 14,
          elevation: 16,
        }}
      >
        <BlurView
          pointerEvents="none"
          intensity={22}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />

        {/* Rail plate. Drawn as a chamfered silhouette so the bar belongs to
            the same milled family as every panel above it. */}
        {trackWidth > 0 ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={trackWidth} height={BAR_HEIGHT}>
              <Defs>
                <SvgLinearGradient id={railId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="rgba(19,28,39,0.95)" />
                  <Stop offset="0.55" stopColor="rgba(9,14,22,0.96)" />
                  <Stop offset="1" stopColor="rgba(4,6,11,0.98)" />
                </SvgLinearGradient>
              </Defs>
              <Path
                d={chamferPath(trackWidth, BAR_HEIGHT, CUT_PLATE)}
                fill={`url(#${railId})`}
              />
              <Path
                d={chamferPath(trackWidth, BAR_HEIGHT, CUT_PLATE, 0.5)}
                fill="none"
                stroke={ICE}
                strokeOpacity={0.3}
                strokeWidth={1}
              />
              {/* Milled top edge — the rail's brightest line. */}
              <Path
                d={`M ${(CUT_PLATE.tl ?? 0) + 3} 1.5 L ${trackWidth - 3} 1.5`}
                stroke={MILLED}
                strokeWidth={1}
              />
              {/* Engraved index ladder along the rail's top face. */}
              <TickLadder
                x={18}
                y={5}
                length={trackWidth - 36}
                count={Math.max(8, Math.round(trackWidth / 13))}
                color={STEEL_HI}
                opacity={0.22}
                majorEvery={5}
              />
              <HexBolt cx={trackWidth - 9} cy={9} />
              <HexBolt cx={9} cy={BAR_HEIGHT - 9} />
            </Svg>
          </View>
        ) : null}

        {/* 2D halo — sits UNDER the Filament view so the pod's metal stays
            crisp and only the light around it blooms. */}
        {trackWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -haloSize / 2,
              top: POD_CENTER_Y - haloSize / 2,
              width: haloSize,
              height: haloSize,
              transform: [{ translateX: haloX }],
            }}
          >
            <GlowHalo size={haloSize} color={ICE} intensity={0.26} />
          </Animated.View>
        ) : null}

        {/* The pod. Mounted once the rail's width is known, because that width
            is what converts a tab centre into a world coordinate. */}
        {trackWidth > 0 ? (
          <NavPodScene viewWidth={trackWidth} targetPx={activeCenter} />
        ) : null}

        {/* Tab cells sit above the 3D — the active glyph reads against the
            pod's matte centre disc. */}
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {state.routes.map((route, index) => {
            const Icon = TAB_ICONS[route.name]
            const options = descriptors[route.key]?.options
            const overrideIcon = options?.tabBarIcon as
              | ((props: { color: string; size?: number; focused: boolean }) => React.ReactNode)
              | undefined
            const focused = state.index === index
            const label = route.name === 'Stage' ? stageLabel : route.name

            return (
              <NavCell
                key={route.key}
                label={label}
                focused={focused}
                Icon={Icon}
                overrideIcon={overrideIcon}
                inactiveColor={tokens.tabBarFg}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  })
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name)
                  }
                }}
                onLongPress={() => {
                  navigation.emit({ type: 'tabLongPress', target: route.key })
                }}
              />
            )
          })}
        </View>
      </View>
    </View>
  )
}

function NavCell({
  label,
  focused,
  Icon,
  overrideIcon,
  inactiveColor,
  onPress,
  onLongPress,
}: {
  label: string
  focused: boolean
  Icon: ((props: { color: string; size?: number }) => React.ReactElement) | undefined
  overrideIcon:
    | ((props: { color: string; size?: number; focused: boolean }) => React.ReactNode)
    | undefined
  inactiveColor: string
  onPress: () => void
  onLongPress: () => void
}) {
  const { tokens } = useTheme()
  // Every inactive tab shares one colour; only the selected one is lit. The
  // glyph on the lit pod goes near-white rather than ice, so it reads as a
  // backlit legend instead of competing with the iris ring around it.
  // The selected glyph goes hull-dark because it sits on the lit ice plate —
  // the same relationship the theme's `tabBarPill` / `tabBarPillFg` token pair
  // describes. Every unselected tab shares one muted colour.
  const iconColor = focused ? tokens.tabBarPillFg : inactiveColor
  const labelColor = focused ? ICE : inactiveColor

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
    >
      <View style={{ height: 26, alignItems: 'center', justifyContent: 'center' }}>
        {overrideIcon
          ? overrideIcon({ color: iconColor, size: 18, focused })
          : Icon
            ? Icon({ color: iconColor, size: 18 })
            : null}
      </View>
      <Text
        style={{
          marginTop: 3,
          color: labelColor,
          fontFamily: tokens.fontDisplay,
          fontSize: 9,
          letterSpacing: 1.7,
          textTransform: 'uppercase',
          opacity: focused ? 1 : 0.82,
          textShadowColor: focused ? 'rgba(91,233,255,0.45)' : 'transparent',
          textShadowRadius: focused ? 7 : 0,
          textShadowOffset: { width: 0, height: 0 },
        }}
      >
        {label}
      </Text>
      {/* Index mark under the inactive tabs — the rail's engraved detent. */}
      {!focused ? (
        <View
          style={{
            marginTop: 3,
            width: 10,
            height: 1,
            backgroundColor: inactiveColor,
            opacity: 0.35,
          }}
        />
      ) : (
        <View style={{ marginTop: 3, height: 1 }} />
      )}
    </Pressable>
  )
}

function NavPodScene({
  viewWidth,
  targetPx,
}: {
  viewWidth: number
  targetPx: number
}): React.ReactElement {
  const foreground = useIsForeground()
  return (
    <FilamentScene
      antiAliasing="FXAA"
      dithering="none"
      shadowing={false}
      screenSpaceRefraction={false}
      frameRateOptions={POD_FRAME_RATE}
      fallback={<View />}
    >
      <NavPodBody viewWidth={viewWidth} targetPx={targetPx} paused={!foreground} />
    </FilamentScene>
  )
}

function NavPodBody({
  viewWidth,
  targetPx,
  paused,
}: {
  viewWidth: number
  targetPx: number
  paused: boolean
}): React.ReactElement | null {
  const model = useModel(NAVPOD_MODEL)
  const asset = getAssetFromModel(model)
  const { transformManager, nameComponentManager, choreographer } = useFilamentContext()

  const pixelsPerUnit = pxPerWorldUnit(BAR_HEIGHT, POD_FOCAL_MM, POD_CAMERA_Z)
  // The model is 1.0 units across, so the scale factor is the desired pixel
  // diameter in world units.
  const podScale = POD_PIXELS / pixelsPerUnit
  const podY = (BAR_HEIGHT / 2 - POD_CENTER_Y) / pixelsPerUnit
  const targetWorld = (targetPx - viewWidth / 2) / pixelsPerUnit

  // Spring state lives on the render thread. `position` starts already at the
  // target so the pod is simply *there* on first paint instead of flying in
  // from the middle of the bar.
  const target = useSharedValue(targetWorld)
  const position = useSharedValue(targetWorld)
  const velocity = useSharedValue(0)
  const flare = useSharedValue(0)

  const previousTarget = useRef(targetWorld)
  useEffect(() => {
    target.value = targetWorld
    if (previousTarget.current !== targetWorld) {
      // Selection actually moved — fire the flare ring.
      flare.value = 1
      previousTarget.current = targetWorld
    }
  }, [flare, target, targetWorld])

  const parts = useMemo(() => {
    if (asset == null) return null
    const instance = asset.getAssetInstances()[0]
    if (instance == null) return null
    const entities = instance.getEntities()
    const byName = (name: string): Entity | undefined =>
      entities.find((entity) => nameComponentManager.getEntityName(entity) === name)
    const plate = byName('PodPlate')
    const flareRing = byName('PodFlare')
    if (!plate || !flareRing) return null
    return { plate, flareRing }
  }, [asset, nameComponentManager])

  RenderCallbackContext.useRenderCallback(
    ({ timeSinceLastFrame }) => {
      'worklet'
      if (parts == null) return

      // Clamp dt so a dropped frame (or a resume from background) can't launch
      // the spring across the bar in one step.
      const dt = Math.min(Math.max(timeSinceLastFrame, 0.001), 0.05)
      const stiffness = 210
      const damping = 2 * Math.sqrt(stiffness) * 0.82
      const acceleration =
        -stiffness * (position.value - target.value) - damping * velocity.value
      velocity.value += acceleration * dt
      position.value += velocity.value * dt
      flare.value *= Math.exp(-5.5 * dt)

      // Bank INTO the direction of travel, as a hint only. Clamped to ±0.11 rad
      // (~6°): the plate has a recognisable outline and swinging it hard
      // destroys that, which is exactly what the first version did on a long
      // jump to an outer tab. There is deliberately no idle rotation at all.
      const yaw = Math.max(-0.11, Math.min(0.11, -velocity.value * 0.045))
      // A fixed, shallow tip so the bevel and rim read as thickness rather than
      // as a drawn outline. Constant, so the plate never appears to wobble.
      const pitch = -0.075
      const x = position.value

      transformManager.openLocalTransformTransaction()

      // Transform order — `updateTransform` pre-multiplies, so the last call
      // applied is the outermost. See the equivalent note in SceneLayer.tsx.
      transformManager.setEntityScale(parts.plate, [podScale, podScale, podScale], false)
      transformManager.setEntityRotation(parts.plate, yaw, [0, 1, 0], true)
      transformManager.setEntityRotation(parts.plate, pitch, [1, 0, 0], true)
      transformManager.setEntityPosition(parts.plate, [x, podY, 0], true)

      // Flare: expands outward as it fades, then collapses to nothing. Scale is
      // the only channel available without reaching into the material, and for
      // an expanding shock ring it happens to be the right one.
      const flareVisible = flare.value > 0.04
      const flareScale = flareVisible ? podScale * (1 + (1 - flare.value) * 0.8) : 0.0001
      transformManager.setEntityScale(
        parts.flareRing,
        [flareScale, flareScale, flareScale],
        false,
      )
      if (flareVisible) {
        transformManager.setEntityRotation(parts.flareRing, yaw, [0, 1, 0], true)
        transformManager.setEntityRotation(parts.flareRing, pitch, [1, 0, 0], true)
        transformManager.setEntityPosition(parts.flareRing, [x, podY, 0], true)
      }

      transformManager.commitLocalTransformTransaction()
    },
    [parts, transformManager, podScale, podY],
  )

  useEffect(() => {
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
        cameraPosition={[0, 0, POD_CAMERA_Z]}
        cameraTarget={[0, 0, 0]}
        focalLengthInMillimeters={POD_FOCAL_MM}
        near={0.1}
        far={12}
      />
      {/* Key light from the upper left so the collar's top facets stay bright
          against the rail, which is darkest at its bottom edge. Kept well below
          the outboard scene's exposure — at 62k the titanium blew out to near
          white and the lit iris ring stopped reading against it. */}
      <Light
        type="directional"
        direction={[0.34, -0.6, -0.72]}
        intensity={17_000}
        colorKelvin={6_400}
      />
      <Light
        type="directional"
        direction={[-0.5, 0.35, -0.79]}
        intensity={6_000}
        colorKelvin={9_200}
      />
      <ModelRenderer model={model} />
    </FilamentView>
  )
}
