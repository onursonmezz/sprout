import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LightSensor } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_KEYS } from '@/data/species-guide';
import { hasPendingLightMeterListener, lightKeyForLux, logMeterPosition, resolveLightMeterResult } from '@/utils/light-meter';

const BAR_HEIGHT = 280;
const BAR_WIDTH = 56;
// LIGHT_KEYS is full_sun→dark; the bar renders top (bright) to bottom (dim),
// so this is already the right order for both the segments and their labels.
const ZONE_COLORS_TOP_TO_BOTTOM = (colors: { accent: string; tint: string; tintMuted: string; textSecondary: string }) => [
  colors.accent,
  colors.tint,
  colors.tintMuted,
  colors.textSecondary,
];

export default function LightMeterScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  const [available, setAvailable] = useState<boolean | null>(null);
  const [lux, setLux] = useState<number | null>(null);
  const canUseReading = hasPendingLightMeterListener();

  useEffect(() => {
    if (Platform.OS === 'web') {
      setAvailable(false);
      return;
    }
    let subscription: { remove: () => void } | null = null;
    (async () => {
      const isAvailable = await LightSensor.isAvailableAsync().catch(() => false);
      setAvailable(isAvailable);
      if (!isAvailable) return;
      LightSensor.setUpdateInterval(500);
      subscription = LightSensor.addListener(({ illuminance }) => setLux(illuminance));
    })();
    return () => subscription?.remove();
  }, []);

  const zoneKey = lux != null ? lightKeyForLux(lux) : null;
  const zoneColors = ZONE_COLORS_TOP_TO_BOTTOM(colors);
  const markerBottom = lux != null ? logMeterPosition(lux) * BAR_HEIGHT : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{t.lightMeter.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.lightMeter.subtitle}</Text>
        <Text style={[styles.instructions, { color: colors.textSecondary }]}>{t.lightMeter.instructions}</Text>

        {available === false ? (
          <View style={[styles.unavailableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 28 }}>📵</Text>
            <Text style={[styles.unavailableTitle, { color: colors.text }]}>{t.lightMeter.unavailableTitle}</Text>
            <Text style={[styles.unavailableBody, { color: colors.textSecondary }]}>{t.lightMeter.unavailableBody}</Text>
          </View>
        ) : (
          <>
            <View style={styles.meterRow}>
              <View style={[styles.bar, { width: BAR_WIDTH, height: BAR_HEIGHT, borderColor: colors.border }]}>
                {zoneColors.map((color, i) => (
                  <View key={i} style={[styles.zoneSegment, { backgroundColor: color }]} />
                ))}
                {lux != null && (
                  <View style={[styles.markerLine, { bottom: markerBottom, backgroundColor: colors.text }]} />
                )}
              </View>
              <View style={[styles.zoneLabels, { height: BAR_HEIGHT }]}>
                {LIGHT_KEYS.map((key) => (
                  <Text key={key} style={[styles.zoneLabel, { color: colors.text }]}>
                    {t.addPlant.lightLevels[key].label}
                  </Text>
                ))}
              </View>
            </View>

            <Text style={[styles.luxValue, { color: colors.text, fontFamily: Fonts.serif }]}>
              {lux != null ? Math.round(lux) : '—'}
            </Text>
            <Text style={[styles.luxUnit, { color: colors.textSecondary }]}>{t.lightMeter.lux}</Text>
            {zoneKey != null && (
              <Text style={[styles.zoneCurrent, { color: colors.tint }]}>{t.addPlant.lightLevels[zoneKey].label}</Text>
            )}

            {canUseReading && zoneKey != null && (
              <Pressable
                onPress={() => {
                  resolveLightMeterResult(zoneKey);
                  router.back();
                }}
                style={[styles.useButton, { backgroundColor: colors.tint }]}>
                <Text style={styles.useButtonText}>{t.lightMeter.useThisReading}</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topRow: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: Spacing.four, alignItems: 'center' },
  title: { fontSize: 28, alignSelf: 'flex-start', marginTop: Spacing.two },
  subtitle: { fontSize: 13, alignSelf: 'flex-start', marginTop: 2 },
  instructions: { fontSize: 13, lineHeight: 19, alignSelf: 'flex-start', marginTop: Spacing.three, marginBottom: Spacing.five },
  meterRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  bar: { borderRadius: 28, borderWidth: 1, overflow: 'hidden' },
  zoneSegment: { flex: 1 },
  markerLine: { position: 'absolute', left: -6, right: -6, height: 3, borderRadius: 2 },
  zoneLabels: { justifyContent: 'space-around' },
  zoneLabel: { fontSize: 12, fontWeight: '700' },
  luxValue: { fontSize: 40, marginTop: Spacing.four },
  luxUnit: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  zoneCurrent: { fontSize: 15, fontWeight: '700', marginTop: Spacing.two },
  useButton: { marginTop: Spacing.four, paddingVertical: 14, paddingHorizontal: Spacing.five, borderRadius: 16, width: '100%', alignItems: 'center' },
  useButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  unavailableCard: {
    marginTop: Spacing.five,
    padding: Spacing.four,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  unavailableTitle: { fontSize: 15, fontWeight: '700' },
  unavailableBody: { fontSize: 13, textAlign: 'center' },
});
