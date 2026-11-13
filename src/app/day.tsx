import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { spotsNearRoute } from '@/analysis/analyze';
import { HOME_CHARGE_KW } from '@/analysis/ev';
import { Button } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { chargerKindLabel, chargerMarker, TRIP_LABEL } from '@/components/labels';
import { StatRow, StatTile } from '@/components/link-row';
import { RouteMap, type MapMarker } from '@/components/route-map';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import { formatDate, formatDuration, formatKm, formatTime, fromDateKey } from '@/lib/format';
import { useRecording, useRecordingActions } from '@/recording/recording-context';
import { useAnalysis } from '@/recording/use-analysis';

/** 4. 1日の記録（/day?date=2026-11-18） */
export default function DayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const dayStart = fromDateKey(String(date));
  const result = useAnalysis();
  const { answers, carType, ready } = useRecording();
  const actions = useRecordingActions();
  const a = result?.analysis;
  const dayIndex = a?.days.findIndex((d) => d.dayStart === dayStart) ?? -1;
  const day = a && dayIndex >= 0 ? a.days[dayIndex] : null;
  // 読み込みが終わるまでは日付を出さない（サーバーで作る HTML には ?date= がないため、最初の表示をそろえる）
  const title = ready && Number.isFinite(dayStart) ? `${formatDate(dayStart)}の記録` : '1日の記録';

  if (!result || !a || !day) {
    return (
      <Screen title={title} back>
        <ThemedText color="sub">{result ? 'この日の記録はありません。' : '読み込んでいます'}</ThemedText>
      </Screen>
    );
  }

  const battery = result.analysis.ev.normal.days[dayIndex];
  const winter = result.analysis.ev.winter.days[dayIndex];
  const spots = spotsNearRoute(day.carTrips).slice(0, 30);
  const chargerStops = a.chargerStops.filter((c) => c.stop.start >= dayStart && c.stop.start < dayStart + 86400000);
  const homeCharge = result.evInput.homeEnv !== 'none';

  const markers: MapMarker[] = [
    ...spots.map((s) => chargerMarker(s.charger, `通った道から約${Math.round(s.nearestM)}m`)),
    ...day.waits.map((w) => ({
      id: `wait-${w.id}`,
      kind: 'stop' as const,
      lat: w.place.lat,
      lng: w.place.lng,
      title: `${formatTime(w.start)}から${formatDuration(w.durationMin)}待っていた`,
    })),
    ...(a.home ? [{ id: 'home', kind: 'home' as const, lat: a.home.lat, lng: a.home.lng, title: '家' }] : []),
  ];

  return (
    <Screen title={title} back>
      <RouteMap
        label={`${formatDate(dayStart)}に通った道と充電スポットの地図`}
        fitKey={String(date)}
        height={280}
        paths={day.trips.map((t) => ({ points: t.path, kind: t.kind === 'car' ? 'car' : 'transit' }))}
        markers={markers}
      />
      <ThemedText type="note" color="sub">
        青い線：車／灰色の点線：電車・バス。印：家・急（急速）・普（普通）・H（Honda Charge）・●（待っていた場所）
      </ThemedText>

      <StatRow>
        <StatTile label="走った距離" value={formatKm(day.carKm)} note={`車 ${day.carTrips.length}回`} />
        <StatTile
          label="電池の残り（EVだったら）"
          value={`${Math.round(battery.startSoc)}% → ${Math.round(battery.endSoc)}%`}
          note={`いちばん少ないとき ${Math.round(battery.minSoc)}%（冬 ${Math.round(winter.minSoc)}%）`}
        />
        <StatTile label="待っていた時間" value={formatDuration(day.waitMin)} />
      </StatRow>

      {a.home ? (
        <Section title="家に止めていた時間">
          <ThemedText>
            {formatDuration(battery.homeParkMin)}（充電できる量 約{Math.round(battery.homeChargeableKwh)}kWh）
          </ThemedText>
          <ThemedText type="note" color="sub">
            家の充電の速さ {HOME_CHARGE_KW}kW（200Vの普通充電の目安）で計算。
            {homeCharge ? `この日に家で入れた量 約${battery.homeChargedKwh.toFixed(1)}kWh。` : '家で充電できない設定なので、計算に入れていません。'}
          </ThemedText>
        </Section>
      ) : null}

      <Section title="移動">
        {day.trips.length === 0 ? <ThemedText color="sub">この日は移動がありません。</ThemedText> : null}
        {day.trips.map((t) => {
          const answered = answers.trips?.[t.id];
          return (
            <View key={t.id} style={styles.trip}>
              <View style={styles.tripHead}>
                <ThemedText style={styles.tripTime}>
                  {formatTime(t.start)}〜{formatTime(t.end)}
                </ThemedText>
                <ThemedText type="bold">{TRIP_LABEL[t.kind]}</ThemedText>
                <ThemedText style={styles.tripKm}>{formatKm(t.distanceKm)}</ThemedText>
              </View>
              {t.guess !== 'car' ? (
                <View style={styles.ask}>
                  <ThemedText>
                    {answered
                      ? answered === 'car'
                        ? '「車だった」と答えました。計算に入れています。'
                        : '「電車・バスだった」と答えました。計算に入れていません。'
                      : `${TRIP_LABEL[t.guess]}だったかもしれません（最高 時速${Math.round(t.maxSpeedKmh)}km、乗る前に歩いて待っていた）。車でしたか？`}
                  </ThemedText>
                  {answered ? (
                    <Button label="答えを変える" variant="secondary" onPress={() => void actions.answerTrip(t.id, null)} />
                  ) : (
                    <View style={styles.row2}>
                      <View style={{ flex: 1 }}>
                        <Button label="車だった" variant="secondary" onPress={() => void actions.answerTrip(t.id, 'car')} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button label="電車・バスだった" variant="secondary" onPress={() => void actions.answerTrip(t.id, 'transit')} />
                      </View>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </Section>

      {day.waits.length ? (
        <Section title="止まって待っていた時間" description="車で来て、歩かずに5〜30分止まっていたところ（お迎えなど）。">
          {day.waits.map((w) => (
            <ThemedText key={w.id}>
              {formatTime(w.start)}から {formatDuration(w.durationMin)}
            </ThemedText>
          ))}
          <ThemedText type="note" color="sub">
            EVなら、エンジンをかけずにエアコンを使って静かに待てます。
          </ThemedText>
        </Section>
      ) : null}

      {carType === 'ownEv' && chargerStops.length ? (
        <Section title="充電スポットに止まりました">
          {chargerStops.map((cs) => (
            <ChargeQuestion
              key={cs.stop.id}
              name={cs.charger.name}
              kind={chargerKindLabel(cs.charger)}
              time={`${formatTime(cs.stop.start)}から${formatDuration(cs.stop.durationMin)}`}
              answer={answers.charges?.[cs.stop.id] ?? null}
              onAnswer={(v) => void actions.answerCharge(cs.stop.id, v)}
            />
          ))}
        </Section>
      ) : null}

      <Section title="近くの充電スポット" description="この日に車で通った道から500m以内。">
        {spots.length === 0 ? <ThemedText color="sub">ありません。</ThemedText> : null}
        {spots.slice(0, 8).map((s) => (
          <View key={s.charger.id} style={styles.spot}>
            <ThemedText style={{ flex: 1 }}>{s.charger.name}</ThemedText>
            <ThemedText type="note" color="sub">
              {chargerKindLabel(s.charger)}・約{Math.round(s.nearestM)}m
            </ThemedText>
          </View>
        ))}
      </Section>
    </Screen>
  );
}

/** E2：「ここで充電しましたか？」 */
function ChargeQuestion({
  name,
  kind,
  time,
  answer,
  onAnswer,
}: {
  name: string;
  kind: string;
  time: string;
  answer: { charged: boolean; yen?: number | null } | null;
  onAnswer: (v: { charged: boolean; yen?: number | null } | null) => void;
}) {
  const [yen, setYen] = useState(answer?.yen != null ? String(answer.yen) : '');
  return (
    <View style={styles.charge}>
      <ThemedText type="bold">{name}</ThemedText>
      <ThemedText type="note" color="sub">
        {kind}・{time}
      </ThemedText>
      {answer == null ? (
        <>
          <ThemedText>ここで充電しましたか？</ThemedText>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Button label="した" variant="secondary" onPress={() => onAnswer({ charged: true })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="していない" variant="secondary" onPress={() => onAnswer({ charged: false })} />
            </View>
          </View>
        </>
      ) : (
        <>
          <ThemedText>{answer.charged ? '充電した' : '充電していない'}</ThemedText>
          {answer.charged ? (
            <View style={{ gap: Spacing.one }}>
              <ThemedText type="note" color="sub">
                払った金額（分かれば。入れると、その金額で計算します）
              </ThemedText>
              <TextInput
                value={yen}
                onChangeText={(t) => {
                  setYen(t);
                  const n = parseInt(t.replace(/[^\d]/g, ''), 10);
                  onAnswer({ charged: true, yen: Number.isFinite(n) ? n : null });
                }}
                inputMode="numeric"
                keyboardType="number-pad"
                placeholder="例：800"
                placeholderTextColor={Colors.sub}
                aria-label="払った金額（円）"
                style={styles.input}
              />
            </View>
          ) : null}
          <Button label="答えを変える" variant="secondary" onPress={() => onAnswer(null)} />
        </>
      )}
      <InfoBox>払った金額を入れなかった充電は、止めていた時間から量を推定し、目安の単価で計算します。</InfoBox>
    </View>
  );
}

const styles = StyleSheet.create({
  trip: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  tripHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tripTime: {
    width: 110,
  },
  tripKm: {
    flex: 1,
    textAlign: 'right',
  },
  ask: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.sm,
    backgroundColor: Colors.warnTint,
  },
  row2: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  spot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  charge: {
    gap: Spacing.two,
  },
  input: {
    minHeight: Math.max(MinTouch, 48),
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    color: Colors.ink,
    backgroundColor: Colors.panel,
  },
});
