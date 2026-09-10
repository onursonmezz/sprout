/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E2A22',
    textSecondary: '#6B7A6E',
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
    tabIconDefault: '#8B9A8E',
    tabIconSelected: '#1F3D2B',
  },
  dark: {
    text: '#EDEAD9',
    textSecondary: '#8FAF95',
    background: '#15201A',
    backgroundElement: '#20302A',
    backgroundSelected: '#2A3D32',
    card: '#1C2A22',
    border: '#2C3C33',
    tint: '#6FBF7F',
    tintMuted: '#22362A',
    accent: '#E08A57',
    accentMuted: '#3A2A1D',
    success: '#6FBF7F',
    tabBar: '#15201A',
    tabIconDefault: '#5C6F60',
    tabIconSelected: '#6FBF7F',
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
export const MaxContentWidth = 800;
