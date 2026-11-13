import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: ReactNode;
};

/** ボタン（高さ48px。押せる部分は44px以上） */
export function Button({ label, onPress, variant = 'primary', disabled, icon }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      role="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        disabled && (primary ? styles.primaryDisabled : styles.secondaryDisabled),
        pressed && styles.pressed,
      ]}>
      {icon ? <View>{icon}</View> : null}
      <ThemedText
        type="bold"
        style={{ color: primary ? Colors.onEv : disabled ? Colors.sub : Colors.ink }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

type ChoiceProps = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /** 右に出す小さい札（例：「準備中」） */
  badge?: string;
};

/** 選ぶカード（ラジオボタン）。選んだものは枠の色と丸の印で示す（色だけにしない） */
export function Choice({ title, description, selected, onPress, disabled, badge }: ChoiceProps) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        disabled && styles.choiceDisabled,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.choiceText}>
        <ThemedText type="bold" color={disabled ? 'sub' : 'ink'}>
          {title}
        </ThemedText>
        {description ? (
          <ThemedText type="note" color="sub">
            {description}
          </ThemedText>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <ThemedText type="note" color="warn" style={styles.badgeText}>
            {badge}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.md - 2,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  primary: {
    backgroundColor: Colors.ev,
  },
  primaryDisabled: {
    backgroundColor: Colors.gas,
  },
  secondary: {
    backgroundColor: Colors.panel,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  secondaryDisabled: {
    backgroundColor: Colors.bg,
  },
  pressed: {
    opacity: 0.75,
  },
  choice: {
    minHeight: MinTouch + 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    backgroundColor: Colors.panel,
  },
  choiceSelected: {
    borderWidth: 1.5,
    borderColor: Colors.ev,
    backgroundColor: Colors.evTint,
  },
  choiceDisabled: {
    backgroundColor: Colors.bg,
  },
  choiceText: {
    flex: 1,
    gap: Spacing.half,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.sub,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.ev,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.ev,
  },
  badge: {
    backgroundColor: Colors.warnTint,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  badgeText: {
    fontWeight: 700,
  },
});
