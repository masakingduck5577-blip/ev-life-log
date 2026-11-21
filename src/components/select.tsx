import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  /** 一覧で、この項目の前に出す見出し（例：「栃木県の市」） */
  group?: string;
  /** 車の写真など */
  image?: string;
};

type Props<T extends string> = {
  /** 一覧の見出しと、読み上げに使う名前 */
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  /** 押す部分を大きく見せる（見出しの代わりに使うとき） */
  large?: boolean;
  /** 選んでいるものの後ろに付ける言葉（例：「だったら」） */
  valueSuffix?: string;
};

/** プルダウン：押すと一覧が開き、選ぶと閉じる。選んでいるものは ✓ と太字で示す（色だけにしない） */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = '選んでください',
  large,
  valueSuffix,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const current = options.find((o) => o.value === value);

  return (
    <>
      <Pressable
        role="button"
        aria-label={`${label}：${current?.label ?? placeholder}`}
        aria-haspopup="listbox"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, large && styles.triggerLarge, pressed && styles.pressed]}>
        {current?.image ? <Image source={{ uri: current.image }} style={large ? styles.thumbLarge : styles.thumb} resizeMode="contain" /> : null}
        <ThemedText type={large ? 'heading' : 'default'} color={current ? 'ink' : 'sub'} style={styles.triggerText}>
          {current ? `${current.label}${valueSuffix ?? ''}` : placeholder}
        </ThemedText>
        <Icon sf="chevron.down" md="expand_more" size={20} color={Colors.ev} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="閉じる">
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <ThemedText type="heading" style={{ flex: 1 }}>
                {label}
              </ThemedText>
              <Pressable role="button" aria-label="閉じる" onPress={() => setOpen(false)} style={styles.close}>
                <Icon sf="xmark" md="close" size={22} color={Colors.ink} />
              </Pressable>
            </View>
            <ScrollView aria-label={label}>
              {options.map((o, i) => {
                const selected = o.value === value;
                const showGroup = o.group && o.group !== options[i - 1]?.group;
                return (
                  <View key={o.value}>
                    {showGroup ? (
                      <ThemedText type="note" color="sub" style={styles.group}>
                        {o.group}
                      </ThemedText>
                    ) : null}
                    <Pressable
                      role="option"
                      aria-selected={selected}
                      onPress={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}>
                      {o.image ? <Image source={{ uri: o.image }} style={styles.thumb} resizeMode="contain" /> : null}
                      <ThemedText type={selected ? 'bold' : 'default'} style={{ flex: 1 }}>
                        {o.label}
                      </ThemedText>
                      {selected ? <Icon sf="checkmark" md="check" size={20} color={Colors.ev} /> : null}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: Math.max(MinTouch, 48),
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    backgroundColor: Colors.panel,
  },
  triggerLarge: {
    borderColor: Colors.ev,
  },
  triggerText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  thumb: {
    width: 56,
    height: 36,
  },
  thumbLarge: {
    width: 80,
    height: 50,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 38, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: MaxContentWidth,
    maxHeight: '75%',
    backgroundColor: Colors.panel,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  close: {
    width: MinTouch,
    height: MinTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
  },
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  optionSelected: {
    backgroundColor: Colors.evTint,
  },
});
