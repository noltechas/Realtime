import React from 'react'
import { View, Text, Pressable, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { hashKey } from '../../../helpers'
import type { ToggleBoxProps } from '../../../types'

// Sketch toggle — paper-rotated card with a hand-drawn checkbox. Active state
// fills with paper-yellow (post-it) and the checkmark gets a soft graphite
// stroke so it reads as a marker tick rather than a digital check.
export function StageToggleBox({ label, on, onPress }: ToggleBoxProps) {
  const { tokens } = useTheme()
  const hash = hashKey(label)
  const angle = (hash % 2 === 0 ? -1 : 1) * (1 + (hash % 3) * 0.4)

  const activeBg = '#FEF9DA'
  const idleBg = '#FDFBF7'

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        toggleBtnStyle(angle),
        { backgroundColor: on ? activeBg : idleBg },
        pressed
          ? {
              transform: [{ rotate: `${angle}deg` }, { translateX: 2 }, { translateY: 2 }] as any,
              shadowOpacity: 0,
              elevation: 0,
            }
          : null,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={[
            toggleCheckBoxStyle,
            { backgroundColor: on ? '#FEF9DA' : 'transparent' },
          ]}
        >
          {on ? <Ionicons name="checkmark" size={16} color="rgba(0,0,0,0.7)" /> : null}
        </View>
        <Text style={toggleLabelStyle(tokens.fontDisplay, tokens.black)}>{label}</Text>
      </View>
    </Pressable>
  )
}

function toggleBtnStyle(angle: number): ViewStyle {
  return {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 2,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ rotate: `${angle}deg` }] as any,
  }
}

const toggleCheckBoxStyle: ViewStyle = {
  width: 22,
  height: 22,
  borderTopLeftRadius: 2,
  borderTopRightRadius: 5,
  borderBottomLeftRadius: 4,
  borderBottomRightRadius: 2,
  borderWidth: 1.5,
  borderColor: 'rgba(0,0,0,0.5)',
  alignItems: 'center',
  justifyContent: 'center',
  transform: [{ rotate: '-2deg' }] as any,
}

function toggleLabelStyle(font: string, color: string): TextStyle {
  return {
    fontFamily: font,
    fontWeight: '800',
    fontSize: 13,
    color,
    letterSpacing: 0.3,
  }
}
