import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Paths } from 'expo-file-system'
import {
  Camera,
  EntitySelector,
  FilamentScene,
  FilamentView,
  Light,
  ModelRenderer,
  useBuffer,
  useFilamentContext,
  useModel,
  type Float3,
} from 'react-native-filament'
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg'

interface NwordPassCardProps {
  holderName: string
  variant: 'permanent' | 'one-time'
  onShare?: () => void
  onReady?: () => void
  presentationTransform?: NwordPassPresentationTransform
  paused?: boolean
  interactive?: boolean
  compact?: boolean
  style?: ViewStyle
}

interface NwordPassPresentationTransform {
  translateY: Animated.Value
  translateZ: Animated.Value
  scale: Animated.Value
  rotateZ: Animated.Value
  tiltX: Animated.Value
  initial: {
    translateY: number
    translateZ: number
    scale: number
    rotateZ: number
    tiltX: number
  }
}

interface HolderNameTextureProps {
  uri: string
  onReady?: () => void
}

interface HolderNameComposerProps {
  holderName: string
  variant: 'permanent' | 'one-time'
  onTextureReady: (uri: string) => void
}

type PortraitId = 'obama' | 'mlk' | 'black-panther' | 'ryan-gosling'

const CARD_RATIO = 1.586
const CARD_MODEL = require('../../assets/models/nword-pass.glb')
const PORTRAIT_STORAGE_KEY = '@karaoke/nword-pass-portrait'
const PORTRAIT_OPTIONS: ReadonlyArray<{
  id: PortraitId
  label: string
  entitySuffix: string
  backHitLeft: `${number}%`
}> = [
  {
    id: 'obama',
    label: 'Obama',
    entitySuffix: 'Obama',
    backHitLeft: '0%',
  },
  {
    id: 'mlk',
    label: 'King',
    entitySuffix: 'Mlk',
    backHitLeft: '25%',
  },
  {
    id: 'black-panther',
    label: 'Black Panther',
    entitySuffix: 'BlackPanther',
    backHitLeft: '50%',
  },
  {
    id: 'ryan-gosling',
    label: 'Ryan Gosling',
    entitySuffix: 'RyanGosling',
    backHitLeft: '75%',
  },
]
const VISIBLE_ENTITY_SCALE: Float3 = [1, 1, 1]
const HIDDEN_ENTITY_SCALE: Float3 = [0.0001, 0.0001, 0.0001]
const FILAMENT_FRAME_RATE_OPTIONS = {
  interval: 2,
  headRoomRatio: 0.16,
  scaleRate: 0.35,
  history: 8,
}
const FILAMENT_PRESENTATION_FRAME_RATE_OPTIONS = {
  interval: 1,
  headRoomRatio: 0.12,
  scaleRate: 0.28,
  history: 6,
}
const FILAMENT_DYNAMIC_RESOLUTION = {
  enabled: true,
  homogeneousScaling: true,
  minScale: [0.65, 0.65] as [number, number],
  maxScale: [1, 1] as [number, number],
  sharpness: 0.82,
  quality: 'MEDIUM' as const,
}
const INTERACTIVE_SCENE_OVERSCAN = 1.18
const INTERACTIVE_CAMERA_Z = 3.32 * INTERACTIVE_SCENE_OVERSCAN
const REST_ROTATION: Float3 = [-0.035, 0.075, 0]
const MAX_X_ROTATION = 0.22
const MAX_Y_ROTATION = 0.42
const FLIPPED_Y = Math.PI + 0.035
const EXPANDED_SCALE = 1

function isPortraitId(value: string): value is PortraitId {
  return PORTRAIT_OPTIONS.some(option => option.id === value)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hashName(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function decodeBase64(base64: string) {
  const decoded = globalThis.atob(base64)
  const bytes = new Uint8Array(decoded.length)
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index)
  }
  return bytes
}

function HolderNameComposer({
  holderName,
  variant,
  onTextureReady,
}: HolderNameComposerProps) {
  const svgRef = useRef<Svg | null>(null)
  const renderVersion = useRef(0)
  const displayName = (holderName.trim() || 'Guest').toLocaleUpperCase()
  const fontSize =
    variant === 'one-time'
      ? displayName.length > 16
        ? 24
        : displayName.length > 10
          ? 29
          : 36
      : displayName.length > 24
        ? 28
        : displayName.length > 16
          ? 34
          : 46

  useEffect(() => {
    const version = ++renderVersion.current
    const timer = setTimeout(() => {
      svgRef.current?.toDataURL(
        base64 => {
          if (version !== renderVersion.current) return
          try {
            const file = new File(
              Paths.cache,
              `nword-pass-holder-${hashName(displayName)}.png`,
            )
            file.create({ intermediates: true, overwrite: true })
            file.write(decodeBase64(base64))
            if (version === renderVersion.current) {
              onTextureReady(file.uri)
            }
          } catch (error) {
            console.warn('[NwordPass] Could not create holder texture:', error)
          }
        },
        { width: 768, height: 112 },
      )
    }, 80)

    return () => {
      clearTimeout(timer)
      renderVersion.current += 1
    }
  }, [displayName, onTextureReady])

  return (
    <Svg
      ref={svgRef}
      pointerEvents="none"
      width={768}
      height={112}
      viewBox="0 0 768 112"
      style={styles.textureComposer}
    >
      <Defs>
        <SvgLinearGradient id="holder-metal" x1="0" y1="0" x2="1" y2="0.2">
          <Stop offset="0" stopColor="#697483" />
          <Stop offset="0.18" stopColor="#F9FBFF" />
          <Stop offset="0.4" stopColor="#9DA8B8" />
          <Stop offset="0.62" stopColor="#FFFFFF" />
          <Stop offset="0.82" stopColor="#818C9C" />
          <Stop offset="1" stopColor="#E8EDF5" />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        x="16"
        y="76"
        textAnchor="start"
        fill="#020305"
        stroke="#020305"
        strokeWidth="4.8"
        fontFamily="Delauney"
        fontSize={fontSize}
        letterSpacing="6"
      >
        {displayName}
      </SvgText>
      <SvgText
        x="16"
        y="80"
        textAnchor="start"
        fill="url(#holder-metal)"
        stroke="#E9EEF6"
        strokeWidth="0.8"
        fontFamily="Delauney"
        fontSize={fontSize}
        letterSpacing="6"
      >
        {displayName}
      </SvgText>
    </Svg>
  )
}

function HolderNameTexture({ uri, onReady }: HolderNameTextureProps) {
  const texture = useBuffer({ source: { uri } })

  useEffect(() => {
    if (texture != null) onReady?.()
  }, [onReady, texture])

  if (texture == null) return null

  return (
    <EntitySelector
      byName="HolderName"
      textureMap={{
        materialName: 'HolderNameMaterial',
        textureSource: texture,
        textureFlags: 'sRGB',
      }}
    />
  )
}

function PortraitSelectionControls({
  selectedPortrait,
}: {
  selectedPortrait: PortraitId
}) {
  return (
    <>
      {PORTRAIT_OPTIONS.map(option => {
        const selected = option.id === selectedPortrait
        return (
          <React.Fragment key={option.id}>
            <EntitySelector
              byName={`FrontPortrait${option.entitySuffix}`}
              scale={selected ? VISIBLE_ENTITY_SCALE : HIDDEN_ENTITY_SCALE}
              multiplyWithCurrentTransform={false}
            />
          </React.Fragment>
        )
      })}
    </>
  )
}

function PassVariantControls({
  variant,
}: {
  variant: 'permanent' | 'one-time'
}) {
  return (
    <EntitySelector
      byName="OneTimeUse"
      scale={
        variant === 'one-time'
          ? VISIBLE_ENTITY_SCALE
          : HIDDEN_ENTITY_SCALE
      }
      multiplyWithCurrentTransform={false}
    />
  )
}

function FilamentCardScene({
  interactive,
  variant,
  rotationX,
  rotationY,
  holderTextureUri,
  selectedPortrait,
  isFlipped,
  presentationTransform,
  paused,
  onReady,
}: {
  interactive: boolean
  variant: 'permanent' | 'one-time'
  rotationX: Animated.Value
  rotationY: Animated.Value
  holderTextureUri: string | null
  selectedPortrait: PortraitId
  isFlipped: boolean
  presentationTransform?: NwordPassPresentationTransform
  paused: boolean
  onReady?: () => void
}) {
  const model = useModel(CARD_MODEL)
  const { choreographer, transformManager } = useFilamentContext()
  const modelRoot = model.state === 'loaded' ? model.rootEntity : null
  const [rotationReady, setRotationReady] = useState(false)
  const [readyHolderTextureUri, setReadyHolderTextureUri] =
    useState<string | null>(null)
  const rotationFrame = useRef<number | null>(null)
  const lastRotationApplyAt = useRef(0)
  const currentTransform = useRef({
    x: interactive ? (isFlipped ? -0.025 : REST_ROTATION[0]) : 0,
    y: interactive ? (isFlipped ? FLIPPED_Y : REST_ROTATION[1]) : 0,
    presentationY: presentationTransform
      ? presentationTransform.initial.translateY
      : 0,
    presentationZ: presentationTransform
      ? presentationTransform.initial.translateZ
      : 0,
    presentationScale: presentationTransform
      ? presentationTransform.initial.scale
      : 1,
    presentationRotateZ: presentationTransform
      ? presentationTransform.initial.rotateZ
      : 0,
    presentationTiltX: presentationTransform
      ? presentationTransform.initial.tiltX
      : 0,
  })

  useLayoutEffect(() => {
    if (modelRoot == null) {
      setRotationReady(false)
      return
    }

    const minimumFrameTime = presentationTransform ? 15 : 28
    const applyTransform = (timestamp?: number) => {
      if (
        timestamp != null &&
        timestamp - lastRotationApplyAt.current < minimumFrameTime
      ) {
        rotationFrame.current = requestAnimationFrame(applyTransform)
        return
      }
      rotationFrame.current = null
      lastRotationApplyAt.current = timestamp ?? performance.now()
      const current = currentTransform.current
      const scale = current.presentationScale

      transformManager.openLocalTransformTransaction()
      transformManager.setEntityScale(
        modelRoot,
        [scale, scale, scale],
        false,
      )
      transformManager.setEntityRotation(
        modelRoot,
        current.x + current.presentationTiltX,
        [1, 0, 0],
        true,
      )
      transformManager.setEntityRotation(
        modelRoot,
        current.y,
        [0, 1, 0],
        true,
      )
      transformManager.setEntityRotation(
        modelRoot,
        current.presentationRotateZ,
        [0, 0, 1],
        true,
      )
      transformManager.setEntityPosition(
        modelRoot,
        [0, current.presentationY, current.presentationZ],
        true,
      )
      transformManager.commitLocalTransformTransaction()
    }
    const scheduleTransform = () => {
      if (rotationFrame.current != null) return
      rotationFrame.current = requestAnimationFrame(applyTransform)
    }
    const xListener = rotationX.addListener(({ value }) => {
      currentTransform.current.x = value
      scheduleTransform()
    })
    const yListener = rotationY.addListener(({ value }) => {
      currentTransform.current.y = value
      scheduleTransform()
    })
    const presentationListeners: Array<{
      value: Animated.Value
      id: string
    }> = []

    if (presentationTransform) {
      presentationListeners.push(
        {
          value: presentationTransform.translateY,
          id: presentationTransform.translateY.addListener(({ value }) => {
            currentTransform.current.presentationY = value
            scheduleTransform()
          }),
        },
        {
          value: presentationTransform.scale,
          id: presentationTransform.scale.addListener(({ value }) => {
            currentTransform.current.presentationScale = value
            scheduleTransform()
          }),
        },
        {
          value: presentationTransform.translateZ,
          id: presentationTransform.translateZ.addListener(({ value }) => {
            currentTransform.current.presentationZ = value
            scheduleTransform()
          }),
        },
        {
          value: presentationTransform.rotateZ,
          id: presentationTransform.rotateZ.addListener(({ value }) => {
            currentTransform.current.presentationRotateZ = value
            scheduleTransform()
          }),
        },
        {
          value: presentationTransform.tiltX,
          id: presentationTransform.tiltX.addListener(({ value }) => {
            currentTransform.current.presentationTiltX = value
            scheduleTransform()
          }),
        },
      )
    }

    applyTransform()
    setRotationReady(true)
    return () => {
      rotationX.removeListener(xListener)
      rotationY.removeListener(yListener)
      presentationListeners.forEach(listener => {
        listener.value.removeListener(listener.id)
      })
      if (rotationFrame.current != null) {
        cancelAnimationFrame(rotationFrame.current)
      }
    }
  }, [
    modelRoot,
    presentationTransform,
    rotationX,
    rotationY,
    transformManager,
  ])

  useEffect(() => {
    if (
      !rotationReady ||
      holderTextureUri == null ||
      readyHolderTextureUri !== holderTextureUri
    ) {
      return
    }
    const frame = requestAnimationFrame(() => onReady?.())
    return () => cancelAnimationFrame(frame)
  }, [
    holderTextureUri,
    onReady,
    readyHolderTextureUri,
    rotationReady,
  ])

  useEffect(() => {
    if (paused) {
      choreographer.stop()
    } else {
      choreographer.start()
    }
  }, [choreographer, paused])

  return (
    <FilamentView
      pointerEvents="none"
      enableTransparentRendering
      style={StyleSheet.absoluteFill}
    >
      <Camera
        cameraPosition={[
          0,
          0,
          interactive
            ? INTERACTIVE_CAMERA_Z
            : variant === 'one-time'
              ? 2.82
              : 2.62,
        ]}
        cameraTarget={[0, 0, 0]}
        focalLengthInMillimeters={28}
        near={0.1}
        far={10}
      />
      <Light
        type="directional"
        direction={[-0.28, -0.38, -0.88]}
        intensity={43_000}
        colorKelvin={6_150}
      />
      <Light
        type="directional"
        direction={[0.58, 0.06, -0.81]}
        intensity={17_000}
        colorKelvin={9_200}
      />
      {rotationReady ? (
        <ModelRenderer model={model}>
          <PortraitSelectionControls selectedPortrait={selectedPortrait} />
          <PassVariantControls variant={variant} />
          {holderTextureUri ? (
            <HolderNameTexture
              key={holderTextureUri}
              uri={holderTextureUri}
              onReady={() => setReadyHolderTextureUri(holderTextureUri)}
            />
          ) : null}
        </ModelRenderer>
      ) : null}
    </FilamentView>
  )
}

function CardMaterial({
  interactive,
  variant,
  rotationX,
  rotationY,
  holderTextureUri,
  selectedPortrait,
  isFlipped,
  presentationTransform,
  paused,
  onReady,
}: {
  interactive: boolean
  variant: 'permanent' | 'one-time'
  rotationX: Animated.Value
  rotationY: Animated.Value
  holderTextureUri: string | null
  selectedPortrait: PortraitId
  isFlipped: boolean
  presentationTransform?: NwordPassPresentationTransform
  paused: boolean
  onReady?: () => void
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {!interactive && !presentationTransform ? (
        <View style={[StyleSheet.absoluteFill, styles.loadingSurface]} />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          interactive && styles.interactiveSceneOverscan,
        ]}
      >
        <FilamentScene
          antiAliasing="FXAA"
          dithering="none"
          shadowing={false}
          screenSpaceRefraction={false}
          frameRateOptions={
            presentationTransform
              ? FILAMENT_PRESENTATION_FRAME_RATE_OPTIONS
              : FILAMENT_FRAME_RATE_OPTIONS
          }
          dynamicResolutionOptions={
            Platform.OS === 'android'
              ? FILAMENT_DYNAMIC_RESOLUTION
              : undefined
          }
          fallback={
            <View
              style={[
                StyleSheet.absoluteFill,
                presentationTransform
                  ? styles.transparentSurface
                  : styles.loadingSurface,
              ]}
            />
          }
        >
          <FilamentCardScene
            interactive={interactive}
            variant={variant}
            rotationX={rotationX}
            rotationY={rotationY}
            holderTextureUri={holderTextureUri}
            selectedPortrait={selectedPortrait}
            isFlipped={isFlipped}
            presentationTransform={presentationTransform}
            paused={paused}
            onReady={onReady}
          />
        </FilamentScene>
      </View>
    </View>
  )
}

export function NwordPassCard({
  holderName,
  variant,
  onShare,
  onReady,
  presentationTransform,
  paused = false,
  interactive = false,
  compact = false,
  style,
}: NwordPassCardProps) {
  const safeName = holderName.trim() || 'Guest'
  const cardRadius = compact ? 19 : 22
  const canFlip = interactive && variant === 'permanent' && onShare != null
  const rotationX = useRef(new Animated.Value(interactive ? REST_ROTATION[0] : 0)).current
  const rotationY = useRef(new Animated.Value(interactive ? REST_ROTATION[1] : 0)).current
  const cardScale = useRef(new Animated.Value(1)).current
  const latestRotation = useRef({
    x: interactive ? REST_ROTATION[0] : 0,
    y: interactive ? REST_ROTATION[1] : 0,
  })
  const gestureStart = useRef({ ...latestRotation.current })
  const idleAnimation = useRef<Animated.CompositeAnimation | null>(null)
  const portraitFlipFrame = useRef<number | null>(null)
  const flippedRef = useRef(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [backInteractive, setBackInteractive] = useState(false)
  const [selectedPortrait, setSelectedPortrait] =
    useState<PortraitId>('obama')
  const [holderTextureUri, setHolderTextureUri] = useState<string | null>(null)

  useEffect(() => {
    if (!interactive || variant !== 'permanent') return
    let cancelled = false

    AsyncStorage.getItem(PORTRAIT_STORAGE_KEY)
      .then(value => {
        if (!cancelled && value != null && isPortraitId(value)) {
          setSelectedPortrait(value)
        }
      })
      .catch(error => {
        console.warn('[NwordPass] Could not restore portrait selection:', error)
      })

    return () => {
      cancelled = true
    }
  }, [interactive, variant])

  useEffect(
    () => () => {
      if (portraitFlipFrame.current != null) {
        cancelAnimationFrame(portraitFlipFrame.current)
      }
    },
    [],
  )

  useEffect(() => {
    const xListener = rotationX.addListener(({ value }) => {
      latestRotation.current.x = value
    })
    const yListener = rotationY.addListener(({ value }) => {
      latestRotation.current.y = value
    })

    return () => {
      rotationX.removeListener(xListener)
      rotationY.removeListener(yListener)
    }
  }, [rotationX, rotationY])

  const stopIdle = useCallback(() => {
    idleAnimation.current?.stop()
    idleAnimation.current = null
  }, [])

  const startIdle = useCallback(() => {
    if (!interactive || flippedRef.current) return
    stopIdle()
    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rotationX, {
            toValue: -0.026,
            duration: 2_200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotationY, {
            toValue: -0.095,
            duration: 2_200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(rotationX, {
            toValue: 0.024,
            duration: 2_800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotationY, {
            toValue: 0.105,
            duration: 2_800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(rotationX, {
            toValue: REST_ROTATION[0],
            duration: 2_200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(rotationY, {
            toValue: REST_ROTATION[1],
            duration: 2_200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]),
    )
    idleAnimation.current = animation
    animation.start()
  }, [interactive, rotationX, rotationY, stopIdle])

  useEffect(() => {
    if (!interactive) return
    const timer = setTimeout(startIdle, 650)
    return () => {
      clearTimeout(timer)
      stopIdle()
    }
  }, [interactive, startIdle, stopIdle])

  const returnToRest = useCallback(() => {
    Animated.parallel([
      Animated.spring(rotationX, {
        toValue: REST_ROTATION[0],
        stiffness: 92,
        damping: 13,
        mass: 0.72,
        useNativeDriver: true,
      }),
      Animated.spring(rotationY, {
        toValue: REST_ROTATION[1],
        stiffness: 92,
        damping: 13,
        mass: 0.72,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) startIdle()
    })
  }, [rotationX, rotationY, startIdle])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          interactive &&
          !flippedRef.current &&
          Math.hypot(gesture.dx, gesture.dy) > 5,
        onPanResponderGrant: () => {
          stopIdle()
          rotationX.stopAnimation()
          rotationY.stopAnimation()
          gestureStart.current = { ...latestRotation.current }
        },
        onPanResponderMove: (_event, gesture) => {
          rotationX.setValue(
            clamp(
              gestureStart.current.x - gesture.dy * 0.0044,
              -MAX_X_ROTATION,
              MAX_X_ROTATION,
            ),
          )
          rotationY.setValue(
            clamp(
              gestureStart.current.y + gesture.dx * 0.0048,
              -MAX_Y_ROTATION,
              MAX_Y_ROTATION,
            ),
          )
        },
        onPanResponderRelease: returnToRest,
        onPanResponderTerminate: returnToRest,
        onShouldBlockNativeResponder: () => true,
      }),
    [
      interactive,
      returnToRest,
      rotationX,
      rotationY,
      stopIdle,
    ],
  )

  const toggleFlip = useCallback(() => {
    if (!canFlip) return
    const opening = !flippedRef.current
    stopIdle()
    rotationX.stopAnimation()
    rotationY.stopAnimation()
    flippedRef.current = opening
    setIsFlipped(opening)
    if (!opening) setBackInteractive(false)

    Animated.parallel([
      Animated.timing(rotationX, {
        toValue: opening ? -0.025 : REST_ROTATION[0],
        duration: 860,
        easing: Easing.bezier(0.18, 0.78, 0.18, 1),
        useNativeDriver: true,
      }),
      Animated.timing(rotationY, {
        toValue: opening ? FLIPPED_Y : REST_ROTATION[1],
        duration: 860,
        easing: Easing.bezier(0.18, 0.78, 0.18, 1),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: opening ? EXPANDED_SCALE : 1,
        stiffness: 104,
        damping: 15,
        mass: 0.78,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return
      if (opening) {
        setBackInteractive(true)
      } else {
        startIdle()
      }
    })
  }, [
    canFlip,
    cardScale,
    rotationX,
    rotationY,
    startIdle,
    stopIdle,
  ])

  const giftFromBack = useCallback(
    (event: GestureResponderEvent) => {
      event.stopPropagation()
      onShare?.()
    },
    [onShare],
  )

  const selectPortrait = useCallback(
    (portraitId: PortraitId, event: GestureResponderEvent) => {
      event.stopPropagation()
      setSelectedPortrait(portraitId)
      rotationX.stopAnimation()
      Animated.sequence([
        Animated.timing(rotationX, {
          toValue: -0.064,
          duration: 110,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(rotationX, {
          toValue: -0.025,
          stiffness: 250,
          damping: 17,
          mass: 0.62,
          useNativeDriver: true,
        }),
      ]).start()
      AsyncStorage.setItem(PORTRAIT_STORAGE_KEY, portraitId).catch(error => {
        console.warn('[NwordPass] Could not save portrait selection:', error)
      })
      if (portraitFlipFrame.current != null) {
        cancelAnimationFrame(portraitFlipFrame.current)
      }
      portraitFlipFrame.current = requestAnimationFrame(() => {
        portraitFlipFrame.current = null
        if (flippedRef.current) toggleFlip()
      })
    },
    [rotationX, toggleFlip],
  )

  const accessibilityLabel = isFlipped
    ? `Back of the N-Word Pass for ${safeName}`
    : variant === 'one-time'
      ? `One-song N-Word Pass for ${safeName}`
      : `N-Word Pass for ${safeName}`

  return (
    <>
      <Animated.View
        style={[
          styles.root,
          style,
          isFlipped && styles.rootExpanded,
          { transform: [{ scale: cardScale }] },
        ]}
      >
        <View
          {...(interactive ? panResponder.panHandlers : {})}
          style={styles.cardShadow}
        >
          <View
            style={[
              styles.card,
              {
                borderRadius: cardRadius,
                backgroundColor:
                  interactive || presentationTransform
                    ? 'transparent'
                    : '#080A0E',
                overflow: interactive ? 'visible' : 'hidden',
              },
            ]}
          >
            <CardMaterial
              interactive={interactive}
              variant={variant}
              rotationX={rotationX}
              rotationY={rotationY}
              holderTextureUri={holderTextureUri}
              selectedPortrait={selectedPortrait}
              isFlipped={isFlipped}
              presentationTransform={presentationTransform}
              paused={paused}
              onReady={onReady}
            />
            {canFlip ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  isFlipped
                    ? `Show the front of the N-Word Pass for ${safeName}`
                    : accessibilityLabel
                }
                accessibilityHint={
                  isFlipped
                    ? 'Tap outside the portrait and gift controls to return to the front'
                    : 'Tap to flip the pass and reveal portrait choices'
                }
                disabled={isFlipped && !backInteractive}
                onPress={toggleFlip}
                style={styles.flipHitTarget}
              />
            ) : null}
            {backInteractive ? (
              <View
                pointerEvents="box-none"
                style={styles.backPortraitHitTargetRow}
              >
                {PORTRAIT_OPTIONS.map(option => {
                  const selected = option.id === selectedPortrait
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${option.label} on the front of your pass`}
                      accessibilityState={{ selected }}
                      onPress={event => selectPortrait(option.id, event)}
                      hitSlop={{ top: 10, bottom: 12, left: 2, right: 2 }}
                      pressRetentionOffset={{
                        top: 24,
                        bottom: 24,
                        left: 12,
                        right: 12,
                      }}
                      style={[
                        styles.backPortraitHitTarget,
                        { left: option.backHitLeft },
                      ]}
                    />
                  )
                })}
              </View>
            ) : null}
            {backInteractive && onShare ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Gift one use of your N-Word Pass"
                onPress={giftFromBack}
                style={styles.backGiftHitTarget}
              />
            ) : null}
          </View>
        </View>
      </Animated.View>

      <HolderNameComposer
        holderName={safeName}
        variant={variant}
        onTextureReady={setHolderTextureUri}
      />
    </>
  )
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    zIndex: 1,
  },
  rootExpanded: {
    zIndex: 40,
    elevation: 40,
  },
  cardShadow: {
    width: '100%',
    aspectRatio: CARD_RATIO,
    shadowColor: '#000000',
    shadowOpacity: 0.38,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 15 },
    elevation: 15,
  },
  card: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#080A0E',
  },
  loadingSurface: {
    backgroundColor: '#090C11',
  },
  transparentSurface: {
    backgroundColor: 'transparent',
  },
  interactiveSceneOverscan: {
    top: '-9%',
    right: '-9%',
    bottom: '-9%',
    left: '-9%',
  },
  flipHitTarget: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  backPortraitHitTargetRow: {
    position: 'absolute',
    left: '3.5%',
    right: '3.5%',
    top: '14%',
    height: '55%',
    zIndex: 10,
  },
  backPortraitHitTarget: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '25%',
  },
  backGiftHitTarget: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    top: '70%',
    height: '24%',
    zIndex: 10,
  },
  textureComposer: {
    position: 'absolute',
    left: -4_096,
    top: 0,
  },
})
