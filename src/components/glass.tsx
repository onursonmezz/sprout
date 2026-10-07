import { ReactNode, useId } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/** Splits "rgba(r,g,b,a)" into an opaque colour plus its alpha, because SVG
 * gradient stops take those separately. */
function splitAlpha(color: string): { color: string; opacity: number } {
  const match = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!match) return { color, opacity: 1 };
  return { color: `rgb(${match[1]},${match[2]},${match[3]})`, opacity: Number(match[4]) };
}

function Glow({ color, size, style }: { color: string; size: number; style: ViewStyle }) {
  const id = useId();
  const { color: rgb, opacity } = splitAlpha(color);
  return (
    <View style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={rgb} stopOpacity={opacity} />
            <Stop offset="0.65" stopColor={rgb} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** The soft green and warm light blobs behind every screen. Sits behind the
 * content and never takes touches. */
export function GlowBackground() {
  const colors = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, overflow: 'hidden' }]} pointerEvents="none">
      <Glow color={colors.glowGreen} size={420} style={{ left: -180, top: -150 }} />
      <Glow color={colors.glowWarm} size={440} style={{ right: -230, top: 250 }} />
    </View>
  );
}

/** Fills its parent with a gradient. The parent needs `overflow: 'hidden'`
 * for rounded corners to clip it. */
export function GradientFill({ stops, angle = 'diagonal' }: { stops: readonly string[]; angle?: 'diagonal' | 'horizontal' }) {
  const id = useId();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2={angle === 'diagonal' ? '1' : '0'}>
            {stops.map((color, i) => (
              <Stop key={i} offset={stops.length === 1 ? 0 : i / (stops.length - 1)} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export function GlassCard({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.glass,
        { backgroundColor: colors.glass, borderColor: colors.glassBorder, boxShadow: `0px 10px 26px ${colors.shadow}` },
        style,
      ]}>
      {children}
    </View>
  );
}

/** The green gradient pill used for the main action on a card. */
export function GradientButton({
  label,
  onPress,
  style,
  size = 'small',
}: {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  size?: 'small' | 'large';
}) {
  const colors = useTheme();
  const body = (
    <View
      style={[
        size === 'large' ? styles.buttonLarge : styles.buttonSmall,
        { boxShadow: `0px 6px 16px ${colors.tintGlow}` },
        style,
      ]}>
      <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
      <Text style={[size === 'large' ? styles.buttonLargeText : styles.buttonSmallText, { color: colors.onTint }]}>{label}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

/** How far a plant is into its watering interval: full means it is due. */
export function ProgressBar({ progress, late = false }: { progress: number; late?: boolean }) {
  const colors = useTheme();
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View style={[styles.track, { backgroundColor: colors.track }]}>
      <View style={[styles.trackFill, { width: `${clamped * 100}%`, backgroundColor: late ? colors.late : colors.tintBright }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  glass: { borderRadius: 18, borderWidth: 1 },
  buttonSmall: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, overflow: 'hidden', alignItems: 'center' },
  buttonSmallText: { fontSize: 12, fontWeight: '700' },
  buttonLarge: { paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, overflow: 'hidden', alignItems: 'center' },
  buttonLargeText: { fontSize: 14, fontWeight: '700' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3 },
});
