# 線路・駅・高速道路のデータ（栃木県）

運転の判定で、電車・新幹線・LRT を見分けるために使います（`src/analysis/rail.ts`）。
計算はスマホの中だけで行い、位置を外に送ることはありません。

| ファイル | 中身 |
|---|---|
| tochigi-rail.json | 線路（railway=rail・light_rail・tram、新幹線を含む）と駅（railway=station・tram_stop・halt） |
| tochigi-motorway.json | 高速道路（highway=motorway） |

## 作り方

```
node scripts/fetch-osm-geo.mjs
```

Overpass API から取り出し、線を間引いて（許し8m、座標は小数5桁）軽くしています。
LRT・路面電車の線路は、道路の中心線から15m以内を通る部分を「道路の上」（`st: 1`）として分けています
（OSM では宇都宮ライトレールが全線 railway=tram・最高速度40kmで、印からは見分けられないため）。

## 出典とライセンス

- データ：© OpenStreetMap contributors
- ライセンス：[Open Database License（ODbL）1.0](https://opendatacommons.org/licenses/odbl/1-0/)
- 詳しく：https://www.openstreetmap.org/copyright

このフォルダの JSON は OpenStreetMap のデータから作ったデータベースなので、ODbL 1.0 で配ります。
