import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps } from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, FontSize, MaxContentWidth, MinTouch, Spacing } from '@/constants/theme';
import { TABS } from '@/constants/tabs';

import { ThemedText } from './themed-text';

type WebSymbol = Extract<ComponentProps<typeof SymbolView>['name'], { web?: unknown }>['web'];

/** ブラウザ用のタブ。iPhone と同じく下に並べる。 */
export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList style={styles.list}>
        {TABS.map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} asChild>
            <TabButton icon={tab.md as WebSymbol}>{tab.label}</TabButton>
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: WebSymbol };

function TabButton({ children, isFocused, icon, ref: _ref, ...props }: TabButtonProps) {
  const color = isFocused ? Colors.ev : Colors.sub;
  return (
    <Pressable
      {...props}
      role="tab"
      aria-selected={isFocused}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <SymbolView name={{ ios: 'circle', web: icon }} size={24} tintColor={color} />
      <ThemedText
        type="note"
        style={[styles.label, { color, fontWeight: isFocused ? 700 : 400 }]}
        numberOfLines={1}>
        {children}
      </ThemedText>
      <View style={[styles.indicator, isFocused && styles.indicatorOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  slot: {
    flex: 1,
  },
  list: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: Colors.panel,
    borderTopWidth: 1,
    borderColor: Colors.line,
  },
  button: {
    flex: 1,
    minHeight: MinTouch + Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingTop: Spacing.two,
  },
  label: {
    fontSize: FontSize.note,
  },
  indicator: {
    height: 3,
    width: 32,
    borderRadius: 2,
    marginTop: Spacing.one,
  },
  indicatorOn: {
    backgroundColor: Colors.ev,
  },
  pressed: {
    opacity: 0.7,
  },
});
