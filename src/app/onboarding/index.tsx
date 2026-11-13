import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Choice } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { CarType } from '@/recording/engine';

const CAR_TYPES: { value: CarType; title: string; description: string }[] = [
  {
    value: 'gas',
    title: '今乗っている車（ガソリン車）で記録',
    description: 'ふだんの運転を、EVに置き換えて計算します。',
  },
  {
    value: 'loanerEv',
    title: 'お店の代車・レンタカーのEVで記録',
    description: '実際のEVの電費で計算します。点検で代車を借りたときなどに。',
  },
  {
    value: 'ownEv',
    title: 'EVに乗っている',
    description: 'ふだんの充電代を、記録から出します。',
  },
];

/** 1. はじめに：どの車で記録するか */
export default function WelcomeScreen() {
  const [car, setCar] = useState<CarType>('gas');

  return (
    <Screen
      title="はじめに"
      lead="1週間ふだん通りに過ごすと、車での移動を記録して「あなたの1週間がEVだったら」を見せます。"
      footer={
        <Button
          label="次へ"
          onPress={() => router.push({ pathname: '/onboarding/setup', params: { car } })}
        />
      }>
      <ThemedText type="note" color="sub">
        1 / 4
      </ThemedText>
      <View style={{ gap: Spacing.two }} role="radiogroup" aria-label="どの車で記録しますか">
        <ThemedText type="heading">どの車で記録しますか</ThemedText>
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
      <InfoBox title="登録なしで始められます">
        名前や免許証の登録はいりません。位置はスマホの中だけで計算し、外には送りません。
      </InfoBox>
    </Screen>
  );
}
