import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';

// react-navigation's own default for this tab bar variant (see
// TABBAR_HEIGHT_UIKIT in its BottomTabBar) — reproduced here because setting
// tabBarStyle.height as a plain number bypasses its automatic
// height-plus-safe-area-inset calculation entirely, so it has to be redone
// by hand to add a little breathing room without breaking that inset.
const DEFAULT_TAB_BAR_HEIGHT = 49;
const EXTRA_TAB_BAR_HEIGHT = 10;

export default function TabLayout() {
  const colors = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          // A plain number here bypasses react-navigation's own
          // height-plus-safe-area-inset math, so that math (default height +
          // insets.bottom) is redone by hand, with a few extra px on top for
          // breathing room — matching EXTRA_TAB_BAR_HEIGHT below.
          height: DEFAULT_TAB_BAR_HEIGHT + insets.bottom + EXTRA_TAB_BAR_HEIGHT,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        // A touch of breathing room so the icon isn't flush against the top
        // edge of the bar and the label isn't flush against the bottom.
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.today,
          tabBarIcon: ({ color, size }) => <Ionicons name="partly-sunny-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: t.tabs.plants,
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t.tabs.calendar,
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: t.tabs.guide,
          tabBarIcon: ({ color, size }) => <Ionicons name="library-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
