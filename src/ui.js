import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { C, STATUS, FLAG_COLORS } from './config';

export function Chip({ label, active, onPress, color }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.chip,
        active && { backgroundColor: color || C.sea, borderColor: color || C.sea },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
    >
      <Text style={[s.chipText, active && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

export function StatusBadge({ status, t, large }) {
  const st = STATUS[status] || STATUS.unknown;
  return (
    <View style={[s.badge, { backgroundColor: st.color }, large && s.badgeLarge]}>
      <Text style={[s.badgeText, large && { fontSize: 16 }]}>
        {st.emoji} {t.status[status] || t.status.unknown}
      </Text>
    </View>
  );
}

export function FlagDot({ flag, size = 14 }) {
  if (!flag) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <View style={{ width: 2, height: size + 4, backgroundColor: '#3B2A1A' }} />
      <View
        style={{
          width: size,
          height: size * 0.75,
          backgroundColor: FLAG_COLORS[flag],
          marginBottom: size * 0.45,
          borderTopRightRadius: 2,
          borderBottomRightRadius: 2,
          opacity: flag === 'none' ? 0.5 : 1,
        }}
      />
    </View>
  );
}

export function minutesAgo(iso) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeLarge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  badgeText: { color: C.white, fontWeight: '700', fontSize: 13 },
});
