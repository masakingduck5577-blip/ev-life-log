import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FULL_SOC, formatTimes, HOME_CHARGE_KW, SAFE_SOC, TANK_L } from '@/analysis/ev';
import { InfoBox } from '@/components/info-box';
import { Section } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PARAMS } from '@/data/simulator';
import { formatShortDate, formatYen, jstMidnight } from '@/lib/format';
import type { AnalysisResult } from '@/recording/use-analysis';

import { Icon } from './icon';
import { LinkRow, StatRow, StatTile } from './link-row';
import { SocChart } from './soc-chart';
import { ThemedText } from './themed-text';

/**
 * 結果（記録タブにそのまま並べる）。記録した日数は何日でもよい。
 * 1. EVだったら（判定・充電・費用） 2. 電池の残り 3. EVの違い 4. ほかの結果への入口
 */

/** 1. EVだったら（ガソリン車・代車の人） */
export function EvVerdictSection({ result }: { result: AnalysisResult }) {
  const ev = result.analysis.ev;
  const homeCharge = result.evInput.homeEnv !== 'none';
  const diff = ev.cost.gas - ev.cost.ev;
  const level =
    ev.verdict.level === 'ok'
      ? ({ sf: 'checkmark.circle', md: 'check_circle', color: Colors.ok, bg: Colors.okTint } as const)
      : ({ sf: 'exclamationmark.triangle', md: 'warning', color: Colors.warn, bg: Colors.warnTint } as const);

  return (
    <Section title={`${ev.ev.name}だったら`} description={`記録した${ev.days}日間の運転で計算しました。`}>
      <View style={[styles.verdict, { backgroundColor: level.bg }]}>
        <Icon sf={level.sf} md={level.md} size={26} color={level.color} />
        <ThemedText type="heading" style={{ flex: 1, color: level.color }}>
          {ev.verdict.text}
        </ThemedText>
      </View>
      <StatRow>
        {homeCharge ? (
          <StatTile label="家での充電" value={`${ev.normal.homeCharges}回`} note={`外での充電 ${ev.normal.publicCharges}回`} />
        ) : (
          <StatTile label="外での充電" value={`約${formatTimes(ev.publicCount.normal)}`} note={`冬は約${formatTimes(ev.publicCount.winter)}`} />
        )}
        <StatTile
          label="燃料代の差"
          value={diff >= 0 ? `${formatYen(diff)}安い` : `${formatYen(-diff)}高い`}
          note={`ガソリン ${formatYen(ev.cost.gas)} → 電気 ${formatYen(ev.cost.ev)}`}
        />
      </StatRow>
    </Section>
  );
}

/** 1. あなたの充電代（EVに乗っている人） */
export function OwnCostSection({ result }: { result: AnalysisResult }) {
  const { analysis: a, own } = result;
  return (
    <Section title="あなたの充電代" description={`記録した${a.ev.days}日間の運転で計算しました。`}>
      <StatRow>
        <StatTile label={`${a.ev.days}日間`} value={formatYen(own.totalYen)} />
        <StatTile label="1kmあたり" value={`${own.perKmYen.toFixed(1)}円`} />
      </StatRow>
      <LinkRow
        title="あなたの充電代をくわしく"
        description="家・外の内訳、ガソリン車との比較、安くする方法"
        onPress={() => router.push('/result/charge-cost')}
      />
    </Section>
  );
}

/** 2. 電池の残り（グラフ） */
export function BatterySection({ result, ownEv }: { result: AnalysisResult; ownEv: boolean }) {
  const { ev } = result.analysis;
  const homeCharge = result.evInput.homeEnv !== 'none';
  const lowest = (season: typeof ev.normal) =>
    season.days.reduce((m, d) => (d.minSoc < m.minSoc ? d : m), season.days[0]);
  const low = lowest(ev.normal);
  const lowWinter = lowest(ev.winter);

  return (
    <Section
      title="電池の残り"
      description={`${ev.ev.name}${ownEv ? 'で' : 'だったら'}、運転すると減り、家で充電すると増えます。`}>
      <SocChart
        start={jstMidnight(ev.normal.days[0].dayStart)}
        days={ev.days}
        normal={ev.normal.trace}
        winter={ev.winter.trace}
      />
      {/* グラフの大事な数字は、文字でも出す（色だけで伝えない） */}
      <StatRow>
        <StatTile label="いちばん少ないとき" value={`${Math.round(low.minSoc)}%`} note={formatShortDate(low.dayStart)} />
        <StatTile label="冬なら" value={`${Math.round(lowWinter.minSoc)}%`} note={formatShortDate(lowWinter.dayStart)} />
      </StatRow>
      {ev.winter.minSoc < SAFE_SOC || ev.normal.publicCharges > 0 ? (
        <InfoBox tone="warn" title="安心ラインを下回りそうな日があります">
          そうなる前に、外で充電する計算にしています（{SAFE_SOC}%から80%まで）。
        </InfoBox>
      ) : null}
      <ThemedText type="note" color="sub">
        電池は{FULL_SOC}%まで充電する想定です。
        {homeCharge ? `家に1時間以上止めたら、${HOME_CHARGE_KW}kWで充電します。` : '家で充電できない設定なので、外で充電するまで減り続けます。'}
        冬は走れる距離が{Math.round(PARAMS.winterFactor * 100)}%になるとして計算しています。
      </ThemedText>
    </Section>
  );
}

/** 3. EVの違い（ガソリンスタンド・メンテナンス） */
export function DifferenceSection({ result }: { result: AnalysisResult }) {
  const { ev } = result.analysis;
  const visits = ev.cost.gasLiters / TANK_L;
  const homeCharge = result.evInput.homeEnv !== 'none';
  return (
    <Section title="あなたの毎日で見るEVの違い">
      <ThemedText type="bold">ガソリンスタンドに行く回数（{ev.days}日間）</ThemedText>
      <StatRow>
        <StatTile
          label="今の車"
          value={`約${visits < 1 ? visits.toFixed(1) : Math.round(visits)}回`}
          note={`ガソリン 約${Math.round(ev.cost.gasLiters)}L`}
        />
        <StatTile
          label="EVなら"
          value={homeCharge ? '0回' : '外で充電'}
          note={homeCharge ? '家で充電' : `約${formatTimes(ev.publicCount.normal)}`}
        />
      </StatRow>
      <ThemedText type="note" color="sub">
        タンク{TANK_L}Lを満タンにするとして計算した目安です。
      </ThemedText>
      <ThemedText type="bold" style={{ marginTop: Spacing.two }}>
        メンテナンス
      </ThemedText>
      <ThemedText>エンジンオイルの交換がいらないなど、手入れが少なくなります。</ThemedText>
      <ThemedText type="note" color="sub">
        販売店の声：「維持費が約2割安い」
      </ThemedText>
    </Section>
  );
}

/** 4. ほかの結果（別の画面） */
export function MoreResultsSection({ result, ownEv }: { result: AnalysisResult; ownEv: boolean }) {
  return (
    <Section title="ほかの結果">
      <LinkRow
        title="通った道の充電スポット"
        description={`近くに ${result.analysis.spots.length}か所`}
        onPress={() => router.push('/result/spots')}
      />
      {!ownEv ? (
        <LinkRow
          title="費用・補助金と相談メモ"
          description="燃料・電気代、国と市町の補助金"
          onPress={() => router.push('/result/cost')}
        />
      ) : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
});
