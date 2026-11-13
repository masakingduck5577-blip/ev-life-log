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
  /** EV（シミュレーターの EVS のキー） */
  evKey?: string;
  /** 比べるガソリン車（GASES のキー） */
  gasKey?: string;
  /** 今の車の燃費（km/L）。分からなければ渡さない */
  gasKmPerL?: number | null;
  /** 自宅で充電できるか */
  homeEnv?: 'have' | 'install' | 'none';
};

/** シミュレーターの画面の名前（app.js の screens） */
export type SimulatorScreen = 'home' | 'gas' | 'cost' | 'memo';

/** シミュレーターの HOME_ENV と同じ（homeCharge・charger を合わせて渡す） */
const HOME_ENV = {
  have: { homeCharge: true, charger: 0 },
  install: { homeCharge: true, charger: 150000 },
  none: { homeCharge: false, charger: 0 },
} as const;

function toBase64Url(text: string): string {
  // 渡す値は英数字だけなので、そのまま btoa でよい
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function buildSimulatorUrl(input: SimulatorInput, screen: SimulatorScreen = 'gas'): string {
  const data: Record<string, unknown> = {};
  if (input.annualKm != null && Number.isFinite(input.annualKm) && input.annualKm > 0) {
    data.kmMode = 'direct';
    data.annualKm = Math.round(input.annualKm / 100) * 100;
  }
  if (input.evKey) data.evKey = input.evKey;
  if (input.gasKey) {
    data.gasKey = input.gasKey;
    data.rivalType = 'gas';
  }
  if (input.gasKmPerL) data.gFe = String(input.gasKmPerL);
  if (input.homeEnv) Object.assign(data, { homeEnv: input.homeEnv, ...HOME_ENV[input.homeEnv] });
  if (Object.keys(data).length === 0) return SIMULATOR_BASE_URL;
  return `${SIMULATOR_BASE_URL}#/${screen}?d=${toBase64Url(JSON.stringify(data))}`;
}
