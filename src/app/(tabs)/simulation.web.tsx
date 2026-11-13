import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, MinTouch, Spacing } from '@/constants/theme';
import { useFrozenSimulatorUrl } from '@/recording/use-frozen-url';

/** 読み込みにこれ以上かかったら、表示できなかったとみなしてリンクを出す */
const LOAD_TIMEOUT_MS = 10000;

/** シミュレーションタブ（ブラウザ）：WebView はブラウザで動かないので iframe で開く */
export default function SimulationScreen() {
  const { url, changed, reload } = useFrozenSimulatorUrl();

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <ThemedText type="note" color="sub" style={styles.barText}>
          記録の結果（1年の距離・EV・自宅の充電）を入れて開いています
        </ThemedText>
        {url ? (
          <a href={url} target="_blank" rel="noopener" style={linkStyle}>
            <Icon sf="arrow.up.right.square" md="open_in_new" size={18} color={Colors.ev} />
            <span>新しいタブで開く</span>
          </a>
        ) : null}
      </View>
      {changed ? (
        <View style={styles.changed}>
          <ThemedText type="note" style={{ flex: 1 }}>
            記録が進みました。
          </ThemedText>
          <Button label="最新の記録で開き直す" variant="secondary" onPress={reload} />
        </View>
      ) : null}
      {!url ? (
        <View style={styles.center}>
          <ThemedText color="sub">読み込んでいます</ThemedText>
        </View>
      ) : (
        <Frame key={url} url={url} />
      )}
    </View>
  );
}

/** iframe。URL が変わると作り直される（key）ので、読み込みの状態もそのたびに最初から */
function Frame({ url }: { url: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  useEffect(() => {
    const timer = setTimeout(() => setState((s) => (s === 'loading' ? 'failed' : s)), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  if (state === 'failed') {
    return (
      <View style={styles.center}>
        <ThemedText type="heading">ここでは表示できませんでした</ThemedText>
        <ThemedText color="sub">新しいタブで開いてください。</ThemedText>
        <Button label="シミュレーターを開く" onPress={() => window.open(url, '_blank', 'noopener')} />
      </View>
    );
  }
  return (
    <iframe
      src={url}
      title="EV Life Simulator"
      onLoad={() => setState('loaded')}
      style={{ flex: 1, width: '100%', height: '100%', border: 0, background: Colors.panel }}
    />
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
  },
});
