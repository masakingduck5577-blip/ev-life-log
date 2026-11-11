/**
 * 色・文字・余白の決まり。
 * 配色は Web 版シミュレーター（ev-life-simulator の style.css）と同じ「配色C」。
 * 明るい表示だけ（ダークモードなし）。赤は使わない（Honda Charge の印だけ例外）。
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  bg: '#F2F5F9', // 背景
  panel: '#FFFFFF', // パネル
  panel2: '#F2F5FA',
  ink: '#0F1726', // 文字
  sub: '#5B6370', // 補足の文字
  line: '#DFE3E8', // 線
  navy: '#0A2540', // 紺
  navy2: '#123A66',
  ev: '#1F6FEB', // アクセント（EV）
  evTint: '#E6F0FE',
  evLight: '#A9C8F7',
  onEv: '#FFFFFF',
  gas: '#69707C', // ガソリン車
  gasTint: '#EEF0F3',
  warn: '#8A5A00', // 注意
  warnTint: '#FFF5DD',
  ok: '#13804B',
  okTint: '#E5F5EC',
  hondaCharge: '#CC0000', // Honda Charge の「H」の印だけ
} as const;

export type ColorName = keyof typeof Colors;

export const Fonts = Platform.select({
  web: { sans: 'var(--font-sans)', heading: 'var(--font-heading)' },
  default: { sans: undefined, heading: undefined },
});

/** 文字の大きさ。本文16px以上、注記も14px以上（DADS）。 */
export const FontSize = {
  note: 14,
  body: 16,
  lead: 18,
  heading: 22,
  title: 26,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
} as const;

/** 押せる部分の最小の大きさ（DADS） */
export const MinTouch = 44;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 560;
