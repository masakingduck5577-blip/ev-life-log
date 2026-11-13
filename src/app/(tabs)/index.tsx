import { router } from 'expo-router';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DAY_MS } from '@/lib/clock';
import { formatDate, formatNumber, formatShortDate, formatTime, jstMidnight } from '@/lib/format';
import type { Activity } from '@/location/source';
import { RECORDING_DAYS } from '@/recording/engine';
import {
  getProgress,
  useNow,
  useRecording,
  useRecordingActions,
} from '@/recording/recording-context';

const ACTIVITY_LABEL: Record<Activity, string> = {
  automotive: '乗り物',
  walking: '歩き',
  stationary: '止まっている',
  unknown: '不明',
};

/** 記録タブ：記録中の状態・1日の記録・結果 */
export default function RecordScreen() {
  const snapshot = useRecording();
  const actions = useRecordingActions();
  const now = useNow(snapshot.clock);
  const progress = getProgress(snapshot, now);
  const openDevSettings = useHiddenTap(() => router.push('/dev'));
  const { startedAt, endsAt, lastPoint, pointCount, dayCounts } = snapshot;

  return (
    <Screen
      title="記録"
      lead="1週間ふだん通りに過ごすと、車での移動を記録します。"
      onTitlePress={openDevSettings}>
      <Section title="記録中の状態">
        {!snapshot.ready ? (
          <ThemedText color="sub">読み込んでいます</ThemedText>
        ) : progress.status === 'notStarted' ? (
          <ThemedText>まだ記録していません。</ThemedText>
        ) : progress.status === 'stopped' ? (
          <ThemedText>記録を止めました。</ThemedText>
        ) : progress.status === 'finished' ? (
          <View style={styles.status}>
            <ThemedText type="heading" color="ev">
              1週間の記録が終わりました
            </ThemedText>
            <ThemedText color="sub">下の「結果」で確かめられます。</ThemedText>
          </View>
        ) : (
          <View style={styles.status}>
            <ThemedText color="sub">
              {formatDate(now)} {formatTime(now)} ・ {progress.day}日目
            </ThemedText>
            <View style={styles.bigRow}>
              <ThemedText>結果が出るまで あと</ThemedText>
              <ThemedText style={styles.big}>{progress.daysLeft}</ThemedText>
              <ThemedText>日</ThemedText>
            </View>
            {endsAt != null ? (
              <ThemedText type="note" color="sub">
                {formatDate(endsAt - 1)} の終わりまで記録します
              </ThemedText>
            ) : null}
          </View>
        )}
        {snapshot.ready && progress.status !== 'notStarted' ? (
          <View style={styles.stats}>
            <Stat label="記録した位置" value={`${formatNumber(pointCount)}件`} />
            <Stat
              label="最後の記録"
              value={lastPoint ? `${formatTime(Date.parse(lastPoint.t))}（${ACTIVITY_LABEL[lastPoint.activity]}）` : 'まだありません'}
            />
          </View>
        ) : null}
        {snapshot.mode === 'device' && progress.status === 'recording' ? (
          <Button label="記録を止める" variant="secondary" onPress={() => void actions.stopDeviceRecording()} />
        ) : null}
        {snapshot.error ? <InfoBox tone="warn" title="うまく動いていません">{snapshot.error}</InfoBox> : null}
      </Section>

      <Section title="1日の記録" description="運転の見分け（車・電車・バス）はこれから作ります。今は受け取った位置の数を出しています。">
        <View role="list">
          {dayCounts.map((count, i) => {
            const dayStart = startedAt != null ? jstMidnight(startedAt) + i * DAY_MS : null;
            const isToday = progress.status === 'recording' && progress.day === i + 1;
            const future = progress.status === 'recording' && i + 1 > progress.day;
            return (
              <View key={i} role="listitem" style={[styles.day, isToday && styles.dayToday]}>
                <ThemedText type="bold" style={styles.dayNo}>
                  {i + 1}日目
                </ThemedText>
                <ThemedText color="sub" style={styles.dayDate}>
                  {`${dayStart != null ? formatShortDate(dayStart) : ''}${isToday ? ' 今日' : ''}`}
                </ThemedText>
                <ThemedText style={styles.dayCount}>
                  {future || startedAt == null ? 'まだ' : `位置 ${formatNumber(count)}件`}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </Section>

      <Section
        title="結果：あなたの1週間がEVだったら"
        description={
          progress.status === 'finished'
            ? '7日分の記録がそろいました。電池の残り・充電スポット・費用の計算はこれから作ります。'
            : `${RECORDING_DAYS}日たつと、電池の残り、通った道の充電スポット、費用の違いを表示します。`
        }
        pending
      />

      {__DEV__ ? (
        <Button label="開発用の設定" variant="secondary" onPress={() => router.push('/dev')} />
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="note" color="sub">
        {label}
      </ThemedText>
      <ThemedText type="bold">{value}</ThemedText>
    </View>
  );
}

/** 5回続けて押すと開く（最終報告会のデモ用のビルドで、開発用の設定を開くため） */
function useHiddenTap(onOpen: () => void) {
  const taps = useRef<number[]>([]);
  return () => {
    const t = Date.now();
    taps.current = [...taps.current.filter((x) => t - x < 3000), t];
    if (taps.current.length >= 5) {
      taps.current = [];
      onOpen();
    }
  };
}

const styles = StyleSheet.create({
  status: {
    gap: Spacing.one,
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  big: {
    fontSize: 40,
    lineHeight: 48,
    fontWeight: 700,
    color: Colors.ev,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    padding: Spacing.two + 2,
    gap: Spacing.half,
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  dayToday: {
    backgroundColor: Colors.evTint,
    borderRadius: Radius.sm,
  },
  dayNo: {
    width: 56,
  },
  dayDate: {
    flex: 1,
  },
  dayCount: {
    textAlign: 'right',
  },
});
