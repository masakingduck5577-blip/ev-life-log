import { View, type ViewProps } from 'react-native';

import { Colors, type ColorName } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  color?: ColorName;
};

export function ThemedView({ style, color = 'bg', ...rest }: ThemedViewProps) {
  return <View style={[{ backgroundColor: Colors[color] }, style]} {...rest} />;
}
