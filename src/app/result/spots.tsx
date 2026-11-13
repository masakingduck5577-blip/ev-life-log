import { StyleSheet, View } from 'react-native';

import { chargerKindLabel, chargerMarker } from '@/components/labels';
import { RouteMap } from '@/components/route-map';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { isHondaCharge } from '@/data/simulator';
import { formatIsoDate } from '@/lib/format';
import { useAnalysis } from '@/recording/use-analysis';

/** 8. 通った道の充電スポット */
export default function SpotsScreen() {
  const result = useAnalysis();
  if (!result) {
    return (
      <Screen title="通った道の充電スポット" back>
        <ThemedText color="sub">まだ記録がありません。</ThemedText>
      </Screen>
    );
  }
  const a = result.analysis;
  const spots = a.spots;
  const counts = {
    honda: spots.filter((s) => isHondaCharge(s.charger)).length,
    quick: spots.filter((s) => !isHondaCharge(s.charger) && s.charger.type === 'quick').length,
    normal: spots.filter((s) => !isHondaCharge(s.charger) && s.charger.type === 'normal').length,
  };
  const sources = [...new Set(spots.map((s) => `${s.charger.source}（${formatIsoDate(s.charger.checkedAt)}確認）`))];

  return (
    <Screen title="通った道の充電スポット" lead="車で通った道と行き先から500m以内にある充電スポットです。" back>
      <RouteMap
        label="1週間に車で通った道と、近くの充電スポットの地図"
        fitKey="week"
        height={320}
        paths={a.trips.filter((t) => t.kind === 'car').map((t) => ({ points: t.path, kind: 'car' as const }))}
        markers={[
          ...spots.map((s) => chargerMarker(s.charger, `1週間に${s.passes}回近くを通った`)),
          ...(a.home ? [{ id: 'home', kind: 'home' as const, lat: a.home.lat, lng: a.home.lng, title: '家' }] : []),
        ]}
      />
      <ThemedText type="note" color="sub">
        印：急（急速）・普（普通）・H（Honda Charge）・家
      </ThemedText>
      <Section title={`近くに ${spots.length}か所`}>
        <ThemedText>
          Honda Charge {counts.honda}か所・急速 {counts.quick}か所・普通 {counts.normal}か所
        </ThemedText>
        {spots.map((s) => (
          <View key={s.charger.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText type="bold">{s.charger.name}</ThemedText>
              <ThemedText type="note" color="sub">
                {chargerKindLabel(s.charger)}
                {s.charger.kw ? ` ${s.charger.kw}kW` : ''}
                {s.charger.hours ? `・${s.charger.hours}` : ''}
              </ThemedText>
            </View>
            <ThemedText type="note" color="sub" style={styles.right}>
              {s.passes}回通った{'\n'}約{Math.round(s.nearestM)}m
            </ThemedText>
          </View>
        ))}
      </Section>
      <ThemedText type="note" color="sub">
        出典：{sources.join('、') || 'Web版シミュレーターの充電スポット一覧'}。Web版シミュレーターと同じデータです。
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  right: {
    textAlign: 'right',
  },
});
