import { DefaultTheme, ThemeProvider } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { Colors } from '@/constants/theme';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.ev,
    background: Colors.bg,
    card: Colors.panel,
    text: Colors.ink,
    border: Colors.line,
  },
};

export default function TabLayout() {
  return (
    <ThemeProvider value={theme}>
      <AppTabs />
    </ThemeProvider>
  );
}
