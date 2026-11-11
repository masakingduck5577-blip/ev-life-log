import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { SAMPLE_SIMULATOR_INPUT } from '@/data/sample-result';
import { buildSimulatorUrl } from '@/lib/simulator';

/** シミュレーションタブ（ブラウザ）：WebView はブラウザで動かないので iframe で開く */
export default function SimulationScreen() {
  const src = buildSimulatorUrl(SAMPLE_SIMULATOR_INPUT);

  return (
    <View style={styles.root}>
      <iframe
        src={src}
        title="EV Life Simulator"
        style={{ flex: 1, width: '100%', height: '100%', border: 0, background: Colors.panel }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.panel,
  },
});
