import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { Button, Choice } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { Screen, Section } from '@/components/screen';
import { Spacing } from '@/constants/theme';
import { useRecording, useRecordingActions } from '@/recording/recording-context';
import { SCENARIOS } from '@/recording/scenarios';

const IS_WEB = Platform.OS === 'web';

/**
 * 開発用の設定。
 * 開発用ビルドでは記録タブのボタンから、デモ用のビルドでは「記録」の見出しを5回押すと開く。
 */
export default function DevSettingsScreen() {
  const { mode, scenarioId } = useRecording();
  const actions = useRecordingActions();

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
              description="宇都宮市周辺の架空の1週間を流します。早送りもできます。スマホの記録は消えません。"
              selected={mode === 'test'}
              onPress={() => void actions.setMode('test')}
            />
          </View>
        )}
      </Section>

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
