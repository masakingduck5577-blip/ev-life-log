import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { chargerKindLabel, chargerMarker } from '@/components/labels';
import { RouteMap } from '@/components/route-map';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import { CHARGERS, isHondaCharge, type Charger } from '@/data/simulator';
import { useAnalysis } from '@/recording/use-analysis';

type Filter = 'all' | 'quick' | 'normal' | 'honda';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'quick', label: '急速' },
  { value: 'normal', label: '普通' },
  { value: 'honda', label: 'Honda Charge' },
];

const match = (c: Charger, f: Filter) =>
  f === 'all' ? true : f === 'honda' ? isHondaCharge(c) : !isHondaCharge(c) && c.type === f;

/** 充電マップのタブ：充電スポットと、自分が車で通った道 */
export default function MapScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const result = useAnalysis();
  const a = result?.analysis;
  const list = useMemo(() => CHARGERS.filter((c) => match(c, filter)), [filter]);
  const nearIds = new Set(a?.spots.map((s) => s.charger.id) ?? []);

  return (
    <Screen title="充電マップ" lead="宇都宮市のまわりの充電スポットと、あなたが車で通った道です。">
      <View style={styles.filters} role="radiogroup" aria-label="充電スポットの種類">
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            role="radio"
            aria-checked={filter === f.value}
            onPress={() => setFilter(f.value)}
            style={[styles.chip, filter === f.value && styles.chipOn]}>
            <ThemedText type="note" style={{ fontWeight: 700, color: filter === f.value ? Colors.onEv : Colors.ink }}>
              {f.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
      <RouteMap
        label="充電スポットの地図"
        fitKey={a ? 'route' : 'all'}
        height={380}
        paths={(a?.trips ?? []).filter((t) => t.kind === 'car').map((t) => ({ points: t.path, kind: 'car' as const }))}
        markers={[
          ...list.map((c) => chargerMarker(c, nearIds.has(c.id) ? 'あなたが通った道の近く' : undefined)),
          ...(a?.home ? [{ id: 'home', kind: 'home' as const, lat: a.home.lat, lng: a.home.lng, title: '家' }] : []),
        ]}
      />
      <ThemedText type="note" color="sub">
        印：急（急速）・普（普通）・H（Honda Charge）・家。青い線は、あなたが車で通った道。
      </ThemedText>
      <Section title={`${FILTERS.find((f) => f.value === filter)?.label}：${list.length}か所`}>
        {a?.spots.length ? (
          <ThemedText>あなたが通った道の近く（500m以内）に {a.spots.filter((s) => match(s.charger, filter)).length}か所あります。</ThemedText>
        ) : null}
        {list
          .filter((c) => nearIds.has(c.id))
          .slice(0, 10)
          .map((c) => (
            <View key={c.id} style={styles.row}>
              <ThemedText style={{ flex: 1 }}>{c.name}</ThemedText>
              <ThemedText type="note" color="sub">
                {chargerKindLabel(c)}
                {c.kw ? ` ${c.kw}kW` : ''}
              </ThemedText>
            </View>
          ))}
        <ThemedText type="note" color="sub">
          出典：e-Mobility Power 充電スポット一覧・Honda Charge 設置施設一覧・Tesla 充電器一覧・OpenStreetMap（Web版シミュレーターと同じデータ）。地図：地理院タイル。
        </ThemedText>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  chip: {
    minHeight: MinTouch,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.panel,
  },
  chipOn: {
    backgroundColor: Colors.ev,
    borderColor: Colors.ev,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
});
