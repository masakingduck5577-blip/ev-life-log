import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import { OUTSIDE_TOCHIGI, TOCHIGI_CITIES, TOCHIGI_TOWNS } from '@/data/cities';

import { ThemedText } from './themed-text';

type Props = {
  value: string | null;
  onChange: (city: string) => void;
};

/** 住んでいる市区町村を選ぶ（栃木県の市町＋県外） */
export function CityPicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap} role="radiogroup" aria-label="住んでいる市区町村">
      <ThemedText type="heading">住んでいる市区町村</ThemedText>
      <ThemedText type="note" color="sub">
        補助金と、充電マップの初めの場所に使います。番地までは聞きません。
      </ThemedText>
      <ThemedText type="bold">栃木県の市</ThemedText>
      <Chips items={TOCHIGI_CITIES} value={value} onChange={onChange} />
      <ThemedText type="bold">栃木県の町</ThemedText>
      <Chips items={TOCHIGI_TOWNS} value={value} onChange={onChange} />
      <Chips items={[OUTSIDE_TOCHIGI]} value={value} onChange={onChange} />
    </View>
  );
}

function Chips({
  items,
  value,
  onChange,
}: {
  items: readonly string[];
  value: string | null;
  onChange: (city: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {items.map((name) => {
        const selected = value === name;
        return (
          <Pressable
            key={name}
            role="radio"
            aria-checked={selected}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(name)}
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}>
            {/* 選んだものは色に加えて「✓」でも示す */}
            <ThemedText type={selected ? 'bold' : 'default'} color={selected ? 'navy' : 'ink'}>
              {selected ? `✓ ${name}` : name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: MinTouch,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    backgroundColor: Colors.panel,
  },
  chipSelected: {
    borderWidth: 1.5,
    borderColor: Colors.ev,
    backgroundColor: Colors.evTint,
  },
  pressed: {
    opacity: 0.75,
  },
});
