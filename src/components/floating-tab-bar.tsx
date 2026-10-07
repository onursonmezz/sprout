import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/glass';
import { useTheme } from '@/hooks/use-theme';
import { hapticTap } from '@/utils/haptics';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'partly-sunny-outline',
  plants: 'leaf-outline',
  calendar: 'calendar-outline',
  guide: 'library-outline',
  settings: 'settings-outline',
};

/** The rounded bar that floats above the bottom edge instead of the stock
 * full-width tab bar. Icon only; the active tab is a glowing green circle. */
export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          bottom: Math.max(insets.bottom, 12),
          backgroundColor: colors.navBackground,
          borderColor: colors.navBorder,
          boxShadow: `0px 14px 30px ${colors.shadow}`,
        },
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            hapticTap();
            navigation.navigate(route.name, route.params);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.title}
            style={styles.item}>
            {focused ? (
              <View style={[styles.active, { boxShadow: `0px 0px 18px ${colors.tintGlow}` }]}>
                <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
                <Ionicons name={ICONS[route.name] ?? 'ellipse-outline'} size={22} color={colors.onTint} />
              </View>
            ) : (
              <Ionicons name={ICONS[route.name] ?? 'ellipse-outline'} size={23} color={colors.tabIconDefault} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  item: { flex: 1, height: 62, alignItems: 'center', justifyContent: 'center' },
  active: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
