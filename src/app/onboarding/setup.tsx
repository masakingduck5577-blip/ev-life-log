import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { SettingsForm } from '@/components/settings-form';
import { ThemedText } from '@/components/themed-text';
import type { CarType } from '@/recording/engine';
import { useRecording, useRecordingActions } from '@/recording/recording-context';

const CAR_TYPES: CarType[] = ['gas', 'loanerEv', 'ownEv'];

/** 2. 初期設定（EVに乗っている人は E1 の設定） */
export default function SetupScreen() {
  const { car } = useLocalSearchParams<{ car?: string }>();
  const carType: CarType = CAR_TYPES.includes(car as CarType) ? (car as CarType) : 'gas';
  const { settings } = useRecording();
  const actions = useRecordingActions();

  return (
    <Screen
      title={carType === 'ownEv' ? 'EVと電気代の設定' : '初期設定'}
      lead="あとから記録タブで変えられます。"
      back
      footer={
        <Button
          label="次へ"
          onPress={() => router.push({ pathname: '/onboarding/location', params: { car: carType } })}
        />
      }>
      <ThemedText type="note" color="sub">
        2 / 4
      </ThemedText>
      <SettingsForm carType={carType} value={settings} onChange={(p) => void actions.updateSettings(p)} />
    </Screen>
  );
}
