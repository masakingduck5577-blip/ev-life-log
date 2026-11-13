import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

type ScreenProps = {
  title: string;
  lead?: string;
  /** 見出しを押したとき（開発用の設定を開く隠し操作に使う） */
  onTitlePress?: () => void;
  /** 画面の下に固定するもの（「次へ」ボタンなど） */
  footer?: ReactNode;
  children?: ReactNode;
};

/** 画面の共通の枠：見出し・説明・中身（縦にスクロール） */
export function Screen({ title, lead, onTitlePress, footer, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const heading = <ThemedText type="title">{title}</ThemedText>;
  return (
    <View style={[styles.safe, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <View style={styles.header}>
            {onTitlePress ? (
              <Pressable onPress={onTitlePress} accessible={false}>
                {heading}
              </Pressable>
            ) : (
              heading
            )}
            {lead ? <ThemedText color="sub">{lead}</ThemedText> : null}
          </View>
          {children}
        </View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.footerInner}>{footer}</View>
        </View>
      ) : null}
    </View>
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
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: Colors.panel,
    borderTopWidth: 1,
    borderColor: Colors.line,
  },
  footerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
});
