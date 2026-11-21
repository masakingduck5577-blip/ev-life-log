import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { Button, Choice } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { formatDuration, formatKm, formatShortDate, formatTime } from '@/lib/format';
import { useRecording, useRecordingActions } from '@/recording/recording-context';
import { SCENARIOS } from '@/recording/scenarios';
import { useAnalysis } from '@/recording/use-analysis';

const IS_WEB = Platform.OS === 'web';

/**
 * 開発用の設定。
 * 開発用ビルドでは記録タブのボタンから、デモ用のビルドでは「記録」の見出しを5回押すと開く。
 */
export default function DevSettingsScreen() {
  const { mode, scenarioId, answers, devTools } = useRecording();
  const actions = useRecordingActions();
  const result = useAnalysis();
  const trips = result?.analysis.trips ?? [];
  const excluded = trips.filter((t) => t.guess !== 'car');

  return (
    <Screen
      title="開発用の設定"
      lead="試すときと、最終報告会のデモのための設定です。"
      footer={<Button label="戻る" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}>
      <Section title="位置の取り方">
        {IS_WEB ? (
          <InfoBox>ブラウザでは、いつもテストデータで表示します。</InfoBox>
        ) : (
          <View style={{ gap: Spacing.two }} role="radiogroup" aria-label="位置の取り方">
            <Choice
              title="スマホの位置で記録する"
              description="ふだんの使い方。画面を閉じていても記録します。"
              selected={mode === 'device'}
              onPress={() => void actions.setMode('device')}
            />
            <Choice
              title="テストデータで試す"
              description="宇都宮市周辺の架空の7日間を流します。早送りもできます。スマホの記録は消えません。"
              selected={mode === 'test'}
              onPress={() => void actions.setMode('test')}
            />
          </View>
        )}
      </Section>

      {!IS_WEB && !__DEV__ ? (
        <Section title="テスト操作の欄">
          <View style={{ gap: Spacing.two }} role="radiogroup" aria-label="テスト操作の欄">
            <Choice title="出さない（お店・一般の人向け）" selected={!devTools} onPress={() => void actions.setDevTools(false)} />
            <Choice title="出す（日付へ・早送り・結果へ）" selected={devTools} onPress={() => void actions.setDevTools(true)} />
          </View>
        </Section>
      ) : null}

      {mode === 'test' ? (
        <Section title="シナリオ">
          <View style={{ gap: Spacing.two }} role="radiogroup" aria-label="シナリオ">
            {SCENARIOS.map((s) => (
              <Choice
                key={s.id}
                title={`${s.id}：${s.title}`}
                description={s.description}
                selected={s.id === scenarioId}
                disabled={!s.available}
                badge={s.available ? undefined : '準備中'}
                onPress={() => void actions.setScenario(s.id)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {/* 動作確認（バスや電車に乗って確かめるとき用）：車ではないと判断した移動と、その理由 */}
      <Section title={`動作確認：車ではないと判断した移動（${excluded.length}件）`}>
        <ThemedText type="note" color="sub">
          見つけた移動 {trips.length}件のうち、車 {trips.length - excluded.length}件。
        </ThemedText>
        {excluded.map((t) => (
          <View key={t.id} style={{ gap: Spacing.half, paddingVertical: Spacing.two, borderBottomWidth: 1, borderColor: Colors.line }}>
            <ThemedText type="bold">
              {formatShortDate(t.start)} {formatTime(t.start)}〜{formatTime(t.end)}・{formatKm(t.distanceKm)}・最高 時速{Math.round(t.maxSpeedKmh)}km
            </ThemedText>
            <ThemedText>
              {t.reason ?? '（理由なし）'}
              {answers.trips?.[t.id] === 'car' ? '（本人が「車だった」に直した）' : ''}
            </ThemedText>
            {t.waitMin > 0 ? (
              <ThemedText type="note" color="sub">
                止まって待っていた時間 {formatDuration(t.waitMin)}
              </ThemedText>
            ) : null}
          </View>
        ))}
      </Section>

      <Section title="はじめからやり直す" description="「はじめに」の画面に戻ります。今の記録は消えます。">
        <Button
          label="はじめの画面へ"
          variant="secondary"
          onPress={async () => {
            await actions.resetOnboarding();
            router.replace('/onboarding');
          }}
        />
      </Section>
    </Screen>
  );
}
