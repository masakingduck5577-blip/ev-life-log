/**
 * Web 版シミュレーター（ev-life-simulator）を開く URL を作る。
 *
 * シミュレーターは `#/<画面>?d=<JSON を base64url にしたもの>` を読んで、
 * 入力の値を復元する（memo.js の restoreFromLink）。使えるキーは memo.js の SHARE_KEYS。
 */

export const SIMULATOR_BASE_URL = 'https://masakingduck5577-blip.github.io/ev-life-simulator/';

/** 記録の結果からシミュレーターへ渡す値 */
export type SimulatorInput = {
  /** 1年に走る距離（km） */
  annualKm?: number;
};

/** シミュレーターの画面の名前（app.js の screens） */
export type SimulatorScreen = 'home' | 'gas' | 'cost' | 'memo';

function toBase64Url(text: string): string {
  // 渡す値は英数字だけなので、そのまま btoa でよい
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildSimulatorUrl(input: SimulatorInput, screen: SimulatorScreen = 'gas'): string {
  const data: Record<string, unknown> = {};
  if (input.annualKm != null && Number.isFinite(input.annualKm)) {
    data.kmMode = 'direct';
    data.annualKm = Math.round(input.annualKm);
  }
  if (Object.keys(data).length === 0) return SIMULATOR_BASE_URL;
  return `${SIMULATOR_BASE_URL}#/${screen}?d=${toBase64Url(JSON.stringify(data))}`;
}
