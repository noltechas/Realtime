import React from 'react'
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../../ThemeContext'
import type { ProfilePortraitProps } from '../../../types'
import { CameraGlyph, useAvatarActionSheet } from '../../../../components/AvatarPicker'
import {
  DYES,
  INK,
  INK_LINE,
  LIFT,
  Plate,
  Sunburst,
  WARM,
  pouredRadii,
  typeOn,
  useLift,
  useSpin,
} from './_glass'

// ── The billed portrait ─────────────────────────────────────────────────────
//
// The guest's photo, mounted the way this theme mounts everything else: as a
// printed handbill. A cream poster plate with poured corners and a heavy ink
// keyline, one hard-edged disc of the guest's OWN singer colour breathing behind
// it, and the photo set into a turning wheel of dye for a mat.
//
// It replaces the shared staging (screens/profile/PortraitSpotlight), which draws
// concentric halo rings and a soft coloured spill around a ring-bordered circle.
// That treatment is well-judged for a glow theme and it is the one thing this
// theme has no vocabulary for: nothing else in the psychedelic app is a floating
// object with a soft light around it — every surface is an opaque plate with ink
// line work. Over the liquid-light footage the rings also had nothing to sit on,
// so the portrait read as a sticker dropped onto a moving background rather than
// as something printed and pasted up.
//
// Where the guest's colour goes, and why it goes there twice: the mat is the
// full dye wheel, which is the theme's loudest device but says nothing about WHO
// this is, so identity moves to the plate's breathing disc behind the medallion
// and to the camera sticker's fill. Both are large, flat and unmissable.
//
// THE WHEEL TURNS; THE PORTRAIT DOES NOT. Rule 3 of the theme's vocabulary is
// that everything breathes visibly, and the plate's discs and the mat's rotation
// both do. The photo itself holds still on purpose — it is the subject, and the
// same reasoning applies to it as to the lettering on the "You're up" callout:
// a face that is mid-scale whenever you look at it reads as a glitch.

/** The poster plate. */
const PLATE = 204
/** The dye wheel's outer diameter — the mat. */
const MAT = 152
/** Width of the visible wheel ring around the photo. */
const MAT_RING = 13
const PHOTO = MAT - MAT_RING * 2

export function PsychedelicProfilePortrait({
  picture,
  initial,
  color,
  onChange,
}: ProfilePortraitProps) {
  const { tokens } = useTheme()
  const openPhotoMenu = useAvatarActionSheet({ picture, onChange })
  // 52s per revolution. The mat is a 13pt ring, so its wedges cross a short arc
  // and a quicker spin reads as a loading spinner rather than as a wheel.
  const spin = useSpin(52000)
  const plate = useLift(0.6)
  const sticker = useLift(1)
  const stickerInk = typeOn(color)
  // Both of these carry a STATIC TILT AND a press scale, and React Native honours
  // only the last `transform` key on a style — so the two have to be composed into
  // one array rather than layered as separate styles, or the press does nothing.
  // Built from `useLift`'s raw `press` value instead of its ready-made transform
  // for that reason.
  const plateTilt = [
    { rotate: '-1.6deg' },
    { scale: plate.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.987] }) },
  ]
  const stickerTilt = [
    { rotate: '7deg' },
    { scale: sticker.press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
  ]

  return (
    <View style={{ width: PLATE, height: PLATE, alignSelf: 'center' }}>
      <Pressable
        onPress={openPhotoMenu}
        onPressIn={plate.onPressIn}
        onPressOut={plate.onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        <Plate
          dye={WARM}
          seed="profile-portrait"
          // The guest's colour as the big breathing disc. `Plate` derives the
          // small one from it, so the plate still gets a three-colour balance.
          partner={color}
          bigDisc={198}
          smallDisc={104}
          phaseIndex={0}
          radii={pouredRadii('profile-portrait', 28, 12)}
          // Pasted up by hand, not laid out on a grid. Small, because the plate is
          // square and a square telegraphs its own rotation far more than a row does.
          style={{ transform: plateTilt }}
          contentStyle={{
            width: PLATE,
            height: PLATE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: MAT,
              height: MAT,
              borderRadius: MAT / 2,
              overflow: 'hidden',
              backgroundColor: WARM,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* The mat. A full sunburst clipped to the circle: the wheel is
                inscribed in its own square, so rotating it never uncovers an
                edge. */}
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <Sunburst size={MAT + 2} colors={DYES} spokes={24} />
            </Animated.View>

            {/* The photo, printed over the wheel. Cream underneath so a
                transparent PNG doesn't show wedges through the face. */}
            <View
              style={{
                width: PHOTO,
                height: PHOTO,
                borderRadius: PHOTO / 2,
                borderWidth: INK_LINE,
                borderColor: INK,
                backgroundColor: WARM,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {picture ? (
                <Image
                  source={{ uri: picture }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : initial ? (
                <Text
                  style={{
                    fontFamily: tokens.fontDisplay,
                    fontSize: Math.round(PHOTO * 0.46),
                    lineHeight: Math.round(PHOTO * 0.56),
                    color: INK,
                  }}
                >
                  {initial}
                </Text>
              ) : (
                <View
                  style={{
                    width: Math.round(PHOTO * 0.42),
                    height: Math.round(PHOTO * 0.42),
                    borderRadius: 999,
                    borderWidth: 3,
                    borderStyle: 'dashed',
                    borderColor: INK,
                    opacity: 0.4,
                  }}
                />
              )}
            </View>

            {/* Keyline on the mat's rim, last so it rides over the wedges. */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: MAT / 2, borderWidth: INK_LINE, borderColor: INK },
              ]}
            />
          </View>
        </Plate>
      </Pressable>

      {/* The camera mark as a dye sticker slapped over the plate's corner —
          deliberately NOT a round badge with a soft shadow, which is the one
          shape this theme never draws. Outside the Plate so it can hang past
          the keyline; the plate clips its own contents. */}
      <Pressable
        onPress={openPhotoMenu}
        onPressIn={sticker.onPressIn}
        onPressOut={sticker.onPressOut}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={{ position: 'absolute', right: -2, bottom: 4 }}
      >
        <Animated.View
          style={[
            LIFT,
            pouredRadii('profile-camera', 15, 7),
            {
              backgroundColor: color,
              borderWidth: INK_LINE,
              borderColor: INK,
              paddingHorizontal: 13,
              paddingVertical: 11,
              transform: stickerTilt,
            },
          ]}
        >
          <CameraGlyph color={stickerInk} />
        </Animated.View>
      </Pressable>
    </View>
  )
}
