import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { InfoBox } from '@/components/info-box';
import { isDriving, TRIP_LABEL } from '@/components/labels';
import { StatRow, StatTile } from '@/components/link-row';
import {
  BatterySection,
  DifferenceSection,
  EvVerdictSection,
  MoreResultsSection,
  OwnCostSection,
} from '@/components/result-summary';
import { RouteMap } from '@/components/route-map';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import { dateKey, formatDate, formatKm, formatShortDate, formatTime, jstDayNumber } from '@/lib/format';
import { getProgress, useNow, useRecording, useRecordingActions } from '@/recording/recording-context';
import { useAnalysis } from '@/recording/use-analysis';

/** 記録タブ：記録の状態 → EVだったら → EVのバッテリー残量 → 給油と出先の充電 → 1日の記録 */
export default function RecordScreen() {
  const snapshot = useRecording();
  const actions = useRecordingActions();
  const now = useNow(snapshot.clock);
  const progress = getProgress(snapshot, now);
  const result = useAnalysis();
  const openDevSettings = useHiddenTap(() => router.push('/dev'));
  const { answers, carType } = snapshot;
  const a = result?.analysis;
  const ownEv = carType === 'ownEv';
  const recording = progress.status === 'recording';
  const today = a?.days.find((d) => jstDayNumber(d.dayStart) === jstDayNumber(now));
  const hasCarTrips = !!a && a.carTripCount > 0;

  return (
    <Screen title="EVライフログ" tabs onTitlePress={openDevSettings}>
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
          {/* 記録の状態（いちばん上。距離と回数だけ） */}
          <Section title={recording ? '記録中' : '記録を止めました'} icon={{ sf: 'record.circle', md: 'radio_button_checked' }}>
            <StatRow>
              <StatTile label="走った距離" value={formatKm(a?.carKm ?? 0)} />
              <StatTile label="運転の回数" value={`${a?.carTripCount ?? 0}回`} />
            </StatRow>
            {snapshot.error ? (
              <InfoBox tone="warn" title="うまく動いていません">
                {snapshot.error}
              </InfoBox>
            ) : null}
          </Section>

          {/* EVだったらの結果 */}
          {result && hasCarTrips ? (
            <>
              {ownEv ? <OwnCostSection result={result} /> : <EvVerdictSection result={result} />}
              <BatterySection result={result} />
            </>
          ) : (
            <InfoBox>車での移動が記録されると、ここに結果が出ます。</InfoBox>
          )}

          {/* 本人に確かめること（結果に関わる） */}
          {a?.home && answers.homeConfirmed == null ? (
            <Section title="家はここですか？" icon={{ sf: 'house', md: 'home' }} description="夜に長くいた場所を、家と考えました。家に止めていた時間で、家での充電を計算します。">
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

          {result && hasCarTrips ? (
            <>
              {!ownEv ? <DifferenceSection result={result} /> : null}
              <MoreResultsSection result={result} ownEv={ownEv} />
            </>
          ) : null}

          {/* 今日の移動 */}
          {recording && today ? (
            <Section title="今日の移動" icon={{ sf: 'car', md: 'directions_car' }}>
              {today.trips.length === 0 ? (
                <ThemedText color="sub">まだ移動していません。</ThemedText>
              ) : (
                today.trips.map((t) => (
                  <View key={t.id} style={styles.tripRow}>
                    <ThemedText style={styles.tripTime}>
                      {formatTime(t.start)}〜{isDriving(t, now, recording) ? '' : formatTime(t.end)}
                    </ThemedText>
                    <ThemedText type="bold">{isDriving(t, now, recording) ? '運転中' : TRIP_LABEL[t.kind]}</ThemedText>
                    <ThemedText style={styles.tripKm}>{formatKm(t.distanceKm)}</ThemedText>
                  </View>
                ))
              )}
            </Section>
          ) : null}

          {/* 1日の記録（新しい日から） */}
          <Section title="1日の記録" icon={{ sf: 'calendar', md: 'calendar_today' }}>
            <View role="list">
              {(a?.days ?? [])
                .map((d, i) => ({ d, battery: a?.ev.normal.days[i] }))
                .reverse()
                .map(({ d, battery }) => {
                  const isToday = recording && jstDayNumber(d.dayStart) === jstDayNumber(now);
                  const notCar = d.trips.filter((t) => t.kind !== 'car').length;
                  return (
                    <Pressable
                      key={d.dayStart}
                      role="listitem"
                      aria-label={`${formatDate(d.dayStart)}の記録`}
                      onPress={() => router.push({ pathname: '/day', params: { date: dateKey(d.dayStart) } })}
                      style={({ pressed }) => [styles.day, isToday && styles.dayToday, pressed && { opacity: 0.7 }]}>
                      <ThemedText type="bold" style={styles.dayDate}>
                        {`${formatShortDate(d.dayStart)}${isToday ? ' 今日' : ''}`}
                      </ThemedText>
                      <View style={styles.dayInfo}>
                        <ThemedText>
                          {d.carTrips.length ? `車 ${d.carTrips.length}回・${formatKm(d.carKm)}` : '車の運転なし'}
                        </ThemedText>
                        {battery && d.carTrips.length ? (
                          <ThemedText type="note" color="sub">
                            最も減ったとき {Math.round(battery.minSoc)}%
                          </ThemedText>
                        ) : null}
                      </View>
                      {notCar ? (
                        <ThemedText type="note" color="sub">
                          車以外 {notCar}
                        </ThemedText>
                      ) : null}
                      <Icon sf="chevron.right" md="chevron_right" size={18} color={Colors.sub} />
                    </Pressable>
                  );
                })}
            </View>
          </Section>
        </>
      )}

      <Button label="設定を変える" variant="secondary" onPress={() => router.push('/settings')} />
      {snapshot.mode === 'device' && recording ? (
        <Button label="記録を止める" variant="secondary" onPress={() => void actions.stopDeviceRecording()} />
      ) : null}
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
    minHeight: MinTouch + 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  dayToday: {
    backgroundColor: Colors.evTint,
    borderRadius: Radius.sm,
  },
  dayDate: {
    width: 110,
  },
  dayInfo: {
    flex: 1,
  },
});
