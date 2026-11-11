import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { STATUS } from './config';

// Carte OpenStreetMap (fonds CARTO) affichée avec Leaflet : aucune clé Google nécessaire.
const HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #dfeef2; }
  .pin { width: 30px; height: 30px; border-radius: 15px; border: 3px solid #fff;
         display: flex; align-items: center; justify-content: center; font-size: 14px;
         box-shadow: 0 1px 4px rgba(0,0,0,.35); }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head><body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([17.5, -72], 5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);
  function send(o) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  window.setBeaches = function (list) {
    layer.clearLayers();
    list.forEach(function (b) {
      var icon = L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 15],
        html: '<div class="pin" style="background:' + b.color + '">' + b.emoji + '</div>' });
      L.marker([b.lat, b.lng], { icon: icon }).on('click', function () { send({ type: 'open', id: b.id }); }).addTo(layer);
    });
  };
  window.goTo = function (r) {
    map.flyToBounds([[r.latitude - r.latitudeDelta / 2, r.longitude - r.longitudeDelta / 2],
                     [r.latitude + r.latitudeDelta / 2, r.longitude + r.longitudeDelta / 2]], { duration: 0.6 });
  };
  send({ type: 'ready' });
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
