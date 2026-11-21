import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { InfoBox } from '@/components/info-box';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/lib/notifications';
import {
  getLocationPermission,
  requestLocationPermission,
  type LocationPermission,
} from '@/location/source';
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
    title: '7日たつと結果が出る',
    body: '1週間がEVだったら、毎日の電池の残り、通った道の充電スポット、費用の違いを見せます。',
  },
];

/** 1. はじめに：アプリの説明・記録のしかた・許可 */
export default function WelcomeScreen() {
  const { mode } = useRecording();
  const [location, setLocation] = useState<LocationPermission | null>(null);
  const [notification, setNotification] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    void getLocationPermission().then(setLocation);
    void getNotificationPermission().then(setNotification);
  }, []);

  const locationOk = IS_WEB || location === 'always';

  return (
    <Screen
      title="EV Life Log"
      lead="1週間ふだん通りに過ごすと、車での移動を記録して「あなたの1週間がEVだったら」を、あなたの数字で見せます。"
      footer={
        <>
          {!locationOk ? (
            <ThemedText type="note" color="sub">
              位置を「常に」許可しないと、画面を閉じている間は記録できません。あとから設定アプリで変えられます。
            </ThemedText>
          ) : null}
          <Button label="はじめる" onPress={() => router.push('/onboarding/setup')} />
        </>
      }>
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
            本当の位置は使わず、宇都宮市周辺の架空の1週間で表示します。許可はいりません。
          </InfoBox>
        ) : null}

        <PermissionRow
          sf="location"
          md="location_on"
          title="位置情報（「常に」）"
          body="画面を閉じている間も、車での移動を記録するために使います。最初の確認で「アプリの使用中は許可」、次に出る確認で「“常に許可”に変更」を選んでください。"
          status={locationStatus(location)}
          action={
            IS_WEB || location === 'always'
              ? null
              : location === 'whenInUse' || location === 'denied'
                ? { label: '設定アプリを開く', onPress: () => void Linking.openSettings() }
                : { label: '位置の使用を許可する', onPress: () => void requestLocationPermission().then(setLocation) }
          }
        />
        <PermissionRow
          sf="bell"
          md="notifications"
          title="お知らせ（任意）"
          body="結果が出たときと、記録が止まっているときにお知らせします。"
          status={notificationStatus(notification)}
          action={
            notification === 'undetermined'
              ? {
                  label: 'お知らせを許可する',
                  onPress: () => void requestNotificationPermission().then(setNotification),
                }
              : null
          }
        />

        {!IS_WEB && mode === 'test' ? (
          <InfoBox>今はテストデータで試しているので、許可しなくても進めます。</InfoBox>
        ) : null}
      </Section>

      <InfoBox title="登録はいりません。位置はスマホの外に送りません">
        名前やメールアドレスの登録はいりません。位置と通った道は、スマホの中だけで計算します。
      </InfoBox>
    </Screen>
  );
}

type Status = { tone: 'ok' | 'warn' | 'sub'; text: string };

function locationStatus(p: LocationPermission | null): Status | null {
  switch (p) {
    case 'always':
      return { tone: 'ok', text: '✓ 「常に許可」になっています' };
    case 'whenInUse':
      return { tone: 'warn', text: '今は「使用中のみ」です。設定アプリで「常に」に変えてください' };
    case 'denied':
      return { tone: 'warn', text: '許可されていません。設定アプリで「常に」にしてください' };
    case 'unavailable':
      return { tone: 'sub', text: 'ブラウザでは使いません' };
    default:
      return null;
  }
}

function notificationStatus(p: NotificationPermission | null): Status | null {
  switch (p) {
    case 'granted':
      return { tone: 'ok', text: '✓ 許可されています' };
    case 'denied':
      return { tone: 'sub', text: 'オフです（設定アプリで変えられます）' };
    case 'unavailable':
      return { tone: 'sub', text: 'ブラウザでは使いません' };
    default:
      return null;
  }
}

function PermissionRow({
  sf,
  md,
  title,
  body,
  status,
  action,
}: {
  sf: SFSymbol;
  md: AndroidSymbol;
  title: string;
  body: string;
  status: Status | null;
  action: { label: string; onPress: () => void } | null;
}) {
  return (
    <View style={styles.permission}>
      <View style={styles.step}>
        <View style={styles.stepIcon}>
          <Icon sf={sf} md={md} size={22} color={Colors.navy} />
        </View>
        <View style={styles.stepText}>
          <ThemedText type="bold">{title}</ThemedText>
          <ThemedText color="sub">{body}</ThemedText>
          {status ? (
            <ThemedText type="bold" color={status.tone}>
              {status.text}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {action ? <Button label={action.label} variant="secondary" onPress={action.onPress} /> : null}
    </View>
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
  permission: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
});
