import type { SFSymbol } from 'expo-symbols';

/** 4つのタブ。iPhone（NativeTabs）とブラウザで同じ並びを使う。アイコンは線のもの。 */
export const TABS = [
  { name: 'index', href: '/', label: '記録', sf: 'car', md: 'directions_car' },
  {
    name: 'simulation',
    href: '/simulation',
    label: 'シミュレーション',
    sf: 'chart.line.uptrend.xyaxis',
    md: 'show_chart',
  },
  { name: 'map', href: '/map', label: '充電マップ', sf: 'map', md: 'map' },
  { name: 'memo', href: '/memo', label: '相談メモ', sf: 'doc.text', md: 'description' },
] as const satisfies readonly {
  name: string;
  href: string;
  label: string;
  sf: SFSymbol;
  md: string;
}[];
