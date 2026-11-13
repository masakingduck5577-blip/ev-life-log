import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatTimes, SAFE_SOC } from '@/analysis/ev';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatKm, formatYen } from '@/lib/format';
import type { AnalysisResult } from '@/recording/use-analysis';

import { Icon } from './icon';
import { LinkRow, StatRow, StatTile } from './link-row';
import { ThemedText } from './themed-text';

/**
 * 5. 結果：判定と3つの数字だけを先に出し、詳しい内容は下の行から見る。
 * EVに乗っている人は、あなたの充電代（E3）を出す。
 */
export function ResultSummary({ result, ownEv, partial }: { result: AnalysisResult; ownEv: boolean; partial: boolean }) {
  const { analysis: a, own } = result;
  const ev = a.ev;
  const homeCharge = result.evInput.homeEnv !== 'none';
  const diff = ev.cost.gas - ev.cost.ev;

  if (ownEv) {
    return (
      <View style={styles.wrap}>
        <ThemedText type="heading">あなたの充電代{partial ? '（ここまで）' : ''}</ThemedText>
        <StatRow>
          <StatTile label="1週間" value={formatYen(own.weekYen)} />
          <StatTile label="1か月にすると" value={formatYen(own.monthYen)} />
          <StatTile label="1kmあたり" value={`${own.perKmYen.toFixed(1)}円`} />
        </StatRow>
        <LinkRow title="あなたの充電代をくわしく" description="家・外の内訳、ガソリン車との比較、安くする方法" onPress={() => router.push('/result/charge-cost')} />
        <LinkRow title="7日間の電池の残り" onPress={() => router.push('/result/battery')} />
        <LinkRow title="通った道の充電スポット" onPress={() => router.push('/result/spots')} />
      </View>
    );
  }

  const levelIcon =
    ev.verdict.level === 'ok'
      ? ({ sf: 'checkmark.circle', md: 'check_circle', color: Colors.ok, bg: Colors.okTint } as const)
      : ({ sf: 'exclamationmark.triangle', md: 'warning', color: Colors.warn, bg: Colors.warnTint } as const);

  return (
    <View style={styles.wrap}>
      <View style={[styles.verdict, { backgroundColor: levelIcon.bg }]}>
        <Icon sf={levelIcon.sf} md={levelIcon.md} size={26} color={levelIcon.color} />
        <View style={{ flex: 1 }}>
          <ThemedText type="note" color="sub">
            {ev.ev.name}だったら{partial ? '（ここまでの記録で）' : ''}
          </ThemedText>
          <ThemedText type="heading" style={{ color: levelIcon.color }}>
            {ev.verdict.text}
          </ThemedText>
        </View>
      </View>
      <StatRow>
        <StatTile label="走った距離" value={formatKm(a.carKm)} note={`運転 ${a.carTripCount}回`} />
        {homeCharge ? (
          <StatTile label="家での充電" value={`${ev.normal.homeCharges}回`} note={`いちばん少ないとき ${Math.round(ev.normal.minSoc)}%`} />
        ) : (
          <StatTile label="外での充電" value={`週に約${formatTimes(ev.publicPerWeek.normal)}`} note={`冬は約${formatTimes(ev.publicPerWeek.winter)}`} />
        )}
        <StatTile
          label="燃料代の差（1週間）"
          value={diff >= 0 ? `${formatYen(diff)}安い` : `${formatYen(-diff)}高い`}
          note={`ガソリン ${formatYen(ev.cost.gas)} → 電気 ${formatYen(ev.cost.ev)}`}
        />
      </StatRow>
      {ev.normal.minSoc < SAFE_SOC ? (
        <ThemedText type="note" color="warn">
          電池の残りが安心ライン（{SAFE_SOC}%）を下回る日があります。
        </ThemedText>
      ) : null}
      <ThemedText type="bold" style={{ marginTop: Spacing.two }}>
        詳しく見る
      </ThemedText>
      <LinkRow title="あなたの1週間で見るEVの違い" description="待っていた時間、ガソリンスタンド、メンテナンス" onPress={() => router.push('/result/difference')} />
      <LinkRow title="7日間の電池の残り" description="日ごとのグラフ、冬の場合" onPress={() => router.push('/result/battery')} />
      <LinkRow title="通った道の充電スポット" description={`近くに ${a.spots.length}か所`} onPress={() => router.push('/result/spots')} />
      <LinkRow title="費用・補助金と相談メモ" description="燃料・電気代、国と市町の補助金" onPress={() => router.push('/result/cost')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
