import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

type LinkRowProps = {
  title: string;
  description?: string;
  right?: ReactNode;
  onPress: () => void;
};

/** 押すと詳しい画面へ進む行 */
export function LinkRow({ title, description, right, onPress }: LinkRowProps) {
  return (
    <Pressable
      role="link"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.text}>
        <ThemedText type="bold">{title}</ThemedText>
        {description ? (
          <ThemedText type="note" color="sub">
            {description}
          </ThemedText>
        ) : null}
      </View>
      {right}
      <Icon sf="chevron.right" md="chevron_right" size={20} color={Colors.sub} />
    </Pressable>
  );
}

/** 数字のタイル（見出し・数字・補足） */
export function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.tile}>
      <ThemedText type="note" color="sub">
        {label}
      </ThemedText>
      <ThemedText style={styles.tileValue}>{value}</ThemedText>
      {note ? (
        <ThemedText type="note" color="sub">
          {note}
        </ThemedText>
      ) : null}
    </View>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <View style={styles.statRow}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    backgroundColor: Colors.panel,
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: Colors.bg,
    borderRadius: Radius.sm,
    padding: Spacing.two + 2,
    gap: Spacing.half,
  },
  tileValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
    color: Colors.ink,
  },
});
