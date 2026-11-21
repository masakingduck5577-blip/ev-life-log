import { StyleSheet, View } from 'react-native';

import type { Trip } from '@/analysis/trips';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { Button } from './button';
import { Icon } from './icon';
import { ThemedText } from './themed-text';

type Props = {
  trip: Trip;
  /** 本人が「車だった」に直したか */
  corrected: boolean;
  onChange: (value: 'car' | null) => void;
};

/**
 * 車ではないと判断した移動（電車・自転車など）。判断した理由を出し、本人が「車だった」に直せる。
 * 聞く画面（確かめてほしい移動）には出さない。
 */
export function TripOverride({ trip: t, corrected, onChange }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Icon sf="info.circle" md="info" size={20} color={Colors.navy} />
        <ThemedText style={{ flex: 1 }}>
          {corrected ? '「車だった」に直しました。計算に入れています。' : `${t.reason ?? '車ではないと判断しました'}。計算に入れていません。`}
        </ThemedText>
      </View>
      {corrected ? (
        <Button label="元に戻す" variant="secondary" onPress={() => onChange(null)} />
      ) : (
        <Button label="車だった（計算に入れる）" variant="secondary" onPress={() => onChange('car')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Colors.evTint,
  },
  head: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
});
