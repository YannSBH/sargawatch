import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { STATUS } from './config';

// Carte OpenStreetMap (fonds OpenFreeMap) affichée avec MapLibre : aucune clé nécessaire.
const HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #dfeef2; }
  .pin { width: 30px; height: 30px; border-radius: 15px; border: 3px solid #fff; box-sizing: border-box;
         display: flex; align-items: center; justify-content: center; font-size: 14px;
         box-shadow: 0 1px 4px rgba(0,0,0,.35); }
</style>
</head><body>
<div id="map"></div>
<script>
  // Fonds de carte OpenFreeMap (données OpenStreetMap) : gratuits, sans clé ni limite
  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [-72, 17.5], zoom: 4,
    attributionControl: { compact: true }
  });
  var markers = [];
  function send(o) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  window.setBeaches = function (list) {
    markers.forEach(function (m) { m.remove(); });
    markers = list.map(function (b) {
      var el = document.createElement('div');
      el.className = 'pin';
      el.style.background = b.color;
      el.textContent = b.emoji;
      el.addEventListener('click', function (e) { e.stopPropagation(); send({ type: 'open', id: b.id }); });
      return new maplibregl.Marker({ element: el }).setLngLat([b.lng, b.lat]).addTo(map);
    });
  };
  window.goTo = function (r) {
    map.fitBounds([[r.longitude - r.longitudeDelta / 2, r.latitude - r.latitudeDelta / 2],
                   [r.longitude + r.longitudeDelta / 2, r.latitude + r.latitudeDelta / 2]], { duration: 600 });
  };
  map.on('load', function () { send({ type: 'ready' }); });
</script>
</body></html>`;

const BeachMap = forwardRef(function BeachMap({ beaches, region, onOpen }, ref) {
  const web = useRef(null);
  const [ready, setReady] = useState(false);

  const run = (js) => web.current?.injectJavaScript(`${js};true;`);

  useImperativeHandle(ref, () => ({
    animateToRegion: (r) => run(`window.goTo(${JSON.stringify(r)})`),
  }));

  useEffect(() => {
    if (!ready) return;
    const data = beaches.map((b) => ({
      id: b.beach_id,
      lat: b.lat,
      lng: b.lng,
      color: (STATUS[b.status] || STATUS.unknown).color,
      emoji: (STATUS[b.status] || STATUS.unknown).emoji,
    }));
    run(`window.setBeaches(${JSON.stringify(data)})`);
  }, [beaches, ready]);

  useEffect(() => {
    if (ready && region) run(`window.goTo(${JSON.stringify(region)})`);
  }, [ready, region]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html: HTML, baseUrl: 'https://sargawatch.app/' }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'ready') setReady(true);
            if (msg.type === 'open') onOpen(msg.id);
          } catch {}
        }}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: '#dfeef2' }}
      />
    </View>
  );
});

export default BeachMap;
