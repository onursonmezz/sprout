import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientButton } from '@/components/glass';
import { PhotoPicker } from '@/components/photo-picker';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { daysSince, PropagationMethod, stagesFor, usePropagation, WATER_CHANGE_DAYS } from '@/context/propagation-context';
import { useTheme } from '@/hooks/use-theme';
import { speciesOf } from '@/utils/care';
import { hapticSuccess, hapticTap } from '@/utils/haptics';

const METHODS: PropagationMethod[] = ['water', 'soil', 'division'];

function formatDay(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

/** One propagation project: where it is, what usually helps at this stage,
 * and the single next step. */
export default function PropagationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t, lang } = useLanguage();
  const { getProject, updateProject, advanceProject, deleteProject } = usePropagation();
  const { getPlant } = usePlants();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const project = getProject(String(id));

  if (!project) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <GlowBackground />
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>{t.prop.notFound}</Text>
          <GradientButton label={t.prop.back} onPress={() => router.back()} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const parent = project.parentPlantId ? getPlant(project.parentPlantId) : undefined;
  const species = speciesOf(project);
  const stages = stagesFor(project.method);
  const stageIndex = stages.indexOf(project.stage);
  const active = project.status === 'active';
  const nextStage = stages[stageIndex + 1];
  const stageDate = { started: project.startedAt, rooted: project.rootedAt, potted: project.pottedAt };
  const waterDays = daysSince(project.waterChangedAt);

  const finish = () => {
    advanceProject(project.id);
    hapticSuccess();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel={t.prop.back}>
          <GlassCard style={styles.roundButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </GlassCard>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {project.status === 'failed'
              ? t.prop.statusFailed
              : project.status === 'done'
                ? t.prop.statusDone(daysSince(project.startedAt) - daysSince(project.pottedAt ?? project.startedAt))
                : t.prop.dayCount(daysSince(project.startedAt))}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <PhotoPicker uri={project.photoUri} onChange={(uri) => updateProject(project.id, { photoUri: uri })} colors={colors} t={t} height={170} />

        {parent && (
          <Pressable onPress={() => router.push(`/plant/${parent.id}`)}>
            <Text style={[styles.parent, { color: colors.tintBright }]}>{t.prop.from(parent.name)}</Text>
          </Pressable>
        )}

        {/* The method can only be changed before the first step is done. */}
        <View style={styles.chips}>
          {METHODS.map((method) => {
            const selected = project.method === method;
            const locked = !active || project.stage !== 'started';
            return (
              <Pressable
                key={method}
                disabled={locked}
                onPress={() => {
                  updateProject(project.id, { method });
                  hapticTap();
                }}
                style={[
                  styles.chip,
                  { backgroundColor: selected ? colors.tint : colors.glass, borderColor: selected ? colors.tint : colors.glassBorder, opacity: locked && !selected ? 0.4 : 1 },
                ]}>
                <Text style={[styles.chipText, { color: selected ? colors.onTint : colors.text }]}>{t.prop.methods[method]}</Text>
              </Pressable>
            );
          })}
        </View>

        <GlassCard style={styles.steps}>
          {stages.map((stage, i) => {
            const reached = i <= stageIndex && project.status !== 'failed';
            const date = stageDate[stage];
            return (
              <View key={stage} style={styles.stepRow}>
                <Ionicons name={reached ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={reached ? colors.tintBright : colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: reached ? colors.text : colors.textSecondary }]}>{t.prop.stages[stage]}</Text>
                  {reached && date && <Text style={[styles.stepDate, { color: colors.textSecondary }]}>{formatDay(date, t.today.dateLocale)}</Text>}
                </View>
              </View>
            );
          })}
        </GlassCard>

        {active && (
          <GlassCard style={styles.tip}>
            <Ionicons name="bulb-outline" size={20} color={colors.tintBright} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.tipText, { color: colors.text }]}>{t.prop.tips[project.method][project.stage === 'rooted' ? 'rooted' : 'started']}</Text>
              {lang === 'tr' && species && species.propagation.length > 0 && (
                <Text style={[styles.tipNote, { color: colors.textSecondary }]}>{t.prop.speciesMethod(species.propagation.join(', '))}</Text>
              )}
              <Text style={[styles.tipNote, { color: colors.tintBright, fontWeight: '700' }]} onPress={() => router.push('/howto/cutting')}>
                {t.howto.open}
              </Text>
            </View>
          </GlassCard>
        )}

        {active && project.method === 'water' && project.stage === 'started' && (
          <GlassCard style={[styles.waterRow, waterDays >= WATER_CHANGE_DAYS && { borderColor: colors.late }]}>
            <Ionicons name="water-outline" size={20} color={waterDays >= WATER_CHANGE_DAYS ? colors.late : colors.tintBright} />
            <Text style={[styles.waterText, { color: colors.text }]}>{t.prop.waterChanged(waterDays)}</Text>
            <Pressable
              onPress={() => {
                updateProject(project.id, { waterChangedAt: new Date().toISOString() });
                hapticSuccess();
              }}
              style={[styles.smallButton, { borderColor: colors.glassBorder }]}>
              <Text style={[styles.smallButtonText, { color: colors.text }]}>{t.prop.changedNow}</Text>
            </Pressable>
          </GlassCard>
        )}

        {active && nextStage && <GradientButton label={t.prop.advance[nextStage]} onPress={finish} size="large" />}

        {project.status === 'done' && (
          <>
            <Text style={[styles.doneText, { color: colors.textSecondary }]}>{t.prop.doneText}</Text>
            <GradientButton
              label={t.prop.addAsPlant}
              size="large"
              onPress={() =>
                router.push({
                  pathname: '/add-plant',
                  params: { prefillName: project.name, prefillSpecies: project.species === '—' ? '' : project.species, prefillLatin: project.latinName },
                })
              }
            />
          </>
        )}

        {active && (
          <Pressable
            onPress={() => {
              updateProject(project.id, { status: 'failed' });
              hapticTap();
            }}
            style={styles.linkButton}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>{t.prop.markFailed}</Text>
          </Pressable>
        )}

        {project.status === 'failed' && <Text style={[styles.doneText, { color: colors.textSecondary }]}>{t.prop.failedText}</Text>}

        {!active &&
          (confirmDelete ? (
            <View style={styles.confirmRow}>
              <Pressable onPress={() => setConfirmDelete(false)} style={[styles.smallButton, { borderColor: colors.glassBorder }]}>
                <Text style={[styles.smallButtonText, { color: colors.text }]}>{t.prop.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  deleteProject(project.id);
                  router.back();
                }}
                style={[styles.smallButton, { borderColor: colors.late }]}>
                <Text style={[styles.smallButtonText, { color: colors.late }]}>{t.prop.deleteConfirm}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setConfirmDelete(true)} style={styles.linkButton}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>{t.prop.delete}</Text>
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  body: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  parent: { fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: '600' },
  steps: { padding: 14, gap: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepTitle: { fontSize: 15, fontWeight: '600' },
  stepDate: { fontSize: 12, marginTop: 1 },
  tip: { flexDirection: 'row', gap: 12, padding: 14 },
  tipText: { fontSize: 13, lineHeight: 19 },
  tipNote: { fontSize: 12, lineHeight: 17 },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  waterText: { flex: 1, fontSize: 13 },
  smallButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { fontSize: 12, fontWeight: '700' },
  doneText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 13, fontWeight: '600' },
  confirmRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
});
