import React from 'react'
import {
  Pressable,
  View,
  Text,
  type ViewStyle,
  type TextStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { NEO_BRUTAL_MOBILE } from '../../../tokens'
import type { ReactionCellProps } from '../../../types'

// Neo-brutal reaction cell. Lifted from the default branch of StageScreen's
// cellStyle()/cellEditStyle() builders — white surface, 3px hard black border,
// hard offset shadow, classic slide-into-shadow press feedback. The edit
// chip in the top-right corner reuses the lock-badge yellow.
const t = NEO_BRUTAL_MOBILE

const OFFSET_SHADOW = {
  shadowColor: t.accentGlowColor,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 4,
}

const PRESSED: ViewStyle = {
  transform: [{ translateX: 2 }, { translateY: 2 }],
  shadowOpacity: 0,
  elevation: 0,
}

const cellStyle: ViewStyle = {
  flex: 1,
  backgroundColor: t.white,
  borderWidth: t.cardBorderWidth,
  borderColor: t.black,
  borderRadius: t.radius,
  padding: 12,
  ...OFFSET_SHADOW,
}

const cellIconAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}

const cellLabelStyle: TextStyle = {
  textAlign: 'center',
  marginTop: 8,
  fontFamily: t.fontDisplay,
  fontWeight: '800',
  fontSize: 13,
  color: t.black,
  letterSpacing: 0.3,
  textTransform: 'uppercase',
}

const cellEditStyle: ViewStyle = {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 24,
  height: 24,
  borderRadius: 6,
  borderWidth: 2,
  borderColor: t.black,
  backgroundColor: t.vividYellow,
  alignItems: 'center',
  justifyContent: 'center',
}

export function ReactionCell({
  onPress,
  onEditPress,
  disabled,
  icon,
  label,
}: ReactionCellProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        cellStyle,
        pressed ? PRESSED : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={cellIconAreaStyle}>{icon}</View>
        <Text style={cellLabelStyle}>{label}</Text>
      </View>
      {onEditPress ? (
        <Pressable onPress={onEditPress} hitSlop={6} style={cellEditStyle}>
          <Ionicons name="create-outline" size={12} color={t.black} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}
