import { useMemo } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Colors, Radius } from '@/constants/theme';

import { ATTRIBUTION, CENTER, LINE, PIN, pinHtml, TILE_URL } from './map-style';
import type { RouteMapProps } from './route-map.types';

export type { MapMarker, MapPath } from './route-map.types';

/** ブラウザ版（package.json の leaflet）と同じ版 */
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist';

/**
 * 地図（スマホ）：WebView の中で、ブラウザ版と同じ Leaflet ＋ 地理院タイルを出す。
 * 地図の部品を新しく入れずに済み、見た目もブラウザ版とそろう。地図を見るにはネットにつながっている必要がある。
 */
export function RouteMap({ paths = [], markers = [], height = 260, label }: RouteMapProps) {
  const html = useMemo(() => {
    const data = {
      paths: paths.map((p) => ({ latlngs: p.points.map((q) => [q.lat, q.lng]), style: LINE[p.kind] })),
      markers: markers.map((m) => ({
        lat: m.lat,
        lng: m.lng,
        title: m.title,
        detail: m.detail ?? '',
        html: pinHtml(m.kind),
        size: PIN[m.kind].size,
        fit: m.kind === 'home' || m.kind === 'stop' || paths.length === 0,
      })),
    };
    return buildHtml(data);
  }, [paths, markers]);
  // 中身が同じなら同じものを渡す（地図を読み込み直さない）
  const source = useMemo(() => ({ html }), [html]);

  return (
    <View style={[styles.box, { height }]} accessible accessibilityLabel={label}>
      <WebView
        originWhitelist={['*']}
        source={source}
        style={styles.web}
        scrollEnabled={false}
        // 出典のリンクなどは、地図の中ではなく Safari で開く
        onShouldStartLoadWithRequest={(req) => {
          if (req.navigationType === 'click') {
            void Linking.openURL(req.url);
            return false;
          }
          return true;
        }}
      />
    </View>
  );
}

/** 地図のページ。データは JSON にして埋め込む（「</script>」で途切れないように < を逃がす） */
function buildHtml(data: unknown): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="${LEAFLET}/leaflet.css">
<style>html,body,#map{margin:0;height:100%;background:${Colors.bg}}</style>
</head><body>
<div id="map"></div>
<script src="${LEAFLET}/leaflet.js"></script>
<script>
(function () {
  var data = ${json};
  var map = L.map('map', { center: ${JSON.stringify(CENTER)}, zoom: 12 });
  L.tileLayer(${JSON.stringify(TILE_URL)}, { attribution: ${JSON.stringify(ATTRIBUTION)}, maxZoom: 18, minZoom: 5 }).addTo(map);
  var bounds = [];
  data.paths.forEach(function (p) {
    bounds = bounds.concat(p.latlngs);
    L.polyline(p.latlngs, { color: p.style.color, weight: p.style.weight, dashArray: p.style.dashArray, opacity: 0.85 }).addTo(map);
  });
  data.markers.forEach(function (m) {
    var icon = L.divIcon({ className: '', iconSize: [m.size, m.size], iconAnchor: [m.size / 2, m.size / 2], html: m.html });
    var popup = document.createElement('div');
    var t = document.createElement('strong');
    t.textContent = m.title;
    popup.appendChild(t);
    if (m.detail) {
      var d = document.createElement('div');
      d.textContent = m.detail;
      d.style.marginTop = '4px';
      popup.appendChild(d);
    }
    L.marker([m.lat, m.lng], { icon: icon, title: m.title }).bindPopup(popup).addTo(map);
    if (m.fit) bounds.push([m.lat, m.lng]);
  });
  if (bounds.length === 1) map.setView(bounds[0], 14);
  else if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 15 });
})();
</script>
</body></html>`;
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.bg,
  },
  web: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
