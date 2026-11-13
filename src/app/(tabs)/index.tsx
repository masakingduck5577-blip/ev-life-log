import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { InfoBox } from '@/components/info-box';
import { TRIP_LABEL } from '@/components/labels';
import { StatRow, StatTile } from '@/components/link-row';
import { ResultSummary } from '@/components/result-summary';
import { RouteMap } from '@/components/route-map';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import {
  dateKey,
  formatDate,
  formatDuration,
  formatKm,
  formatShortDate,
  formatTime,
  jstDayNumber,
} from '@/lib/format';
import { RECORDING_DAYS } from '@/recording/engine';
import {
  getProgress,
  useNow,
  useRecording,
  useRecordingActions,
} from '@/recording/recording-context';
import { useAnalysis } from '@/recording/use-analysis';

/** 記録タブ：3. 記録中（ホーム）・5. 結果・1日の記録への入口 */
export default function RecordScreen() {
  const snapshot = useRecording();
  const actions = useRecordingActions();
  const now = useNow(snapshot.clock);
  const progress = getProgress(snapshot, now);
  const result = useAnalysis();
  const openDevSettings = useHiddenTap(() => router.push('/dev'));
  const { endsAt, answers, carType } = snapshot;
  const a = result?.analysis;
  const finished = progress.status === 'finished' || progress.status === 'stopped';
  const today = a?.days.find((d) => jstDayNumber(d.dayStart) === jstDayNumber(now));

  return (
    <Screen
      title="記録"
      lead="1週間ふだん通りに過ごすと、車での移動を記録します。"
      onTitlePress={openDevSettings}>
      {!snapshot.ready ? (
        <Section title="記録中の状態">
          <ThemedText color="sub">読み込んでいます</ThemedText>
        </Section>
      ) : progress.status === 'notStarted' ? (
        <Section title="記録中の状態">
          <ThemedText>まだ記録していません。</ThemedText>
        </Section>
      ) : (
        <>
          {/* 3. 記録中 */}
          <Section title={finished ? '1週間の記録が終わりました' : '記録中'}>
            {!finished ? (
              <View style={styles.status}>
                <ThemedText color="sub">
                  {formatDate(now)} {formatTime(now)} 現在
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
            ) : (
              <ThemedText color="sub">下の結果で、あなたの1週間がEVだったらを確かめられます。</ThemedText>
            )}
            {a ? (
              <StatRow>
                <StatTile label="走った距離" value={formatKm(a.carKm)} />
                <StatTile label="運転の回数" value={`${a.carTripCount}回`} />
                <StatTile label="止まって待った時間" value={formatDuration(a.waitMin)} />
              </StatRow>
            ) : null}
            {snapshot.mode === 'device' && progress.status === 'recording' ? (
              <Button label="記録を止める" variant="secondary" onPress={() => void actions.stopDeviceRecording()} />
            ) : null}
            {snapshot.error ? (
              <InfoBox tone="warn" title="うまく動いていません">
                {snapshot.error}
              </InfoBox>
            ) : null}
          </Section>

          {/* 本人に確かめること */}
          {a && a.needsAnswer.length > 0 ? (
            <InfoBox tone="warn" title={`確かめてほしい移動が${a.needsAnswer.length}件あります`}>
              <ThemedText>電車やバスだったかもしれない移動です。車だった移動だけを計算に入れます。</ThemedText>
              <Button
                label={`${formatShortDate(a.needsAnswer[0].start)}の記録を見る`}
                variant="secondary"
                onPress={() => router.push({ pathname: '/day', params: { date: dateKey(a.needsAnswer[0].start) } })}
              />
            </InfoBox>
          ) : null}
          {a?.home && answers.homeConfirmed == null ? (
            <Section title="家はここですか？" description="夜に長くいた場所を、家と考えました。家に止めていた時間で、家での充電を計算します。">
              <RouteMap
                height={180}
                label="家と考えた場所の地図"
                fitKey="home"
                markers={[{ id: 'home', kind: 'home', lat: a.home.lat, lng: a.home.lng, title: '家と考えた場所' }]}
              />
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Button label="はい" onPress={() => void actions.answerHome(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="ちがう" variant="secondary" onPress={() => void actions.answerHome(false)} />
                </View>
              </View>
            </Section>
          ) : null}
          {answers.homeConfirmed === false ? (
            <InfoBox tone="warn" title="家の場所が分からないので、家での充電を計算していません">
              <Button label="家の推定に戻す" variant="secondary" onPress={() => void actions.answerHome(null)} />
            </InfoBox>
          ) : null}

          {/* 今日の運転 */}
          {!finished && today ? (
            <Section title="今日の移動">
              {today.trips.length === 0 ? (
                <ThemedText color="sub">まだ移動していません。</ThemedText>
              ) : (
                today.trips.map((t) => (
                  <View key={t.id} style={styles.tripRow}>
                    <ThemedText style={styles.tripTime}>
                      {formatTime(t.start)}〜{formatTime(t.end)}
                    </ThemedText>
                    <ThemedText type="bold">{TRIP_LABEL[t.kind]}</ThemedText>
                    <ThemedText style={styles.tripKm}>{formatKm(t.distanceKm)}</ThemedText>
                    {t.needsAnswer ? (
                      <ThemedText type="note" color="warn">
                        確認
                      </ThemedText>
                    ) : null}
                  </View>
                ))
              )}
            </Section>
          ) : null}

          {/* 5. 結果（記録中は途中経過） */}
          {result && a && a.carTripCount > 0 ? (
            <Section title={finished ? '結果：あなたの1週間がEVだったら' : '途中経過'}>
              <ResultSummary result={result} ownEv={carType === 'ownEv'} partial={!finished} />
            </Section>
          ) : null}

          {/* 1日の記録 */}
          <Section title="1日の記録" description="日付を押すと、運転・地図・電池の残りを見られます。">
            <View role="list">
              {(a?.days ?? []).map((d) => {
                const isToday = progress.status === 'recording' && jstDayNumber(d.dayStart) === jstDayNumber(now);
                const future = progress.status === 'recording' && d.dayStart > now;
                const ask = d.trips.some((t) => t.needsAnswer);
                return (
                  <Pressable
                    key={d.dayStart}
                    role="listitem"
                    disabled={future}
                    aria-label={`${formatDate(d.dayStart)}の記録`}
                    onPress={() => router.push({ pathname: '/day', params: { date: dateKey(d.dayStart) } })}
                    style={({ pressed }) => [styles.day, isToday && styles.dayToday, pressed && { opacity: 0.7 }]}>
                    <ThemedText type="bold" style={styles.dayDate}>
                      {`${formatShortDate(d.dayStart)}${isToday ? ' 今日' : ''}`}
                    </ThemedText>
                    <ThemedText color={future ? 'sub' : 'ink'} style={styles.dayInfo}>
                      {future ? 'まだ' : d.carTrips.length ? `車 ${d.carTrips.length}回・${formatKm(d.carKm)}` : '車の運転なし'}
                    </ThemedText>
                    {ask ? (
                      <ThemedText type="note" color="warn">
                        確認
                      </ThemedText>
                    ) : null}
                    {!future ? <Icon sf="chevron.right" md="chevron_right" size={18} color={Colors.sub} /> : null}
                  </Pressable>
                );
              })}
              {!a ? (
                <ThemedText color="sub">{RECORDING_DAYS}日分の記録がここに並びます。</ThemedText>
              ) : null}
            </View>
          </Section>
        </>
      )}

      <Button label="設定を変える" variant="secondary" onPress={() => router.push('/settings')} />
      {__DEV__ ? (
        <Button label="開発用の設定" variant="secondary" onPress={() => router.push('/dev')} />
      ) : null}
    </Screen>
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
  row2: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  tripTime: {
    width: 110,
  },
  tripKm: {
    flex: 1,
    textAlign: 'right',
  },
  day: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: MinTouch + 4,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  dayToday: {
    backgroundColor: Colors.evTint,
    borderRadius: Radius.sm,
  },
  dayDate: {
    width: 120,
  },
  dayInfo: {
    flex: 1,
  },
});
