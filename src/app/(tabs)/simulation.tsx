import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { SAMPLE_SIMULATOR_INPUT } from '@/data/sample-result';
import { buildSimulatorUrl } from '@/lib/simulator';

/** シミュレーションタブ（iPhone・Android）：Web 版シミュレーターを WebView で開く */
export default function SimulationScreen() {
  const [failed, setFailed] = useState(false);
  const uri = buildSimulatorUrl(SAMPLE_SIMULATOR_INPUT);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {failed ? (
        <View style={styles.center}>
          <ThemedText type="heading">シミュレーターを開けませんでした</ThemedText>
          <ThemedText color="sub">インターネットにつながっているか確かめてください。</ThemedText>
        </View>
      ) : (
        <WebView
          source={{ uri }}
          style={styles.web}
          startInLoadingState
          renderLoading={() => (
            <View style={[StyleSheet.absoluteFill, styles.center]}>
              <ActivityIndicator color={Colors.ev} size="large" />
              <ThemedText color="sub">読み込んでいます</ThemedText>
            </View>
          )}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.panel,
  },
  web: {
    flex: 1,
    backgroundColor: Colors.panel,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    backgroundColor: Colors.panel,
  },
});
