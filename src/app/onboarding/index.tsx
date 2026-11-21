import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { InfoBox } from '@/components/info-box';
import { PermissionRows } from '@/components/permission-rows';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePermissions } from '@/lib/use-permissions';
import { useRecording } from '@/recording/recording-context';

const IS_WEB = Platform.OS === 'web';

const STEPS: { sf: SFSymbol; md: AndroidSymbol; title: string; body: string }[] = [
  {
    sf: 'iphone',
    md: 'smartphone',
    title: 'いつも通りスマホを持って過ごす',
    body: 'アプリを開かなくても、画面を閉じたまま記録します。',
  },
  {
    sf: 'car',
    md: 'directions_car',
    title: '車での移動だけを自動で見分ける',
    body: '歩き・電車・バスは除きます。見分けに迷ったときだけ、あとで「車でしたか？」と聞きます。',
  },
  {
    sf: 'chart.bar',
    md: 'bar_chart',
    title: '記録した日の分だけ、結果が出る',
    body: 'EVだったら毎日のバッテリー残量はどうなるか、通った道の充電スポット、費用の違いを見せます。翌日・3日目・7日目にお知らせします。',
  },
];

/** 1. はじめに：アプリの説明・記録のしかた・許可 */
export default function WelcomeScreen() {
  const { onboarded, startedAt, stoppedAt } = useRecording();
  const { location, notification, askAll } = usePermissions();
  const [asking, setAsking] = useState(false);

  // 「はじめる」：まだ許可していなければ、iPhone の確認の画面を順に出してから入力へ
  const start = async () => {
    setAsking(true);
    try {
      await askAll();
    } finally {
      setAsking(false);
    }
    router.push('/onboarding/setup');
  };

  return (
    <Screen
      title="EV Life Log"
      lead="ふだん通りに過ごすと、車での移動を記録して「あなたの毎日がEVだったら」を、あなたの数字で見せます。"
      footer={
        <>
          <Button label="はじめる" disabled={asking} onPress={() => void start()} />
          <Button
            label="お試しで見る（架空の7日間）"
            variant="secondary"
            onPress={() => router.push({ pathname: '/onboarding/setup', params: { trial: '1' } })}
          />
          <ThemedText type="note" color="sub">
            お試し：宇都宮市周辺の架空の7日間で、結果の見え方を見られます。位置の許可はいりません。
          </ThemedText>
        </>
      }>
      {onboarded && startedAt != null && stoppedAt == null ? (
        <InfoBox tone="ok" title="記録は続いています">
          「はじめる」から設定を確かめて、記録へ進めます。記録は消えません。
        </InfoBox>
      ) : null}
      <Section title="このアプリでわかること">
        <ThemedText>・ガソリン車の人：EVだったら、充電の心配はないか、費用はどう変わるか</ThemedText>
        <ThemedText>・EVに乗っている人：ふだんの充電代はいくらか</ThemedText>
      </Section>

      <Section title="記録のしかた">
        <View style={{ gap: Spacing.three }}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={styles.step}>
              <View style={styles.stepIcon}>
                <Icon sf={s.sf} md={s.md} size={22} color={Colors.navy} />
              </View>
              <View style={styles.stepText}>
                <ThemedText type="bold">
                  {i + 1}. {s.title}
                </ThemedText>
                <ThemedText color="sub">{s.body}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </Section>

      <Section title="使う機能の許可">
        {IS_WEB ? (
          <InfoBox title="ブラウザではテストデータを使います">
            本当の位置は使わず、宇都宮市周辺の架空の7日間で表示します。許可はいりません。
          </InfoBox>
        ) : null}

        <PermissionRows location={location} notification={notification} />
      </Section>

      <InfoBox title="登録はいりません。位置はスマホの外に送りません">
        名前やメールアドレスの登録はいりません。位置と通った道は、スマホの中だけで計算します。
      </InfoBox>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.evTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    gap: Spacing.half,
  },
});
