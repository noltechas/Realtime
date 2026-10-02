import React, { useEffect, useRef } from 'react'
import { Animated, ScrollView, Text, View } from 'react-native'
import type { GenreTabsProps } from '../../../types'
import { Awning, BODY_700, Gloss, MUTED, PINK, PLUM, Press, STRIPES, SUN, Twinkle, WHITE, body, pinkDrop, useMeasured } from './_barbie'

// Barbie genre selector: a STREET OF SHOPFRONTS. Every genre is a little shop
// under its own candy-striped awning, all hung from one white roofline that
// runs the length of the street, like a row of Palm Springs storefronts. The
// genre you're browsing is the shop that's OPEN: its awning is let down in
// Barbie pink (it unrolls with a bounce when you choose it), its sign is lit
// pink, and a twinkle winks over it. The others are furled in their own pastel
// stripes, signs white. The song count is on each sign.

const AWN_H = 14 + 3 + 12 + 6

export function GenreTabs({ list, counts, value, onChange }: GenreTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // A ScrollView shrinks by default and the grid below takes every spare
      // pixel, which would clip the signs. Hold it at its content height.
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 }}
    >
      <View>
        {/* the roofline: one white beam the whole street hangs from */}
        <View style={[pinkDrop, { position: 'absolute', left: -8, right: -8, top: 0, height: 8, borderRadius: 4, backgroundColor: WHITE, shadowOpacity: 0.16, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }]} />
        <View style={{ flexDirection: 'row', gap: 7, paddingTop: 7 }}>
          {list.map((genre, i) => (
            <Shopfront key={genre} label={genre} count={counts[genre] ?? 0} active={genre === value} stripes={STRIPES[i % STRIPES.length]} onPress={() => onChange(genre)} />
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

function Shopfront({ label, count, active, stripes, onPress }: { label: string; count: number; active: boolean; stripes: [string, string]; onPress: () => void }) {
  const [size, onLayout] = useMeasured()
  const unroll = useRef(new Animated.Value(1)).current
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    // Opening a shop lets its awning down with a bounce; the one that closes
    // simply furls (its valance is drawn short).
    if (active) {
      unroll.setValue(0)
      Animated.spring(unroll, { toValue: 1, stiffness: 240, damping: 9, mass: 0.7, useNativeDriver: true }).start()
    }
  }, [active, unroll])

  return (
    <Press onPress={onPress} amount={0.8} hitSlop={{ top: 6, bottom: 6 }} accessibilityLabel={`${label}, ${count} songs`} accessibilityState={{ selected: active }}>
      <View onLayout={onLayout} style={{ minWidth: 76 }}>
        <View style={{ height: AWN_H }}>
          {size ? (
            <Animated.View
              style={{
                transformOrigin: 'top',
                transform: [{ scaleY: unroll.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) }],
              }}
            >
              <Awning width={size.w} canopy={14} valance={active ? 12 : 6} scallop={6} stripes={active ? [PINK, WHITE] : stripes} stripeW={8} />
            </Animated.View>
          ) : null}
        </View>
        <Gloss
          tone={active ? 'pink' : 'white'}
          radius={11}
          rim={2}
          shadow={active}
          glint={active}
          style={{ marginTop: active ? 2 : -4 }}
          contentStyle={{ paddingHorizontal: 12, paddingTop: 5, paddingBottom: 6, alignItems: 'center' }}
        >
          <Text numberOfLines={1} style={{ fontFamily: BODY_700, fontSize: 13, color: active ? WHITE : PLUM }}>
            {label}
          </Text>
          <Text style={body(10.5, active ? '#FFE3F0' : MUTED, 600, { marginTop: -2 })}>{count} songs</Text>
        </Gloss>
        {active ? (
          <View pointerEvents="none" style={{ position: 'absolute', right: -6, top: AWN_H - 6 }}>
            <Twinkle size={16} color={SUN} period={2600} />
          </View>
        ) : null}
      </View>
    </Press>
  )
}
