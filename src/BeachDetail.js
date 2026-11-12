import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, ScrollView, Pressable, Image, StyleSheet, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { C, FLAG_COLORS, STATUS, FORECAST, AMENITIES } from './config';
import { StatusBadge, FlagDot, minutesAgo } from './ui';
import { fetchReports, vote, photoUrl, distanceKm, fetchAmenities, voteAmenity, fetchCover } from './api';

export default function BeachDetail({ beach, beaches, forecast, t, isFav, onToggleFav, onClose, onReport, onOpenBeach, refreshKey, children }) {
  const [reports, setReports] = useState(null);
  const [votedIds, setVotedIds] = useState({});
  const [amen, setAmen] = useState([]);
  const [myAmen, setMyAmen] = useState({});
  const [editAmen, setEditAmen] = useState(false);
  const [cover, setCover] = useState(null);
  const [showFc, setShowFc] = useState(false);

  const load = useCallback(async () => {
    if (!beach) return;
    try {
      setReports(await fetchReports(beach.beach_id));
    } catch {
      setReports([]);
    }
  }, [beach]);

  useEffect(() => {
    setReports(null);
    load();
  }, [load, refreshKey]);

  const loadAmen = useCallback(() => {
    if (!beach) return;
    fetchAmenities(beach.beach_id).then(setAmen).catch(() => {});
  }, [beach]);

  useEffect(() => {
    loadAmen();
    setCover(null);
    if (beach) fetchCover(beach.beach_id).then(setCover).catch(() => {});
  }, [loadAmen, beach?.beach_id, refreshKey]);

  const toggleAmen = async (key) => {
    const confirmed = amen.find((a) => a.amenity === key && a.yes > a.no);
    const mine = myAmen[key];
    const present = mine === undefined ? !confirmed : !mine;
    setMyAmen((m) => ({ ...m, [key]: present }));
    try { await voteAmenity(beach.beach_id, key, present); } catch {}
    loadAmen();
  };

  // Plage sans sargasses la plus proche (si celle-ci est touchée)
  const nearest = useMemo(() => {
    if (!beach || !['some', 'heavy', 'closed'].includes(beach.status)) return null;
    let best = null;
    for (const b of beaches) {
      if (b.beach_id === beach.beach_id || !['beautiful', 'ok'].includes(b.status)) continue;
      const d = distanceKm(beach, b);
      if (d < 60 && (!best || d < best.d)) best = { b, d };
    }
    return best;
  }, [beach, beaches]);

  const doVote = async (id, stillTrue) => {
    try {
      await vote(id, stillTrue);
    } catch {}
    setVotedIds((v) => ({ ...v, [id]: true }));
    load();
  };

  const openDirections = () => {
    const url = Platform.select({
      ios: `maps:?daddr=${beach.lat},${beach.lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${beach.lat},${beach.lng}`,
    });
    Linking.openURL(url);
  };

  if (!beach) return null;
  const sargAgo = minutesAgo(beach.sargassum_at);
  const flagAgo = minutesAgo(beach.flag_at);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={st.header}>
        <Pressable onPress={onClose} hitSlop={12}><Text style={st.close}>✕</Text></Pressable>
        <Pressable onPress={onToggleFav} hitSlop={12}>
          <Text style={[st.star, isFav && { color: '#F5B700' }]}>{isFav ? '★' : '☆'}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={st.body}>
        {cover ? <Image source={{ uri: photoUrl(cover) }} style={st.cover} /> : null}
        <Text style={st.name}>{beach.name}</Text>
        <Text style={st.zone}>
          {beach.zone_name}
          {beach.coast === 'atlantic' ? ` · ${t.coastAtlantic}` : beach.coast === 'caribbean' ? ` · ${t.coastCaribbean}` : ''}
        </Text>

        <View style={{ marginTop: 14 }}>
          <StatusBadge status={beach.status} t={t} large />
          {sargAgo !== null && <Text style={st.meta}>{t.sargassum} · {t.ago(sargAgo)}</Text>}
        </View>

        <View style={st.cards}>
          <View style={st.card}>
            <Text style={st.cardLabel}>{t.flag}</Text>
            {beach.flag ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <FlagDot flag={beach.flag} size={18} />
                <Text style={[st.cardValue, { color: FLAG_COLORS[beach.flag], marginLeft: 6 }]}>
                  {t.flagsShort[beach.flag]}
                </Text>
              </View>
            ) : <Text style={st.cardEmpty}>—</Text>}
            {flagAgo !== null && <Text style={st.cardMeta}>{t.ago(flagAgo)}</Text>}
          </View>
          <View style={st.card}>
            <Text style={st.cardLabel}>{t.water}</Text>
            <Text style={beach.water ? st.cardValue : st.cardEmpty}>{beach.water ? t.waters[beach.water] : '—'}</Text>
          </View>
          <View style={st.card}>
            <Text style={st.cardLabel}>{t.sea}</Text>
            <Text style={beach.sea ? st.cardValue : st.cardEmpty}>{beach.sea ? t.seas[beach.sea] : '—'}</Text>
          </View>
        </View>

        {forecast && beach.forecast_risk ? (
          <Pressable style={[st.fc, { borderColor: FORECAST[beach.forecast_risk].color }]} onPress={() => setShowFc((v) => !v)}>
            <View style={st.fcHead}>
              <View style={[st.fcDot, { backgroundColor: FORECAST[beach.forecast_risk].color + '99' }]}><Text style={{ fontSize: 10 }}>🛰️</Text></View>
              <Text style={st.fcTitle}>{t.forecastTitle}</Text>
              <Text style={st.fcMore}>{showFc ? '▲' : '▼'}</Text>
            </View>
            <Text style={[st.fcRisk, { color: FORECAST[beach.forecast_risk].color }]}>{t.forecastRisk[beach.forecast_risk]}</Text>
            <Text style={st.fcMeta}>
              {forecast.bulletin_date}{forecast.confidence ? ` · ${t.confidence(forecast.confidence)}` : ''}
            </Text>
            {beach.forecast_lowered && forecast.risk !== 'low' ? <Text style={st.fcNote}>{t.forecastLowered}</Text> : null}
            {showFc ? (
              <View style={{ marginTop: 8, gap: 6 }}>
                {t.forecastLang ? <Text style={st.fcNote}>{t.forecastLang}</Text> : null}
                <Text style={st.fcHeadline}>« {forecast.headline} »</Text>
                {forecast.forecast ? <Text style={st.fcText}>{forecast.forecast}</Text> : null}
                {forecast.trend ? (
                  <>
                    <Text style={st.fcSub}>{t.forecastTrend}</Text>
                    <Text style={st.fcText}>{forecast.trend}</Text>
                  </>
                ) : null}
                <Text style={st.fcLink} onPress={() => Linking.openURL(forecast.source_url)}>{t.forecastSource} ↗</Text>
              </View>
            ) : null}
            <Text style={st.fcNote}>{t.forecastNote}</Text>
          </Pressable>
        ) : null}

        <View style={st.amenBox}>
          <View style={st.amenHead}>
            <Text style={st.amenTitle}>{t.amenities}</Text>
            <Pressable onPress={() => setEditAmen((v) => !v)} hitSlop={8}>
              <Text style={st.amenEdit}>{editAmen ? t.done : t.amenityEdit}</Text>
            </Pressable>
          </View>
          {editAmen ? <Text style={st.fcNote}>{t.amenityHint}</Text> : null}
          <View style={st.amenRow}>
            {AMENITIES.filter(([k]) => {
              if (editAmen) return true;
              const a = amen.find((x) => x.amenity === k);
              return myAmen[k] === true || (myAmen[k] === undefined && a && a.yes > a.no);
            }).map(([k, icon]) => {
              const a = amen.find((x) => x.amenity === k);
              const on = myAmen[k] !== undefined ? myAmen[k] : !!(a && a.yes > a.no);
              return (
                <Pressable key={k} disabled={!editAmen} onPress={() => toggleAmen(k)}
                  style={[st.amenChip, on && st.amenOn, editAmen && !on && st.amenOff]}>
                  <Text style={[st.amenText, on && { color: C.white }]}>{icon} {t.amenityNames[k]}</Text>
                </Pressable>
              );
            })}
          </View>
          {!editAmen && !AMENITIES.some(([k]) => {
            const a = amen.find((x) => x.amenity === k);
            return myAmen[k] === true || (myAmen[k] === undefined && a && a.yes > a.no);
          }) ? <Text style={st.empty}>{t.amenityNone}</Text> : null}
        </View>

        {nearest && (
          <Pressable style={st.nearest} onPress={() => onOpenBeach(nearest.b)}>
            <Text style={st.nearestLabel}>{t.nearestGood}</Text>
            <Text style={st.nearestName}>
              {STATUS[nearest.b.status].emoji} {nearest.b.name} · {t.km(nearest.d)} →
            </Text>
          </Pressable>
        )}

        <View style={st.actions}>
          <Pressable style={st.reportBtn} onPress={onReport}>
            <Text style={st.reportText}>📍 {t.report}</Text>
          </Pressable>
          <Pressable style={st.dirBtn} onPress={openDirections}>
            <Text style={st.dirText}>🧭</Text>
          </Pressable>
        </View>

        <Text style={st.section}>{t.latest}</Text>
        {reports === null ? (
          <ActivityIndicator color={C.sea} style={{ marginTop: 16 }} />
        ) : reports.length === 0 ? (
          <Text style={st.empty}>{t.noReports}</Text>
        ) : (
          reports.map((r) => (
            <View key={r.id} style={st.report}>
              <Text style={st.reportTime}>{t.ago(minutesAgo(r.created_at))}</Text>
              <View style={st.tags}>
                {r.beautiful && <Tag text={`✨ ${t.status.beautiful}`} color={STATUS.beautiful.color} />}
                {r.sargassum_level !== null && (
                  <Tag
                    text={`${t.sargassum} : ${t.sargLevels[r.sargassum_level]}`}
                    color={[STATUS.ok.color, STATUS.some.color, STATUS.heavy.color, STATUS.closed.color][r.sargassum_level]}
                  />
                )}
                {r.flag && <Tag text={`${t.flag} : ${t.flagsShort[r.flag]}`} color={FLAG_COLORS[r.flag]} />}
                {r.water && <Tag text={`${t.water} : ${t.waters[r.water]}`} color={C.sea} />}
                {r.sea && <Tag text={`${t.sea} : ${t.seas[r.sea]}`} color={C.seaDark} />}
                {r.smell && <Tag text={`👃 ${t.smell}`} color="#8A5A1C" />}
              </View>
              {r.note ? <Text style={st.note}>« {r.note} »</Text> : null}
              {r.photo_path ? <Image source={{ uri: photoUrl(r.photo_path) }} style={st.photo} /> : null}
              <View style={st.voteRow}>
                {votedIds[r.id] ? (
                  <Text style={st.voted}>{t.voted}</Text>
                ) : (
                  <>
                    <Pressable style={st.voteBtn} onPress={() => doVote(r.id, true)}>
                      <Text style={st.voteText}>👍 {t.stillTrue} ({r.votes.still_true})</Text>
                    </Pressable>
                    <Pressable style={st.voteBtn} onPress={() => doVote(r.id, false)}>
                      <Text style={st.voteText}>👎 {t.outdated} ({r.votes.outdated})</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          ))
        )}
        <Text style={st.disclaimer}>{t.disclaimer}</Text>
      </ScrollView>
      {children}
    </Modal>
  );
}

function Tag({ text, color }) {
  return (
    <View style={[st.tag, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[st.tagText, { color }]}>{text}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: C.white },
  close: { fontSize: 22, color: C.muted },
  star: { fontSize: 28, color: C.muted },
  body: { padding: 16, paddingBottom: 48, backgroundColor: C.sand, flexGrow: 1 },
  name: { fontSize: 28, fontWeight: '800', color: C.ink },
  zone: { fontSize: 15, color: C.muted, marginTop: 2 },
  meta: { fontSize: 13, color: C.muted, marginTop: 6 },
  cards: { flexDirection: 'row', marginTop: 16, gap: 8 },
  card: { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 12, minHeight: 84 },
  cardLabel: { fontSize: 12, color: C.muted, fontWeight: '600' },
  cardValue: { fontSize: 16, fontWeight: '800', color: C.ink, marginTop: 6 },
  cardEmpty: { fontSize: 16, color: C.line, marginTop: 6 },
  cardMeta: { fontSize: 11, color: C.muted, marginTop: 4 },
  nearest: { backgroundColor: STATUS.beautiful.color + '1A', borderRadius: 14, padding: 14, marginTop: 14 },
  nearestLabel: { fontSize: 12, color: C.muted, fontWeight: '700' },
  nearestName: { fontSize: 16, color: C.ink, fontWeight: '700', marginTop: 4 },
  actions: { flexDirection: 'row', marginTop: 16, gap: 10 },
  reportBtn: { flex: 1, backgroundColor: C.sea, borderRadius: 14, padding: 16, alignItems: 'center' },
  reportText: { color: C.white, fontSize: 17, fontWeight: '800' },
  dirBtn: { width: 56, backgroundColor: C.white, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dirText: { fontSize: 22 },
  section: { fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 24, marginBottom: 8 },
  empty: { fontSize: 15, color: C.muted },
  report: { backgroundColor: C.white, borderRadius: 14, padding: 12, marginBottom: 10 },
  reportTime: { fontSize: 12, color: C.muted, marginBottom: 6 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: '700' },
  note: { fontSize: 14, color: C.ink, marginTop: 8, fontStyle: 'italic' },
  photo: { width: '100%', height: 200, borderRadius: 10, marginTop: 8 },
  voteRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  voteBtn: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  voteText: { fontSize: 13, color: C.ink },
  voted: { fontSize: 13, color: C.muted },
  disclaimer: { fontSize: 12, color: C.muted, marginTop: 20, textAlign: 'center' },
  cover: { width: '100%', height: 190, borderRadius: 16, marginBottom: 14 },
  fc: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginTop: 14, borderWidth: 2, borderStyle: 'dashed' },
  fcHead: { flexDirection: 'row', alignItems: 'center' },
  fcDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderStyle: 'dashed', borderColor: '#33454D', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  fcTitle: { fontSize: 13, fontWeight: '700', color: C.muted, flex: 1 },
  fcMore: { fontSize: 12, color: C.muted },
  fcRisk: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  fcMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  fcNote: { fontSize: 12, color: C.muted, marginTop: 6, fontStyle: 'italic' },
  fcHeadline: { fontSize: 14, fontWeight: '700', color: C.ink },
  fcText: { fontSize: 14, color: C.ink, lineHeight: 20 },
  fcSub: { fontSize: 13, fontWeight: '700', color: C.muted, marginTop: 4 },
  fcLink: { fontSize: 14, fontWeight: '700', color: C.sea, marginTop: 4 },
  amenBox: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginTop: 14 },
  amenHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amenTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  amenEdit: { fontSize: 14, fontWeight: '700', color: C.sea },
  amenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  amenChip: { borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.white },
  amenOn: { backgroundColor: C.sea, borderColor: C.sea },
  amenOff: { opacity: 0.55 },
  amenText: { fontSize: 13, color: C.ink, fontWeight: '600' },
});
