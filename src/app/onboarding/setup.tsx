import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button, Choice } from '@/components/button';
import { CityPicker } from '@/components/city-picker';
import { Screen } from '@/components/screen';
import { SettingsForm } from '@/components/settings-form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CarType } from '@/recording/engine';
import { useRecording, useRecordingActions } from '@/recording/recording-context';

const CAR_TYPES: { value: CarType; title: string; description: string }[] = [
  {
    value: 'gas',
    title: 'ガソリン車（今乗っている車）',
    description: 'ふだんの運転を、EVに置き換えて計算します。',
  },
  {
    value: 'loanerEv',
    title: 'お店の代車・レンタカーのEV',
    description: '実際のEVの電費で計算します。点検で代車を借りたときなどに。',
  },
  {
    value: 'ownEv',
    title: 'EV（自分の車）',
    description: 'ふだんの充電代を、記録から出します。',
  },
];

/** 2. はじめの入力：車の種類・住んでいる市区町村・燃費・自宅の充電 → 記録を始める */
export default function SetupScreen() {
  const { trial } = useLocalSearchParams<{ trial?: string }>();
  const isTrial = trial === '1';
  const { settings, carType: savedCar, startedAt, stoppedAt, mode } = useRecording();
  const actions = useRecordingActions();
  // 選んでいなければ、今の設定の車の種類を出す
  const [picked, setCar] = useState<CarType | null>(null);
  const car: CarType = picked ?? savedCar ?? 'gas';
  const [busy, setBusy] = useState(false);
  // すでにスマホで記録している（ブラウザはテストデータを続ける）なら、記録を消さずに記録タブへ
  const continuing =
    savedCar != null && startedAt != null && stoppedAt == null && (Platform.OS === 'web' || mode === 'device');

  const start = async () => {
    setBusy(true);
    try {
      // 「テストデータで試す」から来たときはテストデータ、「はじめる」からはスマホの記録（ブラウザは常にテストデータ）
      await actions.setMode(isTrial ? 'test' : 'device');
      await actions.completeOnboarding(car);
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="あなたの車と住まい"
      lead="計算に使います。分からないところはそのままで始められ、あとから設定で変えられます。"
      back
      footer={
        <Button
          label={isTrial ? 'テストデータで試す' : continuing ? '記録へ' : '記録を始める'}
          disabled={busy}
          onPress={() => void start()}
        />
      }>
      <View style={{ gap: Spacing.two }} role="radiogroup" aria-label="今乗っている車">
        <ThemedText type="heading">今乗っている車</ThemedText>
        {CAR_TYPES.map((c) => (
          <Choice
            key={c.value}
            title={c.title}
            description={c.description}
            selected={car === c.value}
            onPress={() => setCar(c.value)}
          />
        ))}
      </View>

      <View style={{ marginTop: Spacing.three }}>
        <CityPicker value={settings.city} onChange={(city) => void actions.updateSettings({ city })} />
      </View>

      <View style={{ marginTop: Spacing.three }}>
        <SettingsForm
          compact
          carType={car}
          value={settings}
          onChange={(p) => void actions.updateSettings(p)}
        />
      </View>

      {car === 'ownEv' ? (
        <ThemedText type="note" color="sub">
          乗っているEVの車種と電気料金は、始めたあとに「設定」で選べます。
        </ThemedText>
      ) : null}
    </Screen>
  );
}
