import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LightSensor } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientFill } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_KEYS, LightKey, lookups, speciesDisplayName, speciesGuide } from '@/data/species-guide';
import { hasPendingLightMeterListener, lightKeyForLux, logMeterPosition, resolveLightMeterResult } from '@/utils/light-meter';

const COLUMN_HEIGHT = 300;
const COLUMN_WIDTH = 14;
const DOT_SIZE = 26;

const ZONE_ICON: Record<LightKey, keyof typeof Ionicons.glyphMap> = {
  full_sun: 'sunny',
  part_sun: 'partly-sunny-outline',
  shade: 'cloud-outline',
  dark: 'moon-outline',
};

const VERDICT_ICON = {
  tooDark: 'arrow-up',
  dim: 'arrow-up',
  ok: 'checkmark',
  tooBright: 'arrow-down',
} as const;

/** Distance from the top of the column for a lux value (bright = top). */
function columnY(lux: number) {
  return (1 - logMeterPosition(lux)) * COLUMN_HEIGHT;
}

export default function LightMeterScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { species: speciesId } = useLocalSearchParams<{ species?: string }>();

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

  // Opened from a plant's page: judge the reading against that species' own
  // light needs instead of just naming the generic zone.
  const species = speciesId ? speciesGuide.find((s) => s.id === speciesId) : undefined;
  const speciesName = species ? speciesDisplayName(species, lang) : null;
  const verdict =
    species && lux != null
      ? lux < species.light.luxMin * 0.5
        ? 'tooDark'
        : lux < species.light.luxMin
          ? 'dim'
          : lux <= species.light.luxMax
            ? 'ok'
            : 'tooBright'
      : null;

  const zoneKey = lux != null ? lightKeyForLux(lux) : null;
  const verdictColor = verdict === 'ok' ? colors.tintBright : colors.late;

  // Each zone's band on the column runs from its own threshold up to the
  // next brighter zone's threshold; the label sits in the middle of it.
  const zones = LIGHT_KEYS.map((key, i) => {
    const top = i === 0 ? 0 : columnY(lookups.lightLux[LIGHT_KEYS[i - 1]].min);
    const bottom = i === LIGHT_KEYS.length - 1 ? COLUMN_HEIGHT : columnY(lookups.lightLux[key].min);
    return { key, center: (top + bottom) / 2, min: lookups.lightLux[key].min };
  });

  const idealTop = species ? columnY(species.light.luxMax) : 0;
  const idealBottom = species ? columnY(species.light.luxMin) : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()}>
          <GlassCard style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </GlassCard>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.lightMeter.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {speciesName ? t.lightMeter.measuringFor(speciesName) : t.lightMeter.subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.instructions, { color: colors.textSecondary }]}>{t.lightMeter.instructions}</Text>

        {available === false ? (
          <GlassCard style={styles.unavailableCard}>
            <Ionicons name="eye-off-outline" size={30} color={colors.textSecondary} />
            <Text style={[styles.unavailableTitle, { color: colors.text }]}>{t.lightMeter.unavailableTitle}</Text>
            <Text style={[styles.unavailableBody, { color: colors.textSecondary }]}>{t.lightMeter.unavailableBody}</Text>
          </GlassCard>
        ) : (
          <>
            <View style={styles.meterRow}>
              <View style={styles.columnWrap}>
                <View style={[styles.column, { boxShadow: `0px 0px 26px ${colors.tintGlow}` }]}>
                  <GradientFill angle="vertical" stops={[colors.late, '#F5D58A', colors.tintBright, colors.gradientTo, colors.tintMuted]} />
                </View>
                {species && (
                  <View
                    style={[
                      styles.idealFrame,
                      { top: idealTop, height: Math.max(12, idealBottom - idealTop), borderColor: colors.text },
                    ]}
                  />
                )}
                {lux != null && (
                  <View
                    style={[
                      styles.dot,
                      {
                        top: columnY(lux) - DOT_SIZE / 2,
                        backgroundColor: colors.text,
                        borderColor: colors.background,
                        boxShadow: `0px 0px 14px ${colors.text}`,
                      },
                    ]}
                  />
                )}
              </View>

              <View style={styles.zoneLabels}>
                {zones.map(({ key, center, min }) => {
                  const active = zoneKey === key;
                  return (
                    <View key={key} style={[styles.zoneRow, { top: center - 18 }]}>
                      <Ionicons name={ZONE_ICON[key]} size={17} color={active ? colors.text : colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.zoneLabel, { color: active ? colors.text : colors.textSecondary, fontWeight: active ? '700' : '500' }]}
                          numberOfLines={2}>
                          {t.addPlant.lightLevels[key].label}
                        </Text>
                        <Text style={[styles.zoneMin, { color: colors.textSecondary }]}>{min.toLocaleString(t.today.dateLocale)}+</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              <GlassCard style={styles.readout}>
                <Text style={[styles.luxValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
                  {lux != null ? Math.round(lux).toLocaleString(t.today.dateLocale) : '—'}
                </Text>
                <Text style={[styles.luxUnit, { color: colors.textSecondary }]}>{t.lightMeter.lux}</Text>
                {zoneKey != null ? (
                  <View style={styles.zoneCurrentRow}>
                    <Ionicons name={ZONE_ICON[zoneKey]} size={15} color={colors.tintBright} />
                    <Text style={[styles.zoneCurrent, { color: colors.tintBright }]}>{t.addPlant.lightLevels[zoneKey].label}</Text>
                  </View>
                ) : (
                  <Text style={[styles.waiting, { color: colors.textSecondary }]}>{t.lightMeter.waiting}</Text>
                )}
                {speciesName && (
                  <Text style={[styles.frameTag, { color: colors.text, borderColor: colors.textSecondary }]}>
                    {t.lightMeter.rangeFrame(speciesName)}
                  </Text>
                )}
              </GlassCard>
            </View>

            <View style={styles.bottom}>
              {species && speciesName && (
                <GlassCard style={styles.verdictCard}>
                  <View style={[styles.verdictIcon, { backgroundColor: colors.track }]}>
                    <Ionicons name={verdict ? VERDICT_ICON[verdict] : 'leaf-outline'} size={20} color={verdict ? verdictColor : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    {verdict && <Text style={[styles.verdictText, { color: verdictColor }]}>{t.lightMeter.verdicts[verdict]}</Text>}
                    <Text style={[styles.verdictPlant, { color: colors.textSecondary }]}>
                      {t.lightMeter.forPlant(speciesName, species.light.luxMin, species.light.luxMax)}
                    </Text>
                  </View>
                </GlassCard>
              )}

              {canUseReading && zoneKey != null && (
                <Pressable
                  onPress={() => {
                    resolveLightMeterResult(zoneKey);
                    router.back();
                  }}
                  style={[styles.useButton, { boxShadow: `0px 6px 16px ${colors.tintGlow}` }]}>
                  <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
                  <Text style={[styles.useButtonText, { color: colors.onTint }]}>{t.lightMeter.useThisReading}</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three },
  instructions: { fontSize: 12, lineHeight: 18, marginTop: Spacing.three },
  meterRow: { flexDirection: 'row', gap: 14, marginTop: Spacing.four, height: COLUMN_HEIGHT },
  columnWrap: { width: DOT_SIZE + 6, height: COLUMN_HEIGHT, alignItems: 'center' },
  column: { width: COLUMN_WIDTH, height: COLUMN_HEIGHT, borderRadius: COLUMN_WIDTH / 2, overflow: 'hidden' },
  idealFrame: { position: 'absolute', left: 1, right: 1, borderWidth: 1.5, borderRadius: 10 },
  dot: { position: 'absolute', width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2, borderWidth: 6 },
  zoneLabels: { flex: 1, height: COLUMN_HEIGHT },
  zoneRow: { position: 'absolute', left: 0, right: 0, height: 36, flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneLabel: { fontSize: 12, lineHeight: 15 },
  zoneMin: { fontSize: 10 },
  readout: { width: 124, padding: 14, justifyContent: 'center' },
  luxValue: { fontSize: 36, fontWeight: '700' },
  luxUnit: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 },
  zoneCurrentRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  zoneCurrent: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  waiting: { fontSize: 11, marginTop: 10 },
  frameTag: { fontSize: 10, fontWeight: '600', marginTop: 12, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  bottom: { marginTop: 'auto', gap: 10 },
  verdictCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  verdictIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verdictPlant: { fontSize: 11, marginTop: 1 },
  verdictText: { fontSize: 14, fontWeight: '700' },
  useButton: { overflow: 'hidden', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  useButtonText: { fontSize: 15, fontWeight: '700' },
  unavailableCard: { marginTop: Spacing.five, padding: Spacing.four, alignItems: 'center', gap: Spacing.one },
  unavailableTitle: { fontSize: 15, fontWeight: '700', marginTop: Spacing.one },
  unavailableBody: { fontSize: 13, textAlign: 'center' },
});
