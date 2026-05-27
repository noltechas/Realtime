import React from 'react'
import { View, Text, Pressable } from 'react-native'
import Svg, { Path, G, Ellipse, Circle } from 'react-native-svg'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../../ThemeContext'
import type { ReactionCellProps } from '../../../types'

// Zen reaction cell — an origami-fold card:
//   • Background is washi paper with a triangular "fold" in the top-right
//     corner (a darker triangle suggesting the paper is folded down) revealing
//     a vermillion under-layer.
//   • Top-left has a tiny sakura petal stamp.
//   • Press dims, no bounce — origami paper does not bounce.
export function ReactionCell({
  onPress,
  onEditPress,
  disabled,
  icon,
  label,
}: ReactionCellProps) {
  const { tokens } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          flex: 1,
          backgroundColor: '#F0E6D3',
          borderWidth: 1,
          borderColor: '#2a1f15',
          padding: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 1, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 3,
        },
        pressed ? { opacity: 0.85 } : null,
        disabled ? { opacity: 0.4 } : null,
      ]}
    >
      {/* Origami top-right fold — vermillion triangle behind, dark fold edge */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 28,
          height: 28,
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 28 28">
          {/* Under-layer (visible through fold) */}
          <Path d="M 28 0 L 0 0 L 28 28 Z" fill="#D4442A" />
          {/* Folded flap on top */}
          <Path
            d="M 0 0 L 28 0 L 28 28 Z"
            fill="#E8DBC0"
            stroke="#2a1f15"
            strokeWidth={0.6}
          />
          {/* Fold shadow */}
          <Path
            d="M 0 0 L 28 28"
            stroke="#2a1f15"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </Svg>
      </View>

      {/* Sakura stamp top-left */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 12,
          height: 12,
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 12 12">
          <G transform="translate(6 6)">
            {[0, 72, 144, 216, 288].map((a) => (
              <G key={a} transform={`rotate(${a})`}>
                <Ellipse cx={0} cy={-3} rx={1.8} ry={2.4} fill="#F4B6C2" stroke="#A85E76" strokeWidth={0.3} />
              </G>
            ))}
            <Circle cx={0} cy={0} r={1} fill="#D4B85A" />
          </G>
        </Svg>
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 8,
        }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <Text
          style={{
            textAlign: 'center',
            marginTop: 8,
            fontFamily: tokens.fontDisplay,
            fontWeight: '700',
            fontSize: 13,
            color: '#1a1814',
            letterSpacing: 0.6,
          }}
        >
          {label}
        </Text>
      </View>

      {onEditPress ? (
        <Pressable
          onPress={onEditPress}
          hitSlop={6}
          style={{
            position: 'absolute',
            top: 6,
            right: 32,
            width: 22,
            height: 22,
            borderRadius: 3,
            borderWidth: 1,
            borderColor: '#7A2616',
            backgroundColor: '#D4442A',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="create-outline" size={12} color="#F0E6D3" />
        </Pressable>
      ) : null}
    </Pressable>
  )
}
