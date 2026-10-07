import { Tabs } from 'expo-router/js-tabs';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useLanguage } from '@/context/language-context';

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.today }} />
      <Tabs.Screen name="plants" options={{ title: t.tabs.plants }} />
      <Tabs.Screen name="calendar" options={{ title: t.tabs.calendar }} />
      <Tabs.Screen name="guide" options={{ title: t.tabs.guide }} />
      <Tabs.Screen name="settings" options={{ title: t.tabs.settings }} />
    </Tabs>
  );
}
