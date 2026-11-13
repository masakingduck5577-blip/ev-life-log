import { useState } from 'react';

import { useRecording } from './recording-context';
import { useSimulatorUrl } from './use-simulator-url';

/**
 * シミュレーターを開く URL。記録が進むたびに開き直さないよう、読み込みが終わった時点の URL で止めておく。
 * 新しい結果があれば changed が true になるので、「開き直す」ボタンを出す。
 */
export function useFrozenSimulatorUrl() {
  const { ready } = useRecording();
  const latest = useSimulatorUrl();
  const [url, setUrl] = useState<string | null>(null);
  // 読み込みが終わったら、そのときの URL に決める（描画中に state を合わせる書き方）
  if (ready && url == null) setUrl(latest);
  return { url, changed: url != null && url !== latest, reload: () => setUrl(latest) };
}
