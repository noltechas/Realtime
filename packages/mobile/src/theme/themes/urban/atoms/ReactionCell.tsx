import React from 'react'
import { View, Text, Pressable, type ViewStyle, type TextStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import type { ReactionCellProps } from '../../../types'

// Urban ReactionCell — same skewed parallelogram + drop-shadow treatment as
// the SongCard / QueueRow, scaled to grid-cell proportions. Inner icon area
// and label are counter-skewed (skewX +8deg) so emoji and text glyphs stay
// upright. The "edit" affordance in the top-right corner is positioned in
// post-skew screen space, so it also gets a counter-skew.
export function UrbanReactionCell({
  label,
  icon,
  onPress,
  onEditPress,
  disabled,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  const unskew: { skewX: string }[] = [{ skewX: '8deg' }]

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        cellStyle(tokens),
        pressed ? { opacity: 0.85 } : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: unskew }}>
        <View style={cellIconAreaStyle}>{icon}</View>
        <Text style={cellLabelStyle(tokens)}>{label}</Text>
      </View>
      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          hitSlop={6}
          style={[cellEditStyle(tokens), { transform: unskew }]}
        >
          <Ionicons name="create-outline" size={12} color={tokens.black} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

function cellStyle(t: ReturnType<typeof useTheme>['tokens']): ViewStyle {
  return {
    flex: 1,
    backgroundColor: t.creamDark,
    borderWidth: 2,
    borderColor: t.dimBorder,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderRightColor: t.accentA,
    borderBottomColor: t.accentA,
    transform: [{ skewX: '-8deg' }],
    padding: 12,
  }
}
const cellIconAreaStyle: ViewStyle = {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
}
function cellLabelStyle(t: ReturnType<typeof useTheme>['tokens']): TextStyle {
  return {
    textAlign: 'center',
    marginTop: 8,
    fontFamily: t.fontDisplay,
    fontWeight: '800',
    fontSize: 13,
    color: t.black,
    letterSpacing: 2,
    textTransform: 'uppercase',
  }
}
function cellEditStyle(t: ReturnType<typeof useTheme>['tokens']): ViewStyle {
  return {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: t.accentA,
    backgroundColor: 'rgba(212,255,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
