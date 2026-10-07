/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E2A22',
    textSecondary: '#5F7265',
    background: '#F1EEE2',
    backgroundElement: '#FBFAF3',
    backgroundSelected: '#E4E1D2',
    card: '#FBFAF3',
    border: '#E7E3D4',
    tint: '#1F3D2B',
    tintMuted: '#DCEAE0',
    accent: '#CC6B3B',
    accentMuted: '#FBEAE0',
    success: '#1F3D2B',
    tabBar: '#F1EEE2',
    tabIconDefault: '#8A9A8F',
    tabIconSelected: '#1F3D2B',
    // "Glass" look: translucent cards over the glowing background.
    glass: 'rgba(255,255,255,0.62)',
    glassBorder: 'rgba(255,255,255,0.95)',
    tintBright: '#2F7A47',
    late: '#CC6B3B',
    onTint: '#FFFFFF',
    gradientFrom: '#3F9A58',
    gradientTo: '#1F3D2B',
    track: 'rgba(31,61,43,0.12)',
    glowGreen: 'rgba(111,191,127,0.55)',
    glowWarm: 'rgba(224,138,87,0.38)',
    navBackground: 'rgba(255,255,255,0.94)',
    navBorder: '#FFFFFF',
    heroFrom: '#1F3D2B',
    heroMid: '#2F7A47',
    heroTo: '#CC6B3B',
    onHero: '#FFFFFF',
    shadow: 'rgba(31,61,43,0.14)',
    tintGlow: 'rgba(31,61,43,0.30)',
  },
  dark: {
    text: '#E6ECE7',
    textSecondary: '#9FB0A4',
    background: '#070B09',
    backgroundElement: '#141A17',
    backgroundSelected: '#1E2622',
    card: '#131816',
    border: '#262D29',
    tint: '#6FBF7F',
    tintMuted: '#16261C',
    accent: '#E08A57',
    accentMuted: '#2E2017',
    success: '#6FBF7F',
    tabBar: '#070B09',
    tabIconDefault: '#7D8C82',
    tabIconSelected: '#6FBF7F',
    glass: 'rgba(255,255,255,0.055)',
    glassBorder: 'rgba(255,255,255,0.10)',
    tintBright: '#8FE3A1',
    late: '#F2A377',
    onTint: '#06120A',
    gradientFrom: '#6FBF7F',
    gradientTo: '#3F9A58',
    track: 'rgba(255,255,255,0.10)',
    glowGreen: 'rgba(111,191,127,0.50)',
    glowWarm: 'rgba(224,138,87,0.30)',
    navBackground: 'rgba(20,30,24,0.94)',
    navBorder: 'rgba(255,255,255,0.12)',
    heroFrom: '#8FE3A1',
    heroMid: '#5FAE70',
    heroTo: '#D98A5C',
    onHero: '#08160D',
    shadow: 'rgba(0,0,0,0.40)',
    tintGlow: 'rgba(111,191,127,0.40)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
/** The tab bar floats over the content, so every tab screen's scroll area
 * needs this much bottom padding to let its last item clear the bar. */
export const FloatingTabBarSpace = 120;
export const MaxContentWidth = 800;
