import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassCard } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { daysSince, Propagation, usePropagation } from '@/context/propagation-context';
import { Plant } from '@/data/plants';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess, hapticTap } from '@/utils/haptics';

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

/** The sheet that opens when a project tile is held down: give up on the
 * cutting or delete the project without opening its page. */
function ProjectQuickActions({ project, onClose }: { project: Propagation; onClose: () => void }) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { updateProject, deleteProject } = usePropagation();
  const [confirming, setConfirming] = useState(false);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
            {confirming ? t.prop.delete : project.name}
          </Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t.quick.close}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
        {confirming ? (
          <>
            <Text style={[styles.confirmText, { color: colors.text }]}>{t.prop.deleteQuestion}</Text>
            <View style={styles.confirmRow}>
              <Pressable onPress={() => setConfirming(false)} style={[styles.confirmButton, { borderColor: colors.border }]}>
                <Text style={[styles.confirmButtonText, { color: colors.text }]}>{t.prop.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onClose();
                  deleteProject(project.id);
                }}
                style={[styles.confirmButton, { borderColor: colors.late }]}>
                <Text style={[styles.confirmButtonText, { color: colors.late }]}>{t.prop.deleteConfirm}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {project.status === 'active' && (
              <Pressable
                onPress={() => {
                  updateProject(project.id, { status: 'failed' });
                  hapticTap();
                  onClose();
                }}
                style={[styles.menuRow, { backgroundColor: colors.backgroundSelected }]}>
                <Ionicons name="close-circle-outline" size={20} color={colors.tintBright} />
                <Text style={[styles.menuText, { color: colors.text }]}>{t.prop.markFailed}</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setConfirming(true)} style={[styles.menuRow, { backgroundColor: colors.backgroundSelected }]}>
              <Ionicons name="trash-outline" size={20} color={colors.late} />
              <Text style={[styles.menuText, { color: colors.late }]}>{t.prop.delete}</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

function ProjectTile({ project }: { project: Propagation }) {
  const colors = useTheme();
  const router = useRouter();
  const statusLine = useStatusLine();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => router.push(`/propagation/${project.id}`)}
        onLongPress={() => {
          hapticTap();
          setMenuOpen(true);
        }}>
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
      {menuOpen && <ProjectQuickActions project={project} onClose={() => setMenuOpen(false)} />}
    </>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingTop: 14, paddingHorizontal: 18, gap: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 15 },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600' },
  confirmText: { fontSize: 14, lineHeight: 20 },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmButton: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  confirmButtonText: { fontSize: 15, fontWeight: '700' },
});
