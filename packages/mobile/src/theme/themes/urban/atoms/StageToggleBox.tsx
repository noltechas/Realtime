import React from 'react'
import { Pressable, View, Text, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hexToRgba } from '../../../helpers'
import type { ToggleBoxProps } from '../../../types'

// Urban StageToggleBox — a skewed parallelogram row containing a sharp
// checkbox + uppercase label. The inner row is counter-skewed so the check
// mark and label stay upright; the box's right + bottom toxic-green borders
// supply the structural drop shadow that the rest of the urban theme uses.
export function UrbanStageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const unskew: { skewX: string }[] = [{ skewX: '8deg' }]

  const activeBg = hexToRgba(tokens.accentA, 0.18) ?? 'rgba(212,255,0,0.18)'
  const idleBg = 'transparent'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        boxStyle(tokens),
        { backgroundColor: on ? activeBg : idleBg },
        pressed ? { opacity: 0.85 } : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, transform: unskew }}>
        <View
          style={[
            checkBoxStyle(tokens),
            { backgroundColor: on ? tokens.accentA : 'transparent' },
          ]}
        >
          {on ? <Ionicons name="checkmark" size={16} color={tokens.appBg} /> : null}
        </View>
        <Text style={labelStyle(tokens)}>{label}</Text>
      </View>
    </Pressable>
  )
}

function boxStyle(t: ReturnType<typeof useTheme>['tokens']): ViewStyle {
  return {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: t.dimBorder,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderRightColor: t.accentA,
    borderBottomColor: t.accentA,
    transform: [{ skewX: '-8deg' }],
  }
}
function checkBoxStyle(t: ReturnType<typeof useTheme>['tokens']): ViewStyle {
  return {
    width: 22,
    height: 22,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.accentA,
    alignItems: 'center',
    justifyContent: 'center',
  }
}
function labelStyle(t: ReturnType<typeof useTheme>['tokens']): TextStyle {
  return {
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 13,
    color: t.black,
    letterSpacing: 2,
    textTransform: 'uppercase',
  }
}
