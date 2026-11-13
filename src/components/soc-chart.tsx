import { StyleSheet, View } from 'react-native';

import { SAFE_SOC } from '@/analysis/ev';
import { Colors, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

export type SocDay = { label: string; normal: number; winter: number };

const H = 150;
/** 日付の文字の高さ（棒の下） */
const LABEL_H = 26;

/**
 * 7日間の電池の残り（その日でいちばん少ないとき）。ふだん と 冬 を並べる。
 * 数字も棒の上に書く（色だけで伝えない）。安心ライン（20%）に線を引く。
 */
export function SocChart({ days }: { days: SocDay[] }) {
  return (
    <View>
      <View style={styles.legend}>
        <Legend color={Colors.ev} text="ふだん" />
        <Legend color={Colors.navy} text="冬" />
        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <ThemedText type="note" color="sub">
            安心ライン {SAFE_SOC}%
          </ThemedText>
        </View>
      </View>
      <View style={styles.chart} accessible accessibilityLabel={days.map((d) => `${d.label} ふだん${Math.round(d.normal)}% 冬${Math.round(d.winter)}%`).join('、')}>
        <View style={[styles.safeLine, { bottom: (SAFE_SOC / 100) * H + LABEL_H }]} />
        {days.map((d) => (
          <View key={d.label} style={styles.day}>
            <View style={styles.bars}>
              <Bar value={d.normal} color={Colors.ev} />
              <Bar value={d.winter} color={Colors.navy} />
            </View>
            <ThemedText type="note" color="sub" style={styles.dayLabel}>
              {d.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.barCol}>
      <ThemedText style={styles.barValue}>{Math.round(v)}</ThemedText>
      <View style={[styles.bar, { height: (v / 100) * H, backgroundColor: color }]} />
    </View>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, { backgroundColor: color }]} />
      <ThemedText type="note" color="sub">
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendBox: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendLine: {
    width: 18,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.warn,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 22,
    position: 'relative',
  },
  safeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.warn,
  },
  day: {
    flex: 1,
    alignItems: 'center',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: H,
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 14,
    lineHeight: 18,
    color: Colors.ink,
  },
  bar: {
    width: 16,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  dayLabel: {
    marginTop: Spacing.one,
    height: LABEL_H - Spacing.one,
  },
});
