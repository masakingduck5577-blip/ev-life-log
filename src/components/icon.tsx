import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { Colors } from '@/constants/theme';

type IconProps = {
  /** iOS の SF Symbols の名前 */
  sf: SFSymbol;
  /** Android とブラウザの Material Symbols の名前 */
  md: AndroidSymbol;
  size?: number;
  color?: string;
};

/** 線のアイコン。飾りなので読み上げない（意味は横の文字で伝える） */
export function Icon({ sf, md, size = 20, color = Colors.ink }: IconProps) {
  return (
    <SymbolView
      name={{ ios: sf, android: md, web: md }}
      size={size}
      tintColor={color}
      accessible={false}
      aria-hidden
    />
  );
}
