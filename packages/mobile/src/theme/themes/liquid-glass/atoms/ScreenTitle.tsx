import React from 'react'
import { Text, View } from 'react-native'
import type { ScreenTitleProps } from '../../../types'
import { LIFT, sf } from './_glass'

// Liquid Glass screen heading: a large title, the system way.
export function ScreenTitle({ title }: ScreenTitleProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[sf(36, '800', '#FFFFFF', { letterSpacing: -0.9 }), LIFT]}>{title}</Text>
    </View>
  )
}
