import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouch, Spacing } from '@/constants/theme';
import { SAMPLE_SIMULATOR_INPUT } from '@/data/sample-result';
import { buildSimulatorUrl } from '@/lib/simulator';

/** 読み込みにこれ以上かかったら、表示できなかったとみなしてリンクを出す */
const LOAD_TIMEOUT_MS = 10000;

/** シミュレーションタブ（ブラウザ）：WebView はブラウザで動かないので iframe で開く */
export default function SimulationScreen() {
  const src = buildSimulatorUrl(SAMPLE_SIMULATOR_INPUT);
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    const timer = setTimeout(() => setState((s) => (s === 'loading' ? 'failed' : s)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  const openInNewTab = () => window.open(src, '_blank', 'noopener');

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <ThemedText type="note" color="sub" style={styles.barText}>
          Web版のシミュレーターを表示しています
        </ThemedText>
        <a href={src} target="_blank" rel="noopener" style={linkStyle}>
          <Icon sf="arrow.up.right.square" md="open_in_new" size={18} color={Colors.ev} />
          <span>新しいタブで開く</span>
        </a>
      </View>
      {state === 'failed' ? (
        <View style={styles.center}>
          <ThemedText type="heading">ここでは表示できませんでした</ThemedText>
          <ThemedText color="sub">新しいタブで開いてください。</ThemedText>
          <Button label="シミュレーターを開く" onPress={openInNewTab} />
        </View>
      ) : (
        <iframe
          src={src}
          title="EV Life Simulator"
          onLoad={() => setState('loaded')}
          style={{ flex: 1, width: '100%', height: '100%', border: 0, background: Colors.panel }}
        />
      )}
    </View>
  );
}

const linkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minHeight: MinTouch,
  padding: '0 8px',
  color: Colors.ev,
  fontSize: 14,
  fontWeight: 700,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.panel,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    borderBottomWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.panel,
  },
  barText: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
});
