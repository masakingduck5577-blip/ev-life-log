import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

type InfoBoxProps = {
  tone?: 'info' | 'warn' | 'ok';
  title?: string;
  children: ReactNode;
};

const TONES = {
  info: { bg: Colors.evTint, fg: Colors.navy, sf: 'info.circle', md: 'info' },
  warn: { bg: Colors.warnTint, fg: Colors.warn, sf: 'exclamationmark.triangle', md: 'warning' },
  ok: { bg: Colors.okTint, fg: Colors.ok, sf: 'checkmark.circle', md: 'check_circle' },
} as const;

/** 説明の箱。種類はアイコンと見出しでも伝える（色だけにしない） */
export function InfoBox({ tone = 'info', title, children }: InfoBoxProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg }]}>
      <Icon sf={t.sf} md={t.md} size={20} color={t.fg} />
      <View style={styles.text}>
        {title ? (
          <ThemedText type="bold" style={{ color: t.fg }}>
            {title}
          </ThemedText>
        ) : null}
        {typeof children === 'string' ? <ThemedText>{children}</ThemedText> : children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
});
