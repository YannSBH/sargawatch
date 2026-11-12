import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { C, STATUS, FORECAST } from './config';

// Légende de la carte : ronds pleins = signalé sur place, ronds en pointillés = prévision Météo-France
export default function Legend({ t }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Pressable style={[st.box, st.button]} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={st.buttonText}>ⓘ {t.legend}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable style={st.box} onPress={() => setOpen(false)} accessibilityRole="button">
      <View style={st.head}>
        <Text style={st.title}>{t.legend}</Text>
        <Text style={st.close}>✕</Text>
      </View>
      <Text style={st.section}>{t.legendObserved}</Text>
      {['beautiful', 'ok', 'some', 'heavy', 'closed', 'unknown'].map((k) => (
        <View key={k} style={st.row}>
          <View style={[st.dot, { backgroundColor: STATUS[k].color }]}>
            <Text style={st.emoji}>{STATUS[k].emoji}</Text>
          </View>
          <Text style={st.label}>{t.status[k]}</Text>
        </View>
      ))}
      <Text style={[st.section, { marginTop: 8 }]}>{t.legendForecast}</Text>
      {['low', 'medium', 'high'].map((k) => (
        <View key={k} style={st.row}>
          <View style={[st.dot, st.dashed, { backgroundColor: FORECAST[k].color + '99' }]}>
            <Text style={st.emoji}>🛰️</Text>
          </View>
          <Text style={st.label}>{t.forecastRisk[k]}</Text>
        </View>
      ))}
    </Pressable>
  );
}

const st = StyleSheet.create({
  box: {
    position: 'absolute', left: 12, bottom: 12, backgroundColor: C.white, borderRadius: 14,
    padding: 12, maxWidth: 260, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  button: { paddingVertical: 8, paddingHorizontal: 12 },
  buttonText: { fontSize: 14, fontWeight: '700', color: C.seaDark },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '800', color: C.ink },
  close: { fontSize: 14, color: C.muted, paddingLeft: 12 },
  section: { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 4, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  dot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.white,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  dashed: { borderStyle: 'dashed', borderColor: '#33454D' },
  emoji: { fontSize: 10 },
  label: { fontSize: 13, color: C.ink, flexShrink: 1 },
});
