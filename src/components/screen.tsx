import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

type ScreenProps = {
  title: string;
  lead?: string;
  children?: ReactNode;
};

/** タブの画面の共通の枠：見出し・説明・中身（縦にスクロール） */
export function Screen({ title, lead, children }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <View style={styles.header}>
            <ThemedText type="title">{title}</ThemedText>
            {lead ? <ThemedText color="sub">{lead}</ThemedText> : null}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SectionProps = {
  title: string;
  description?: string;
  /** まだ作っていない部分に「準備中」を付ける */
  pending?: boolean;
  children?: ReactNode;
};

/** 白いパネルの区切り */
export function Section({ title, description, pending, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <ThemedText type="heading" style={styles.sectionTitle}>
          {title}
        </ThemedText>
        {pending ? (
          <View style={styles.pill}>
            <ThemedText type="note" color="warn" style={styles.pillText}>
              準備中
            </ThemedText>
          </View>
        ) : null}
      </View>
      {description ? <ThemedText color="sub">{description}</ThemedText> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  section: {
    backgroundColor: Colors.panel,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sectionTitle: {
    flexShrink: 1,
  },
  pill: {
    marginLeft: 'auto',
    backgroundColor: Colors.warnTint,
    borderRadius: 999,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half,
  },
  pillText: {
    fontWeight: 700,
  },
});
