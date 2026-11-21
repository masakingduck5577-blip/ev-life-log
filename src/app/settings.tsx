import { View } from 'react-native';

import { Choice } from '@/components/button';
import { CityPicker } from '@/components/city-picker';
import { PermissionRows } from '@/components/permission-rows';
import { Screen, Section } from '@/components/screen';
import { SettingsForm } from '@/components/settings-form';
import { Spacing } from '@/constants/theme';
import { usePermissions } from '@/lib/use-permissions';
import type { CarType } from '@/recording/engine';
import { useRecording, useRecordingActions } from '@/recording/recording-context';

const CAR_TYPES: { value: CarType; title: string }[] = [
  { value: 'gas', title: '今乗っている車（ガソリン車）で記録' },
  { value: 'loanerEv', title: 'お店の代車・レンタカーのEVで記録' },
  { value: 'ownEv', title: 'EVに乗っている' },
];

/** 設定：位置とお知らせの許可、車と住まい（初期設定と同じ内容） */
export default function SettingsScreen() {
  const { settings, carType } = useRecording();
  const actions = useRecordingActions();
  const { location, notification } = usePermissions();
  const car = carType ?? 'gas';

  return (
    <Screen title="設定" back>
      <Section title="位置情報とお知らせ" icon={{ sf: 'location', md: 'location_on' }}>
        <PermissionRows location={location} notification={notification} hideBody />
      </Section>
      <Section title="どの車で記録しますか" icon={{ sf: 'car', md: 'directions_car' }}>
        <View style={{ gap: Spacing.two }} role="radiogroup" aria-label="どの車で記録しますか">
          {CAR_TYPES.map((c) => (
            <Choice key={c.value} title={c.title} selected={car === c.value} onPress={() => void actions.setCarType(c.value)} />
          ))}
        </View>
      </Section>
      <CityPicker value={settings.city} onChange={(city) => void actions.updateSettings({ city })} />
      <SettingsForm carType={car} value={settings} onChange={(p) => void actions.updateSettings(p)} />
    </Screen>
  );
}
