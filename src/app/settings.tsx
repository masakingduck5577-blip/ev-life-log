import { View } from 'react-native';

import { Choice } from '@/components/button';
import { Screen, Section } from '@/components/screen';
import { SettingsForm } from '@/components/settings-form';
import { Spacing } from '@/constants/theme';
import type { CarType } from '@/recording/engine';
import { useRecording, useRecordingActions } from '@/recording/recording-context';

const CAR_TYPES: { value: CarType; title: string }[] = [
  { value: 'gas', title: '今乗っている車（ガソリン車）で記録' },
  { value: 'loanerEv', title: 'お店の代車・レンタカーのEVで記録' },
  { value: 'ownEv', title: 'EVに乗っている' },
];

/** 設定を変える（初期設定と同じ内容） */
export default function SettingsScreen() {
  const { settings, carType } = useRecording();
  const actions = useRecordingActions();
  const car = carType ?? 'gas';

  return (
    <Screen title="設定" lead="変えると、結果の計算にすぐ反映されます。" back>
      <Section title="どの車で記録しますか">
        <View style={{ gap: Spacing.two }} role="radiogroup" aria-label="どの車で記録しますか">
          {CAR_TYPES.map((c) => (
            <Choice key={c.value} title={c.title} selected={car === c.value} onPress={() => void actions.setCarType(c.value)} />
          ))}
        </View>
      </Section>
      <SettingsForm carType={car} value={settings} onChange={(p) => void actions.updateSettings(p)} />
    </Screen>
  );
}
