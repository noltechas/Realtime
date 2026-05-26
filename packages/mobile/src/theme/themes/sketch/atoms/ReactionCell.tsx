import React from 'react'
import { View, Text, Pressable, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import { sketchWobble, sketchAngle } from '../../../helpers'
import type { ReactionCellProps } from '../../../types'

// Sketch reaction cell — paper background, hand-drawn rotation per label, soft
// drop shadow. The edit affordance (when present) lives in the top-right
// corner with its own counter-rotation so the pencil icon stays upright.
export function ReactionCell({
  onPress,
  onEditPress,
  disabled,
  icon,
  label,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const angle = sketchAngle(label)
  const unskew = [{ rotate: `${-angle}deg` }]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        cellStyle(angle),
        pressed
          ? {
              transform: [
                { rotate: `${angle}deg` },
                { translateX: 2 },
                { translateY: 2 },
                ...sketchWobble(label),
              ] as any,
              shadowOpacity: 0,
              elevation: 0,
            }
          : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: unskew as any }}>
        <View style={cellIconAreaStyle}>{icon}</View>
        <Text style={cellLabelStyle(tokens.fontDisplay, tokens.black)}>{label}</Text>
      </View>
      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          hitSlop={6}
          style={[cellEditStyle, { transform: unskew as any }]}
        >
          <Ionicons name="create-outline" size={12} color={tokens.black} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

function cellStyle(angle: number): ViewStyle {
  return {
    flex: 1,
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 1,
    transform: [{ rotate: `${angle}deg` }] as any,
  }
}

const cellIconAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}

function cellLabelStyle(font: string, color: string): TextStyle {
  return {
    textAlign: 'center',
    marginTop: 8,
    fontFamily: font,
    fontWeight: '800',
    fontSize: 13,
    color,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  }
}

const cellEditStyle: ViewStyle = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderTopLeftRadius: 2,
  borderTopRightRadius: 7,
  borderBottomLeftRadius: 6,
  borderBottomRightRadius: 3,
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.18)',
  backgroundColor: '#FEF9DA',
  alignItems: 'center',
  justifyContent: 'center',
}
