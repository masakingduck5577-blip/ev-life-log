import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useFrozenSimulatorUrl } from '@/recording/use-frozen-url';

/** シミュレーションタブ（iPhone・Android）：Web 版シミュレーターを WebView で開く */
export default function SimulationScreen() {
  const [failed, setFailed] = useState(false);
  const { url, changed, reload } = useFrozenSimulatorUrl();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {changed ? (
        <View style={styles.changed}>
          <ThemedText type="note" style={{ flex: 1 }}>
            記録が進みました。
          </ThemedText>
          <Button label="最新の記録で開き直す" variant="secondary" onPress={reload} />
        </View>
      ) : null}
      {failed ? (
        <View style={styles.center}>
          <ThemedText type="heading">シミュレーターを開けませんでした</ThemedText>
          <ThemedText color="sub">インターネットにつながっているか確かめてください。</ThemedText>
        </View>
      ) : url ? (
        <WebView
          key={url}
          source={{ uri: url }}
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
      ) : (
        <View style={styles.center}>
          <ThemedText color="sub">読み込んでいます</ThemedText>
        </View>
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
  changed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Colors.evTint,
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
