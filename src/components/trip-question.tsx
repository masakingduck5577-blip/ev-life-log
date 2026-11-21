import { StyleSheet, View } from 'react-native';

import type { Trip } from '@/analysis/trips';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatKm, formatShortDate, formatTime } from '@/lib/format';

import { Button } from './button';
import { TRIP_LABEL } from './labels';
import { RouteMap } from './route-map';
import { ThemedText } from './themed-text';

type Props = {
  trip: Trip;
  answered: 'car' | 'transit' | undefined;
  onAnswer: (value: 'car' | 'transit' | null) => void;
  /** 地図で道を見せる（記録タブ）。1日の記録では上に地図があるので出さない */
  showMap?: boolean;
};

/** 「車でしたか？」の確認（電車かも・自転車かもの移動） */
export function TripQuestion({ trip: t, answered, onAnswer, showMap }: Props) {
  const reason =
    t.guess === 'train'
      ? `最高 時速${Math.round(t.maxSpeedKmh)}km。乗る前に歩いて待っていました`
      : `最高 時速${Math.round(t.maxSpeedKmh)}km。車にしては遅い移動です`;

  return (
    <View style={styles.box}>
      <ThemedText type="bold">
        {formatShortDate(t.start)} {formatTime(t.start)}〜{formatTime(t.end)}・{formatKm(t.distanceKm)}
      </ThemedText>
      {showMap ? (
        <RouteMap
          height={200}
          label={`${formatShortDate(t.start)} ${formatTime(t.start)}からの移動の地図`}
          fitKey={t.id}
          paths={[{ points: t.path, kind: 'car' }]}
          markers={[]}
        />
      ) : null}
      {answered ? (
        <>
          <ThemedText>
            {answered === 'car'
              ? '「車だった」と答えました。計算に入れています。'
              : '「車ではない」と答えました。計算に入れていません。'}
          </ThemedText>
          <Button label="答えを変える" variant="secondary" onPress={() => onAnswer(null)} />
        </>
      ) : (
        <>
          <ThemedText>
            {TRIP_LABEL[t.guess]}だったかもしれません（{reason}）。車でしたか？
          </ThemedText>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Button label="車だった" onPress={() => onAnswer('car')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="車ではない" variant="secondary" onPress={() => onAnswer('transit')} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.warnTint,
  },
  row2: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
