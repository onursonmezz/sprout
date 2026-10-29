import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientButton } from '@/components/glass';
import { PhotoPicker } from '@/components/photo-picker';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { daysSince, Propagation, PropagationStage, stagesFor, usePropagation } from '@/context/propagation-context';
import { GERMINATION } from '@/data/germination';
import { findSpeciesExact } from '@/data/species-guide';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess, hapticTap } from '@/utils/haptics';

function formatDay(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
}

/** The usual sprouting time for a sowing's species, if two sources agree on one. */
export function germinationFor(project: Propagation) {
  const species = project.latinName ? findSpeciesExact(project.latinName) : undefined;
  return species ? GERMINATION[species.id] : undefined;
}

/** Still waiting for the first sprout well past the usual time. */
export function sowingOverdue(project: Propagation) {
  const g = germinationFor(project);
  return !!g && project.status === 'active' && project.stage === 'started' && daysSince(project.startedAt) > g.days[1];
}

/**
 * A seed sowing (option A in taslak/tohum.html): the sprouting window with
 * today's day on it, a suggestion for the current stage, the stages with
 * their dates, and the one next step.
 */
export function SeedProjectScreen({ project }: { project: Propagation }) {
  const colors = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const { t } = useLanguage();
  const { updateProject, advanceProject, deleteProject } = usePropagation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const day = daysSince(project.startedAt);
  const germination = germinationFor(project);
  const stages = stagesFor('seed');
  const stageIndex = stages.indexOf(project.stage);
  const active = project.status === 'active';
  const nextStage = stages[stageIndex + 1];
  const total = project.seedCount ?? 0;
  const sprouted = project.sproutedCount ?? 0;
  const overdue = sowingOverdue(project);
  const stageDate: Partial<Record<PropagationStage, string | null | undefined>> = {
    started: project.startedAt,
    sprouted: project.sproutedAt,
    trueLeaves: project.trueLeavesAt,
    potted: project.pottedAt,
  };

  // The window bar spans a little past the latest usual day, rounded up to
  // whole ticks so the day labels line up with the bar.
  const tickStep = germination && germination.days[1] > 18 ? 10 : 5;
  const span = germination ? Math.ceil(Math.max(germination.days[1] + 4, day + 2) / tickStep) * tickStep : 0;
  const pct = (n: number) => `${Math.min(100, (n / span) * 100)}%` as const;

  const hints: Partial<Record<PropagationStage, string>> = t.seed.stageHints;
  const tipKey =project.stage === 'started' ? 'started' : project.stage === 'sprouted' ? 'sprouted' : 'trueLeaves';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityLabel={t.prop.back}>
          <GlassCard style={styles.roundButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </GlassCard>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {[
              project.status === 'failed' ? t.seed.markFailed : t.prop.dayCount(day),
              total > 0 ? t.seed.countValue(total) : '',
              project.container ? t.seed.containers[project.container] : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <PhotoPicker uri={project.photoUri} onChange={(uri) => updateProject(project.id, { photoUri: uri })} colors={colors} t={t} height={150} />

        {active && project.stage === 'started' && germination && (
          <GlassCard style={styles.card}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.seed.window(day).toLocaleUpperCase(t.today.dateLocale)}</Text>
            <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
              <View
                style={[
                  styles.range,
                  { left: pct(germination.days[0]), width: pct(germination.days[1] - germination.days[0]), backgroundColor: colors.tint, opacity: 0.45 },
                ]}
              />
              <View style={[styles.now, { left: pct(day), backgroundColor: colors.late }]} />
            </View>
            <View style={styles.ticks}>
              {Array.from({ length: Math.floor(span / tickStep) + 1 }, (_, i) => (
                <Text key={i} style={[styles.tick, { color: colors.textSecondary }]}>
                  {i * tickStep}
                </Text>
              ))}
            </View>
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              {t.seed.speciesInfo(germination.days[0], germination.days[1], germination.soilTempC[0], germination.soilTempC[1])}
            </Text>
          </GlassCard>
        )}

        {overdue && (
          <GlassCard style={[styles.tip, { borderLeftColor: colors.late }]}>
            <View style={styles.tipHead}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.late} />
              <Text style={[styles.tipTitle, { color: colors.late }]}>{t.seed.overdue(project.name, day)}</Text>
            </View>
            <Text style={[styles.tipText, { color: colors.text }]}>{t.seed.overdueText}</Text>
          </GlassCard>
        )}

        {active && (
          <GlassCard style={[styles.tip, { borderLeftColor: colors.late }]}>
            <View style={styles.tipHead}>
              <Ionicons name={project.stage === 'started' ? 'water-outline' : 'sunny-outline'} size={16} color={colors.late} />
              <Text style={[styles.tipTitle, { color: colors.late }]}>{t.seed.today}</Text>
            </View>
            <Text style={[styles.tipText, { color: colors.text }]}>{t.seed.tips[tipKey]}</Text>
            {project.stage === 'started' && germination && (
              <Text style={[styles.note, { color: colors.textSecondary }]}>{germination.surface ? t.seed.surface : t.seed.cover}</Text>
            )}
          </GlassCard>
        )}

        {project.stage !== 'started' && total > 0 && (
          <GlassCard style={styles.card}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t.seed.sprouted.toLocaleUpperCase(t.today.dateLocale)}</Text>
            <View style={styles.counter}>
              <Pressable
                disabled={!active}
                onPress={() => updateProject(project.id, { sproutedCount: Math.max(0, sprouted - 1) })}
                style={[styles.step, { backgroundColor: colors.backgroundSelected }]}>
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <Text style={[styles.countText, { color: colors.text }]}>{t.seed.sproutedValue(sprouted, total)}</Text>
              <Pressable
                disabled={!active}
                onPress={() => updateProject(project.id, { sproutedCount: Math.min(total, sprouted + 1) })}
                style={[styles.step, { backgroundColor: colors.backgroundSelected }]}>
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
          </GlassCard>
        )}

        <GlassCard style={styles.steps}>
          {stages.map((stage, i) => {
            const reached = i <= stageIndex && project.status !== 'failed';
            const current = active && i === stageIndex + 1;
            const date = stageDate[stage];
            return (
              <View key={stage} style={styles.stepRow}>
                <Ionicons
                  name={reached ? 'checkmark-circle' : current ? 'radio-button-on' : 'ellipse-outline'}
                  size={22}
                  color={reached ? colors.tintBright : current ? colors.late : colors.textSecondary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.stepTitle, { color: reached || current ? colors.text : colors.textSecondary }]}>
                    {stage === 'started' ? t.seed.sown : t.prop.stages[stage]}
                  </Text>
                  {reached && date ? (
                    <Text style={[styles.stepDate, { color: colors.textSecondary }]}>{formatDay(date, t.today.dateLocale)}</Text>
                  ) : !reached && hints[stage] ? (
                    <Text style={[styles.stepDate, { color: colors.textSecondary }]}>{hints[stage]}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </GlassCard>

        {active && nextStage && (
          <GradientButton
            label={t.prop.advance[nextStage]}
            onPress={() => {
              advanceProject(project.id);
              hapticSuccess();
            }}
            size="large"
          />
        )}

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
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>{t.seed.markFailed}</Text>
          </Pressable>
        )}

        {project.status === 'failed' && <Text style={[styles.doneText, { color: colors.textSecondary }]}>{t.seed.failedText}</Text>}

        {!active &&
          (confirmDelete ? (
            <View style={styles.confirmRow}>
              <Pressable onPress={() => setConfirmDelete(false)} style={[styles.smallButton, { borderColor: colors.glassBorder }]}>
                <Text style={[styles.smallButtonText, { color: colors.text }]}>{t.prop.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  deleteProject(project.id);
                  goBack();
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  body: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  card: { padding: 14, gap: 6, borderRadius: 16 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  track: { height: 10, borderRadius: 5, marginTop: 8 },
  range: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5 },
  now: { position: 'absolute', top: -4, width: 4, height: 18, borderRadius: 2, marginLeft: -2 },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  tick: { fontSize: 10 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  tip: { padding: 14, gap: 6, borderRadius: 16, borderLeftWidth: 3 },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipTitle: { fontSize: 12, fontWeight: '700' },
  tipText: { fontSize: 13, lineHeight: 19 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  step: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  countText: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  steps: { padding: 14, gap: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepTitle: { fontSize: 15, fontWeight: '600' },
  stepDate: { fontSize: 12, marginTop: 1 },
  doneText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 13, fontWeight: '600' },
  smallButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { fontSize: 12, fontWeight: '700' },
  confirmRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
});
