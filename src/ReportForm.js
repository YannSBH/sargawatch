import React, { useState } from 'react';
import {
  Modal, View, Text, ScrollView, Pressable, TextInput, Image, StyleSheet, ActivityIndicator, Alert, Switch,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C, FLAG_COLORS, STATUS } from './config';
import { Chip } from './ui';
import { sendReport } from './api';

const SARG_COLORS = [STATUS.ok.color, STATUS.some.color, STATUS.heavy.color, STATUS.closed.color];

export default function ReportForm({ visible, beach, t, lang, onClose, onSent }) {
  const [sarg, setSarg] = useState(null);
  const [beautiful, setBeautiful] = useState(false);
  const [flag, setFlag] = useState(null);
  const [water, setWater] = useState(null);
  const [sea, setSea] = useState(null);
  const [smell, setSmell] = useState(false);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setSarg(null); setBeautiful(false); setFlag(null); setWater(null); setSea(null);
    setSmell(false); setNote(''); setPhoto(null);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(t.photoPerm);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return pickPhoto();
    const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0].uri);
  };

  const submit = async () => {
    if (sarg === null && !flag && !beautiful && !water && !sea) return Alert.alert(t.needSomething);
    setBusy(true);
    try {
      await sendReport(
        {
          beach_id: beach.beach_id,
          sargassum_level: sarg,
          beautiful: beautiful || null,
          flag,
          water,
          sea,
          smell: smell || null,
          note: note.trim() ? note.trim().slice(0, 280) : null,
          lang,
        },
        photo
      );
      reset();
      onSent?.();
      Alert.alert(t.thanks);
    } catch (e) {
      Alert.alert(t[e.message] || t.error);
    } finally {
      setBusy(false);
    }
  };

  if (!beach) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={st.header}>
        <Pressable onPress={onClose} hitSlop={12}><Text style={st.cancel}>{t.cancel}</Text></Pressable>
        <Text style={st.headerTitle} numberOfLines={1}>{beach.name}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        <Text style={st.title}>{t.reportTitle}</Text>

        <View style={st.beautifulBox}>
          <Text style={st.label}>{t.beautifulQ}</Text>
          <Chip
            label={t.beautifulYes}
            active={beautiful}
            color={STATUS.beautiful.color}
            onPress={() => {
              const v = !beautiful;
              setBeautiful(v);
              if (v && sarg === null) setSarg(0);
            }}
          />
        </View>

        <Text style={st.label}>{t.sargassum}</Text>
        <View style={st.row}>
          {t.sargLevels.map((l, i) => (
            <Chip key={i} label={l} active={sarg === i} color={SARG_COLORS[i]}
              onPress={() => { setSarg(sarg === i ? null : i); if (i >= 2) setBeautiful(false); }} />
          ))}
        </View>
        {sarg !== null && sarg >= 1 && (
          <View style={st.switchRow}>
            <Text style={st.switchLabel}>{t.smell}</Text>
            <Switch value={smell} onValueChange={setSmell} trackColor={{ true: C.sea }} />
          </View>
        )}

        <Text style={st.label}>{t.flag}</Text>
        {Object.keys(FLAG_COLORS).map((f) => (
          <Pressable key={f} onPress={() => setFlag(flag === f ? null : f)}
            style={[st.flagRow, flag === f && { borderColor: FLAG_COLORS[f], backgroundColor: FLAG_COLORS[f] + '22' }]}>
            <View style={[st.flagSwatch, { backgroundColor: FLAG_COLORS[f] }]} />
            <Text style={st.flagText}>{t.flags[f]}</Text>
          </Pressable>
        ))}

        <Text style={st.label}>{t.water}</Text>
        <View style={st.row}>
          {Object.keys(t.waters).map((w) => (
            <Chip key={w} label={t.waters[w]} active={water === w} onPress={() => setWater(water === w ? null : w)} />
          ))}
        </View>

        <Text style={st.label}>{t.sea}</Text>
        <View style={st.row}>
          {Object.keys(t.seas).map((w) => (
            <Chip key={w} label={t.seas[w]} active={sea === w} onPress={() => setSea(sea === w ? null : w)} />
          ))}
        </View>

        <TextInput
          style={st.input}
          placeholder={t.note}
          placeholderTextColor={C.muted}
          value={note}
          onChangeText={setNote}
          maxLength={280}
          multiline
        />

        {photo ? <Image source={{ uri: photo }} style={st.photo} /> : null}
        <View style={st.row}>
          <Chip label={`📷 ${photo ? t.changePhoto : t.addPhoto}`} onPress={takePhoto} />
          <Chip label="🖼️" onPress={pickPhoto} />
        </View>

        <Pressable style={[st.send, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color={C.white} /> : <Text style={st.sendText}>{t.send}</Text>}
        </Pressable>
        <Text style={st.disclaimer}>{t.disclaimer}</Text>
      </ScrollView>
    </Modal>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderColor: C.line, backgroundColor: C.white,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.ink, flex: 1, textAlign: 'center' },
  cancel: { color: C.sea, fontSize: 16, width: 60 },
  body: { padding: 16, paddingBottom: 48, backgroundColor: C.sand },
  title: { fontSize: 24, fontWeight: '800', color: C.ink, marginBottom: 12 },
  beautifulBox: { backgroundColor: STATUS.beautiful.color + '18', borderRadius: 14, padding: 12, marginBottom: 4 },
  label: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 15, color: C.ink },
  flagRow: {
    flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.line, backgroundColor: C.white, marginBottom: 6,
  },
  flagSwatch: { width: 26, height: 18, borderRadius: 3, marginRight: 10 },
  flagText: { fontSize: 14, color: C.ink, flex: 1 },
  input: {
    backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.line,
    padding: 12, minHeight: 70, fontSize: 15, color: C.ink, marginTop: 16, marginBottom: 12, textAlignVertical: 'top',
  },
  photo: { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  send: { backgroundColor: C.sea, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12 },
  sendText: { color: C.white, fontSize: 17, fontWeight: '800' },
  disclaimer: { fontSize: 12, color: C.muted, marginTop: 14, textAlign: 'center' },
});
