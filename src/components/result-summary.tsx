import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatTimes, TANK_L } from '@/analysis/ev';
import { Section } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { EVS } from '@/data/simulator';
import { formatShortDate, formatYen, jstMidnight } from '@/lib/format';
import { useRecordingActions } from '@/recording/recording-context';
import type { AnalysisResult } from '@/recording/use-analysis';

import { Icon } from './icon';
import { LinkRow } from './link-row';
import { Select } from './select';
import { SocChart } from './soc-chart';
import { ThemedText } from './themed-text';

/**
 * 結果（記録タブにそのまま並べる）。記録した日数は何日でもよい。
 * 1. EVだったら 2. EVのバッテリー残量 3. 給油と出先の充電 4. ほかの結果への入口
 */

type IconName = { sf: Parameters<typeof Icon>[0]['sf']; md: Parameters<typeof Icon>[0]['md'] };

const EV_OPTIONS = Object.entries(EVS).map(([key, e]) => ({ value: key, label: e.name, image: e.photo }));

/** 名前（左）と数字（右）の1行。数字が長くても、名前の列はずれない */
function ResultRow({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: IconName }) {
  return (
    <View style={styles.row}>
      {icon ? <Icon sf={icon.sf} md={icon.md} size={20} color={Colors.sub} /> : null}
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <View style={styles.rowValue}>
        <ThemedText type="bold" style={styles.rowValueText}>
          {value}
        </ThemedText>
        {sub ? (
          <ThemedText type="note" color="sub" style={styles.rowValueText}>
            {sub}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

/** 「○○だったら」の見出し。車はプルダウンで変えられる。日数は改行して青で出す */
function EvHeader({ result, own }: { result: AnalysisResult; own?: boolean }) {
  const actions = useRecordingActions();
  const ev = result.analysis.ev;
  return (
    <View style={{ gap: Spacing.one }}>
      <Select
        large
        label={own ? '乗っているEV' : 'どのEVで計算しますか'}
        value={ev.evKey}
        options={EV_OPTIONS}
        valueSuffix={own ? undefined : 'だったら'}
        onChange={(evKey) => void actions.updateSettings({ evKey })}
      />
      <ThemedText type="bold" color="ev">
        記録した{ev.days}日間
      </ThemedText>
    </View>
  );
}

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
    <Section title="EVだったら" icon={{ sf: 'bolt.car', md: 'electric_car' }}>
      <EvHeader result={result} />
      <View style={[styles.verdict, { backgroundColor: level.bg }]}>
        <Icon sf={level.sf} md={level.md} size={26} color={level.color} />
        <ThemedText type="heading" style={{ flex: 1, color: level.color }}>
          {ev.verdict.text}
        </ThemedText>
      </View>
      <View>
        {homeCharge ? (
          <ResultRow label="家で充電する回数" value={`${ev.normal.homeCharges}回`} icon={{ sf: 'house', md: 'home' }} />
        ) : null}
        <ResultRow label="ガソリン代" value={formatYen(ev.cost.gas)} icon={{ sf: 'fuelpump', md: 'local_gas_station' }} />
        <ResultRow label="電気代（EV）" value={formatYen(ev.cost.ev)} icon={{ sf: 'bolt', md: 'bolt' }} />
        <ResultRow
          label="燃料代の差"
          value={diff >= 0 ? `${formatYen(diff)} 安い` : `${formatYen(-diff)} 高い`}
          icon={{ sf: 'yensign.circle', md: 'currency_yen' }}
        />
      </View>
    </Section>
  );
}

/** 1. あなたの充電代（EVに乗っている人） */
export function OwnCostSection({ result }: { result: AnalysisResult }) {
  const { own } = result;
  return (
    <Section title="あなたの充電代" icon={{ sf: 'yensign.circle', md: 'currency_yen' }}>
      <EvHeader result={result} own />
      <View>
        <ResultRow label="充電代" value={formatYen(own.totalYen)} icon={{ sf: 'bolt', md: 'bolt' }} />
        <ResultRow label="1kmあたり" value={`${own.perKmYen.toFixed(1)}円`} icon={{ sf: 'road.lanes', md: 'route' }} />
      </View>
      <LinkRow title="あなたの充電代をくわしく" onPress={() => router.push('/result/charge-cost')} />
    </Section>
  );
}

/** 2. EVのバッテリー残量（グラフ） */
export function BatterySection({ result }: { result: AnalysisResult }) {
  const { ev } = result.analysis;
  const low = ev.normal.days.reduce((m, d) => (d.minSoc < m.minSoc ? d : m), ev.normal.days[0]);

  return (
    <Section title="EVのバッテリー残量" icon={{ sf: 'battery.75percent', md: 'battery_5_bar' }}>
      <SocChart start={jstMidnight(ev.normal.days[0].dayStart)} days={ev.days} normal={ev.normal.trace} />
      {/* グラフの大事な数字は、文字でも出す（色だけで伝えない） */}
      <ResultRow
        label="最も減ったときの残量"
        value={`${Math.round(low.minSoc)}%`}
        sub={formatShortDate(low.dayStart)}
        icon={{ sf: 'arrow.down.circle', md: 'arrow_circle_down' }}
      />
    </Section>
  );
}

/** 「約○日に1回」。回数が0なら null */
function everyDays(days: number, count: number): string | null {
  if (count <= 0) return null;
  const d = days / count;
  return d < 1 ? `1日に約${formatTimes(count / days)}` : `約${Math.round(d)}日に1回`;
}

/** 3. 給油と出先の充電：ガソリンスタンドに行く間隔と、EVで出先の充電スポットに行く回数 */
export function DifferenceSection({ result }: { result: AnalysisResult }) {
  const { ev } = result.analysis;
  // 満タン（30L）にするとして、何日に1回ガソリンスタンドに行くか
  const gasEvery = everyDays(ev.days, ev.cost.gasLiters / TANK_L);
  const homeCharge = result.evInput.homeEnv !== 'none';
  const outCount = homeCharge ? ev.normal.publicCharges : ev.publicCount;
  return (
    <Section title="給油と出先の充電" icon={{ sf: 'fuelpump', md: 'local_gas_station' }}>
      <View>
        <ResultRow label="ガソリンスタンド（今の車）" value={gasEvery ?? '行かない'} icon={{ sf: 'fuelpump', md: 'local_gas_station' }} />
        <ResultRow
          label="出先の充電スポット（EV）"
          value={outCount > 0 ? `${ev.days}日間で${homeCharge ? '' : '約'}${formatTimes(outCount)}` : '自宅充電のみでOK'}
          sub={outCount > 0 ? (everyDays(ev.days, outCount) ?? undefined) : undefined}
          icon={{ sf: 'ev.charger', md: 'ev_station' }}
        />
      </View>
    </Section>
  );
}

/** 4. ほかの結果（別の画面） */
export function MoreResultsSection({ result, ownEv }: { result: AnalysisResult; ownEv: boolean }) {
  return (
    <Section title="ほかの結果" icon={{ sf: 'list.bullet', md: 'list' }}>
      <LinkRow
        title="通った道の充電スポット"
        description={`近くに ${result.analysis.spots.length}か所`}
        onPress={() => router.push('/result/spots')}
      />
      {!ownEv ? <LinkRow title="費用・補助金と相談メモ" onPress={() => router.push('/result/cost')} /> : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  rowLabel: {
    flex: 1,
  },
  rowValue: {
    alignItems: 'flex-end',
  },
  rowValueText: {
    textAlign: 'right',
  },
});
