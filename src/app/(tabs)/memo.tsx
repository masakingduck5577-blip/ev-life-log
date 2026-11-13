import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatTimes, perMonth } from '@/analysis/ev';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { InfoBox } from '@/components/info-box';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import { formatDate, formatDuration, formatKm, formatMan, formatYen } from '@/lib/format';
import { RECORDING_DAYS } from '@/recording/engine';
import { useRecording } from '@/recording/recording-context';
import { useAnalysis } from '@/recording/use-analysis';
import { useSimulatorUrl } from '@/recording/use-simulator-url';
import { getStore } from '@/storage/store';

const ASKS = [
  { id: 'subsidy', label: '補助金の申請のしかた' },
  { id: 'charger', label: '自宅の充電設備（工事・費用）' },
  { id: 'trial', label: '試乗・EVレンタカーで試したい' },
  { id: 'tradein', label: '今の車の下取り' },
  { id: 'plan', label: '電気料金のプラン' },
  { id: 'winter', label: '冬の電池の減り方' },
];

type MemoState = { asks: Record<string, boolean>; note: string };
const MEMO_KEY = 'memo';
const HOME_LABEL = { have: 'できる（設備あり）', install: '設備を付ければできる', none: 'できない' } as const;

/** 相談メモのタブ：結果を1枚にまとめて、販売店で見せる */
export default function MemoScreen() {
  const result = useAnalysis();
  const { startedAt, carType, settings } = useRecording();
  const simUrl = useSimulatorUrl('cost');
  const [memo, setMemo] = useState<MemoState>({ asks: {}, note: '' });

  useEffect(() => {
    void getStore()
      .getSetting<MemoState>(MEMO_KEY)
      .then((m) => m && setMemo(m));
  }, []);
  const save = (next: MemoState) => {
    setMemo(next);
    void getStore().setSetting(MEMO_KEY, next);
  };

  const a = result?.analysis;
  const ev = a?.ev;
  const ownEv = carType === 'ownEv';

  return (
    <Screen title="相談メモ" lead="記録の結果を1枚にまとめました。お店でスタッフに見せられます。">
      {!a || !ev || a.carTripCount === 0 ? (
        <InfoBox>記録が進むと、ここに結果がまとまります。</InfoBox>
      ) : (
        <View style={styles.sheet} nativeID="memo-sheet">
          <ThemedText type="heading" color="navy">
            EV相談メモ
          </ThemedText>
          <ThemedText type="note" color="sub">
            {startedAt != null ? `${formatDate(startedAt)}から${RECORDING_DAYS}日間の記録` : ''}・位置や通った道は入っていません
          </ThemedText>
          <Line label={ownEv ? '乗っているEV' : '検討中のEV'} value={ev.ev.name} />
          {!ownEv ? <Line label="判定" value={ev.verdict.text} strong /> : null}
          <Line label="1週間に走った距離" value={`${formatKm(a.carKm)}（運転 ${a.carTripCount}回・1年で約${formatNumberKm(ev.yearKm)}）`} />
          <Line
            label="電池の残り（いちばん少ないとき）"
            value={`ふだん ${Math.round(ev.normal.minSoc)}%・冬 ${Math.round(ev.winter.minSoc)}%`}
          />
          <Line label="自宅で充電" value={HOME_LABEL[settings.homeEnv]} />
          {settings.homeEnv === 'none' ? (
            <Line label="外での充電" value={`週に約${formatTimes(ev.publicPerWeek.normal)}（冬は約${formatTimes(ev.publicPerWeek.winter)}）`} />
          ) : null}
          {ownEv && result ? (
            <Line label="あなたの充電代" value={`1か月 ${formatYen(result.own.monthYen)}（1kmあたり ${result.own.perKmYen.toFixed(1)}円）`} strong />
          ) : (
            <Line
              label="燃料代（1か月）"
              value={`ガソリン ${formatYen(perMonth(ev.cost.gas))} → 電気 ${formatYen(perMonth(ev.cost.ev))}`}
              strong
            />
          )}
          <Line label="止まって待った時間（1週間）" value={formatDuration(a.waitMin)} />
          {!ownEv ? (
            <Line label="国の補助金" value={`${formatMan(ev.ev.subsidy)}（2027年1月以降の登録は${formatMan(ev.ev.subsidy2027)}）`} />
          ) : null}

          <ThemedText type="bold" style={{ marginTop: Spacing.two }}>
            聞きたいこと
          </ThemedText>
          <View style={{ gap: Spacing.one }}>
            {ASKS.map((q) => {
              const on = !!memo.asks[q.id];
              return (
                <Pressable
                  key={q.id}
                  role="checkbox"
                  aria-checked={on}
                  onPress={() => save({ ...memo, asks: { ...memo.asks, [q.id]: !on } })}
                  style={[styles.ask, on && styles.askOn]}>
                  <View style={[styles.box, on && styles.boxOn]}>
                    {on ? <Icon sf="checkmark" md="check" size={16} color={Colors.onEv} /> : null}
                  </View>
                  <ThemedText>{q.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            value={memo.note}
            onChangeText={(note) => save({ ...memo, note })}
            placeholder="ほかに聞きたいこと・メモ"
            placeholderTextColor={Colors.sub}
            multiline
            aria-label="ほかに聞きたいこと・メモ"
            style={styles.note}
          />
        </View>
      )}

      <Section title="お店で見せる">
        {Platform.OS === 'web' ? (
          <Button label="印刷・PDFで保存" onPress={() => window.print()} />
        ) : null}
        <Button label="Web版シミュレーターで詳しく見る" variant="secondary" onPress={() => void Linking.openURL(simUrl)} />
        <ThemedText type="note" color="sub">
          お店に集計の結果（週の距離・充電の回数・費用）を送る機能は準備中です。送る前に同意の画面を出します。
        </ThemedText>
      </Section>
    </Screen>
  );
}

const formatNumberKm = (km: number) => `${(Math.round(km / 100) * 100).toLocaleString('ja-JP')}km`;

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <ThemedText type="note" color="sub">
        {label}
      </ThemedText>
      <ThemedText type={strong ? 'bold' : 'default'}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.panel,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  line: {
    gap: Spacing.half,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  ask: {
    minHeight: MinTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.sm,
  },
  askOn: {
    backgroundColor: Colors.evTint,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.sub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    backgroundColor: Colors.ev,
    borderColor: Colors.ev,
  },
  note: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    padding: Spacing.three,
    fontSize: 16,
    color: Colors.ink,
    textAlignVertical: 'top',
  },
});
