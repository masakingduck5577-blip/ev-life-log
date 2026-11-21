import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { formatTimes, TANK_L } from '@/analysis/ev';
import { Section } from '@/components/screen';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatShortDate, formatYen, jstMidnight } from '@/lib/format';
import type { AnalysisResult } from '@/recording/use-analysis';

import { Icon } from './icon';
import { LinkRow } from './link-row';
import { SocChart } from './soc-chart';
import { ThemedText } from './themed-text';

/**
 * 結果（記録タブにそのまま並べる）。記録した日数は何日でもよい。
 * 1. EVだったら 2. 電池の残り 3. ガソリンスタンドに行く回数 4. ほかの結果への入口
 */

/** 名前（左）と数字（右）の1行。数字が長くても、名前の列はずれない */
function ResultRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.row}>
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
    <Section title={`${ev.ev.name}だったら（${ev.days}日間）`}>
      <View style={[styles.verdict, { backgroundColor: level.bg }]}>
        <Icon sf={level.sf} md={level.md} size={26} color={level.color} />
        <ThemedText type="heading" style={{ flex: 1, color: level.color }}>
          {ev.verdict.text}
        </ThemedText>
      </View>
      <View>
        {homeCharge ? <ResultRow label="家で充電する回数" value={`${ev.normal.homeCharges}回`} /> : null}
        <ResultRow
          label="外で充電する回数"
          value={homeCharge ? `${ev.normal.publicCharges}回` : `約${formatTimes(ev.publicCount)}`}
        />
        <ResultRow label="ガソリン代" value={formatYen(ev.cost.gas)} />
        <ResultRow label="電気代（EV）" value={formatYen(ev.cost.ev)} />
        <ResultRow
          label="燃料代の差"
          value={diff >= 0 ? `${formatYen(diff)} 安い` : `${formatYen(-diff)} 高い`}
        />
      </View>
    </Section>
  );
}

/** 1. あなたの充電代（EVに乗っている人） */
export function OwnCostSection({ result }: { result: AnalysisResult }) {
  const { analysis: a, own } = result;
  return (
    <Section title={`あなたの充電代（${a.ev.days}日間）`}>
      <View>
        <ResultRow label="充電代" value={formatYen(own.totalYen)} />
        <ResultRow label="1kmあたり" value={`${own.perKmYen.toFixed(1)}円`} />
      </View>
      <LinkRow title="あなたの充電代をくわしく" onPress={() => router.push('/result/charge-cost')} />
    </Section>
  );
}

/** 2. 電池の残り（グラフ） */
export function BatterySection({ result }: { result: AnalysisResult }) {
  const { ev } = result.analysis;
  const low = ev.normal.days.reduce((m, d) => (d.minSoc < m.minSoc ? d : m), ev.normal.days[0]);

  return (
    <Section title="電池の残り">
      <SocChart start={jstMidnight(ev.normal.days[0].dayStart)} days={ev.days} normal={ev.normal.trace} />
      {/* グラフの大事な数字は、文字でも出す（色だけで伝えない） */}
      <ResultRow label="いちばん少ないとき" value={`${Math.round(low.minSoc)}%`} sub={formatShortDate(low.dayStart)} />
    </Section>
  );
}

/** 3. ガソリンスタンドに行く回数 */
export function DifferenceSection({ result }: { result: AnalysisResult }) {
  const { ev } = result.analysis;
  const visits = ev.cost.gasLiters / TANK_L;
  const homeCharge = result.evInput.homeEnv !== 'none';
  return (
    <Section title={`ガソリンスタンドに行く回数（${ev.days}日間）`}>
      <View>
        <ResultRow
          label="今の車"
          value={`約${visits < 1 ? visits.toFixed(1) : Math.round(visits)}回`}
          sub={`ガソリン 約${Math.round(ev.cost.gasLiters)}L`}
        />
        <ResultRow label="EVなら" value="0回" sub={homeCharge ? '家で充電' : '外で充電'} />
      </View>
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
    gap: Spacing.three,
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
