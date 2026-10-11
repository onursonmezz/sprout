import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { daysSince, Propagation, usePropagation } from '@/context/propagation-context';
import { Plant } from '@/data/plants';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess } from '@/utils/haptics';

/** "Day 12 · waiting for roots" — where a project stands, in a few words. */
function useStatusLine() {
  const { t } = useLanguage();
  return (p: Propagation) =>
    p.status === 'failed'
      ? t.prop.statusFailed
      : p.status === 'done'
        ? t.prop.stages.potted
        : `${t.prop.dayCount(daysSince(p.startedAt))} · ${p.stage === 'rooted' || p.method === 'division' ? t.prop.waitingPot : t.prop.waitingRoots}`;
}

function ProjectTile({ project }: { project: Propagation }) {
  const colors = useTheme();
  const router = useRouter();
  const statusLine = useStatusLine();
  return (
    <Pressable onPress={() => router.push(`/propagation/${project.id}`)}>
      <GlassCard style={styles.tile}>
        <View style={[styles.tilePhoto, { backgroundColor: colors.track }]}>
          {project.photoUri ? (
            <Image source={{ uri: project.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="cut-outline" size={26} color={colors.tintBright} />
          )}
        </View>
        <View style={styles.tileInfo}>
          <Text style={[styles.tileName, { color: colors.text }]} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={[styles.tileMeta, { color: colors.textSecondary }]} numberOfLines={2}>
            {statusLine(project)}
          </Text>
        </View>
      </GlassCard>
    </Pressable>
  );
}

/** On a plant's page: start following a cutting taken from it, and see the
 * ones already under way. */
export function PropagationSection({ plant }: { plant: Plant }) {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { projects, startProject } = usePropagation();
  const mine = projects.filter((p) => p.parentPlantId === plant.id);

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.prop.sectionTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.prop.sectionHint}</Text>
        </View>
        <Pressable
          onPress={() => {
            const id = startProject({
              parentPlantId: plant.id,
              name: t.prop.cuttingOf(plant.name),
              species: plant.species,
              latinName: plant.latinName,
            });
            hapticSuccess();
            router.push(`/propagation/${id}`);
          }}
          style={[styles.startButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
          <Ionicons name="cut-outline" size={15} color={colors.tintBright} />
          <Text style={[styles.startText, { color: colors.text }]}>{t.prop.tookCutting}</Text>
        </Pressable>
      </View>
      {mine.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {mine.map((p) => (
            <ProjectTile key={p.id} project={p} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

/** On the Plants tab: every project, plus a way to start one for a cutting
 * whose parent plant is not in the app. */
export function PropagationStrip() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { projects, startProject } = usePropagation();

  return (
    <View style={{ gap: Spacing.two, marginBottom: Spacing.three }}>
      <Text style={[styles.title, { color: colors.text }]}>{t.prop.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        <Pressable
          onPress={() => {
            const id = startProject({ parentPlantId: null, name: t.prop.newCutting, species: '—', latinName: '' });
            hapticSuccess();
            router.push(`/propagation/${id}`);
          }}>
          <GlassCard style={[styles.tile, styles.newTile]}>
            <Ionicons name="add-circle-outline" size={26} color={colors.tintBright} />
            <Text style={[styles.tileName, { color: colors.text, textAlign: 'center' }]}>{t.prop.newCutting}</Text>
            <Text style={[styles.tileMeta, { color: colors.textSecondary, textAlign: 'center' }]}>{t.prop.startHint}</Text>
          </GlassCard>
        </Pressable>
        {projects.map((p) => (
          <ProjectTile key={p.id} project={p} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  startButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  startText: { fontSize: 12, fontWeight: '700' },
  tile: { width: 150, overflow: 'hidden' },
  newTile: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10 },
  tilePhoto: { height: 84, alignItems: 'center', justifyContent: 'center' },
  tileInfo: { padding: 10, gap: 2, height: 66 },
  tileName: { fontSize: 13, fontWeight: '700' },
  tileMeta: { fontSize: 11, lineHeight: 15 },
});
