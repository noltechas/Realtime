import React from 'react'
import { View, Text } from 'react-native'
import { useTheme } from '../theme/ThemeContext'

interface PillProps {
  label: string
  color?: string
  textColor?: string
}

export function Pill({ label, color, textColor }: PillProps) {
  const { tokens, styles } = useTheme()
  return (
    <View style={[styles.pill, color ? { backgroundColor: color } : null]}>
      <Text style={[styles.pillText, textColor ? { color: textColor } : null]}>
        {label}
      </Text>
    </View>
  )
}
