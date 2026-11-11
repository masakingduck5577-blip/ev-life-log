import { NativeTabs } from 'expo-router/native-tabs';

import { Colors } from '@/constants/theme';
import { TABS } from '@/constants/tabs';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Colors.panel}
      tintColor={Colors.ev}
      iconColor={{ default: Colors.sub, selected: Colors.ev }}
      labelStyle={{ default: { color: Colors.sub }, selected: { color: Colors.ev } }}>
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
