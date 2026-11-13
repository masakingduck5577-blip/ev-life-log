import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { Button } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  getLocationPermission,
  requestLocationPermission,
  type LocationPermission,
} from '@/location/source';
import { useRecording } from '@/recording/recording-context';

const IS_WEB = Platform.OS === 'web';

/** 2. 位置の「常に許可」の説明 */
export default function LocationPermissionScreen() {
  const { car } = useLocalSearchParams<{ car?: string }>();
  const { mode } = useRecording();
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  const next = () => router.push({ pathname: '/onboarding/notifications', params: { car } });

  useEffect(() => {
    if (!IS_WEB) void getLocationPermission().then(setPermission);
  }, []);

  const ask = async () => {
    const p = await requestLocationPermission();
    setPermission(p);
    if (p === 'always') next();
  };

  const footer = IS_WEB ? (
    <Button label="次へ" onPress={next} />
  ) : permission === 'always' ? (
    <Button label="次へ" onPress={next} />
  ) : (
    <>
      <Button label="位置の使用を許可する" onPress={() => void ask()} />
      <Button label="あとで設定する" variant="secondary" onPress={next} />
    </>
  );

  return (
    <Screen
      title="位置の使用を「常に」許可してください"
      lead="画面を閉じている間も、1週間の車での移動を記録するためです。"
      footer={footer}>
      <ThemedText type="note" color="sub">
        2 / 3
      </ThemedText>

      {IS_WEB ? (
        <InfoBox title="ブラウザではテストデータを使います">
          ブラウザでは本当の位置を使わず、宇都宮市周辺の架空の1週間（テストデータ）で表示します。許可はいりません。
        </InfoBox>
      ) : null}

      <Section title="許可のしかた（iPhone）">
        <View style={{ gap: Spacing.two }}>
          <ThemedText>1. 最初の確認で「アプリの使用中は許可」を選びます。</ThemedText>
          <ThemedText>2. あとで出る確認で「“常に許可”に変更」を選びます。</ThemedText>
          <ThemedText type="note" color="sub">
            出てこないときは、設定アプリ → EV Life Log → 位置情報 →「常に」にします。
          </ThemedText>
        </View>
      </Section>

      <InfoBox title="位置はスマホの外に送りません">
        位置と通った道は、スマホの中だけで計算します。外に送るのは、あなたが送ると決めた集計の結果（週の距離・充電の回数・費用）だけです。
      </InfoBox>

      {!IS_WEB && mode === 'test' ? (
        <InfoBox>今はテストデータで試しているので、許可しなくても進めます。</InfoBox>
      ) : null}

      {permission === 'always' ? (
        <InfoBox tone="ok" title="「常に許可」になっています">次へ進んでください。</InfoBox>
      ) : null}
      {permission === 'whenInUse' ? (
        <InfoBox tone="warn" title="今は「使用中のみ」です">
          <ThemedText>画面を閉じると記録が止まります。設定アプリで「常に」に変えてください。</ThemedText>
          <Button label="設定アプリを開く" variant="secondary" onPress={() => void Linking.openSettings()} />
        </InfoBox>
      ) : null}
      {permission === 'denied' ? (
        <InfoBox tone="warn" title="位置の使用が許可されていません">
          <ThemedText>記録するには、設定アプリで位置情報を「常に」にしてください。</ThemedText>
          <Button label="設定アプリを開く" variant="secondary" onPress={() => void Linking.openSettings()} />
        </InfoBox>
      ) : null}
    </Screen>
  );
}
