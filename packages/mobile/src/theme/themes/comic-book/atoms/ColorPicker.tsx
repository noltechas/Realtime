import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { UNIVERSAL_SINGER_COLORS } from '@karaoke/shared'
import { COMIC_BOOK_MOBILE } from '../../../tokens'
import type { ColorPickerProps } from '../../../types'
import { INK, YELLOW, Burst } from './_comic'

// Comic-Book color picker. Swatches are inked dots; the selected one is punched
// onto a yellow STARBURST so it reads as the "chosen" pop-art spot color.
//
// A wrapping grid rather than a horizontal scroller — a scroller cut the last
// dots off at the screen edge. CELL + gap fits seven per row, so 13 lands as a
// clean 7 + 6. The burst is bigger than its cell and bleeds into the gutters,
// which is why the gaps are wider than the dots need: only one dot is ever
// selected, so the bleed never collides with a neighbour.
const t = COMIC_BOOK_MOBILE

const CELL = 40
const SWATCH = 34
const BURST = 54

export function ColorPicker({ value, onChange, label = 'Your Color' }: ColorPickerProps) {
  return (
    <View>
      <Text
        style={{
          fontFamily: t.fontDisplay,
          fontSize: 12,
          letterSpacing: 2,
          color: INK,
          textTransform: 'uppercase',
          marginBottom: 10,
          paddingHorizontal: 24,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: 24,
          paddingVertical: 8,
          flexDirection: 'row',
          flexWrap: 'wrap',
          columnGap: 10,
          rowGap: 16,
        }}
      >
        {UNIVERSAL_SINGER_COLORS.map((c, i) => {
          const selected = i === value
          return (
            <Pressable
              key={c.color}
              onPress={() => onChange(i)}
              hitSlop={6}
              style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
            >
              {selected ? (
                <View
                  style={{
                    position: 'absolute',
                    top: (CELL - BURST) / 2,
                    left: (CELL - BURST) / 2,
                    width: BURST,
                    height: BURST,
                  }}
                >
                  <Burst width={BURST} height={BURST} fill={YELLOW} kind="burst" strokeWidth={3} />
                </View>
              ) : null}
              <View
                style={{
                  width: SWATCH,
                  height: SWATCH,
                  borderRadius: 999,
                  backgroundColor: c.color,
                  borderWidth: selected ? 3 : 2.5,
                  borderColor: INK,
                }}
              />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
