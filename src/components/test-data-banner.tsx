import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useRecording } from '@/recording/recording-context';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

/** テストデータのとき、画面の上に出す帯（目立ちすぎないように、薄い青に紺の文字） */
export function TestDataBanner() {
  const { mode, scenarioId, ready } = useRecording();
  const insets = useSafeAreaInsets();
  if (!ready || mode !== 'test') return null;

  return (
    <View role="status" style={[styles.bar, { paddingTop: insets.top + Spacing.one }]}>
      <Icon sf="info.circle" md="info" size={18} color={Colors.navy} />
      <ThemedText type="note" color="navy" style={styles.text}>
        テストデータで表示中（シナリオ{scenarioId}）
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.evTint,
    borderBottomWidth: 1,
    borderColor: Colors.evLight,
  },
  text: {
    fontWeight: 500,
  },
});
