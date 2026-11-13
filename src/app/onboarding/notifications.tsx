import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { requestNotificationPermission } from '@/lib/notifications';
import type { CarType } from '@/recording/engine';
import { useRecordingActions } from '@/recording/recording-context';

const IS_WEB = Platform.OS === 'web';
const CAR_TYPES: CarType[] = ['gas', 'loanerEv', 'ownEv'];

/** 3. 通知の説明 → 記録を始める */
export default function NotificationPermissionScreen() {
  const { car } = useLocalSearchParams<{ car?: string }>();
  const actions = useRecordingActions();
  const [busy, setBusy] = useState(false);
  const carType: CarType = CAR_TYPES.includes(car as CarType) ? (car as CarType) : 'gas';

  const start = async (askFirst: boolean) => {
    setBusy(true);
    try {
      if (askFirst) await requestNotificationPermission();
      await actions.completeOnboarding(carType);
      router.replace('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="お知らせを受け取りますか"
      lead="記録が終わったときなどに、お知らせします。"
      footer={
        IS_WEB ? (
          <Button label="記録を始める" disabled={busy} onPress={() => void start(false)} />
        ) : (
          <>
            <Button label="お知らせを許可して始める" disabled={busy} onPress={() => void start(true)} />
            <Button
              label="お知らせなしで始める"
              variant="secondary"
              disabled={busy}
              onPress={() => void start(false)}
            />
          </>
        )
      }>
      <ThemedText type="note" color="sub">
        3 / 3
      </ThemedText>

      {IS_WEB ? (
        <InfoBox title="ブラウザではお知らせを使いません">
          スマホのアプリでは、ここでお知らせの許可を聞きます。ブラウザではこのまま始められます。
        </InfoBox>
      ) : null}

      <Section title="お知らせする内容">
        <View style={{ gap: Spacing.two }}>
          <ThemedText>・7日たって、結果が出たとき</ThemedText>
          <ThemedText>・記録が止まっているとき（位置の許可が変わったときなど）</ThemedText>
          {carType === 'ownEv' ? (
            <ThemedText>・充電スポットに止まったとき「ここで充電しましたか？」</ThemedText>
          ) : null}
        </View>
      </Section>
    </Screen>
  );
}
