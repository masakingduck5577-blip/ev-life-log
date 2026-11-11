import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts, FontSize, type ColorName } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'bold' | 'note' | 'heading' | 'title';
  color?: ColorName;
};

export function ThemedText({ style, type = 'default', color = 'ink', ...rest }: ThemedTextProps) {
  const isHeading = type === 'heading' || type === 'title';
  return (
    <Text
      role={isHeading ? 'heading' : undefined}
      style={[{ color: Colors[color] }, styles[type], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.body,
    lineHeight: 26,
    fontWeight: 400,
  },
  bold: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.body,
    lineHeight: 26,
    fontWeight: 700,
  },
  note: {
    fontFamily: Fonts.sans,
    fontSize: FontSize.note,
    lineHeight: 22,
    fontWeight: 400,
  },
  heading: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.lead,
    lineHeight: 26,
    fontWeight: 700,
  },
  title: {
    fontFamily: Fonts.heading,
    fontSize: FontSize.title,
    lineHeight: 36,
    fontWeight: 700,
  },
});
