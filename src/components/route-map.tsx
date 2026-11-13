import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';
import type { RouteMapProps } from './route-map.types';

export type { MapMarker, MapPath } from './route-map.types';

/**
 * 地図（スマホ）。スマホで地図を出すには、地図の部品を入れて開発用ビルドを作り直す必要があるので、
 * 今は説明だけを出す（ブラウザ版は route-map.web.tsx）。
 */
export function RouteMap({ height = 240, label }: RouteMapProps) {
  return (
    <View style={[styles.box, { height }]} accessibilityLabel={label}>
      <ThemedText color="sub" style={styles.text}>
        地図はスマホのアプリでは準備中です。ブラウザ版で見られます。
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  text: {
    textAlign: 'center',
  },
});
