import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { useLanguage } from '@/context/language-context';
import { useSettings } from '@/context/settings-context';
import { Plant } from '@/data/plants';
import { useTheme } from '@/hooks/use-theme';
import { wateringBreakdown } from '@/utils/watering-algorithm';

/**
 * "Why every N days?" under a plant's next-watering card: the species'
 * starting interval and what each of the plant's own conditions does to it,
 * so the schedule can be trusted without looking it up elsewhere.
 */
export function WhyInterval({ plant }: { plant: Plant }) {
  const colors = useTheme();
  const { t } = useLanguage();
  const { seasonalAdjustment, heatingOn, latitude } = useSettings();
  const [open, setOpen] = useState(false);

  const custom = plant.customIntervalDays != null;
  const { baseDays, factors } = wateringBreakdown(plant, new Date(), { applySeasonalFactors: seasonalAdjustment, heatingOn, latitude });

  const labels: Record<string, string> = {
    material: t.why.material(t.addPlant.potMaterials[plant.pot.materialKey]),
    size: plant.pot.diameterCm != null ? t.why.size(plant.pot.diameterCm) : t.why.sizeUnknown,
    light: t.why.light(t.addPlant.lightLevels[plant.environment.lightKey].label),
    window: t.why.window,
    season: t.why.season,
    heating: t.why.heating,
    outdoor: t.why.outdoor,
    drainage: t.why.drainage,
    learned: t.why.learned,
  };

  const rows = [...factors, { key: 'learned', factor: plant.intervalAdjust ?? 1 }]
    .map(({ key, factor }) => ({ key, factor, percent: Math.round(Math.abs(factor - 1) * 100) }))
    .filter((row) => row.percent >= 1);

  return (
    <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((v) => !v);
        }}
        style={styles.header}>
        <Ionicons name="help-circle-outline" size={17} color={colors.tintBright} />
        <Text style={[styles.headerText, { color: colors.text }]}>{t.why.title(plant.customIntervalDays ?? plant.wateringIntervalDays)}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
      </Pressable>

      {open &&
        (custom ? (
          <Text style={[styles.note, { color: colors.textSecondary }]}>{t.why.custom}</Text>
        ) : (
          <View style={styles.rows}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t.why.base}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>{t.why.days(baseDays)}</Text>
            </View>
            {rows.map((row) => (
              <View key={row.key} style={styles.row}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{labels[row.key] ?? row.key}</Text>
                <Text style={[styles.rowValue, { color: row.factor < 1 ? colors.late : colors.tintBright }]}>
                  {row.factor < 1 ? t.why.moreOften(row.percent) : t.why.lessOften(row.percent)}
                </Text>
              </View>
            ))}
            <View style={[styles.row, styles.resultRow, { borderTopColor: colors.glassBorder }]}>
              <Text style={[styles.rowLabel, { color: colors.text, fontWeight: '700' }]}>{t.why.result}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>{t.why.everyDays(plant.wateringIntervalDays)}</Text>
            </View>
            <Text style={[styles.note, { color: colors.textSecondary }]}>{t.why.note}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  rows: { marginTop: 10, gap: 7 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  rowLabel: { flex: 1, fontSize: 12.5 },
  rowValue: { fontSize: 12.5, fontWeight: '700' },
  resultRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  note: { fontSize: 11.5, lineHeight: 16, marginTop: 6 },
});
