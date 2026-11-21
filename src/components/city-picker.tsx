import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { OUTSIDE_TOCHIGI, TOCHIGI_CITIES, TOCHIGI_TOWNS } from '@/data/cities';

import { Select, type SelectOption } from './select';
import { ThemedText } from './themed-text';

const OPTIONS: SelectOption<string>[] = [
  ...TOCHIGI_CITIES.map((c) => ({ value: c, label: c, group: '栃木県の市' })),
  ...TOCHIGI_TOWNS.map((c) => ({ value: c, label: c, group: '栃木県の町' })),
  { value: OUTSIDE_TOCHIGI, label: OUTSIDE_TOCHIGI, group: 'そのほか' },
];

/** 住んでいる市区町村（プルダウン） */
export function CityPicker({ value, onChange }: { value: string | null; onChange: (city: string) => void }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="heading">住んでいる市区町村</ThemedText>
      <Select label="住んでいる市区町村" value={value} options={OPTIONS} onChange={onChange} />
    </View>
  );
}
