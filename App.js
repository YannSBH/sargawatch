import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, FlatList, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { C, STATUS } from './src/config';
import { STRINGS, LANGS, detectLang, countryName } from './src/i18n';
import { fetchBeaches, fetchCountries, myFavorites, toggleFavorite } from './src/api';
import { Chip, StatusBadge, FlagDot, minutesAgo } from './src/ui';
import BeachDetail from './src/BeachDetail';
import ReportForm from './src/ReportForm';
import BeachMap from './src/BeachMap';

// Vue de départ de la carte pour chaque pays
const REGIONS = {
  ALL: { latitude: 17.5, longitude: -72, latitudeDelta: 14, longitudeDelta: 24 },
  BL: { latitude: 17.9, longitude: -62.83, latitudeDelta: 0.09, longitudeDelta: 0.09 },
  MF: { latitude: 18.07, longitude: -63.06, latitudeDelta: 0.2, longitudeDelta: 0.2 },
  GP: { latitude: 16.2, longitude: -61.5, latitudeDelta: 1.0, longitudeDelta: 1.0 },
  MQ: { latitude: 14.65, longitude: -61.0, latitudeDelta: 0.75, longitudeDelta: 0.75 },
  DO: { latitude: 18.7, longitude: -69.6, latitudeDelta: 2.8, longitudeDelta: 3.6 },
  MX: { latitude: 20.8, longitude: -86.95, latitudeDelta: 1.8, longitudeDelta: 1.6 },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

function Main() {
  const [lang, setLang] = useState(detectLang());
  const t = STRINGS[lang];
  const [countries, setCountries] = useState([]);
  const [beaches, setBeaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [country, setCountry] = useState('ALL');
  const [tab, setTab] = useState('map');
  const [favs, setFavs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const mapRef = useRef(null);

  // Préférences mémorisées (langue, pays)
  useEffect(() => {
    (async () => {
      try {
        const l = await AsyncStorage.getItem('lang');
        if (l && STRINGS[l]) setLang(l);
        const c = await AsyncStorage.getItem('country');
        if (c) setCountry(c);
      } catch {}
    })();
  }, []);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [cs, bs] = await Promise.all([fetchCountries(), fetchBeaches()]);
      setCountries(cs);
      setBeaches(bs);
      myFavorites().then(setFavs).catch(() => {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5 * 60 * 1000); // rafraîchit toutes les 5 min
    return () => clearInterval(timer);
  }, [load]);

  const chooseLang = (l) => {
    setLang(l);
    AsyncStorage.setItem('lang', l).catch(() => {});
  };

  const chooseCountry = (c) => {
    setCountry(c);
    AsyncStorage.setItem('country', c).catch(() => {});
    mapRef.current?.animateToRegion(REGIONS[c] || REGIONS.ALL, 600);
  };

  // Seuls les pays qui ont déjà des plages apparaissent dans les filtres
  const activeCountries = useMemo(() => {
    const withBeaches = new Set(beaches.map((b) => b.country_code));
    return countries.filter((c) => withBeaches.has(c.code));
  }, [countries, beaches]);

  const visible = useMemo(() => {
    let list = country === 'ALL' ? beaches : beaches.filter((b) => b.country_code === country);
    if (tab === 'favs') list = beaches.filter((b) => favs.includes(b.beach_id));
    // les belles plages et les plages avec info récente en premier
    const rank = { beautiful: 0, ok: 1, some: 2, heavy: 3, closed: 4, unknown: 5 };
    return [...list].sort((a, b) => (rank[a.status] - rank[b.status]) || a.name.localeCompare(b.name));
  }, [beaches, country, tab, favs]);

  const open = beaches.find((b) => b.beach_id === openId) || null;

  const onToggleFav = async () => {
    if (!open) return;
    const id = open.beach_id;
    setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    try {
      await toggleFavorite(id);
    } catch {
      myFavorites().then(setFavs).catch(() => {});
    }
  };

  const onSent = () => {
    setReporting(false);
    setRefreshKey((k) => k + 1);
    load();
  };

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Image source={require('./assets/icon.png')} style={st.logo} />
          <View>
            <Text style={st.brand}>SargaWatch</Text>
            <Text style={st.tagline}>{t.tagline}</Text>
          </View>
        </View>
        <View style={st.langs}>
          {LANGS.map((l) => (
            <Pressable key={l.code} onPress={() => chooseLang(l.code)} style={[st.lang, lang === l.code && st.langOn]}>
              <Text style={[st.langText, lang === l.code && { color: C.white }]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab !== 'favs' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filters} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <Chip label={`🌎 ${t.all}`} active={country === 'ALL'} onPress={() => chooseCountry('ALL')} />
          {activeCountries.map((c) => (
            <Chip key={c.code} label={countryName(c, lang)} active={country === c.code} onPress={() => chooseCountry(c.code)} />
          ))}
        </ScrollView>
      )}

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={st.center}><ActivityIndicator size="large" color={C.sea} /><Text style={st.muted}>{t.loading}</Text></View>
        ) : error && !beaches.length ? (
          <View style={st.center}>
            <Text style={st.muted}>{t.offline}</Text>
            <Chip label={t.retry} active onPress={() => { setLoading(true); load(); }} />
          </View>
        ) : tab === 'map' ? (
          <BeachMap
            ref={mapRef}
            beaches={visible}
            region={REGIONS[country] || REGIONS.ALL}
            onOpen={(id) => setOpenId(id)}
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(b) => String(b.beach_id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={C.sea} />}
            ListEmptyComponent={<Text style={st.muted}>{tab === 'favs' ? t.noFavorites : ''}</Text>}
            renderItem={({ item: b }) => {
              const ago = minutesAgo(b.last_report_at);
              return (
                <Pressable style={st.row} onPress={() => setOpenId(b.beach_id)}>
                  <View style={[st.rowBar, { backgroundColor: STATUS[b.status]?.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={st.rowName}>{b.name}</Text>
                    <Text style={st.rowZone}>{b.zone_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                      <StatusBadge status={b.status} t={t} />
                      {b.flag ? <View style={{ marginLeft: 10 }}><FlagDot flag={b.flag} /></View> : null}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {ago !== null && <Text style={st.rowAgo}>{t.ago(ago)}</Text>}
                    {b.reports_24h > 0 && <Text style={st.rowAgo}>{t.reports24h(b.reports_24h)}</Text>}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <SafeAreaView edges={['bottom']} style={st.tabbar}>
        {[
          ['map', '🗺️', t.map],
          ['list', '📋', t.list],
          ['favs', '★', t.favorites],
        ].map(([k, icon, label]) => (
          <Pressable key={k} style={st.tab} onPress={() => setTab(k)}>
            <Text style={[st.tabIcon, tab === k && { color: C.sea }]}>{icon}</Text>
            <Text style={[st.tabText, tab === k && { color: C.sea, fontWeight: '800' }]}>{label}</Text>
          </Pressable>
        ))}
      </SafeAreaView>

      {open && (
        <BeachDetail
          beach={open}
          beaches={beaches}
          t={t}
          isFav={favs.includes(open.beach_id)}
          onToggleFav={onToggleFav}
          onClose={() => setOpenId(null)}
          onReport={() => setReporting(true)}
          onOpenBeach={(b) => setOpenId(b.beach_id)}
          refreshKey={refreshKey}
        >
          <ReportForm
            visible={reporting}
            beach={open}
            t={t}
            lang={lang}
            onClose={() => setReporting(false)}
            onSent={onSent}
          />
        </BeachDetail>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.sand },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  logo: { width: 40, height: 40, borderRadius: 10, marginRight: 10 },
  brand: { fontSize: 22, fontWeight: '900', color: C.seaDark, letterSpacing: -0.5 },
  tagline: { fontSize: 12, color: C.muted },
  langs: { flexDirection: 'row', backgroundColor: C.white, borderRadius: 10, padding: 3 },
  lang: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  langOn: { backgroundColor: C.sea },
  langText: { fontSize: 12, fontWeight: '800', color: C.ink },
  filters: { flexGrow: 0, paddingBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  muted: { color: C.muted, fontSize: 15, textAlign: 'center' },
  pin: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: C.white,
  },
  pinText: { fontSize: 15 },
  row: {
    flexDirection: 'row', backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 10, overflow: 'hidden',
  },
  rowBar: { width: 5, borderRadius: 3, marginRight: 12 },
  rowName: { fontSize: 17, fontWeight: '800', color: C.ink },
  rowZone: { fontSize: 13, color: C.muted, marginTop: 1 },
  rowAgo: { fontSize: 11, color: C.muted, marginBottom: 2 },
  tabbar: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderColor: C.line },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabIcon: { fontSize: 20, color: C.muted },
  tabText: { fontSize: 12, color: C.muted, marginTop: 2 },
});
