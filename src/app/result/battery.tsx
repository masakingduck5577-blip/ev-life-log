import { StyleSheet, View } from 'react-native';

import { FULL_SOC, HOME_CHARGE_KW, SAFE_SOC } from '@/analysis/ev';
import { Screen, Section } from '@/components/screen';
import { SocChart } from '@/components/soc-chart';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { PARAMS } from '@/data/simulator';
import { formatKm, formatShortDate } from '@/lib/format';
import { useAnalysis } from '@/recording/use-analysis';

/** 7. 7日間の電池の残り */
export default function BatteryScreen() {
  const result = useAnalysis();
  if (!result) {
    return (
      <Screen title="7日間の電池の残り" back>
        <ThemedText color="sub">まだ記録がありません。</ThemedText>
      </Screen>
    );
  }
  const { ev } = result.analysis;
  const homeCharge = result.evInput.homeEnv !== 'none';

  return (
    <Screen title="7日間の電池の残り" lead={`${ev.ev.name}だったら、その日でいちばん少ないときの電池の残りです。`} back>
      <Section title="日ごとのグラフ">
        <SocChart
          days={ev.normal.days.map((d, i) => ({
            label: formatShortDate(d.dayStart).replace(/（.）/, ''),
            normal: d.minSoc,
            winter: ev.winter.days[i].minSoc,
          }))}
        />
      </Section>

      <Section title="日ごとの数字">
        <View style={styles.headRow}>
          <ThemedText type="note" color="sub" style={styles.c1}>日付</ThemedText>
          <ThemedText type="note" color="sub" style={styles.c2}>走った距離</ThemedText>
          <ThemedText type="note" color="sub" style={styles.c3}>ふだん</ThemedText>
          <ThemedText type="note" color="sub" style={styles.c3}>冬</ThemedText>
        </View>
        {ev.normal.days.map((d, i) => (
          <View key={d.dayStart} style={styles.row}>
            <ThemedText style={styles.c1}>{formatShortDate(d.dayStart)}</ThemedText>
            <ThemedText style={styles.c2}>{formatKm(d.km)}</ThemedText>
            <ThemedText style={styles.c3}>{Math.round(d.minSoc)}%</ThemedText>
            <ThemedText style={styles.c3}>{Math.round(ev.winter.days[i].minSoc)}%</ThemedText>
          </View>
        ))}
      </Section>

      <Section title="計算のしかた">
        <ThemedText type="note" color="sub">
          ・電池は{FULL_SOC}%まで充電する想定。安心ラインは{SAFE_SOC}%です。{'\n'}
          ・電費はカタログ値（{ev.ev.whPerKm}Wh/km）を実際の走りに合わせて直した値です。冬は走れる距離が{Math.round(PARAMS.winterFactor * 100)}%になるとして計算しています。{'\n'}
          {homeCharge
            ? `・家に1時間以上止めたら、${HOME_CHARGE_KW}kWで充電する想定です。`
            : '・家で充電できない設定なので、外で充電するまで電池は減り続けます。'}
          {'\n'}・計算の式は Web版シミュレーターと同じです。
        </ThemedText>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    paddingBottom: Spacing.one,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  row: {
    flexDirection: 'row',
    minHeight: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  c1: { flex: 1.4 },
  c2: { flex: 1, textAlign: 'right' },
  c3: { flex: 0.8, textAlign: 'right' },
});
