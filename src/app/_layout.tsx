import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DevPanel } from '@/components/dev-panel';
import { TestDataBanner } from '@/components/test-data-banner';
import { Colors } from '@/constants/theme';
// スマホでは、位置のバックグラウンドのタスクをここで登録する（画面を作る前に必要）
import '@/location/source';
import { RecordingProvider, useRecording } from '@/recording/recording-context';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.ev,
    background: Colors.bg,
    card: Colors.panel,
    text: Colors.ink,
    border: Colors.line,
  },
};

export default function RootLayout() {
  return (
    <RecordingProvider>
      <ThemeProvider value={theme}>
        <View style={styles.root}>
          <TestDataBanner />
          <BelowBanner>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.bg },
                // ブラウザでは画面の切り替えにアニメーションを付けない（途中で止まって見えないことがあるため）
                animation: Platform.OS === 'web' ? 'none' : 'default',
              }}
            />
          </BelowBanner>
          <DevPanel />
        </View>
      </ThemeProvider>
    </RecordingProvider>
  );
}

/** 帯が上の余白（ノッチ）を使うので、その下の画面には上の余白を足さない */
function BelowBanner({ children }: { children: ReactNode }) {
  const { mode, ready } = useRecording();
  const insets = useSafeAreaInsets();
  const bannerShown = ready && mode === 'test';
  return (
    <View style={styles.content}>
      <SafeAreaInsetsContext.Provider value={bannerShown ? { ...insets, top: 0 } : insets}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
  },
});
