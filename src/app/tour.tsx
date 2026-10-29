import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientButton } from '@/components/glass';
import { useAddGrowthPhoto } from '@/components/growth-album';
import { PlantPhoto } from '@/components/plant-avatar';
import { roomDisplayName } from '@/constants/rooms';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { SymptomKey, symptomKeys } from '@/data/troubleshooting';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess, hapticTap } from '@/utils/haptics';
import { photoDue } from '@/utils/seasonal-tasks';

type Outcome = { plantId: string; name: string; kind: 'ok' | 'newLeaf' | 'issue'; symptom?: SymptomKey };

/**
 * The weekly tour: one plant at a time, one question each — a new leaf, a
 * problem, or all fine. Answers go to the plant's journal; problems end up in
 * a summary that links to the matching guide page. Gives a reason to open the
 * app, and to actually look at the plants, on weeks with nothing to water.
 */
export default function TourScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { plants, addJournalEntry } = usePlants();
  const { setLastTourDate } = useSettings();
  const addGrowthPhoto = useAddGrowthPhoto();

  // The order is fixed when the tour starts, so answering does not reshuffle it.
  const order = useMemo(() => plants.map((p) => p.id), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [pickingIssue, setPickingIssue] = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);
  // What the last answer did, shown on the next plant so a tap never looks like nothing happened.
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const plant = plants.find((p) => p.id === order[index]);
  const finished = index >= order.length;

  const next = (outcome: Outcome) => {
    setOutcomes((prev) => [...prev, outcome]);
    setLastSaved(
      outcome.kind === 'newLeaf' ? t.tour.savedLeaf(outcome.name) : outcome.kind === 'issue' ? t.tour.savedIssue(outcome.name) : t.tour.savedFine(outcome.name)
    );
    setPickingIssue(false);
    setPhotoTaken(false);
    if (index + 1 >= order.length) setLastTourDate(new Date());
    setIndex((i) => i + 1);
  };

  const close = () => router.back();

  if (order.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <GlowBackground />
        <View style={styles.center}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>{t.tour.noPlants}</Text>
          <GradientButton label={t.tour.done} onPress={close} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (finished || !plant) {
    const leaves = outcomes.filter((o) => o.kind === 'newLeaf');
    const issues = outcomes.filter((o) => o.kind === 'issue');
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <GlowBackground />
        <ScrollView contentContainerStyle={styles.summary}>
          <Ionicons name="checkmark-circle" size={56} color={colors.tintBright} style={{ alignSelf: 'center' }} />
          <Text style={[styles.summaryTitle, { color: colors.text }]}>{t.tour.summaryTitle}</Text>
          <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{t.tour.summaryChecked(outcomes.length)}</Text>

          {leaves.length > 0 && (
            <GlassCard style={styles.summaryCard}>
              <Ionicons name="leaf-outline" size={20} color={colors.tintBright} />
              <Text style={[styles.summaryCardText, { color: colors.text }]}>
                {t.tour.summaryLeaves(leaves.map((o) => o.name).join(', '))}
              </Text>
            </GlassCard>
          )}

          {issues.map((o) => (
            <Pressable key={o.plantId} onPress={() => o.symptom && router.push({ pathname: '/diagnose', params: { plantId: o.plantId, symptom: o.symptom } })}>
              <GlassCard style={[styles.summaryCard, { borderColor: colors.late }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.late} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryCardText, { color: colors.text }]}>
                    {o.name}: {o.symptom ? t.troubleshooting.symptoms[o.symptom].label : ''}
                  </Text>
                  <Text style={[styles.summaryLink, { color: colors.tintBright }]}>{t.tour.openGuide}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </GlassCard>
            </Pressable>
          ))}

          {leaves.length === 0 && issues.length === 0 && (
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{t.tour.summaryAllFine}</Text>
          )}

          <GradientButton label={t.tour.done} onPress={close} size="large" style={{ marginTop: Spacing.three }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const wantsPhoto = photoDue(plant) && !photoTaken;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.tour.title}</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>{t.tour.progress(index + 1, order.length)}</Text>
        </View>
        <Pressable onPress={close} hitSlop={10} accessibilityLabel={t.tour.close}>
          <GlassCard style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </GlassCard>
        </Pressable>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.track }]}>
        <View style={[styles.progressFill, { width: `${(index / order.length) * 100}%`, backgroundColor: colors.tintBright }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {index === 0 ? (
          <Text style={[styles.intro, { color: colors.textSecondary }]}>{t.tour.intro}</Text>
        ) : (
          lastSaved && (
            <View style={[styles.savedRow, { backgroundColor: colors.tintMuted }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.tintBright} />
              <Text style={[styles.savedText, { color: colors.text }]}>{lastSaved}</Text>
            </View>
          )
        )}
        <GlassCard style={styles.plantCard}>
          <PlantPhoto plant={plant} height={250} iconSize={90} />
          <View style={styles.plantInfo}>
            <Text style={[styles.plantName, { color: colors.text }]}>{plant.name}</Text>
            <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>
              {plant.species !== '—' ? `${plant.species} · ` : ''}
              {roomDisplayName(plant, t)}
            </Text>
          </View>
        </GlassCard>

        {wantsPhoto && (
          <Pressable
            onPress={async () => {
              if (await addGrowthPhoto(plant, 'camera')) setPhotoTaken(true);
            }}>
            <GlassCard style={[styles.photoRow, { borderColor: colors.late }]}>
              <Ionicons name="camera-outline" size={20} color={colors.late} />
              <Text style={[styles.photoText, { color: colors.text }]}>{t.tour.photoDue}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </GlassCard>
          </Pressable>
        )}
        {photoTaken && (
          <View style={[styles.savedRow, { backgroundColor: colors.tintMuted }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.tintBright} />
            <Text style={[styles.savedText, { color: colors.text }]}>{t.tour.photoAdded}</Text>
          </View>
        )}

        <Text style={[styles.question, { color: colors.text }]}>{pickingIssue ? t.tour.whichIssue : t.tour.question}</Text>

        {pickingIssue ? (
          <View style={styles.issueGrid}>
            {symptomKeys.map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  addJournalEntry(plant.id, {
                    id: `tour-${Date.now()}`,
                    type: 'note',
                    title: t.troubleshooting.symptoms[key].label,
                    description: t.tour.journalIssue,
                    daysAgo: 0,
                  });
                  hapticTap();
                  next({ plantId: plant.id, name: plant.name, kind: 'issue', symptom: key });
                }}
                style={[styles.issueChip, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <Text style={[styles.issueText, { color: colors.text }]}>{t.troubleshooting.symptoms[key].label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPickingIssue(false)} style={styles.issueBack}>
              <Text style={[styles.issueBackText, { color: colors.textSecondary }]}>{t.tour.back}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: Spacing.two }}>
            <Answer
              icon="leaf-outline"
              label={t.tour.newLeaf}
              onPress={() => {
                addJournalEntry(plant.id, {
                  id: `tour-${Date.now()}`,
                  type: 'newLeaf',
                  title: t.plantDetail.journal.typeNames.newLeaf,
                  description: t.tour.journalLeaf,
                  daysAgo: 0,
                });
                hapticSuccess();
                next({ plantId: plant.id, name: plant.name, kind: 'newLeaf' });
              }}
            />
            <Answer icon="alert-circle-outline" label={t.tour.issue} warning onPress={() => setPickingIssue(true)} />
            <Answer
              icon="checkmark-circle-outline"
              label={t.tour.fine}
              onPress={() => {
                hapticTap();
                next({ plantId: plant.id, name: plant.name, kind: 'ok' });
              }}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Answer({
  icon,
  label,
  onPress,
  warning = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  warning?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.answer}>
        <Ionicons name={icon} size={22} color={warning ? colors.late : colors.tintBright} />
        <Text style={[styles.answerText, { color: colors.text }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  closeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { height: 4, borderRadius: 2, marginHorizontal: Spacing.three, marginTop: Spacing.two, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  body: { padding: Spacing.three, gap: Spacing.three },
  intro: { fontSize: 13, lineHeight: 19 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  savedText: { flex: 1, fontSize: 13, fontWeight: '600' },
  plantCard: { overflow: 'hidden' },
  plantInfo: { padding: Spacing.three, paddingTop: 12 },
  plantName: { fontSize: 22, fontWeight: '700' },
  plantMeta: { fontSize: 13, marginTop: 2 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16 },
  photoText: { flex: 1, fontSize: 13, fontWeight: '600' },
  question: { fontSize: 16, fontWeight: '700' },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderRadius: 16 },
  answerText: { flex: 1, fontSize: 15, fontWeight: '600' },
  issueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  issueChip: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  issueText: { fontSize: 13, fontWeight: '600' },
  issueBack: { width: '100%', alignItems: 'center', paddingVertical: 10 },
  issueBackText: { fontSize: 13, fontWeight: '600' },
  summary: { padding: Spacing.four, gap: Spacing.two, paddingTop: Spacing.six },
  summaryTitle: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  summaryText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  summaryCardText: { flex: 1, fontSize: 14, fontWeight: '600' },
  summaryLink: { fontSize: 12, fontWeight: '700', marginTop: 2 },
});
